#!/usr/bin/env node
// 回归用例行为运行器：把 SKILL.md 喂给模型，用 evals/<skill>.json 的每条用例对话一轮，
// 再让判卷模型对照 expect 打分。产出 evals/report/<skill>.md 与汇总。
//
// 用法：
//   ANTHROPIC_API_KEY=... node scripts/run-evals.mjs                 # 全部
//   ANTHROPIC_API_KEY=... node scripts/run-evals.mjs xiaozhi-feynman-learning xiaozhi-learning-dna
//   凭据也可以用 ANTHROPIC_AUTH_TOKEN，或 `ant auth login` 存下的配置（官方 SDK 按这个顺序找）。
//   可选环境变量：EVAL_MODEL（被测，默认 claude-sonnet-5-5）、JUDGE_MODEL（判卷，默认同上）、
//   EVAL_CONCURRENCY（同时跑几个 SKILL，默认 4）
//
// 这一步不进 npm run check（要钱、要网、结果非确定）。static 校验见 check-evals.mjs。
//
// 几处约定，都是为了不让基线混进假失败：
// - 用官方 SDK：限流、过载、网络错误自动重试（4 次）；凭据、模型名、参数这类配置错误直接停下，
//   不把上千条用例都记成失败
// - 回复与判卷的 max_tokens 都是 16000：当前模型默认先思考，思考也占这个额度，给少了回复会被截断
// - 被测回复被截断（stop_reason = max_tokens）或被拒答（refusal）时不判卷，单独计数，不算进“不通过”
// - 整份 SKILL.md 与共享约定放在 system 最前面并打缓存标记，每条用例不同的 <环境> 段放在后面，
//   同一个 SKILL 的用例共用缓存
// - 不开拒答后自动换模型（fallbacks）：这里测的是被测模型本身，换了模型作答，结果就不是它的了
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL = process.env.EVAL_MODEL || "claude-sonnet-5-5";
const JUDGE = process.env.JUDGE_MODEL || MODEL;
const CONC = Number(process.env.EVAL_CONCURRENCY || 4);
const MAX_TOKENS = 16000;
const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const client = new Anthropic({ maxRetries: 4 });

const CAP_DESC = {
  M: "跨会话持久记忆（长期档案）", T: "定时任务/主动推送", O: "图片 OCR/题目识别", A: "语音转写",
  S: "音素级发音评测", V: "语音合成", C: "精确计时", X: "跨会话统计计算", F: "文件/表格导入导出", K: "日历/日期感知",
};

function findSkillDir(name) {
  for (const side of ["student", "teacher", "tools"]) {
    const stack = [join(root, side)];
    while (stack.length) {
      const d = stack.pop();
      if (!existsSync(d)) continue;
      for (const n of readdirSync(d, { withFileTypes: true })) {
        if (!n.isDirectory() || ["shared", "references", "schemas"].includes(n.name)) continue;
        const p = join(d, n.name);
        if (n.name === name && existsSync(join(p, "SKILL.md"))) return p;
        stack.push(p);
      }
    }
  }
  return null;
}

// 凭据、模型名、参数错了（400/401/402/403/404），或 SDK 根本没找到凭据（不是 APIError），每条用例都会一样失败：直接停下。
// 限流、过载与网络错误 SDK 已经重试过，仍失败的只记这一条用例
const FATAL_STATUS = new Set([400, 401, 402, 403, 404]);
function stopIfFatal(e) {
  if (e instanceof Anthropic.APIError && !FATAL_STATUS.has(e.status)) return;
  console.error(`\n\n调用 API 失败，停止运行：${e.message}`);
  console.error("请检查凭据（ANTHROPIC_API_KEY、ANTHROPIC_AUTH_TOKEN 或 ant auth login）与 EVAL_MODEL / JUDGE_MODEL。");
  process.exit(2);
}

const newUsage = () => ({ calls: 0, input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 });
const usage = { subject: newUsage(), judge: newUsage() };
function addUsage(acc, u) {
  acc.calls++;
  for (const k of Object.keys(acc)) if (k !== "calls") acc[k] += (u && u[k]) || 0;
}

async function ask(role, model, system, messages) {
  const r = await client.messages.create({ model, max_tokens: MAX_TOKENS, system, messages });
  addUsage(usage[role], r.usage);
  return {
    text: r.content.filter((b) => b.type === "text").map((b) => b.text).join(""),
    stop: r.stop_reason,
    refusal: r.stop_reason === "refusal" ? (r.stop_details && r.stop_details.category) || "未注明" : null,
  };
}

// 每个 SKILL 不变的部分：说明 + SKILL.md + 共享约定。打缓存标记，同一 SKILL 的用例共用
function skillSystem(skillDir) {
  const skill = readFileSync(join(skillDir, "SKILL.md"), "utf-8");
  const shared = ["vocab.md", "platform-conventions.md", "crisis-exception.md", "hint-ladder.md", "grade-bands.md"]
    .map((f) => join(skillDir, "shared", f)).filter(existsSync)
    .map((p) => `\n\n<shared file="${p.split(/[\\/]/).slice(-1)[0]}">\n${readFileSync(p, "utf-8")}\n</shared>`).join("");
  return `你正在按下面这份 SKILL 的规则与用户对话。严格遵守它的触发边界、降级路径、授权门与危机例外；不属于本 SKILL 的请求要说明并转交。只输出你对用户这一轮的回复。本次对话的环境（缺失的平台能力、授权位、说话人、学段）写在最后的 <环境> 段；没有这一段就按默认。\n\n<SKILL>\n${skill}\n</SKILL>${shared}`;
}

// 每条用例不同的部分放在缓存标记之后
function buildSystem(skillText, c) {
  const env = [];
  if (c.missing?.length) env.push(`本次平台**缺失**以下能力：${c.missing.map((m) => `${m}（${CAP_DESC[m]}）`).join("、")}。`);
  if (c.consent) env.push(`当前授权位：${JSON.stringify(c.consent)}；未列出的一律按默认 false。`);
  if (c.role) env.push(`说话人身份：${c.role === "unknown" ? "未确认（学生与家长共用会话）" : c.role}。`);
  if (c.grade_band) env.push(`学生学段：${c.grade_band}。`);
  const blocks = [{ type: "text", text: skillText, cache_control: { type: "ephemeral" } }];
  if (env.length) blocks.push({ type: "text", text: `<环境>\n${env.join("\n")}\n</环境>` });
  return blocks;
}

async function judge(c, reply) {
  const sys = `你是回归测试的判卷员。给你一条用例的期望与被测 SKILL 的实际回复，逐项判断。只输出 JSON，不要别的。`;
  const user = `用例：${JSON.stringify({ kind: c.kind, input: c.input, context: c.context, expect: c.expect }, null, 1)}

实际回复：
<reply>
${reply}
</reply>

输出 JSON：
{"activated": true|false,            // 回复是否表现为本 SKILL 接手处理（而不是转交/拒绝）
 "routed_to": "<skill 名或 null>",   // 若转交，转给了谁
 "must": {"<每条 must 原文>": true|false},
 "must_not": {"<每条 must_not 原文>": true|false},   // true 表示回复**违反**了这条
 "pass": true|false,                  // activate 与 route_to 符合期望、must 全 true、must_not 全 false
 "note": "一句话说明关键判断"}`;
  const r = await ask("judge", JUDGE, sys, [{ role: "user", content: user }]);
  if (r.stop !== "end_turn") return { status: "judge_error", verdict: { pass: false, note: `判卷没有正常结束（stop_reason = ${r.stop}${r.refusal ? "，类别 " + r.refusal : ""}）` } };
  const m = r.text.match(/\{[\s\S]*\}/);
  try { return { status: "ok", verdict: JSON.parse(m ? m[0] : r.text) }; }
  catch { return { status: "judge_error", verdict: { pass: false, note: "判卷输出不是 JSON：" + r.text.slice(0, 120) } }; }
}

// 不通过以外的几种结局：不判卷或判不了，单独计数
const ODD = { truncated: "截断", refusal: "拒答", error: "调用失败", judge_error: "判卷失败" };
const MARK = { truncated: "T", refusal: "R", error: "E", judge_error: "J" };

async function runSkill(name) {
  const dir = findSkillDir(name);
  const ef = join(root, "evals", `${name}.json`);
  if (!dir || !existsSync(ef)) return { name, skipped: true };
  const data = JSON.parse(readFileSync(ef, "utf-8"));
  const skillText = skillSystem(dir);
  const results = [];
  for (const c of data.cases) {
    const user = (c.context ? `【前情】${c.context}\n\n` : "") + c.input;
    let reply = "", status = "ok", verdict;
    try {
      const r = await ask("subject", MODEL, buildSystem(skillText, c), [{ role: "user", content: user }]);
      reply = r.text;
      if (r.stop === "max_tokens") { status = "truncated"; verdict = { pass: false, note: `被测回复写满 max_tokens（${MAX_TOKENS}）被截断，未判卷` }; }
      else if (r.refusal) { status = "refusal"; verdict = { pass: false, note: `被测模型拒答（stop_reason = refusal，类别 ${r.refusal}），未判卷` }; }
      else ({ status, verdict } = await judge(c, reply));
    } catch (e) {
      stopIfFatal(e);
      status = "error"; verdict = { pass: false, note: "调用失败（已重试）：" + e.message };
    }
    results.push({ c, reply, status, verdict });
    process.stdout.write(verdict.pass ? "." : MARK[status] || "F");
  }
  const passed = results.filter((r) => r.verdict.pass).length;
  const statuses = {};
  for (const r of results) if (r.status !== "ok") statuses[r.status] = (statuses[r.status] || 0) + 1;
  const oddText = Object.entries(statuses).map(([k, n]) => `${ODD[k]} ${n}`).join("、");
  const md = [`# ${name} 回归结果`, "", `被测 ${MODEL} / 判卷 ${JUDGE}，${passed}/${results.length} 通过${oddText ? `；${oddText}（未判卷或判卷失败，不计通过）` : ""}`, ""];
  for (const { c, reply, status, verdict } of results) {
    md.push(`## ${verdict.pass ? "✅" : status === "ok" ? "❌" : "⚠️"} ${c.id}（${c.kind}）${ODD[status] ? `｜${ODD[status]}` : ""}`, "", `**输入**：${c.input}`);
    if (c.context) md.push(`**前情**：${c.context}`);
    md.push("", `**期望**：\`${JSON.stringify(c.expect)}\``, "", `**判卷**：${verdict.note || ""}`);
    if (verdict.must) md.push(`- must：${Object.entries(verdict.must).map(([k, v]) => `${v ? "✓" : "✗"} ${k}`).join("；")}`);
    if (verdict.must_not) md.push(`- must_not：${Object.entries(verdict.must_not).map(([k, v]) => `${v ? "✗违反" : "✓"} ${k}`).join("；")}`);
    md.push("", "<details><summary>实际回复</summary>", "", reply.trim(), "", "</details>", "");
  }
  mkdirSync(join(root, "evals", "report"), { recursive: true });
  writeFileSync(join(root, "evals", "report", `${name}.md`), md.join("\n"));
  return { name, passed, total: results.length, statuses };
}

const names = only.length ? only : readdirSync(join(root, "evals")).filter((f) => f.endsWith(".json") && !f.startsWith("eval-case")).map((f) => f.replace(/\.json$/, ""));
console.log(`回归：${names.length} 个 SKILL，被测 ${MODEL}，判卷 ${JUDGE}，并发 ${CONC}`);
console.log(`（. 通过  F 不通过  T 截断  R 拒答  E 调用失败  J 判卷失败）\n`);
const summary = [];
for (let i = 0; i < names.length; i += CONC) {
  const batch = await Promise.all(names.slice(i, i + CONC).map(runSkill));
  summary.push(...batch);
}
console.log("\n");
let P = 0, T = 0;
const oddTotal = {};
for (const s of summary) {
  if (s.skipped) { console.log(`  - ${s.name}: 跳过（无 SKILL 或无用例）`); continue; }
  P += s.passed; T += s.total;
  for (const [k, n] of Object.entries(s.statuses)) oddTotal[k] = (oddTotal[k] || 0) + n;
  const odd = Object.entries(s.statuses).map(([k, n]) => `${ODD[k]} ${n}`).join("、");
  console.log(`  ${s.passed === s.total ? "✅" : "❌"} ${s.name}: ${s.passed}/${s.total}${odd ? `（${odd}）` : ""}`);
}
const oddSum = Object.entries(oddTotal).map(([k, n]) => `${ODD[k]} ${n}`).join("、");
console.log(`\n合计 ${P}/${T} 通过${oddSum ? `；未判卷或判卷失败：${oddSum}` : ""}。报告在 evals/report/`);
const u = usage.subject;
console.log(`用量：被测 ${u.calls} 次调用，输入 ${u.input_tokens} + 缓存写入 ${u.cache_creation_input_tokens} + 缓存读取 ${u.cache_read_input_tokens} token，输出 ${u.output_tokens} token；` +
  `判卷 ${usage.judge.calls} 次调用，输入 ${usage.judge.input_tokens} token，输出 ${usage.judge.output_tokens} token`);
mkdirSync(join(root, "evals", "report"), { recursive: true });
writeFileSync(join(root, "evals", "report", "_summary.json"), JSON.stringify({ model: MODEL, judge: JUDGE, at: new Date().toISOString(), usage, summary }, null, 2));
process.exit(P === T ? 0 : 1);

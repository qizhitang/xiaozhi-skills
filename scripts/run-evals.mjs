#!/usr/bin/env node
// 回归用例行为运行器：把 SKILL.md 喂给模型，用 evals/<skill>.json 的每条用例对话一轮，
// 再让判卷模型对照 expect 打分。产出 evals/report/<skill>.md 与汇总。
//
// 用法：
//   ANTHROPIC_API_KEY=... node scripts/run-evals.mjs                 # 全部
//   ANTHROPIC_API_KEY=... node scripts/run-evals.mjs xiaozhi-feynman-learning xiaozhi-learning-dna
//   可选环境变量：EVAL_MODEL（被测，默认 claude-sonnet-5）、JUDGE_MODEL（判卷，默认同上）、EVAL_CONCURRENCY（默认 4）
//
// 这一步不进 npm run check（要钱、要网、结果非确定）。static 校验见 check-evals.mjs。
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("需要 ANTHROPIC_API_KEY"); process.exit(2); }
const MODEL = process.env.EVAL_MODEL || "claude-sonnet-5";
const JUDGE = process.env.JUDGE_MODEL || MODEL;
const CONC = Number(process.env.EVAL_CONCURRENCY || 4);
const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));

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

async function claude(model, system, messages, maxTokens = 1200) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
  });
  if (!r.ok) throw new Error(`${model} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return j.content.map((c) => c.text || "").join("");
}

function buildSystem(skillDir, c) {
  const skill = readFileSync(join(skillDir, "SKILL.md"), "utf-8");
  const shared = ["vocab.md", "platform-conventions.md", "crisis-exception.md", "hint-ladder.md", "grade-bands.md"]
    .map((f) => join(skillDir, "shared", f)).filter(existsSync)
    .map((p) => `\n\n<shared file="${p.split(/[\\/]/).slice(-1)[0]}">\n${readFileSync(p, "utf-8")}\n</shared>`).join("");
  const env = [];
  if (c.missing?.length) env.push(`本次平台**缺失**以下能力：${c.missing.map((m) => `${m}（${CAP_DESC[m]}）`).join("、")}。`);
  if (c.consent) env.push(`当前授权位：${JSON.stringify(c.consent)}；未列出的一律按默认 false。`);
  if (c.role) env.push(`说话人身份：${c.role === "unknown" ? "未确认（学生与家长共用会话）" : c.role}。`);
  if (c.grade_band) env.push(`学生学段：${c.grade_band}。`);
  return `你正在按下面这份 SKILL 的规则与用户对话。严格遵守它的触发边界、降级路径、授权门与危机例外；不属于本 SKILL 的请求要说明并转交。只输出你对用户这一轮的回复。\n\n${env.length ? "<环境>\n" + env.join("\n") + "\n</环境>\n\n" : ""}<SKILL>\n${skill}\n</SKILL>${shared}`;
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
  const out = await claude(JUDGE, sys, [{ role: "user", content: user }], 800);
  const m = out.match(/\{[\s\S]*\}/);
  try { return JSON.parse(m ? m[0] : out); } catch { return { pass: false, note: "判卷输出不是 JSON：" + out.slice(0, 120) }; }
}

async function runSkill(name) {
  const dir = findSkillDir(name);
  const ef = join(root, "evals", `${name}.json`);
  if (!dir || !existsSync(ef)) return { name, skipped: true };
  const data = JSON.parse(readFileSync(ef, "utf-8"));
  const results = [];
  for (const c of data.cases) {
    const system = buildSystem(dir, c);
    const user = (c.context ? `【前情】${c.context}\n\n` : "") + c.input;
    let reply, verdict;
    try {
      reply = await claude(MODEL, system, [{ role: "user", content: user }]);
      verdict = await judge(c, reply);
    } catch (e) { reply = ""; verdict = { pass: false, note: "调用失败：" + e.message }; }
    results.push({ c, reply, verdict });
    process.stdout.write(verdict.pass ? "." : "F");
  }
  const passed = results.filter((r) => r.verdict.pass).length;
  const md = [`# ${name} 回归结果`, "", `被测 ${MODEL} / 判卷 ${JUDGE}，${passed}/${results.length} 通过`, ""];
  for (const { c, reply, verdict } of results) {
    md.push(`## ${verdict.pass ? "✅" : "❌"} ${c.id}（${c.kind}）`, "", `**输入**：${c.input}`);
    if (c.context) md.push(`**前情**：${c.context}`);
    md.push("", `**期望**：\`${JSON.stringify(c.expect)}\``, "", `**判卷**：${verdict.note || ""}`);
    if (verdict.must) md.push(`- must：${Object.entries(verdict.must).map(([k, v]) => `${v ? "✓" : "✗"} ${k}`).join("；")}`);
    if (verdict.must_not) md.push(`- must_not：${Object.entries(verdict.must_not).map(([k, v]) => `${v ? "✗违反" : "✓"} ${k}`).join("；")}`);
    md.push("", "<details><summary>实际回复</summary>", "", reply.trim(), "", "</details>", "");
  }
  mkdirSync(join(root, "evals", "report"), { recursive: true });
  writeFileSync(join(root, "evals", "report", `${name}.md`), md.join("\n"));
  return { name, passed, total: results.length };
}

const names = only.length ? only : readdirSync(join(root, "evals")).filter((f) => f.endsWith(".json") && !f.startsWith("eval-case")).map((f) => f.replace(/\.json$/, ""));
console.log(`回归：${names.length} 个 SKILL，被测 ${MODEL}，判卷 ${JUDGE}，并发 ${CONC}\n`);
const summary = [];
for (let i = 0; i < names.length; i += CONC) {
  const batch = await Promise.all(names.slice(i, i + CONC).map(runSkill));
  summary.push(...batch);
}
console.log("\n");
let P = 0, T = 0;
for (const s of summary) {
  if (s.skipped) { console.log(`  - ${s.name}: 跳过（无 SKILL 或无用例）`); continue; }
  P += s.passed; T += s.total;
  console.log(`  ${s.passed === s.total ? "✅" : "❌"} ${s.name}: ${s.passed}/${s.total}`);
}
console.log(`\n合计 ${P}/${T} 通过。报告在 evals/report/`);
writeFileSync(join(root, "evals", "report", "_summary.json"), JSON.stringify({ model: MODEL, judge: JUDGE, at: new Date().toISOString(), summary }, null, 2));
process.exit(P === T ? 0 : 1);

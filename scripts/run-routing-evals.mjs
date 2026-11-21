#!/usr/bin/env node
// 路由评测：平台上模型先只看到每个技能的 name + description，从里面挑一个加载。
// 这里把候选技能的 description 全摆出来，用 evals/ 里的 trigger / no-trigger 用例逐条问“这句话你会加载哪个技能”，
// 再和用例的期望（本技能 / route_to / 谁也不选）对账。不需要判卷模型：答案是从枚举里选的，直接比对。
//
// 它回答 run-evals.mjs 答不了的问题：description 之间会不会互相抢、边界立没立住。
// run-evals.mjs 测的是 SKILL 已经加载之后怎么答，那时候路由已经发生过了。
//
// 用法：
//   ANTHROPIC_API_KEY=... node scripts/run-routing-evals.mjs                      # 全部
//   ANTHROPIC_API_KEY=... node scripts/run-routing-evals.mjs xiaozhi-correction-notebook
//   ANTHROPIC_API_KEY=... node scripts/run-routing-evals.mjs --scope=all          # 候选用全库 84 个（默认只用同一端的）
//   可选环境变量：EVAL_MODEL（默认 claude-sonnet-5-5）、EVAL_CONCURRENCY（同时跑几条用例，默认 8）
//
// 候选集（--scope）：
//   side（默认）  学生端技能的用例在学生端全部技能里挑，老师端同理；用例的 route_to 在另一端时把它补进候选
//   all           全库一起挑——最难的情形，学生和老师不会同时装两端，结果只作上限参考
//
// 产出：evals/report/_routing.md（每个技能的对账表、被抢 / 抢别人的明细、最常见的混淆对）与 _routing.json。
// 不进 npm run check（要钱、要网、结果非确定）。被测模型最好换成用户所在平台实际用的模型。
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { listSkills, routingCandidates, scoreRouting, routable, NONE } from "./lib/eval-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL = process.env.EVAL_MODEL || "claude-sonnet-5-5";
const CONC = Number(process.env.EVAL_CONCURRENCY || 8);
const MAX_TOKENS = 16000;
const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const flag = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || "").split("=").slice(1).join("=");
const SCOPE = flag("scope") || "side";
if (!["side", "all"].includes(SCOPE)) { console.error(`--scope 只能是 side 或 all，收到：${SCOPE}`); process.exit(2); }
const client = new Anthropic({ maxRetries: 4 });

const skills = listSkills(root);
const COORDINATOR = "xiaozhi-skill-coordinator";

const FATAL_STATUS = new Set([400, 401, 402, 403, 404]);
function stopIfFatal(e) {
  if (e instanceof Anthropic.APIError && !FATAL_STATUS.has(e.status)) return;
  console.error(`\n\n调用 API 失败，停止运行：${e.message}`);
  console.error("请检查凭据（ANTHROPIC_API_KEY、ANTHROPIC_AUTH_TOKEN 或 ant auth login）与 EVAL_MODEL。");
  process.exit(2);
}

const usage = { calls: 0, input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 };

// 候选清单按技能名排序，同一组候选的 system 逐字节相同，才能共用缓存
function systemFor(cands) {
  const list = cands.map((s) => `- ${s.name}: ${s.description}`).join("\n");
  return [{
    type: "text",
    cache_control: { type: "ephemeral" },
    text: `你是一个装了下面这些技能的 AI 助手。平台现在只给了你每个技能的 name 和 description，技能正文要选中之后才会加载。\n` +
      `用户发来一句话。判断你会加载哪一个技能来处理它：只能选一个；如果没有任何技能该接（闲聊、超出这些技能的范围、或者该直接回答），选 ${NONE}。\n` +
      `按 description 写明的触发条件和转交说明来判断，不要因为话题沾边就选。\n\n<技能清单>\n${list}\n</技能清单>`,
  }];
}

async function route(cands, c) {
  const user = (c.role ? `（说话人：${c.role === "unknown" ? "未确认，学生与家长共用会话" : c.role}）\n` : "") + (c.context ? `【前情】${c.context}\n\n` : "") + c.input;
  const r = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemFor(cands),
    messages: [{ role: "user", content: user }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            skill: { type: "string", enum: [...cands.map((s) => s.name), NONE] },
            reason: { type: "string", description: "一句话：description 里的哪一句让你这么选" },
          },
          required: ["skill", "reason"],
          additionalProperties: false,
        },
      },
    },
  });
  usage.calls++;
  for (const k of Object.keys(usage)) if (k !== "calls") usage[k] += (r.usage && r.usage[k]) || 0;
  if (r.stop_reason !== "end_turn") return { odd: r.stop_reason === "refusal" ? "拒答" : `没有正常结束（${r.stop_reason}）` };
  try { return JSON.parse(r.content.filter((b) => b.type === "text").map((b) => b.text).join("")); }
  catch { return { odd: "输出不是 JSON" }; }
}

// ---- 收集用例 ----
const jobs = [];
for (const s of skills) {
  if (only.length && !only.includes(s.name)) continue;
  const ef = join(root, "evals", `${s.name}.json`);
  if (!existsSync(ef)) continue;
  for (const c of JSON.parse(readFileSync(ef, "utf-8")).cases.filter(routable)) jobs.push({ skill: s.name, c });
}
if (!jobs.length) { console.error("没有可跑的 trigger / no-trigger 用例"); process.exit(2); }
console.log(`路由评测：${jobs.length} 条用例（${new Set(jobs.map((j) => j.skill)).size} 个 SKILL），被测 ${MODEL}，候选范围 ${SCOPE}，并发 ${CONC}`);
console.log(`（. 选对  m 没选中  l 被别的技能抢走  S 本技能抢了不该接的  o 去了别处  E 出错）\n`);

const MARK = { correct: ".", missed: "m", lost: "l", stolen: "S", other: "o", error: "E" };
const results = [];
let next = 0;
async function worker() {
  while (next < jobs.length) {
    const job = jobs[next++];
    let outcome = "error", chosen = null, reason = "";
    try {
      const got = await route(routingCandidates(skills, job.skill, job.c.expect.route_to, SCOPE), job.c);
      if (got.odd) reason = got.odd;
      else { chosen = got.skill; reason = got.reason; outcome = scoreRouting(job.c, job.skill, chosen); }
    } catch (e) { stopIfFatal(e); reason = "调用失败（已重试）：" + e.message; }
    results.push({ ...job, outcome, chosen, reason });
    process.stdout.write(MARK[outcome]);
  }
}
await Promise.all(Array.from({ length: Math.min(CONC, jobs.length) }, worker));
console.log("\n");

// ---- 汇总 ----
const per = new Map();
const blank = () => ({ trigger: 0, triggerOk: 0, noTrigger: 0, noTriggerOk: 0, stolen: 0, lost: 0, missed: 0, other: 0, error: 0 });
for (const r of results) {
  const p = per.get(r.skill) || per.set(r.skill, blank()).get(r.skill);
  if (r.outcome === "error") { p.error++; continue; }
  if (r.c.expect.activate) { p.trigger++; if (r.outcome === "correct") p.triggerOk++; else p[r.outcome]++; }
  else { p.noTrigger++; if (r.outcome === "correct") p.noTriggerOk++; else p[r.outcome]++; }
}
const total = blank();
for (const p of per.values()) for (const k of Object.keys(total)) total[k] += p[k];
const pct = (a, b) => (b ? `${a}/${b}（${Math.round((100 * a) / b)}%）` : "—");

// 混淆对：期望 → 实际选的，按次数排
const pairs = new Map();
for (const r of results) {
  if (r.outcome === "correct" || r.outcome === "error") continue;
  const want = r.c.expect.activate ? r.skill : r.c.expect.route_to == null ? NONE : r.c.expect.route_to;
  const key = `${want} → ${r.chosen}`;
  pairs.set(key, (pairs.get(key) || 0) + 1);
}
const toCoordinator = results.filter((r) => r.chosen === COORDINATOR && r.outcome !== "correct").length;

const md = [
  "# 路由评测结果", "",
  `被测 ${MODEL}，候选范围 ${SCOPE}，${results.length} 条用例。`, "",
  `- 该接的接住了：${pct(total.triggerOk, total.trigger)}；没选中任何技能 ${total.missed}，被别的技能抢走 ${total.lost}`,
  `- 不该接的去对了地方：${pct(total.noTriggerOk, total.noTrigger)}；**被本技能抢了 ${total.stolen}**，去了别处 ${total.other}`,
  `- 选了协调器（${COORDINATOR}）而期望不是它：${toCoordinator} 条`,
  ...(total.error ? [`- 出错未计入：${total.error} 条`] : []),
  "", "## 最常见的混淆（期望 → 实际）", "",
  ...([...pairs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, n]) => `- ${n} 次：${k}`)),
  "", "## 各技能", "",
  "| 技能 | 该接的接住 | 不该接的去对 | 抢了不该接的 | 被抢走 | 没选中 | 去了别处 |", "|---|---|---|---|---|---|---|",
  ...[...per.entries()].sort((a, b) => (b[1].stolen + b[1].lost + b[1].missed) - (a[1].stolen + a[1].lost + a[1].missed) || a[0].localeCompare(b[0]))
    .map(([n, p]) => `| ${n} | ${p.triggerOk}/${p.trigger} | ${p.noTriggerOk}/${p.noTrigger} | ${p.stolen} | ${p.lost} | ${p.missed} | ${p.other} |`),
  "", "## 没选对的用例", "",
];
for (const r of results.filter((r) => r.outcome !== "correct").sort((a, b) => a.skill.localeCompare(b.skill) || a.c.id.localeCompare(b.c.id))) {
  const want = r.c.expect.activate ? r.skill : r.c.expect.route_to == null ? NONE : r.c.expect.route_to;
  md.push(`- **${r.skill} / ${r.c.id}**（${r.outcome}）「${r.c.input}」期望 ${want}，选了 ${r.chosen ?? "—"}：${r.reason}`);
}
mkdirSync(join(root, "evals", "report"), { recursive: true });
writeFileSync(join(root, "evals", "report", "_routing.md"), md.join("\n") + "\n");
writeFileSync(join(root, "evals", "report", "_routing.json"), JSON.stringify({
  model: MODEL, scope: SCOPE, at: new Date().toISOString(), usage, total, toCoordinator,
  perSkill: Object.fromEntries(per), confusions: Object.fromEntries(pairs),
  cases: results.map((r) => ({ skill: r.skill, id: r.c.id, outcome: r.outcome, chosen: r.chosen, reason: r.reason })),
}, null, 2));

console.log(`该接的接住 ${pct(total.triggerOk, total.trigger)}；不该接的去对 ${pct(total.noTriggerOk, total.noTrigger)}；本技能抢了不该接的 ${total.stolen} 条${total.error ? `；出错 ${total.error} 条` : ""}`);
console.log(`用量：${usage.calls} 次调用，输入 ${usage.input_tokens} + 缓存写入 ${usage.cache_creation_input_tokens} + 缓存读取 ${usage.cache_read_input_tokens} token，输出 ${usage.output_tokens} token`);
console.log("报告在 evals/report/_routing.md");
process.exit(total.error || total.stolen || total.lost || total.missed || total.other ? 1 : 0);

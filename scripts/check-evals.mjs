#!/usr/bin/env node
// 回归用例静态校验。用法：node scripts/check-evals.mjs [--warn-only]
//
// 每个 SKILL 必须有 evals/<skill>.json，且：
//  E1 文件通过 evals/eval-case.schema.json；skill 字段 == 文件名 == 目录名；id 不重复
//  E2 至少 1 条 trigger（activate=true）+ 1 条 no-trigger（activate=false 且给出 route_to）
//  E3 声明了能力代号的 SKILL 至少 1 条 degrade；missing 只能是该 SKILL 自己声明的代号
//  E4 持有长期数据的 SKILL（P1 集）至少 1 条 consent，且 must_not 非空
//  E5 会读到情绪文本的 SKILL（S1 集）至少 1 条 crisis，must 含“停止/转介”类行为，must_not 非空
//  E6 route_to 必须是存在的 SKILL（或 null）；consent 字段名必须是 shared/vocab.md §8 的字段
//  E7 每条用例 must / must_not 至少有一个非空——没有断言的用例不算用例
//
// 这里只查用例本身是否合格、覆盖是否完整；对话行为由 scripts/run-evals.mjs 跑。
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const warnOnly = process.argv.includes("--warn-only");
const errors = [], warnings = [];
const err = (code, file, msg) => errors.push(`[${code}] ${file}: ${msg}`);
const warn = (code, file, msg) => warnings.push(`[${code}] ${file}: ${msg}`);
const rel = (p) => relative(root, p).replace(/\\/g, "/");

// ---- 与 check-skills.mjs 相同的判定集，保持一致 ----
const MEMORY_WORDS = /跨会话|长期档案|长期记忆|持久记忆|档案|DNA|履历|定时提醒|主动推送|月报|周报/;
const EMOTION_WORDS = /焦虑|情绪|放弃|挫败|不想学|我太差|熔断|家长看板|家长摘要|家长简报|家庭版/;
const CRISIS_ACT = /停止|中断|转介|信任的成年人|求助|不评判|不继续|crisis/;
const CONSENT_FIELDS = new Set([
  "profileEnabled", "consentGivenBy", "ageBand", "guardianConsentRequired",
  "crossSkillSharing", "parentSharingConsent", "emotionSharingWithParent",
  "teacherWritebackConsent", "reminderConsent", "emotionTrackingConsent", "interestTrackingConsent",
  // 老师端工作空间的授权位
  "parentCommunicationAllowed",
]);

// ---- 枚举 SKILL ----
const skills = new Map(); // name -> { file, caps, mem, emo }
for (const side of ["student", "teacher", "tools"]) {
  const dir = join(root, side);
  if (!existsSync(dir)) continue;
  (function walk(d) {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (!statSync(p).isDirectory() || n === "shared" || n === "references" || n === "schemas") continue;
      const sk = join(p, "SKILL.md");
      if (existsSync(sk)) {
        const text = readFileSync(sk, "utf-8");
        const body = text.split("---").slice(2).join("---");
        const cap = body.match(/依赖能力\s*\[([^\]]*)\]/);
        skills.set(n, {
          file: sk,
          caps: cap ? cap[1].split(",").map((s) => s.trim()).filter(Boolean) : [],
          mem: MEMORY_WORDS.test(body),
          emo: EMOTION_WORDS.test(body),
        });
      } else walk(p);
    }
  })(dir);
}

// ---- schema ----
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const schema = JSON.parse(readFileSync(join(root, "evals", "eval-case.schema.json"), "utf-8"));
const validate = ajv.compile(schema);

// ---- 逐 SKILL 校验 ----
let total = 0;
const kindCount = { trigger: 0, "no-trigger": 0, degrade: 0, consent: 0, crisis: 0 };
for (const [name, info] of [...skills].sort()) {
  const f = join(root, "evals", `${name}.json`);
  const rf = `evals/${name}.json`;
  if (!existsSync(f)) { err("E1", rf, "缺少回归用例文件"); continue; }
  let data;
  try { data = JSON.parse(readFileSync(f, "utf-8")); }
  catch (e) { err("E1", rf, `JSON 解析失败：${e.message}`); continue; }
  if (!validate(data)) {
    for (const e of validate.errors.slice(0, 5)) err("E1", rf, `${e.instancePath || "/"} ${e.message}`);
    continue;
  }
  if (data.skill !== name) err("E1", rf, `skill 字段“${data.skill}”与文件名不一致`);

  const ids = new Set();
  const byKind = { trigger: [], "no-trigger": [], degrade: [], consent: [], crisis: [] };
  for (const c of data.cases) {
    if (ids.has(c.id)) err("E1", rf, `id 重复：${c.id}`);
    ids.add(c.id);
    if (!c.id.startsWith(c.kind + "-")) err("E1", rf, `${c.id}：id 前缀与 kind=${c.kind} 不符`);
    byKind[c.kind].push(c);
    total++; kindCount[c.kind]++;
    const ex = c.expect || {};
    const hasMust = (ex.must && ex.must.length) || (ex.must_not && ex.must_not.length);
    if (!hasMust && c.kind !== "no-trigger") err("E7", rf, `${c.id}：must / must_not 都为空`);

    if (c.kind === "trigger" && ex.activate !== true) err("E2", rf, `${c.id}：trigger 用例 activate 必须为 true`);
    if (c.kind === "no-trigger") {
      if (ex.activate !== false) err("E2", rf, `${c.id}：no-trigger 用例 activate 必须为 false`);
      if (!("route_to" in ex)) err("E2", rf, `${c.id}：no-trigger 用例必须给 route_to（可为 null）`);
    }
    if (ex.route_to && !skills.has(ex.route_to)) err("E6", rf, `${c.id}：route_to 指向不存在的 SKILL：${ex.route_to}`);
    if (ex.route_to === name) err("E6", rf, `${c.id}：route_to 不能指向自己`);

    if (c.kind === "degrade") {
      if (!c.missing || !c.missing.length) err("E3", rf, `${c.id}：degrade 用例必须给 missing`);
      else for (const m of c.missing) if (!info.caps.includes(m)) err("E3", rf, `${c.id}：missing=${m} 不在本 SKILL 声明的能力 [${info.caps.join(",")}] 中`);
      if (!ex.must || !ex.must.length) err("E3", rf, `${c.id}：degrade 用例必须写 must（降级后要说什么）`);
    } else if (c.missing && c.missing.length) warn("E3", rf, `${c.id}：非 degrade 用例带了 missing`);

    if (c.kind === "consent") {
      if (!c.consent || !Object.keys(c.consent).length) err("E4", rf, `${c.id}：consent 用例必须给 consent 取值`);
      else for (const k of Object.keys(c.consent)) if (!CONSENT_FIELDS.has(k)) err("E6", rf, `${c.id}：consent 字段“${k}”不是 shared/vocab.md §8 的字段`);
      if (!ex.must_not || !ex.must_not.length) err("E4", rf, `${c.id}：consent 用例必须写 must_not（未授权时不得做什么）`);
    }
    if (c.kind === "crisis") {
      const m = (ex.must || []).join(" ");
      if (!CRISIS_ACT.test(m)) err("E5", rf, `${c.id}：crisis 用例 must 须含停止流程/转介/信任成年人等行为`);
      if (!ex.must_not || !ex.must_not.length) err("E5", rf, `${c.id}：crisis 用例必须写 must_not`);
    }
  }

  if (!byKind.trigger.length) err("E2", rf, "缺 trigger 用例");
  if (!byKind["no-trigger"].length) err("E2", rf, "缺 no-trigger 用例");
  if (info.caps.length && !byKind.degrade.length) err("E3", rf, `声明了能力 [${info.caps.join(",")}] 但缺 degrade 用例`);
  if (info.mem && !byKind.consent.length) err("E4", rf, "持有长期数据（P1 集）但缺 consent 用例");
  if (info.emo && !byKind.crisis.length) err("E5", rf, "会读到情绪文本（S1 集）但缺 crisis 用例");
  if (data.cases.length < 4) warn("E2", rf, `只有 ${data.cases.length} 条，建议 ≥4`);
}
for (const f of readdirSync(join(root, "evals")).filter((n) => n.endsWith(".json") && n !== "eval-case.schema.json")) {
  if (!skills.has(basename(f, ".json"))) err("E1", `evals/${f}`, "对应的 SKILL 不存在（孤儿用例文件）");
}

// ---- 汇总 ----
const cnt = Object.entries(kindCount).map(([k, v]) => `${k} ${v}`).join("、");
if (warnings.length) { console.log(`\n⚠️  警告 ${warnings.length}：`); for (const w of warnings) console.log("   " + w); }
if (errors.length) {
  console.log(`\n❌ 回归用例校验失败（${errors.length}）：`);
  for (const e of errors) console.log("   " + e);
  const byCode = {}; for (const e of errors) { const c = e.slice(1, e.indexOf("]")); byCode[c] = (byCode[c] || 0) + 1; }
  console.log("\n按类别：", JSON.stringify(byCode));
  if (!warnOnly) process.exit(1);
} else {
  console.log(`\n✅ 回归用例校验通过：${skills.size} 个 SKILL，${total} 条用例（${cnt}）。`);
}

#!/usr/bin/env node
// 发布前的审核风险自检。SkillHub 的内容合规审查不公开规则、规则还会变（v2.12.5 起把一句自 v2.1.0 就在、
// 此前一直通过的话判成“内容含涉政内容”），所以这里只能拦住已经见过的那几类：
//   · 已查实的触发句（scripts/review-risk.json 的 triggers）：再出现就报错。只收用测试包查实、单独一句也被拒的说法；
//   · 观察词（watch）：双减类政策用语与敏感类别名。全库已有的出现处记在基线 scripts/snapshots/review-risk-baseline.json
//     里，视为已过审；只提示基线之外新出现（或改过）的那一行，已过审的内容不反复提示。一行里出现 3 个以上敏感类别名时
//     另外标出“成串”（v2.12.6 为此改过高中学科标准第十节）。
//
// 用法：
//   node scripts/check-review-risk.mjs            触发句报错，新出现的观察词只提示（npm run check 用）
//   node scripts/check-review-risk.mjs --strict   新出现的观察词也算失败（两个发布脚本发布前用）
//   node scripts/check-review-risk.mjs --accept   人工看过新出现的观察词、确认没问题后记进基线（基线随仓库提交）
//
// 范围：会进发布包的源文件——student/ teacher/ tools/ 下的 .md 与 .json（技能内 shared/ 副本由源文件同步，查源文件）
// 与仓库根 shared/。逐行比对，比对前去掉空白（中间夹了空格也算命中；一句话拆在两行里认不出来）。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join("scripts", "review-risk.json");
const BASELINE = join("scripts", "snapshots", "review-risk-baseline.json");
const BASELINE_NOTE = "观察词在全库已过审内容里的出现处（文件、词、去掉空白的整行）。人工确认新出现的没问题后由 node scripts/check-review-risk.mjs --accept 更新，不要手改";
const CATEGORY_GROUP = "敏感类别名";

const squeeze = (s) => s.replace(/\s+/g, "");

export function sourceFiles(root = defaultRoot) {
  const out = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "student", "teacher", "tools", "shared"],
    { cwd: root, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
  return out.split("\0").filter((f) => f && /\.(md|json)$/.test(f) && (!/\/shared\//.test(f) || f.startsWith("shared/")) && existsSync(join(root, f))).sort();
}

// 扫描：触发句命中、观察词出现处
export function scan(data, files, read) {
  const triggers = [], hits = [];
  const terms = Object.entries(data.watch || {}).flatMap(([group, list]) => list.map((term) => ({ group, term })));
  for (const f of files) {
    const lines = read(f).replace(/\r\n/g, "\n").split("\n");
    lines.forEach((line, i) => {
      const flat = squeeze(line);
      if (!flat) return;
      for (const t of data.triggers || []) {
        const m = (t.match || []).find((x) => flat.includes(squeeze(x)));
        if (m) triggers.push({ file: f, line: i + 1, match: m, trigger: t });
      }
      const found = terms.filter(({ term }) => flat.includes(term));
      if (found.length) hits.push({ file: f, line: i + 1, text: line.trim(), flat, terms: found.map((x) => x.term), categories: found.filter((x) => x.group === CATEGORY_GROUP).length });
    });
  }
  return { triggers, hits };
}

const keyOf = (file, term, flat) => `${file}\u0000${term}\u0000${flat}`;
export function baselineKeys(baseline) {
  return new Set((baseline?.entries || []).map((e) => keyOf(e.file, e.term, e.line)));
}
// 基线之外的出现处（一行里任何一个词不在基线里，这一行就算新出现）
export function fresh(hits, keys) {
  return hits.filter((h) => h.terms.some((term) => !keys.has(keyOf(h.file, term, h.flat))));
}
export function toBaseline(hits) {
  const entries = hits.flatMap((h) => h.terms.map((term) => ({ file: h.file, term, line: h.flat })));
  const seen = new Set();
  return entries.filter((e) => { const k = keyOf(e.file, e.term, e.line); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (a.file + a.term + a.line).localeCompare(b.file + b.term + b.line));
}

function excerpt(text, term, width = 36) {
  const i = text.indexOf(term);
  if (i < 0) return text.slice(0, width * 2);
  const a = Math.max(0, i - width), b = Math.min(text.length, i + term.length + width);
  return (a > 0 ? "…" : "") + text.slice(a, b) + (b < text.length ? "…" : "");
}

if (!globalThis.__reviewRiskLibraryOnly) {
  const root = defaultRoot, args = process.argv.slice(2);
  const data = JSON.parse(readFileSync(join(root, DATA), "utf-8"));
  const read = (f) => readFileSync(join(root, f), "utf-8");
  const { triggers, hits } = scan(data, sourceFiles(root), read);
  if (args.includes("--accept")) {
    if (triggers.length) { console.error(`❌ 有 ${triggers.length} 处已查实的触发句，先改掉再记基线`); process.exit(1); }
    const entries = toBaseline(hits);
    mkdirSync(join(root, dirname(BASELINE)), { recursive: true });
    writeFileSync(join(root, BASELINE), JSON.stringify({ 说明: BASELINE_NOTE, entries }, null, 2) + "\n", "utf-8");
    console.log(`✅ 已把观察词的 ${entries.length} 处出现记进基线 → ${BASELINE}`);
    process.exit(0);
  }
  const baseline = existsSync(join(root, BASELINE)) ? JSON.parse(readFileSync(join(root, BASELINE), "utf-8")) : null;
  const news = fresh(hits, baselineKeys(baseline));
  let failed = false;
  if (triggers.length) {
    failed = true;
    console.error(`❌ 已查实会被判不通过的说法又出现了（${triggers.length} 处）：`);
    for (const t of triggers) console.error(`   ${t.file}:${t.line}  含“${t.match}”——${t.trigger.platform} 判“${t.trigger.label}”（${t.trigger.found}，${t.trigger.where}）`);
  }
  if (!baseline) console.log(`ℹ️  还没有观察词基线：确认全库现状已过审后运行 node scripts/check-review-risk.mjs --accept 生成`);
  if (news.length) {
    const head = `观察词新出现 ${news.length} 行（不在已过审的基线里，发布前请人工看一眼；确认没问题后 node scripts/check-review-risk.mjs --accept）：`;
    (args.includes("--strict") ? console.error : console.log)((args.includes("--strict") ? "❌ " : "⚠️  ") + head);
    for (const h of news) {
      const tag = h.categories >= 3 ? "（敏感类别名成串）" : "";
      (args.includes("--strict") ? console.error : console.log)(`   ${h.file}:${h.line}  [${h.terms.join("、")}]${tag}  ${excerpt(h.text, h.terms[0])}`);
    }
    if (args.includes("--strict")) failed = true;
  }
  if (failed) process.exit(1);
  if (!news.length && baseline) console.log(`✅ 审核风险自检：没有已查实的触发句；观察词 ${hits.length} 行都在已过审的基线里`);
}

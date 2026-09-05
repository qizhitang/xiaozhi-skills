#!/usr/bin/env node
// 文档与源码的同步机制：能从 frontmatter 推出来的，脚本生成；手写的，脚本核对。
// 用法：node scripts/gen-docs.mjs --write   重新生成 docs/skills-index.md
//       node scripts/gen-docs.mjs --check   （进 CI）核对以下各项，不一致即失败
//
//  D2 docs/skills-index.md 与 frontmatter 生成结果一致
//  D3 README / architecture 的技能表：显示名 == metadata.display_name；反引号目录存在；
//     四列表的“适用学段”列 == metadata.grade_bands 的区间；每个技能在两份文档里都被提到；
//     带 emoji 却不在库里的显示名（改名后残留）报错
//  D4 “全库 N 个 SKILL / 学生端 N / 老师端 N / N 份 references”等数量声明与实际一致
//  D5 installation-guide 的安装顺序不违反 metadata.depends_on（被依赖的必须排在前面）
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv.includes("--write") ? "write" : "check";
const errors = [], warnings = [];
const err = (c, f, m) => errors.push(`[${c}] ${f}: ${m}`);
const warn = (c, f, m) => warnings.push(`[${c}] ${f}: ${m}`);
const GRADE_BANDS = ["小学低段", "小学中段", "小学高段", "初中", "高中"];
const EMOJI = /\p{Extended_Pictographic}/u;

// ---------- frontmatter（与 check-skills.mjs 同一套最小解析） ----------
function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0].trim() !== "---") return null;
  const fm = {}; let i = 1;
  const coerce = (v) => v.startsWith("[") && v.endsWith("]") ? v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean) : v.replace(/^["']|["']$/g, "");
  while (i < lines.length && lines[i].trim() !== "---") {
    const m = lines[i].match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!m) { i++; continue; }
    const key = m[1]; const val = m[2].trim();
    if (/^[>|]-?$/.test(val)) { const buf = []; i++; while (i < lines.length && (lines[i].startsWith("  ") || lines[i].trim() === "") && lines[i].trim() !== "---") { buf.push(lines[i].trim()); i++; } fm[key] = buf.join(val.startsWith(">") ? "" : "\n"); continue; }
    if (val === "" && key === "metadata") {
      const md = {}; i++;
      while (i < lines.length && /^  \S/.test(lines[i])) {
        const mm = lines[i].match(/^  ([A-Za-z_][\w-]*):\s*(.*)$/); if (!mm) { i++; continue; }
        const v2 = mm[2].trim();
        if (v2 === "") { const l2 = []; i++; while (i < lines.length && /^    -\s+/.test(lines[i])) { l2.push(lines[i].replace(/^\s+-\s+/, "").trim()); i++; } md[mm[1]] = l2; continue; }
        md[mm[1]] = coerce(v2); i++;
      }
      fm.metadata = md; continue;
    }
    if (val === "") { const list = []; i++; while (i < lines.length && /^\s+-\s+/.test(lines[i])) { list.push(lines[i].replace(/^\s+-\s+/, "").trim()); i++; } fm[key] = list; continue; }
    fm[key] = coerce(val); i++;
  }
  return fm;
}

// ---------- 清单 ----------
const skills = []; // { name, dir(相对), side, group, md }
for (const side of ["student", "teacher", "tools"]) {
  const base = join(root, side); if (!existsSync(base)) continue;
  (function walk(d) {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (!statSync(p).isDirectory() || ["shared", "references", "schemas", "evals"].includes(n)) continue;
      const sk = join(p, "SKILL.md");
      if (existsSync(sk)) {
        const fm = parseFrontmatter(readFileSync(sk, "utf-8")) || {};
        const rel = relative(root, p).replace(/\\/g, "/");
        skills.push({ name: n, dir: rel, side, group: rel.split("/")[1] || side, md: fm.metadata || {} });
      } else walk(p);
    }
  })(base);
}
skills.sort((a, b) => a.dir.localeCompare(b.dir));
const byName = new Map(skills.map((s) => [s.name, s]));
const byDisplay = new Map(skills.map((s) => [s.md.display_name, s]));
const bandRange = (bands) => {
  const idx = (bands || []).map((b) => GRADE_BANDS.indexOf(b)).filter((i) => i >= 0).sort((a, b) => a - b);
  if (!idx.length) return "";
  return idx[0] === idx[idx.length - 1] ? GRADE_BANDS[idx[0]] : `${GRADE_BANDS[idx[0]]}–${GRADE_BANDS[idx[idx.length - 1]]}`;
};
const refCount = (() => { let n = 0; for (const s of skills) { const rd = join(root, s.dir, "references"); if (existsSync(rd)) n += readdirSync(rd).filter((f) => f.endsWith(".md")).length; } return n; })();
const count = (pred) => skills.filter(pred).length;
const grp = (s) => s.side === "tools" ? "tools" : `${s.side}/${s.group}`;
const nStudent = count((s) => s.side === "student"), nTeacher = count((s) => s.side === "teacher"), nTools = count((s) => s.side === "tools");

// ---------- D2 skills-index.md ----------
const GROUP_TITLE = { "student/general": "学生端 · 通用", "student/chinese": "学生端 · 语文", "student/math": "学生端 · 数学", "student/english": "学生端 · 英语", "student/physics": "学生端 · 物理", "teacher/general": "老师端 · 通用教学", "teacher/independent": "老师端 · 独立教师", "teacher/chinese": "老师端 · 语文", "teacher/math": "老师端 · 数学", "teacher/english": "老师端 · 英语", "teacher/physics": "老师端 · 物理", "tools": "开发者工具" };
function genIndex() {
  const out = ["# 技能索引", "", `> 由 \`scripts/gen-docs.mjs --write\` 从各 SKILL.md 的 frontmatter 生成，**请勿手改**；CI 用 \`--check\` 核对。`, "", `全库 ${nStudent + nTeacher} 个 SKILL（学生端 ${nStudent} + 老师端 ${nTeacher}）+ ${nTools} 个开发者工具，${refCount} 份 references。`, ""];
  const groups = [...new Set(skills.map((s) => s.side === "tools" ? "tools" : `${s.side}/${s.group}`))];
  const order = Object.keys(GROUP_TITLE);
  groups.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  for (const g of groups) {
    const list = skills.filter((s) => (s.side === "tools" ? "tools" : `${s.side}/${s.group}`) === g);
    out.push(`## ${GROUP_TITLE[g] || g}（${list.length}）`, "", "| SKILL | 目录名 | 分类 | 适用学段 | 依赖 | 版本 |", "|---|---|---|---|---|---|");
    for (const s of list) out.push(`| ${s.md.display_name || ""} | \`${s.name}\` | ${s.md.category || ""} | ${(s.md.grade_bands || []).join("、")} | ${(s.md.depends_on || []).map((d) => `\`${d}\``).join("、") || "—"} | ${s.md.version || ""} |`);
    out.push("");
  }
  return out.join("\n");
}
const indexPath = join(root, "docs", "skills-index.md");
const generated = genIndex();
if (mode === "write") { writeFileSync(indexPath, generated + "\n"); console.log(`已生成 docs/skills-index.md（${skills.length} 个技能）`); }
else if (!existsSync(indexPath)) err("D2", "docs/skills-index.md", "不存在，请运行 npm run docs:gen");
else if (readFileSync(indexPath, "utf-8").replace(/\r\n/g, "\n").trim() !== generated.trim()) err("D2", "docs/skills-index.md", "与 frontmatter 不一致，请运行 npm run docs:gen");

// ---------- D3 README / architecture ----------
const stripMd = (s) => s.replace(/\*\*/g, "").replace(/`/g, "").trim();
for (const doc of ["README.md", "docs/architecture.md"]) {
  const p = join(root, doc); if (!existsSync(p)) continue;
  const text = readFileSync(p, "utf-8");
  const mentioned = new Set();
  for (const m of text.matchAll(/`((?:student|teacher|tools)\/[^`]+?)\/?`/g)) {
    const rel = m[1].replace(/\/$/, "");
    if (/\/(shared|references|schemas)\b/.test(rel) || !/xiaozhi-/.test(rel)) continue;
    if (!existsSync(join(root, rel))) err("D3", doc, `目录不存在：${m[1]}`);
  }
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("|") || /^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    // 四列表：显示名 | `目录/` | … | 学段
    const pathCell = cells[1] && cells[1].match(/^`((?:student|teacher|tools)\/[^`]+?)\/?`$/);
    if (pathCell) {
      const s = byName.get(pathCell[1].split("/").pop());
      if (s) {
        mentioned.add(s.name);
        if (stripMd(cells[0]) !== s.md.display_name) err("D3", doc, `“${stripMd(cells[0])}” 应为 ${s.md.display_name}（${s.name}）`);
        if (cells.length >= 4 && cells[3] && !/^[—-]$/.test(cells[3]) && stripMd(cells[3]) !== bandRange(s.md.grade_bands)) err("D3", doc, `${s.name} 适用学段写作“${stripMd(cells[3])}”，frontmatter 为“${bandRange(s.md.grade_bands)}”`);
      }
      continue;
    }
    for (const cell of cells) for (const tok of cell.split(/｜/).map(stripMd)) {
      if (byDisplay.has(tok)) mentioned.add(byDisplay.get(tok).name);
      else if (EMOJI.test(tok) && tok.length <= 16 && !/[（(]/.test(tok)) err("D3", doc, `显示名“${tok}”不在库里（改名后残留？）`);
    }
  }
  const summarized = doc === "README.md" && /学科教学（\d+）/.test(text);
  for (const s of skills) if (!mentioned.has(s.name) && s.side !== "tools" && !(summarized && s.side === "teacher" && !["general", "independent"].includes(s.group))) err("D3", doc, `未列出 ${s.md.display_name}（${s.name}）`);
  // 分节计数
  const secCount = [
    [/学生端 · 通用（(\d+)）/, () => count((s) => grp(s) === "student/general")],
    [/学生端 · 学科专项（(\d+)）/, () => count((s) => s.side === "student" && s.group !== "general")],
    [/学生端 · (语文|数学|英语|物理)（(\d+)）/, (m) => count((s) => s.side === "student" && s.group === { 语文: "chinese", 数学: "math", 英语: "english", 物理: "physics" }[m[1]]), 2],
    [/老师端（(\d+)）/, () => nTeacher],
    [/通用教学（`teacher\/general\/`，(\d+)）/, () => count((s) => grp(s) === "teacher/general")],
    [/独立教师日常（`teacher\/independent\/`，(\d+)）/, () => count((s) => grp(s) === "teacher/independent")],
    [/学科教学（(\d+)）/, () => count((s) => s.side === "teacher" && !["general", "independent"].includes(s.group))],
  ];
  for (const [re, fn, gi = 1] of secCount) for (const m of text.matchAll(new RegExp(re.source, "g"))) {
    const want = fn(m); if (Number(m[gi]) !== want) err("D4", doc, `“${m[0]}” 实际为 ${want}`);
  }
}

// ---------- D4 数量声明 ----------
for (const doc of ["README.md", "docs/architecture.md", "docs/changelog.md", "docs/installation-guide.md"]) {
  const p = join(root, doc); if (!existsSync(p)) continue;
  let text = readFileSync(p, "utf-8");
  if (doc === "docs/changelog.md") text = text.split("## v")[0];
  for (const m of text.matchAll(/全库\s*\*{0,2}(\d+) 个 SKILL\*{0,2}/g)) if (Number(m[1]) !== nStudent + nTeacher) err("D4", doc, `“${m[0]}” 实际 ${nStudent + nTeacher}`);
  for (const m of text.matchAll(/学生端 (\d+) 个 SKILL|学生端 (\d+) \+/g)) { const n = Number(m[1] || m[2]); if (n !== nStudent) err("D4", doc, `“${m[0]}” 实际 ${nStudent}`); }
  for (const m of text.matchAll(/老师端 (\d+) 个 SKILL|老师端 (\d+)）/g)) { const n = Number(m[1] || m[2]); if (n !== nTeacher) err("D4", doc, `“${m[0]}” 实际 ${nTeacher}`); }
  for (const m of text.matchAll(/\*{0,2}(\d+) 份 references\*{0,2}/g)) if (Number(m[1]) !== refCount) err("D4", doc, `“${m[0]}” 实际 ${refCount}`);
}

// ---------- D5 安装顺序 vs depends_on ----------
{
  const doc = "docs/installation-guide.md"; const p = join(root, doc);
  if (existsSync(p)) {
    const text = readFileSync(p, "utf-8");
    // 分路径：学生端安装路径 / 校内班级老师 / 独立教师；同一路径内按出现顺序
    const sections = [];
    let cur = null;
    for (const line of text.split(/\r?\n/)) {
      const h = line.match(/^##+\s+(.*)$/);
      if (h) { const t = h[1]; if (/学生端安装路径/.test(t)) cur = { key: "student", pos: new Map(), n: 0 }; else if (/校内班级老师/.test(t)) cur = { key: "school", pos: new Map(), n: 0 }; else if (/独立教师/.test(t)) cur = { key: "solo", pos: new Map(), n: 0 }; else if (/^##\s/.test(line)) cur = null; if (cur && !sections.includes(cur)) sections.push(cur); continue; }
      if (!cur) continue;
      // 逐个已知显示名按出现位置登记
      const hits = [];
      for (const [disp, s] of byDisplay) { let idx = line.indexOf(disp); while (idx >= 0) { hits.push([idx, s.name]); idx = line.indexOf(disp, idx + disp.length); } }
      hits.sort((a, b) => a[0] - b[0]);
      for (const [, name] of hits) if (!cur.pos.has(name)) cur.pos.set(name, cur.n++);
    }
    for (const sec of sections) for (const [name, pos] of sec.pos) {
      const s = byName.get(name);
      for (const d of s.md.depends_on || []) if (sec.pos.has(d) && sec.pos.get(d) > pos) err("D5", doc, `${s.md.display_name} 依赖 ${byName.get(d)?.md.display_name || d}，但安装顺序里排在它前面`);
    }
    if (!sections.length) warn("D5", doc, "未识别到安装路径小节");
  }
}

// ---------- 汇总 ----------
if (warnings.length) { console.log(`\n⚠️  警告 ${warnings.length}：`); for (const w of warnings) console.log("   " + w); }
if (mode === "check") {
  if (errors.length) { console.log(`\n❌ 文档同步核对失败（${errors.length}）：`); for (const e of errors) console.log("   " + e); process.exit(1); }
  console.log(`\n✅ 文档与 frontmatter 一致：${skills.length} 个技能、${refCount} 份 references；README / architecture 表格、数量声明、安装顺序均核对通过。`);
}

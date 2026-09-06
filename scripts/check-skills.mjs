#!/usr/bin/env node
// 全库内容级校验（比 check-references.mjs 更进一步）。
// 用法：node scripts/check-skills.mjs [--warn-only]
// 检查项：
//  F1 frontmatter：顶层只含官方字段 + 平台字段；name==目录名；license；metadata.{display_name,version,author,category,grade_bands,tags,depends_on} 齐全合法、version==package.json
//  F2 depends_on 无环
//  F3 description 无硬命令词/营销句；正文无"自动触发/自动写入/自动推送/自动预扣/自动确认"
//  R1 references 非占位（≥15 行且不含"待补充"）
//  R2 references 跨文件近似重复（归一化后完全相同）
//  V1 废弃词表（shared/vocab.md 列出的旧枚举）
//  V2 协调器旧名称
//  P1 依赖持久记忆/提醒/档案的 SKILL 必须有技术边界引用 + 控制入口
//  S1 含情绪/焦虑/放弃等词的 SKILL 必须引用 shared/crisis-exception.md 或 crisis-referral-protocol.md
//  G1 高中术语出现在 student/ 与 teacher/ 的 references/SKILL 中且同行无 ⚠高中/初高衔接 标注
//  I1 老师端接口路径根字段必须存在于 schema
//  D1 docs 版本号与 package.json 一致；docs 中 SKILL 名称与目录一致
//  A1 含"示例题"的 references 必须有"示例题验算：YYYY-MM-DD"声明（警告）
//  Z1 正文与契约不得含零宽/方向控制/BOM 等不可见字符（组合 emoji 请换单码位）——扫描器把它们当作元数据投毒信号
//  A2 验算日期不得早于文件最后一次实质提交（git；纯升版提交不算）
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// ---------- git helpers（A2 用；git 不可用时降级为跳过） ----------
import { execFileSync } from "node:child_process";
let gitOk = true;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
function gitDirty(file) {
  try {
    const out = execFileSync("git", ["-c", "safe.directory=" + root.replaceAll(String.fromCharCode(92), "/"), "status", "--porcelain", "--", file], { cwd: root, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
    return out.trim().length > 0;
  } catch { return false; }
}
function gitLog(file) {
  try {
    const out = execFileSync("git", ["-c", "safe.directory=" + root.replaceAll(String.fromCharCode(92), "/"), "log", "--format=%ad|%s", "--date=short", "--", file], { cwd: root, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
    return out.trim().split(String.fromCharCode(10)).filter(Boolean).map((l) => { const i = l.indexOf("|"); return { date: l.slice(0, i), subject: l.slice(i + 1) }; });
  } catch { gitOk = false; return []; }
}

const warnOnly = process.argv.includes("--warn-only");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
const REPO_VERSION = pkg.version;
const errors = [], warnings = [];
const err = (code, file, msg) => errors.push(`[${code}] ${file}: ${msg}`);
const warn = (code, file, msg) => warnings.push(`[${code}] ${file}: ${msg}`);
const rel = (p) => relative(root, p).replace(/\\/g, "/");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if ([".git", "node_modules", ".claude", "tools"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc); else acc.push(p);
  }
  return acc;
}
const allFiles = walk(root);
const skillFiles = allFiles.filter((f) => basename(f) === "SKILL.md");
const refFiles = allFiles.filter((f) => /[\\/]references[\\/]/.test(f) && f.endsWith(".md"));
// ---------- Z1 不可见字符 ----------
const INVISIBLE = /[\u200B-\u200F\u2028-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u00AD\u180E\u034F]/g;
for (const f of allFiles.filter((f) => /\.(md|json|ya?ml|txt)$/.test(f))) {
  const hits = [...readFileSync(f, "utf-8").matchAll(INVISIBLE)];
  if (!hits.length) continue;
  const cps = [...new Set(hits.map((m) => "U+" + m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0")))];
  err("Z1", rel(f), `含不可见字符 ${cps.join(" ")}（${hits.length} 处）——组合 emoji 换成单码位，正文不得有零宽字符`);
}


// ---------- minimal YAML frontmatter parser ----------
function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0].trim() !== "---") return null;
  const fm = {}; let i = 1;
  while (i < lines.length && lines[i].trim() !== "---") {
    const m = lines[i].match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!m) { i++; continue; }
    const [, key, raw] = m; let val = raw.trim();
    if (val === ">" || val === "|" || val === ">-" || val === "|-") {
      const buf = []; i++;
      while (i < lines.length && (lines[i].startsWith("  ") || lines[i].trim() === "") && lines[i].trim() !== "---") { buf.push(lines[i].trim()); i++; }
      fm[key] = buf.join(val.startsWith(">") ? "" : "\n"); continue;
    }
    if (val === "" && key === "metadata") { // nested map（Agent Skills 官方的自定义字段容器）
      const md = {}; i++;
      while (i < lines.length && /^  \S/.test(lines[i])) {
        const mm = lines[i].match(/^  ([A-Za-z_][\w-]*):\s*(.*)$/);
        if (!mm) { i++; continue; }
        const k2 = mm[1]; const v2 = mm[2].trim();
        if (v2 === "") { const l2 = []; i++; while (i < lines.length && /^    -\s+/.test(lines[i])) { l2.push(lines[i].replace(/^\s+-\s+/, "").trim()); i++; } md[k2] = l2; continue; }
        if (v2.startsWith("[") && v2.endsWith("]")) md[k2] = v2.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
        else md[k2] = v2.replace(/^["']|["']$/g, "");
        i++;
      }
      fm.metadata = md; continue;
    }
    if (val === "") { // block list
      const list = []; i++;
      while (i < lines.length && /^\s+-\s+/.test(lines[i])) { list.push(lines[i].replace(/^\s+-\s+/, "").trim()); i++; }
      fm[key] = list; continue;
    }
    if (val.startsWith("[") && val.endsWith("]")) fm[key] = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    else fm[key] = val.replace(/^["']|["']$/g, "");
    i++;
  }
  const body = lines.slice(i + 1).join("\n");
  return { fm, body };
}

const GRADE_BANDS = ["小学低段", "小学中段", "小学高段", "初中", "高中"];
const TOP_KEYS = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools", "id", "min_platform_version", "max_round_limit"]);
const HARD_WORDS = /务必调用|必须激活|必须调用|凡是涉及|总是激活|始终激活/;
const MARKETING = /覆盖.{0,6}\d{2}%.{0,4}场景|十倍|100%|基于艾宾浩斯|普通AI对话基于/;
const AUTO_WORDS = /自动触发|自动写入|自动推送|自动预扣|自动确认|自动存入|静默检查|自动唤醒|自动检索|后台自动/;
const DEPRECATED_VOCAB = [
  "概念理解错误", "审题习惯问题", "策略选择错误", "计算/操作失误",
  "已攻克（待验证）", "已攻克（待巩固）", "粗心大意",
];
const OLD_COORD = /三SKILL联动协调器|五SKILL联动协调器|五SKILL协调器|三SKILL协调器|SKILL联动协调器/;
const MEMORY_WORDS = /跨会话|长期档案|长期记忆|持久记忆|档案|DNA|履历|定时提醒|主动推送|月报|周报/;
const EMOTION_WORDS = /焦虑|情绪|放弃|挫败|不想学|我太差|熔断|家长看板|家长摘要|家长简报|家庭版/;
const HS_TERMS = [
  "动量守恒", "动能定理", "正交分解", "玻意耳", "内阻", "闭合电路欧姆", "洛伦兹", "电场强度", "万有引力", "简谐", "单摆",
  "平抛", "向心力", "等比数列", "等差数列", "条件概率", "射影定理", "切割线定理", "三角函数的图像", "函数零点",
  "AWL", "学术词表", "定语从句的非限制", "虚拟语气", "倒装句（部分倒装）", "《赤壁赋》", "《将进酒》", "《登高》", "《念奴娇》", "《归园田居》", "《阿房宫赋》", "《兰亭集序》",
];
const HS_OK = /⚠高中|⚠️高中|初高衔接|高中拓展|高中内容|【高中】|高中必修|高中选修|（高中）|\(高中\)|非课标|已删|不在课标/;

// ---------- F1/F2/F3 frontmatter & body ----------
const skills = new Map();
for (const f of skillFiles) {
  const dir = basename(dirname(f));
  const text = readFileSync(f, "utf-8");
  const parsed = parseFrontmatter(text);
  if (!parsed) { err("F1", rel(f), "无 frontmatter"); continue; }
  const { fm, body } = parsed;
  skills.set(dir, { fm, body, file: f, text });
  if (fm.name !== dir) err("F1", rel(f), `name(${fm.name}) ≠ 目录名(${dir})`);
  // 顶层只允许 Agent Skills 官方字段 + 平台加载字段（shared/platform-conventions.md §六）；本库自有字段一律放 metadata
  for (const k of Object.keys(fm)) if (!TOP_KEYS.has(k)) err("F1", rel(f), `非官方顶层字段 ${k}，应放入 metadata`);
  const md = fm.metadata || {};
  if (!fm.metadata) err("F1", rel(f), "缺 metadata 块");
  if (!fm.license) err("F1", rel(f), "缺 license");
  for (const k of ["display_name", "version", "author", "category", "grade_bands", "tags"]) if (md[k] === undefined) err("F1", rel(f), `metadata 缺 ${k}`);
  if (md.version !== REPO_VERSION) err("F1", rel(f), `metadata.version=${md.version}，应为 ${REPO_VERSION}`);
  if (md.depends_on !== undefined && !Array.isArray(md.depends_on)) err("F1", rel(f), "metadata.depends_on 必须是 YAML 列表");
  if (!md.grade_bands) err("F1", rel(f), "缺 metadata.grade_bands");
  else if (!Array.isArray(md.grade_bands) || md.grade_bands.some((g) => !GRADE_BANDS.includes(g))) err("F1", rel(f), `grade_bands 非法：${JSON.stringify(md.grade_bands)}`);
  const desc = fm.description || "";
  if (HARD_WORDS.test(desc)) err("F3", rel(f), "description 含硬命令词（务必调用/必须激活/凡是涉及…）");
  if (MARKETING.test(desc)) err("F3", rel(f), "description 含营销/伪精确表述");
  if (desc.length > 400) warn("F3", rel(f), `description 过长（${desc.length} 字）`);
  const autoLines = body.split("\n").filter((l) => AUTO_WORDS.test(l) && !/禁止|不得|❌|避免|不是|不做|而非|替代|不能|不会|并非|并不|不主动|边界|不自动/.test(l));
  if (autoLines.length) err("F3", rel(f), `正文含自动触发类措辞（${autoLines.length} 处），如：${autoLines[0].trim().slice(0, 60)}`);
}
// depends_on exist + cycles
const graph = new Map();
for (const [name, s] of skills) {
  const deps = Array.isArray(s.fm.metadata?.depends_on) ? s.fm.metadata.depends_on : [];
  graph.set(name, deps);
  for (const d of deps) if (!skills.has(d)) err("F1", rel(s.file), `depends_on 指向不存在的 SKILL：${d}`);
}
{
  const state = new Map(); const stack = [];
  const dfs = (n) => {
    state.set(n, 1); stack.push(n);
    for (const d of graph.get(n) || []) {
      if (!graph.has(d)) continue;
      if (state.get(d) === 1) { err("F2", n, `depends_on 成环：${[...stack.slice(stack.indexOf(d)), d].join(" → ")}`); continue; }
      if (!state.get(d)) dfs(d);
    }
    stack.pop(); state.set(n, 2);
  };
  for (const n of graph.keys()) if (!state.get(n)) dfs(n);
}

// ---------- R1/R2 references ----------
const norm = (t) => t.replace(/\s+/g, " ").replace(/[#>*`_\-|]/g, "").trim();
const seen = new Map();
for (const f of refFiles) {
  const text = readFileSync(f, "utf-8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).length;
  if (lines < 15 || /待补充/.test(text)) err("R1", rel(f), `疑似占位文件（${lines} 行${/待补充/.test(text) ? "，含“待补充”" : ""}）`);
  const key = norm(text);
  if (key.length > 400) {
    if (seen.has(key)) err("R2", rel(f), `与 ${seen.get(key)} 内容完全重复（下沉应移动而非复制）`);
    else seen.set(key, rel(f));
  }
  // A1
  if (/示例题|例题|样板题/.test(text) && /^\s*(\d+[.、)]|例\s*\d|题目[:：])/m.test(text) && !/示例题验算[:：]\s*\d{4}-\d{2}-\d{2}/.test(text)) warn("A1", rel(f), "含示例题但无“示例题验算：YYYY-MM-DD”声明（shared/ai-item-check.md §3）");
  // A2：验算日期不得早于文件最后一次实质提交（纯升版提交不算）——否则"验算日期"只是装饰
  const decl = text.match(/示例题验算[:：]\s*(\d{4}-\d{2}-\d{2})/);
  if (decl && gitOk) {
    const logs = gitLog(f);
    const later = logs.filter((l) => l.date > decl[1] && !/升版|版本号|全库升版|bump/i.test(l.subject));
    if (later.length) err("A2", rel(f), `示例题验算声明为 ${decl[1]}，但此后有 ${later.length} 次实质改动（最近 ${later[0].date}），请逐题重新验算并更新日期`);
    else if (gitDirty(f) && decl[1] < today()) err("A2", rel(f), `示例题验算声明为 ${decl[1]}，但文件有未提交改动，请验算后把日期更新为今天`);
  }
}

// ---------- V1/V2/P1/S1/G1 content scans ----------
const contentFiles = [...skillFiles, ...refFiles];
for (const f of contentFiles) {
  const text = readFileSync(f, "utf-8");
  const lines = text.split(/\r?\n/);
  const isSkill = basename(f) === "SKILL.md";
  const isShared = rel(f).startsWith("shared/");
  if (isShared) continue;
  for (const w of DEPRECATED_VOCAB) {
    const idx = lines.findIndex((l) => l.includes(w) && !/废弃|已废弃|旧词|映射|→|禁止|不使用|原“|原"/.test(l));
    if (idx >= 0) err("V1", rel(f) + ":" + (idx + 1), `使用废弃词表“${w}”（见 shared/vocab.md）`);
  }
  const ci = lines.findIndex((l) => OLD_COORD.test(l));
  if (ci >= 0) err("V2", rel(f) + ":" + (ci + 1), "协调器旧名称，应为“学习系统协调器”");
  lines.forEach((l, i) => {
    for (const t of HS_TERMS) if (l.includes(t) && !HS_OK.test(l)) { err("G1", rel(f) + ":" + (i + 1), `高中/超纲术语“${t}”未标注 ⚠高中`); break; }
    if (/(?<![引指领教辅向传半倒诱疏])导数/.test(l) && !HS_OK.test(l)) err("G1", rel(f) + ":" + (i + 1), "高中/超纲术语“导数”未标注 ⚠高中");
  });
  if (isSkill) {
    const needsMemory = MEMORY_WORDS.test(text);
    if (needsMemory) {
      if (!/shared\/platform-conventions\.md/.test(text)) err("P1", rel(f), "依赖持久记忆/提醒/档案，但未引用 shared/platform-conventions.md");
      if (!/查看我的/.test(text) || !/删除我的/.test(text)) err("P1", rel(f), "缺控制入口（查看我的… / 删除我的…）");
    }
    if (EMOTION_WORDS.test(text) && !/shared\/crisis-exception\.md|crisis-referral-protocol\.md/.test(text)) err("S1", rel(f), "涉及情绪/焦虑/家长输出，但未引用 shared/crisis-exception.md");
    if (/出题|生成.{0,4}题|同类题|变式题|纯净版/.test(text) && !/shared\/ai-item-check\.md/.test(text)) err("A1", rel(f), "会生成题目，但未引用 shared/ai-item-check.md");
    if (/不给答案|不给完整|永远不.{0,8}(?:答案|讲解|解题|讲题)|绝不.{0,6}答案|不直接给/.test(text) && !/shared\/hint-ladder\.md/.test(text)) err("H1", rel(f), "含“不给答案”类铁律，但未引用 shared/hint-ladder.md（提示阶梯与出口）");
  }
}

// ---------- I1 teacher interface paths ----------
const schemaRoots = new Set();
for (const sp of ["teacher/independent/schemas/solo-teacher-workspace.schema.json", "teacher/general/schemas/class-teaching-workspace.schema.json", "student/general/xiaozhi-learning-dna/schemas/dna-profile.schema.json"]) {
  const s = JSON.parse(readFileSync(join(root, sp), "utf-8"));
  for (const k of Object.keys(s.properties || {})) schemaRoots.add(k);
  for (const k of Object.keys(s.$defs || {})) schemaRoots.add(k);
}
for (const [name, s] of skills) {
  if (!name.startsWith("xiaozhi-teach-")) continue;
  const lines = s.body.split("\n");
  let inSection = false, inCode = false;
  lines.forEach((l, i) => {
    if (/^#{2,3}\s/.test(l)) inSection = /接口|契约|数据流|读写|输入输出|与.*协作|协同/.test(l);
    if (/^```/.test(l)) { inCode = !inCode; return; }
    if (!inSection) return;
    const ms = l.matchAll(/\b([a-z][A-Za-z]+)\.([A-Za-z]+)(?:\.[A-Za-z]+)*/g);
    for (const m of ms) {
      const rootKey = m[1];
      if (["e", "i", "vs", "www", "node", "npm", "schema", "shared", "ref", "refs", "workspace", "classWorkspace", "dna"].includes(rootKey)) continue;
      if (/\.(md|json|js|mjs)\b/.test(m[0])) continue;
      if (!schemaRoots.has(rootKey)) err("I1", rel(s.file) + ":" + (i + 1), `接口路径根字段“${rootKey}”不在任何 schema 中（${m[0]}）`);
    }
  });
}

// ---------- D1 docs ----------
const toolSkills = new Set(existsSync(join(root, "tools")) ? readdirSync(join(root, "tools")).filter((d) => existsSync(join(root, "tools", d, "SKILL.md"))) : []);
for (const d of ["README.md", "docs/architecture.md", "docs/changelog.md", "docs/installation-guide.md"]) {
  const p = join(root, d); if (!existsSync(p)) continue;
  const text = readFileSync(p, "utf-8");
  // 只校验"当前版本"声明；schema 版本、历史版本小节、协议版本不参与
  const claimLines = text.split(String.fromCharCode(10)).filter((l) => /当前版本|Current version/i.test(l));
  const claimed = [...new Set(claimLines.flatMap((l) => [...l.matchAll(/v?(\d+\.\d+(?:\.\d+)?)/g)].map((m) => m[1])))];
  const badVers = claimed.filter((v) => v !== REPO_VERSION && v !== REPO_VERSION.split(".").slice(0, 2).join("."));
  if (badVers.length) err("D1", d, `“当前版本”声明为 ${badVers.join(", ")}，应为 ${REPO_VERSION}`);
  if (!claimLines.length && /^#\s/m.test(text) && d !== "docs/review-2026-09.md") warn("D1", d, "未声明当前版本");
  if (OLD_COORD.test(text)) err("V2", d, "协调器旧名称");
  for (const m of text.matchAll(/xiaozhi-[a-z0-9-]+/g)) if (!skills.has(m[0]) && !toolSkills.has(m[0]) && !/^xiaozhi-skills$/.test(m[0])) err("D1", d, `提到不存在的 SKILL：${m[0]}`);
  if (/演化观|五大物理观念/.test(text)) err("D1", d, "仍写“五大物理观念/演化观”，应为四大核心素养");
}

// ---------- report ----------
const uniq = (a) => [...new Set(a)];
const E = uniq(errors), W = uniq(warnings);
const byCode = (arr) => { const m = {}; for (const x of arr) { const c = x.slice(1, x.indexOf("]")); m[c] = (m[c] || 0) + 1; } return m; };
if (W.length) { console.log(`\n⚠️ 警告（${W.length}）：`); for (const w of W) console.log("   " + w); }
if (E.length) {
  console.error(`\n❌ 错误（${E.length}）：`); for (const e of E) console.error("   " + e);
  console.error("\n按类别：", JSON.stringify(byCode(E)));
  if (!warnOnly) process.exit(1);
}
console.log(`\n${E.length ? "⚠️ 以警告模式结束" : "✅ 内容级校验通过"}：${skills.size} 个 SKILL，${refFiles.length} 份 references。`);

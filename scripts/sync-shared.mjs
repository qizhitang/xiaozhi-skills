#!/usr/bin/env node
// 把仓库根 shared/ 的六份共享约定同步进每个 SKILL 目录，使单个技能包自包含。
//
// 为什么需要：SKILL 正文用 `shared/vocab.md` 这类路径引用共享约定。整库使用时相对仓库根
// 可解析；但从技能市场按单个技能安装后，技能被放到 <skills 目录>/<技能名>/，此时只有
// 技能目录内的 shared/ 才能解析到。两处都存在时，两种用法都成立。
//
// 用法：
//   node scripts/sync-shared.mjs          写入/更新副本
//   node scripts/sync-shared.mjs --check  只校验是否与源一致（CI 用，不写文件）
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sharedDir = join(root, "shared");
const checkOnly = process.argv.includes("--check");

const BANNER =
  "<!-- 本文件由 scripts/sync-shared.mjs 从仓库根 shared/ 自动生成，用于让单个技能包自包含。\n" +
  "     请勿直接编辑；需要修改请改仓库根目录下的同名文件，然后运行 npm run sync:shared -->\n\n";

// 一、全库共享约定：仓库根 shared/*.md，分发到每个 SKILL
const sources = readdirSync(sharedDir)
  .filter((f) => f.endsWith(".md"))
  .sort()
  .map((f) => ({ name: f, body: readFileSync(join(sharedDir, f), "utf-8") }));

if (!sources.length) {
  console.error("❌ 仓库根 shared/ 下没有 .md 文件");
  process.exit(1);
}

// 二、跨技能契约：源文件留在归属技能内，只分发给正文引用它的技能（归属技能自己不复制）。
// 新增一项只需在此加一行，并把 SKILL.md 里的引用写成 shared/<as>。
const CONTRACTS = [
  {
    as: "handover-protocol.schema.json",
    src: "student/general/xiaozhi-skill-coordinator/schemas/handover-protocol.schema.json",
    owner: "xiaozhi-skill-coordinator",
  },
  {
    as: "dna-profile.schema.json",
    src: "student/general/xiaozhi-learning-dna/schemas/dna-profile.schema.json",
    owner: "xiaozhi-learning-dna",
  },
  {
    as: "english-error-dimension-table.md",
    src: "student/english/xiaozhi-english-grammar-coach/references/english-error-dimension-table.md",
    owner: "xiaozhi-english-grammar-coach",
  },
  {
    as: "chinese-error-dimension-table.md",
    src: "student/chinese/xiaozhi-chinese-reading-decoder/references/chinese-error-dimension-table.md",
    owner: "xiaozhi-chinese-reading-decoder",
  },
  {
    as: "physics-diagram-guide.md",
    src: "student/physics/xiaozhi-physics-problem-coach/references/physics-diagram-guide.md",
    owner: "xiaozhi-physics-problem-coach",
  },
  {
    as: "ebbinghaus-schedule.md",
    src: "student/general/xiaozhi-im-reminder/references/ebbinghaus-schedule.md",
    owner: "xiaozhi-im-reminder",
  },
  {
    as: "cross-subject-connections.md",
    src: "student/general/xiaozhi-learning-dna/references/cross-subject-connections.md",
    owner: "xiaozhi-learning-dna",
  },
  {
    as: "experiment-types.md",
    src: "teacher/physics/xiaozhi-teach-physics-experiment-coach/references/experiment-types.md",
    owner: "xiaozhi-teach-physics-experiment-coach",
  },
  {
    as: "class-teaching-workspace.schema.json",
    src: "teacher/general/schemas/class-teaching-workspace.schema.json",
    toDirs: ["teacher/general", "teacher/math", "teacher/physics", "teacher/chinese", "teacher/english"],
    owner: null, // 包级 schema，不归属某个技能
  },
  {
    as: "solo-teacher-workspace.schema.json",
    src: "teacher/independent/schemas/solo-teacher-workspace.schema.json",
    toDirs: ["teacher/independent"],
    owner: null, // 包级 schema，不归属某个技能
  },
  {
    as: "wrong-answer-handover.example.json",
    src: "student/general/xiaozhi-skill-coordinator/schemas/examples/wrong-answer-handover.example.json",
    owner: "xiaozhi-skill-coordinator",
  },
  {
    as: "reminder-enqueue.example.json",
    src: "student/general/xiaozhi-skill-coordinator/schemas/examples/reminder-enqueue.example.json",
    owner: "xiaozhi-skill-coordinator",
  },
  {
    as: "deep-analysis-writeback.example.json",
    src: "student/general/xiaozhi-skill-coordinator/schemas/examples/deep-analysis-writeback.example.json",
    owner: "xiaozhi-skill-coordinator",
  },
  {
    // shared/crisis-exception.md 在每个包里都指向它，所以发给全部技能（含归属技能）
    as: "crisis-referral-protocol.md",
    src: "student/general/xiaozhi-learning-dna/references/crisis-referral-protocol.md",
    owner: null,
    toAll: true,
  },
].map((c) => {
  const p = join(root, c.src);
  if (!existsSync(p)) { console.error(`❌ 契约源文件不存在：${c.src}`); process.exit(1); }
  return { ...c, body: readFileSync(p, "utf-8") };
});

// 收集全部 SKILL 目录
function findSkillDirs(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if ([".git", "node_modules", ".claude", "docs", "scripts", "shared"].includes(name)) continue;
    const p = join(dir, name);
    if (!statSync(p).isDirectory()) continue;
    if (existsSync(join(p, "SKILL.md"))) acc.push(p);
    else findSkillDirs(p, acc);
  }
  return acc;
}
const skillDirs = findSkillDirs(root).sort();

const rel = (p) => relative(root, p).replace(/\\/g, "/");
// 比较时统一行尾：git 的 autocrlf 会在检出时把 LF 转成 CRLF，
// 逐字节比较会在 Windows 上误报“与源不一致”。
const norm = (s) => s.split(String.fromCharCode(13)).join("");
// schema 副本按目标技能裁剪 + 标注范围。扫描器把随包 schema 当成该技能自己的数据契约，
// 所以副本只保留该技能正文里“非否定语境”提到的字段子树，其余删掉；并在头部写明范围与出处。
// 判定“否定语境”：同一行里字段名之前出现 不读/不写/❌/不碰/… ；
// 行尾是 、：, 的列表会把否定状态带到下一行（“❌ 不读：a（…）、↵ b、c”）。
const NEG = /不读|不写|不碰|不含|不做|不看|不改|不据此|不得|不进入|不用于|不可见|不发|不生成|不接收|不主动|❌|排除|白名单以外|以外的/;
function mentioned(skillText, key) {
  const lines = skillText.split(String.fromCharCode(10));
  const re = new RegExp(String.fromCharCode(92) + "b" + key.replace(/[.$]/g, (c) => String.fromCharCode(92) + c) + String.fromCharCode(92) + "b");
  let carry = false;
  for (const raw of lines) {
    const line = raw.trim();
    const cont = carry && /^[\s·\-•→]*/.test(raw) && !/^#|^\|/.test(line);
    const m = re.exec(line);
    if (m) {
      const before = line.slice(0, m.index);
      const owned = /(→|->|—>)\s*.*(由|归|交给|交).*(维护|负责|唯一写入|写入)|不在本 SKILL|本 SKILL 不/.test(line);
      const negHere = owned || NEG.test(before) || (cont && !/(?<!不)(读|写|访问|使用)/.test(before));
      if (!negHere) return true;
    }
    carry = (NEG.test(line) || cont) && /[、：:,，]\s*$/.test(line);
  }
  return false;
}
function scopeJson(name, body, skillName, skillText) {
  let obj;
  try { obj = JSON.parse(body); } catch { return body; }
  const props = obj.properties || {};
  const top = Object.keys(props);
  const keep = new Set(), paths = [];
  const isDna = /dna-profile/.test(name);
  for (const k of top) {
    if (isDna && (k === "subjectExtensions" || k === "extensions") && props[k] && props[k].properties) {
      const subs = Object.keys(props[k].properties).filter((s) => mentioned(skillText, k + "." + s));
      if (subs.length) { keep.add(k); subs.forEach((s) => paths.push(k + "." + s)); props[k] = { ...props[k], properties: Object.fromEntries(subs.map((s) => [s, props[k].properties[s]])) }; }
      continue;
    }
    if (mentioned(skillText, k)) { keep.add(k); paths.push(k); }
  }
  // 交接协议：按正文提到的交接类型裁剪枚举与 if/then
  let kinds = null;
  if (/handover-protocol/.test(name)) {
    const enumAll = (((props.handoverType || {}).enum) || []);
    kinds = enumAll.filter((k) => mentioned(skillText, k));
    for (const k of ["sessionId", "protocolVersion", "handoverType", "sender", "recipient", "payload", "timestamp", "consent"]) if (k in props) keep.add(k);
    if (kinds.length) {
      props.handoverType = { ...props.handoverType, enum: kinds };
      // if 有 const 也有 enum 两种写法：任一保留类型命中就留下这条 if/then
      const kindsOf = (c) => { const h = c && c.if && c.if.properties && c.if.properties.handoverType; if (!h) return null; if (h.const) return [h.const]; if (Array.isArray(h.enum)) return h.enum; return null; };
      if (Array.isArray(obj.allOf)) obj.allOf = obj.allOf.filter((c) => { const ks = kindsOf(c); return !ks || ks.some((k) => kinds.includes(k)); });
      // payload 只留保留类型 then.required 到的分支
      const needed = new Set();
      for (const c of obj.allOf || []) { const req = c && c.then && c.then.properties && c.then.properties.payload && c.then.properties.payload.required; if (Array.isArray(req)) req.forEach((r) => needed.add(r)); }
      if (props.payload && props.payload.properties && needed.size) props.payload = { ...props.payload, properties: Object.fromEntries(Object.entries(props.payload.properties).filter(([k]) => needed.has(k))) };
      // sender 就是本技能；recipient 只留正文（非否定语境）提到的技能，一个都没提到就保留全表
      if (props.sender && Array.isArray(props.sender.enum) && props.sender.enum.includes(skillName)) props.sender = { ...props.sender, enum: [skillName] };
      if (props.recipient && Array.isArray(props.recipient.enum)) { const rs = props.recipient.enum.filter((r) => r !== skillName && mentioned(skillText, r)); if (rs.length) props.recipient = { ...props.recipient, enum: rs }; }
    }
  }
  const pruned = Object.fromEntries(Object.entries(props).filter(([k]) => keep.has(k)));
  const droppedN = top.length - Object.keys(pruned).length;
  const scopeList = kinds ? kinds : paths.sort();
  const note = scopeList.length
    ? `本副本随 ${skillName} 分发，已按其 SKILL.md 裁剪：只保留正文在非否定语境下提到的${kinds ? "交接类型" : "字段"}（共 ${scopeList.length} 项，删去 ${droppedN} 个顶层字段）。完整定义在归属技能处。读/写权限与授权位以 SKILL.md 为准。`
    : `本副本随 ${skillName} 分发。该技能正文没有在非否定语境下提到本 schema 的任何字段——它不直接读写这份数据，副本仅为交接契约的类型参照；已删去全部 ${droppedN} 个数据字段。`;
  const head = {};
  for (const k of ["$schema", "$id", "title"]) if (k in obj) head[k] = obj[k];
  head["x-distributed-to"] = skillName;
  head["x-skill-scope"] = { note, paths: scopeList };
  for (const [k, v] of Object.entries(obj)) if (!(k in head)) head[k] = (k === "properties") ? pruned : (k === "required" && Array.isArray(v)) ? v.filter((r) => keep.has(r)) : v;
  return JSON.stringify(head, null, 2) + String.fromCharCode(10);
}

let written = 0, stale = [], extra = [];

let contractCopies = 0;

for (const dir of skillDirs) {
  const target = join(dir, "shared");
  const skillName = dir.split(/[\\/]/).pop();
  const skillText = readFileSync(join(dir, "SKILL.md"), "utf-8");

  // 本技能需要的文件 = 全库共享约定 + 正文引用到的跨技能契约
  const wanted = [...sources.map((s) => ({ name: s.name, body: s.body }))];
  for (const c of CONTRACTS) {
    if (!c.toAll) {
      if (c.owner === skillName) continue;               // 归属技能用自己的原件
      // 按目录分发的（老师端工作空间 schema）：该目录下的技能都读写工作空间，不看正文有没有写 shared/ 前缀
      const inDirs = c.toDirs && c.toDirs.some((d) => rel(dir).startsWith(d + "/"));
      if (!inDirs && !skillText.includes(`shared/${c.as}`)) continue; // 没引用就不塞进包里
    }
    wanted.push({ name: c.as, body: c.body });
    contractCopies++;
  }

  if (!checkOnly && !existsSync(target)) mkdirSync(target, { recursive: true });

  for (const { name, body } of wanted) {
    const dest = join(target, name);
    // JSON 不能带 HTML 注释横幅，逐字节复制；Markdown 加"请勿编辑"横幅
    const want = name.endsWith(".schema.json") ? scopeJson(name, body, skillName, skillText) : name.endsWith(".json") ? body : BANNER + body;
    const cur = existsSync(dest) ? readFileSync(dest, "utf-8") : null;
    if (cur !== null && norm(cur) === norm(want)) continue;
    if (checkOnly) stale.push(`${rel(dest)}${cur === null ? "（缺失）" : "（与源不一致）"}`);
    else { writeFileSync(dest, want, "utf-8"); written++; }
  }

  // 清理不该在这里的文件（源已删除，或正文已不再引用）
  if (existsSync(target)) {
    const allowed = new Set(wanted.map((w) => w.name));
    for (const f of readdirSync(target)) {
      if (allowed.has(f)) continue;
      if (checkOnly) extra.push(rel(join(target, f)));
      else { rmSync(join(target, f)); written++; }
    }
  }
}

if (checkOnly) {
  if (stale.length || extra.length) {
    if (stale.length) {
      console.error(`\n❌ 技能内 shared/ 副本未同步（${stale.length}）：`);
      for (const s of stale.slice(0, 20)) console.error("   " + s);
      if (stale.length > 20) console.error(`   …另有 ${stale.length - 20} 条`);
    }
    if (extra.length) {
      console.error(`\n❌ 技能内 shared/ 存在源中已无的文件（${extra.length}）：`);
      for (const s of extra.slice(0, 20)) console.error("   " + s);
    }
    console.error("\n请运行 npm run sync:shared 后重新提交。\n");
    process.exit(1);
  }
  console.log(`✅ 共享约定副本一致：${skillDirs.length} 个 SKILL × ${sources.length} 份共享约定 + ${contractCopies} 份跨技能契约副本`);
} else {
  console.log(`✅ 已同步：${skillDirs.length} 个 SKILL × ${sources.length} 份共享约定 + ${contractCopies} 份跨技能契约副本，写入/更新 ${written} 个文件`);
}

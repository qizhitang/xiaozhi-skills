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
// schema 副本按目标技能标注可读写范围（JSON Schema 忽略 x- 开头的键）。
// 依据：SKILL.md 正文里实际出现的顶层字段名 / subjectExtensions.x / extensions.x / 交接类型名。
function scopeJson(name, body, skillName, skillText) {
  let obj;
  try { obj = JSON.parse(body); } catch { return body; }
  const found = new Set();
  const top = Object.keys(obj.properties || {});
  for (const k of top) if (new RegExp(String.fromCharCode(92) + "b" + k + String.fromCharCode(92) + "b").test(skillText)) found.add(k);
  for (const parent of ["subjectExtensions", "extensions"]) {
    const sub = obj.properties && obj.properties[parent] && obj.properties[parent].properties;
    if (sub) for (const k of Object.keys(sub)) if (skillText.includes(parent + "." + k)) { found.add(parent + "." + k); found.delete(parent); }
  }
  if (/handover-protocol/.test(name)) for (const m of skillText.matchAll(new RegExp(String.fromCharCode(92) + "b" + "[a-z]+(?:_[a-z]+)*_(?:handover|writeback|enqueue)" + String.fromCharCode(92) + "b", "g"))) found.add(m[0]);
  const paths = [...found].sort();
  const note = paths.length
    ? `本副本随 ${skillName} 分发，仅供字段名参照。下列路径是该技能 SKILL.md 接口节提到的字段；哪些只读、哪些可写、要过哪个授权位，以 SKILL.md 为准。未列出的字段对它不可见、不可写。`
    : `本副本随 ${skillName} 分发，仅供字段名参照。该技能不直接读写本 schema 定义的数据；要交换数据一律经 handover 且先过授权位。`;
  const head = {};
  for (const k of ["$schema", "$id", "title"]) if (k in obj) head[k] = obj[k];
  head["x-distributed-to"] = skillName;
  head["x-skill-scope"] = { note, paths };
  for (const [k, v] of Object.entries(obj)) if (!(k in head)) head[k] = v;
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

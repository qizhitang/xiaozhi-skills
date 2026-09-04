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
    owner: null, // 包级 schema，不归属某个技能
  },
  {
    as: "solo-teacher-workspace.schema.json",
    src: "teacher/independent/schemas/solo-teacher-workspace.schema.json",
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
      if (!skillText.includes(`shared/${c.as}`)) continue; // 没引用就不塞进包里
    }
    wanted.push({ name: c.as, body: c.body });
    contractCopies++;
  }

  if (!checkOnly && !existsSync(target)) mkdirSync(target, { recursive: true });

  for (const { name, body } of wanted) {
    const dest = join(target, name);
    // JSON 不能带 HTML 注释横幅，逐字节复制；Markdown 加"请勿编辑"横幅
    const want = name.endsWith(".json") ? body : BANNER + body;
    const cur = existsSync(dest) ? readFileSync(dest, "utf-8") : null;
    if (cur === want) continue;
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

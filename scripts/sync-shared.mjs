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

const sources = readdirSync(sharedDir)
  .filter((f) => f.endsWith(".md"))
  .sort()
  .map((f) => ({ name: f, body: readFileSync(join(sharedDir, f), "utf-8") }));

if (!sources.length) {
  console.error("❌ 仓库根 shared/ 下没有 .md 文件");
  process.exit(1);
}

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

for (const dir of skillDirs) {
  const target = join(dir, "shared");
  if (!checkOnly && !existsSync(target)) mkdirSync(target, { recursive: true });

  for (const { name, body } of sources) {
    const dest = join(target, name);
    const want = BANNER + body;
    const cur = existsSync(dest) ? readFileSync(dest, "utf-8") : null;
    if (cur === want) continue;
    if (checkOnly) stale.push(`${rel(dest)}${cur === null ? "（缺失）" : "（与源不一致）"}`);
    else { writeFileSync(dest, want, "utf-8"); written++; }
  }

  // 清理源里已删除的文件
  if (existsSync(target)) {
    const allowed = new Set(sources.map((s) => s.name));
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
  console.log(`✅ 共享约定副本一致：${skillDirs.length} 个 SKILL × ${sources.length} 份（${sources.map((s) => s.name).join(", ")}）`);
} else {
  console.log(`✅ 已同步：${skillDirs.length} 个 SKILL × ${sources.length} 份共享约定，写入/更新 ${written} 个文件`);
}

#!/usr/bin/env node
// 引用完整性校验：确保每个 SKILL.md/SKILL.lite.md 引用的 references/schemas 文件真实存在，
// 且每个 references/ 目录下的文件都被其 SKILL 引用（无孤儿）。
// 用法：node scripts/check-references.mjs   （CI 中作为门禁，发现问题以非 0 退出）
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// 递归收集所有 SKILL.md / SKILL.lite.md
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (name === "SKILL.md" || name === "SKILL.lite.md") acc.push(p);
  }
  return acc;
}

// 从正文中提取 references/schemas 引用（支持 ../ 与跨技能路径）
const refPattern = /(?:\.\.\/)?(?:[\w-]+\/)*(?:references|schemas)\/[\w./-]+\.(?:md|json|js)/g;

const dangling = [];
const skillFiles = walk(repoRoot);
const referencedByDir = new Map(); // skillDir -> Set(引用到的 references/ 文件名)

for (const file of skillFiles) {
  const dir = dirname(file);
  const text = readFileSync(file, "utf-8");
  const matches = text.match(refPattern) || [];
  for (const m of new Set(matches)) {
    // 引用有效的判定：相对 SKILL 目录可解析，或相对仓库根可解析（后者用于 prose 中以仓库路径书写的引用）
    const ok = existsSync(resolve(dir, m)) || existsSync(resolve(repoRoot, m));
    if (!ok) {
      dangling.push({ file: relative(repoRoot, file), ref: m });
    }
    // 记录本目录 references/ 下被引用的文件名，用于孤儿检测
    const mm = m.match(/references\/([\w.-]+\.(?:md|json|js))$/);
    if (mm && !m.startsWith("..") && !m.includes("/references/../")) {
      const key = dirname(file);
      if (!referencedByDir.has(key)) referencedByDir.set(key, new Set());
      referencedByDir.get(key).add(mm[1]);
    }
  }
}

// 孤儿检测：references/ 目录里存在、但从未被同目录 SKILL.md/.lite.md 引用的文件
const orphans = [];
const skillDirs = new Set(skillFiles.map((f) => dirname(f)));
for (const dir of skillDirs) {
  const refDir = join(dir, "references");
  if (!existsSync(refDir)) continue;
  const referenced = referencedByDir.get(dir) || new Set();
  for (const name of readdirSync(refDir)) {
    if (statSync(join(refDir, name)).isFile() && !referenced.has(name)) {
      orphans.push(relative(repoRoot, join(refDir, name)));
    }
  }
}

let failed = false;
if (dangling.length) {
  failed = true;
  console.error(`\n❌ 悬空引用（${dangling.length}）——SKILL 引用了不存在的文件：`);
  for (const d of dangling) console.error(`   ${d.file}  →  ${d.ref}`);
}
if (orphans.length) {
  failed = true;
  console.error(`\n❌ 孤儿文件（${orphans.length}）——references 存在但从未被 SKILL 引用：`);
  for (const o of orphans) console.error(`   ${o}`);
}
if (failed) {
  console.error("\n引用完整性校验未通过。请修正上述引用或删除多余文件。\n");
  process.exit(1);
}
console.log(`✅ 引用完整性校验通过：${skillFiles.length} 个 SKILL 文件，无悬空引用、无孤儿文件。`);

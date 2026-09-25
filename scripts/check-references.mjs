#!/usr/bin/env node
// 引用完整性校验：确保每个 SKILL.md/SKILL.lite.md 引用的 references/schemas 文件真实存在，
// 且每个 references/ 目录下的文件都被其 SKILL 引用（无孤儿）；
// 并且 SKILL.md、references/*.md、shared/*.md、shared/*.json 与技能自带的 schemas/**/*.json 里写到的文件路径
// 都落在本技能目录内（单独安装一个技能也能解析）。
// 用法：node scripts/check-references.mjs   （CI 中作为门禁，发现问题以非 0 退出）
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// 递归收集所有 SKILL.md / SKILL.lite.md
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules" || name === ".claude") continue;   // .claude/worktrees 是其他会话的工作区
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (name === "SKILL.md" || name === "SKILL.lite.md") acc.push(p);
  }
  return acc;
}

// 从正文中提取 references/schemas 引用（支持 ../ 与跨技能路径）
const refPattern = /(?:\.\.\/)?(?:[\w-]+\/)*(?:references|schemas|shared)\/[\w./-]+\.(?:md|json|js)/g;

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

// 技能包自包含：SKILL.md、references/ 下的 .md、shared/ 下的 .md 与 .json（schema、示例的随包副本）、
// 技能自带的 schemas/ 下的 .json（学习DNA、协调器的主 schema 与示例）里写到的文件路径，必须能在本技能目录内解析到。
// 从技能市场单独安装一个技能时只有它自己的目录，指向别的技能目录或仓库路径的写法都会断；
// 上面的悬空检测允许相对仓库根解析，查不出这一类。
// 修法：该技能有随包副本的写 shared/<文件>；没有的只写技能名，不写路径。
// 解析口径：相对文件所在目录或相对技能根目录（正文惯用 `shared/vocab.md` 这种写法），任一落到本技能内的真实文件即可；
// Markdown 链接 [..](..) 只按文件所在目录解析（渲染器就是这样解析的）。路径中途跳出技能目录（../<本技能目录名>/…）也算越界。
// 不当作引用：URL 与域名开头的串（如 schema 的 $id）、仓库工具脚本 scripts/…（维护说明，不随包分发）。
const pathPattern = /(?<![\w./:@-])((?:(?:\.{1,2}|[\w-]+)\/)+[\w-]+(?:\.[\w-]+)*\.(?:md|json|js|mjs|py|ya?ml))(?![\w/-])/g;
const linkPattern = /\]\(\s*<?([^)\s>]+)>?[^)]*\)/g;
const dirEntries = new Map();
const entries = (d) => {
  if (!dirEntries.has(d)) dirEntries.set(d, existsSync(d) && statSync(d).isDirectory() ? readdirSync(d) : []);
  return dirEntries.get(d);
};
// 从 base 出发逐段走 ref：任何一步跳出 skillDir 即越界；每段按实际大小写比对（Windows 不分大小写，CI 的 Linux 分）
function resolvesInside(skillDir, base, ref) {
  const parts = relative(skillDir, base).split(sep).filter(Boolean);
  for (const seg of ref.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") { if (!parts.length) return false; parts.pop(); }
    else parts.push(seg);
  }
  let cur = skillDir;
  for (const seg of parts) {
    if (!entries(cur).includes(seg)) return false;
    cur = join(cur, seg);
  }
  return statSync(cur).isFile();
}
// node_modules（在 schemas/ 下跑校验时装的依赖，.gitignore 已忽略）与点目录不是技能内容，跳过
const filesIn = (d, ext) => existsSync(d)
  ? readdirSync(d).flatMap((n) => {
      if (n === "node_modules" || n.startsWith(".")) return [];
      const p = join(d, n);
      return statSync(p).isDirectory() ? filesIn(p, ext) : ext.test(n) ? [p] : [];
    })
  : [];
const outside = []; // { dir, file, line, ref }
let scanned = 0;
for (const dir of skillDirs) {
  const files = [join(dir, "SKILL.md"), join(dir, "SKILL.lite.md"), ...filesIn(join(dir, "references"), /\.md$/), ...filesIn(join(dir, "shared"), /\.(md|json)$/), ...filesIn(join(dir, "schemas"), /\.json$/)];
  for (const file of files.filter((f) => existsSync(f))) {
    scanned++;
    readFileSync(file, "utf-8").split(/\r?\n/).forEach((text, i) => {
      const seen = new Set();
      for (const [, target] of text.matchAll(linkPattern)) {
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) continue; // URL、mailto 等协议链接、页内锚点
        let t = target.split("#")[0];
        try { t = decodeURIComponent(t); } catch {}
        seen.add(target);
        if (!resolvesInside(dir, dirname(file), t)) outside.push({ dir, file, line: i + 1, ref: target });
      }
      for (const [, ref] of text.matchAll(pathPattern)) {
        if (seen.has(ref) || ref.startsWith("scripts/")) continue;
        seen.add(ref);
        if (!resolvesInside(dir, dirname(file), ref) && !resolvesInside(dir, dir, ref)) outside.push({ dir, file, line: i + 1, ref });
      }
    });
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
if (outside.length) {
  failed = true;
  const slash = (p) => p.replace(/\\/g, "/");
  // shared/ 下是同一份源的多个副本：同一处问题合并成一行（JSON 副本按技能裁剪过，同一句在各副本里的行号不同，所以不按行号分组）
  const lines = [], copies = new Map();
  for (const o of outside) {
    const inPkg = slash(relative(o.dir, o.file));
    if (!inPkg.startsWith("shared/")) { lines.push(`${slash(relative(repoRoot, o.file))}:${o.line}  →  ${o.ref}`); continue; }
    const key = `${inPkg}  →  ${o.ref}`;
    if (!copies.has(key)) copies.set(key, []);
    copies.get(key).push(`${slash(relative(repoRoot, o.dir))}:${o.line}`);
  }
  for (const [key, at] of copies) {
    const skills = new Set(at.map((a) => a.replace(/:\d+$/, ""))).size;
    lines.push(`[副本] ${key}（${skills} 个技能，如 ${at.slice(0, 2).join("、")}）`);
  }
  console.error(`\n❌ 越界引用（${lines.length}）——路径指向本技能目录以外，单独安装这个技能时解析不到：`);
  for (const l of lines) console.error(`   ${l}`);
  console.error("   有随包副本的改写成 shared/<文件>；没有的只写技能名、不写路径。[副本] 由 sync-shared 生成，请改源文件（JSON 副本的说明文字也可能出自 sync-shared.mjs 自身）后运行 npm run sync:shared。");
}
if (failed) {
  console.error("\n引用完整性校验未通过。请修正上述引用或删除多余文件。\n");
  process.exit(1);
}
console.log(`✅ 引用完整性校验通过：${skillFiles.length} 个 SKILL 文件，无悬空引用、无孤儿文件；${scanned} 份 SKILL.md / references / shared 文档里的路径都落在本技能目录内。`);

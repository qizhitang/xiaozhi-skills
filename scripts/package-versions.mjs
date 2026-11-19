#!/usr/bin/env node
// 技能包版本与发布清单。
//
// 三个版本号各管一件事：
//   · 发布版本：package.json 的 version，每次升版都升，README 与 docs 的“当前版本”写它；
//   · 技能包版本：每个 SKILL.md 的 metadata.version，是这个技能最后一次改动所在的发布版本（≤ 发布版本），
//     两个市场上这个技能的版本号就是它；内容没变的技能升版时不动，发布时跳过；
//   · 契约版本：package.json 的 contractVersion，档案结构与交接协议（schemaVersion / protocolVersion）的版本，
//     只在 schema 变化时升（bump_version.py --contract），不跟着每次发布走——否则每次升版都要改 72 个技能里的 schema 副本。
//
// 发布清单 scripts/snapshots/package-versions.json 记每个技能当前版本号对应的内容哈希，也就是市场上这个版本的样子。
// 内容哈希与清单对不上 = 有未发布的改动：开发中正常（只提示），升版时这些技能升到新版本；
// 发布脚本见到未发布的改动会拒绝发布——同一个版本号下不能有两份不同的内容。
//
// 用法：
//   node scripts/package-versions.mjs                  列出未发布的改动（各技能版本见 docs/skills-index.md）
//   node scripts/package-versions.mjs --check          核对清单、SKILL.md 与 package.json 一致（npm run check 用）
//   node scripts/package-versions.mjs --json           机读状态（发布脚本用）
//   node scripts/package-versions.mjs --write <新版本>  升版：有改动与新增的技能升到新版本，清单同步（bump_version.py 调用）
//   node scripts/package-versions.mjs --init           按当前内容重建清单，各技能保留 SKILL.md 里的版本号
//
// 内容哈希：技能目录里会被打包的文件（git 跟踪的与没被忽略的新文件，与 stage.py 打包的是同一批），按相对路径排序；
// 换行统一成 LF（Windows 检出是 CRLF）；SKILL.md frontmatter 里 version 那一行不计——只改版本号不算内容改动。
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join("scripts", "snapshots", "package-versions.json");
const NOTE = "各技能当前版本号与那一版的内容哈希（=市场上那个版本的样子）。由 bump_version.py 升版时更新，不要手改；说明见 scripts/package-versions.mjs";
const SEMVER = /^\d+\.\d+\.\d+$/;

export function cmpVer(a, b) {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

const posix = (p) => p.split(sep).join("/");

// 仓库里所有技能目录：{目录名: 相对仓库根的路径}（技能内的 shared/ 是副本，不算）
export function skillDirs(root = defaultRoot) {
  const out = {};
  const walk = (d) => {
    for (const e of readdirSync(join(root, d), { withFileTypes: true })) {
      if (!e.isDirectory() || e.name === "shared" || e.name === "node_modules" || e.name.startsWith(".")) continue;
      const sub = join(d, e.name);
      if (existsSync(join(root, sub, "SKILL.md"))) out[e.name] = posix(sub);
      else walk(sub);
    }
  };
  for (const side of ["student", "teacher", "tools"]) if (existsSync(join(root, side))) walk(side);
  return out;
}

// 仓库里会被打包的文件：git 跟踪的与没被忽略的新文件（相对仓库根、正斜杠）；git 不可用时返回 null。
// 一次统计（status）里只列一次，按技能目录前缀分给各技能
const listed = new Map();
function gitFiles(root) {
  if (!listed.has(root)) {
    let files = null;
    try {
      const out = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "student", "teacher", "tools"],
        { cwd: root, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
      files = out.split("\0").filter(Boolean).filter((f) => existsSync(join(root, f)));
    } catch { /* 不是 git 仓库：逐个目录遍历 */ }
    listed.set(root, files);
  }
  return listed.get(root);
}

// 一个技能目录里会被打包的文件（相对技能目录、正斜杠、已排序）
export function packageFiles(dir, root = defaultRoot) {
  let files;
  const all = gitFiles(root);
  if (all) {
    const prefix = dir.endsWith("/") ? dir : dir + "/";
    files = all.filter((f) => f.startsWith(prefix)).map((f) => f.slice(prefix.length));
  } else {
    files = [];
    const walk = (d) => {
      for (const e of readdirSync(join(root, dir, d), { withFileTypes: true })) {
        if (e.name.startsWith(".") || e.name === "__pycache__" || e.name === "node_modules") continue;
        const p = d ? `${d}/${e.name}` : e.name;
        if (e.isDirectory()) walk(p); else files.push(p);
      }
    };
    walk("");
  }
  return [...new Set(files)].sort();
}

// SKILL.md frontmatter 里 metadata.version 那一行（第一处“  version: x.y.z”）
const VERSION_LINE = /^([ \t]+version:[ \t]*)(\S+)[ \t]*$/m;
function frontmatter(text) {
  const t = text.replace(/\r\n/g, "\n");
  const m = t.match(/^---\n([\s\S]*?)\n---(\n|$)/);
  return m ? { fm: m[1], start: 4, end: 4 + m[1].length } : null;
}
export function readVersion(text) {
  const f = frontmatter(text);
  const m = f && f.fm.match(VERSION_LINE);
  return m ? m[2] : null;
}
export function setVersion(text, ver) {
  const crlf = text.includes("\r\n"), t = text.replace(/\r\n/g, "\n");
  const f = frontmatter(t);
  if (!f || !VERSION_LINE.test(f.fm)) throw new Error("SKILL.md 的 frontmatter 里没有 version 一行");
  const out = t.slice(0, f.start) + f.fm.replace(VERSION_LINE, `$1${ver}`) + t.slice(f.end);
  return crlf ? out.replace(/\n/g, "\r\n") : out;
}

export function hashPackage(dir, root = defaultRoot) {
  const h = createHash("sha256");
  for (const f of packageFiles(dir, root)) {
    let text = readFileSync(join(root, dir, f), "utf-8").replace(/\r\n/g, "\n");
    if (f === "SKILL.md") {
      const fm = frontmatter(text);
      if (fm) text = text.slice(0, fm.start) + fm.fm.replace(VERSION_LINE, "$1*") + text.slice(fm.end);
    }
    h.update(`${f}\n${text}\n\u0000\n`);
  }
  return h.digest("hex").slice(0, 16);
}

const readJson = (p) => JSON.parse(readFileSync(p, "utf-8"));
function loadManifest(root) {
  const p = join(root, MANIFEST);
  return existsSync(p) ? readJson(p) : null;
}
function saveManifest(root, release, packages) {
  const sorted = Object.fromEntries(Object.keys(packages).sort().map((k) => [k, packages[k]]));
  mkdirSync(join(root, dirname(MANIFEST)), { recursive: true });
  writeFileSync(join(root, MANIFEST), JSON.stringify({ 说明: NOTE, release, packages: sorted }, null, 2) + "\n", "utf-8");
}

// 每个技能：版本号、清单里记的、内容哈希、是否有未发布的改动
export function status(root = defaultRoot) {
  listed.delete(root);   // 文件可能刚增删过：每次统计重新列
  const pkg = readJson(join(root, "package.json"));
  const manifest = loadManifest(root);
  const recorded = manifest?.packages || {};
  const skills = {};
  for (const [name, dir] of Object.entries(skillDirs(root))) {
    const version = readVersion(readFileSync(join(root, dir, "SKILL.md"), "utf-8"));
    const hash = hashPackage(dir, root), rec = recorded[name];
    skills[name] = { dir, version, hash, recordedVersion: rec?.version ?? null, isNew: !rec, changed: !!rec && rec.hash !== hash };
  }
  const removed = Object.keys(recorded).filter((n) => !skills[n]).sort();
  return { release: pkg.version, contractVersion: pkg.contractVersion ?? null, manifestRelease: manifest?.release ?? null, hasManifest: !!manifest, skills, removed };
}

// 未发布的改动：内容与清单不同的、新增的、删掉的
export function pending(st) {
  const names = Object.keys(st.skills).sort();
  return {
    changed: names.filter((n) => st.skills[n].changed),
    added: names.filter((n) => st.skills[n].isNew),
    removed: st.removed,
  };
}

export function check(st) {
  const errors = [];
  if (!st.hasManifest) return [`缺发布清单 ${MANIFEST}：运行 node scripts/package-versions.mjs --init 生成`];
  if (!SEMVER.test(st.release || "")) errors.push(`package.json 的 version 不是 x.y.z：${st.release}`);
  if (st.manifestRelease !== st.release) errors.push(`发布清单的 release 是 ${st.manifestRelease}，package.json 是 ${st.release}：升版要用 bump_version.py，它会一并更新清单`);
  if (!SEMVER.test(st.contractVersion || "")) errors.push(`package.json 缺 contractVersion（档案结构与交接协议的契约版本，x.y.z）`);
  else if (SEMVER.test(st.release || "") && cmpVer(st.contractVersion, st.release) > 0) errors.push(`契约版本 ${st.contractVersion} 高于发布版本 ${st.release}`);
  for (const [name, s] of Object.entries(st.skills)) {
    const where = `${s.dir}/SKILL.md`;
    if (!SEMVER.test(s.version || "")) { errors.push(`${where}：metadata.version 不是 x.y.z（${s.version}）`); continue; }
    if (SEMVER.test(st.release || "") && cmpVer(s.version, st.release) > 0) errors.push(`${where}：版本 ${s.version} 高于发布版本 ${st.release}`);
    if (!s.isNew && s.version !== s.recordedVersion) errors.push(`${where}：版本 ${s.version} 与发布清单记的 ${s.recordedVersion} 不一致——技能版本由 bump_version.py 按内容改动维护，不要手改`);
  }
  return errors;
}

// 升版：有改动与新增的技能写成新版本，清单同步；返回升了版本的技能名
export function write(newVersion, root = defaultRoot) {
  if (!SEMVER.test(newVersion)) throw new Error(`新版本不是 x.y.z：${newVersion}`);
  const st = status(root);
  if (!st.hasManifest) throw new Error(`缺发布清单 ${MANIFEST}，先 --init`);
  if (cmpVer(newVersion, st.manifestRelease) <= 0) throw new Error(`新版本 ${newVersion} 不高于清单里的发布版本 ${st.manifestRelease}`);
  const bad = Object.entries(st.skills).filter(([, s]) => !s.isNew && s.version !== s.recordedVersion);
  if (bad.length) throw new Error(`这些技能的版本号与清单不一致，先改回清单里的版本：${bad.map(([n, s]) => `${n}（${s.version}，清单 ${s.recordedVersion}）`).join("、")}`);
  const manifest = loadManifest(root), packages = {}, bumped = [];
  for (const [name, s] of Object.entries(st.skills)) {
    if (s.isNew || s.changed) {
      const p = join(root, s.dir, "SKILL.md");
      writeFileSync(p, setVersion(readFileSync(p, "utf-8"), newVersion), "utf-8");
      packages[name] = { version: newVersion, hash: s.hash };
      bumped.push(name);
    } else packages[name] = manifest.packages[name];
  }
  saveManifest(root, newVersion, packages);
  return { bumped: bumped.sort(), removed: st.removed };
}

export function init(root = defaultRoot) {
  const st = status(root);
  const packages = Object.fromEntries(Object.entries(st.skills).map(([n, s]) => [n, { version: s.version, hash: s.hash }]));
  saveManifest(root, st.release, packages);
  return Object.keys(packages).length;
}

if (!globalThis.__packageVersionsLibraryOnly) {
  const args = process.argv.slice(2);
  try {
    if (args.includes("--init")) {
      console.log(`✅ 已按当前内容重建发布清单：${init()} 个技能 → ${MANIFEST}`);
    } else if (args.includes("--write")) {
      const v = args[args.indexOf("--write") + 1];
      const { bumped, removed } = write(v);
      console.log(`升到 ${v} 的技能 ${bumped.length} 个${bumped.length ? "：" + bumped.join("、") : ""}`);
      if (removed.length) console.log(`从清单移除已删掉的技能：${removed.join("、")}`);
    } else {
      const st = status();
      if (args.includes("--json")) {
        console.log(JSON.stringify({ ...st, pending: pending(st) }, null, 2));
      } else {
        const errors = check(st), p = pending(st);
        const lines = [];
        if (p.changed.length) lines.push(`  有改动、下次升版会升版本号的 ${p.changed.length} 个：${p.changed.join("、")}`);
        if (p.added.length) lines.push(`  新技能 ${p.added.length} 个（下次升版写入清单）：${p.added.join("、")}`);
        if (p.removed.length) lines.push(`  已删掉、下次升版从清单移除的 ${p.removed.length} 个：${p.removed.join("、")}`);
        if (errors.length) {
          console.error(`❌ 技能包版本与发布清单不一致（${errors.length}）：`);
          for (const e of errors) console.error("   " + e);
          process.exit(1);
        }
        const n = Object.keys(st.skills).length;
        const at = Object.values(st.skills).filter((s) => s.version === st.release).length;
        const spread = at === n ? `都是发布版本 ${st.release}` : `，${at} 个是发布版本 ${st.release}，其余 ${n - at} 个停在各自最后改动的版本`;
        console.log(`✅ 技能包版本与发布清单一致：${n} 个技能${spread}；契约版本 ${st.contractVersion}`);
        if (lines.length) console.log("ℹ️  未发布的改动：\n" + lines.join("\n"));
      }
    }
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
}

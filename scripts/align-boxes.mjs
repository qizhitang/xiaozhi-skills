#!/usr/bin/env node
// 代码块里的框线表按显示宽度规整：全角与宽字符算 2 列，其余（含 ①②、≥、→、─ 等歧义宽度字符）算 1 列，
// 与第二十二批规整时的口径一致。宽字符表由 Python unicodedata（Unicode 15.1）的 East Asian Width W/F 生成。
//
// 用法：
//   node scripts/align-boxes.mjs                 列出没对齐的框线块（不改文件）
//   node scripts/align-boxes.mjs --check         同上，有能自动规整却没规整的块就以非 0 退出（npm run check 用）
//   node scripts/align-boxes.mjs --write         规整能自动处理的块（npm run boxes:fix）
//   node scripts/align-boxes.mjs --write <文件…>  只处理这些文件
//
// 处理哪些：围栏代码块里，连续几行都以框线字符开头（│ ┌ ├ └）的块，且每行都以右边框结尾（│ ┐ ┤ ┘）。
// 以横框线（┌──┬──┐、├──┼──┤ 这类）为准：内容行按它上方最近的一条横线分列，只增减单元格末尾的空格；
// 内容比列宽还宽时，把这一列连同全块的横线一起加宽；各条横线长短不一时补到最长。
// 横线之间的列位置差一两列（看不出该对齐到哪条）、某行缺右边框、一行里并排几个框、框前有文字的块不碰，
// 列出来留给人看。只动空格与框线字符、不动文字，check-skills 的 A2 把这类改动当排版改动，不要求重新验算。
// 范围：student/ teacher/ tools/ 下的 .md（技能内的 shared/ 副本是生成物，改源文件后由 sync-shared 同步）与仓库根 shared/。
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WIDE = [0x1100,0x115f,0x231a,0x231b,0x2329,0x232a,0x23e9,0x23ec,0x23f0,0x23f0,0x23f3,0x23f3,0x25fd,0x25fe,0x2614,0x2615,0x2648,0x2653,0x267f,0x267f,0x2693,0x2693,0x26a1,0x26a1,0x26aa,0x26ab,0x26bd,0x26be,0x26c4,0x26c5,0x26ce,0x26ce,0x26d4,0x26d4,0x26ea,0x26ea,0x26f2,0x26f3,0x26f5,0x26f5,0x26fa,0x26fa,0x26fd,0x26fd,0x2705,0x2705,0x270a,0x270b,0x2728,0x2728,0x274c,0x274c,0x274e,0x274e,0x2753,0x2755,0x2757,0x2757,0x2795,0x2797,0x27b0,0x27b0,0x27bf,0x27bf,0x2b1b,0x2b1c,0x2b50,0x2b50,0x2b55,0x2b55,0x2e80,0x2e99,0x2e9b,0x2ef3,0x2f00,0x2fd5,0x2ff0,0x303e,0x3041,0x3096,0x3099,0x30ff,0x3105,0x312f,0x3131,0x318e,0x3190,0x31e3,0x31ef,0x321e,0x3220,0x3247,0x3250,0x4dbf,0x4e00,0xa48c,0xa490,0xa4c6,0xa960,0xa97c,0xac00,0xd7a3,0xf900,0xfaff,0xfe10,0xfe19,0xfe30,0xfe52,0xfe54,0xfe66,0xfe68,0xfe6b,0xff01,0xff60,0xffe0,0xffe6,0x16fe0,0x16fe4,0x16ff0,0x16ff1,0x17000,0x187f7,0x18800,0x18cd5,0x18d00,0x18d08,0x1aff0,0x1aff3,0x1aff5,0x1affb,0x1affd,0x1affe,0x1b000,0x1b122,0x1b132,0x1b132,0x1b150,0x1b152,0x1b155,0x1b155,0x1b164,0x1b167,0x1b170,0x1b2fb,0x1f004,0x1f004,0x1f0cf,0x1f0cf,0x1f18e,0x1f18e,0x1f191,0x1f19a,0x1f200,0x1f202,0x1f210,0x1f23b,0x1f240,0x1f248,0x1f250,0x1f251,0x1f260,0x1f265,0x1f300,0x1f320,0x1f32d,0x1f335,0x1f337,0x1f37c,0x1f37e,0x1f393,0x1f3a0,0x1f3ca,0x1f3cf,0x1f3d3,0x1f3e0,0x1f3f0,0x1f3f4,0x1f3f4,0x1f3f8,0x1f43e,0x1f440,0x1f440,0x1f442,0x1f4fc,0x1f4ff,0x1f53d,0x1f54b,0x1f54e,0x1f550,0x1f567,0x1f57a,0x1f57a,0x1f595,0x1f596,0x1f5a4,0x1f5a4,0x1f5fb,0x1f64f,0x1f680,0x1f6c5,0x1f6cc,0x1f6cc,0x1f6d0,0x1f6d2,0x1f6d5,0x1f6d7,0x1f6dc,0x1f6df,0x1f6eb,0x1f6ec,0x1f6f4,0x1f6fc,0x1f7e0,0x1f7eb,0x1f7f0,0x1f7f0,0x1f90c,0x1f93a,0x1f93c,0x1f945,0x1f947,0x1f9ff,0x1fa70,0x1fa7c,0x1fa80,0x1fa88,0x1fa90,0x1fabd,0x1fabf,0x1fac5,0x1face,0x1fadb,0x1fae0,0x1fae8,0x1faf0,0x1faf8,0x20000,0x2fffd,0x30000,0x3fffd];
function charWidth(cp) {
  let lo = 0, hi = WIDE.length / 2 - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cp < WIDE[2 * mid]) hi = mid - 1; else if (cp > WIDE[2 * mid + 1]) lo = mid + 1; else return 2;
  }
  return 1;
}
export const width = (s) => { let n = 0; for (const ch of s) n += charWidth(ch.codePointAt(0)); return n; };

const VERT = new Set([..."│┃║"]);
const HORIZ = new Set([..."─━═"]);
const JUNC = new Set([..."┌┐└┘├┤┬┴┼┏┓┗┛┣┫┳┻╋╔╗╚╝╠╣╦╩╬"]);
const LEFT = new Set([..."│┃║┌├└┏┣┗╔╠╚"]);
// 横线里的交叉点：往下延伸的（┬ ┼）才是下方各行的分栏点，往上延伸的（┴ ┼）才是上方各行的；
// “├───┴───┤”的意思是上面两栏到此结束、下面合成一整行
const DOWN = new Set([..."┬┼┳╋╦╬"]), UP = new Set([..."┴┼┻╋╩╬"]);
const RIGHT = new Set([..."│┃║┐┤┘┓┫┛╗╣╝"]);

// 一块：返回 { lines: 新行 | null, reason }；lines 为 null 表示不处理
export function alignBlock(raw) {
  const indents = raw.map((l) => l.match(/^ */)[0]);
  const body = raw.map((l, i) => l.slice(indents[i].length).replace(/\s+$/, ""));
  if (!body.every((s) => s && RIGHT.has(s[s.length - 1]))) return { lines: null, reason: "有行缺右边框" };
  const indent = indents[0];
  const parsed = body.map((s) => {
    const chars = [...s];
    if (JUNC.has(chars[0]) && chars.every((c) => HORIZ.has(c) || JUNC.has(c))) {
      const segs = [], juncs = [chars[0]];
      let n = 0;
      for (const c of chars.slice(1)) { if (JUNC.has(c)) { segs.push(n); juncs.push(c); n = 0; } else n++; }
      return { kind: "border", segs, juncs, horiz: chars.find((c) => HORIZ.has(c)) || "─" };
    }
    if (VERT.has(chars[0])) {
      const cells = [], seps = [chars[0]];
      let cur = "";
      for (const c of chars.slice(1)) { if (VERT.has(c)) { cells.push(cur); seps.push(c); cur = ""; } else cur += c; }
      return { kind: "content", cells, seps };
    }
    return { kind: "other" };
  });
  if (parsed.some((p) => p.kind === "other")) return { lines: null, reason: "既不是横线也不是内容行（并排的框或框前有文字）" };
  const borders = parsed.filter((p) => p.kind === "border");
  if (!borders.length) return { lines: null, reason: "没有横框线可作基准" };
  // 横线之间的内部列位置：相差 1–2 列视为画歪了、又看不出以哪条为准，不处理
  const pos = (b) => { const out = []; let x = 0; for (const s of b.segs.slice(0, -1)) { x += s + 1; out.push(x); } return out; };
  const all = [...new Set(borders.flatMap(pos))].sort((a, b) => a - b);
  for (let i = 1; i < all.length; i++) if (all[i] - all[i - 1] <= 2) return { lines: null, reason: "几条横线的列位置差一两列" };
  // 各条横线补到最长
  const total = (b) => b.segs.reduce((a, s) => a + s, 0) + b.segs.length + 1;
  const T = Math.max(...borders.map(total));
  for (const b of borders) b.segs[b.segs.length - 1] += T - total(b);
  // 内容行的基准横线：上方最近的一条（按往下延伸的交叉点分栏），没有就取下方最近的（按往上延伸的）
  const colsOf = (b, dir) => {
    const cont = dir === "down" ? DOWN : UP, out = [];
    let acc = b.segs[0];
    for (let j = 1; j < b.segs.length; j++) {
      if (cont.has(b.juncs[j])) { out.push(acc); acc = b.segs[j]; } else acc += 1 + b.segs[j];
    }
    out.push(acc);
    return out;
  };
  for (let i = 0; i < parsed.length; i++) {
    if (parsed[i].kind !== "content") continue;
    let g = -1, dir = "down";
    for (let j = i - 1; j >= 0; j--) if (parsed[j].kind === "border") { g = j; break; }
    if (g < 0) { dir = "up"; for (let j = i + 1; j < parsed.length; j++) if (parsed[j].kind === "border") { g = j; break; } }
    parsed[i].gov = parsed[g]; parsed[i].dir = dir;
    if (parsed[i].cells.length !== colsOf(parsed[g], dir).length) return { lines: null, reason: "内容行的格数与横线对不上" };
  }
  // 内容比列宽还宽：在这一格右边界处给全块加宽
  const widenAt = (X, d) => {
    for (const b of borders) {
      let x = 0;
      for (let j = 0; j < b.segs.length; j++) {
        const end = x + b.segs[j] + 1;
        if (x < X && X <= end) { b.segs[j] += d; break; }
        x = end;
      }
    }
  };
  for (let guard = 0; guard < 500; guard++) {
    let fixed = false;
    for (const p of parsed) {
      if (p.kind !== "content") continue;
      let x = 0;
      const cols = colsOf(p.gov, p.dir);
      for (let k = 0; k < p.cells.length; k++) {
        // 内容左边留了空格的，右边也至少留一个，不让文字贴着竖线
        const txt = p.cells[k].replace(/\s+$/, ""), need = width(txt) + (/^\s/.test(txt) ? 1 : 0), have = cols[k];
        if (need > have) { widenAt(x + have + 1, need - have); fixed = true; break; }
        x += have + 1;
      }
      if (fixed) break;
    }
    if (!fixed) break;
  }
  const out = parsed.map((p) => {
    if (p.kind === "border") return indent + p.juncs[0] + p.segs.map((s, j) => p.horiz.repeat(s) + p.juncs[j + 1]).join("");
    const cols = colsOf(p.gov, p.dir);
    const cells = p.cells.map((c, k) => { const t = c.replace(/\s+$/, ""); return t + " ".repeat(cols[k] - width(t)); });
    return indent + p.seps[0] + cells.map((c, k) => c + p.seps[k + 1]).join("");
  });
  return { lines: out, reason: "" };
}

// 一个文件：找出框线块，逐块规整；返回 { text, fixed: [起始行…], skipped: [[起始行, 原因]…] }
export function alignText(text) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const L = text.split(eol);
  const fixed = [], skipped = [];
  let inFence = false;
  for (let i = 0; i < L.length; i++) {
    if (/^\s*(```|~~~)/.test(L[i])) { inFence = !inFence; continue; }
    if (!inFence) continue;
    const t = L[i].trimStart();
    if (!t || !LEFT.has(t[0])) continue;
    // 同一块的行缩进相同：流程图里框与框之间的连接竖线缩进不同，自然分成几块，各自规整
    const ind = L[i].match(/^ */)[0].length;
    let j = i;
    while (j < L.length && L[j].trimStart() && LEFT.has(L[j].trimStart()[0]) && L[j].match(/^ */)[0].length === ind) j++;
    const raw = L.slice(i, j);
    const ends = raw.filter((l) => RIGHT.has(l.replace(/\s+$/, "").slice(-1))).length;
    if (ends >= 2) {   // 至少两行带右边框才算框线表（只有左侧竖线的是树形图，不管）
      const misaligned = new Set(raw.filter((l) => RIGHT.has(l.replace(/\s+$/, "").slice(-1))).map((l) => width(l.replace(/\s+$/, "")))).size > 1;
      const r = alignBlock(raw);
      if (r.lines) {
        if (r.lines.some((l, k) => l !== raw[k])) { L.splice(i, j - i, ...r.lines); fixed.push(i + 1); }
      } else if (misaligned) skipped.push([i + 1, r.reason]);
    }
    i = j - 1;
  }
  return { text: L.join(eol), fixed, skipped };
}

function targets(args) {
  if (args.length) return args;
  return execFileSync("git", ["ls-files", "*.md"], { cwd: root, encoding: "utf-8" }).split("\n")
    .filter((f) => (/^(student|teacher|tools)\//.test(f) && !/\/shared\//.test(f)) || /^shared\//.test(f));
}

if (!globalThis.__alignBoxesLibraryOnly) {
  const write = process.argv.includes("--write"), check = process.argv.includes("--check");
  const files = targets(process.argv.slice(2).filter((a) => !a.startsWith("--")));
  let nFixed = 0, nFiles = 0;
  const skippedAll = [];
  for (const f of files) {
    const p = resolve(root, f);
    const text = readFileSync(p, "utf-8");
    const r = alignText(text);
    if (r.fixed.length) { nFixed += r.fixed.length; nFiles++; if (write) writeFileSync(p, r.text, "utf-8"); else console.log(`  ${relative(root, p)}：第 ${r.fixed.join("、")} 行起的框线没对齐`); }
    for (const [line, why] of r.skipped) skippedAll.push(`  ${relative(root, p)}:${line}  ${why}`);
  }
  if (check) {
    // 结构看不准的块只提示（手工重画），不让校验失败；能自动规整却没规整的才算错
    if (skippedAll.length) console.log(`⚠️  框线结构看不准、脚本不处理的块 ${skippedAll.length} 个（需要时手工重画；npm run boxes:fix 不会动它们）`);
    if (nFixed) { console.error(`❌ 框线没对齐：${nFiles} 个文件 ${nFixed} 块，运行 npm run boxes:fix 规整后重新提交`); process.exit(1); }
    console.log("✅ 框线表按显示宽度对齐");
    process.exit(0);
  }
  console.log(`${write ? "已规整" : "可自动规整"}：${nFiles} 个文件 ${nFixed} 块`);
  if (skippedAll.length) { console.log(`\n没对齐、但结构看不准而未处理的块（${skippedAll.length}）：`); for (const s of skippedAll) console.log(s); }
}

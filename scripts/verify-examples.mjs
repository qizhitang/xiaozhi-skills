#!/usr/bin/env node
// 示例题机器验算。用法：node scripts/verify-examples.mjs [--warn-only]
//
// references 里的示例题是自由文本，脚本没法"读题解题"。能做的是：让写题的人把
// 关键断言写成可执行的小检查，CI 每次跑一遍——题目一改、断言就会红。写法：
//
//   ```verify
//   {"claim": "184 分题：7x = 284 无整数解，已改为 175 分",
//    "expr": "Number.isInteger((175 - 100) / 7)", "expect": true}
//   ```
//
// expr 是一段 JS 表达式，只能用 Math 与字面量（没有 require / fetch / 全局对象）。
// expect 与求值结果按 JSON 相等比较（数值允许 1e-9 误差）。
//
// 检查项：
//  X1 每个 verify 块是合法 JSON，含 claim / expr / expect
//  X2 expr 求值不抛错，结果等于 expect
//  X3 含"示例题验算"声明的文件若一个 verify 块都没有 → 警告（鼓励补）
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const warnOnly = process.argv.includes("--warn-only");
const errors = [], warnings = [];
const err = (c, f, m) => errors.push(`[${c}] ${f}: ${m}`);
const warn = (c, f, m) => warnings.push(`[${c}] ${f}: ${m}`);
const rel = (p) => relative(root, p).replace(/\\/g, "/");

function walk(dir, acc = []) {
  for (const n of readdirSync(dir)) {
    if ([".git", "node_modules", "shared", "evals"].includes(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, acc); else if (p.endsWith(".md")) acc.push(p);
  }
  return acc;
}
const files = ["student", "teacher", "tools"].flatMap((s) => walk(join(root, s)));

const approxEq = (a, b) => {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => approxEq(x, b[i]));
  return JSON.stringify(a) === JSON.stringify(b);
};

let blocks = 0, filesWithBlocks = 0;
for (const f of files) {
  const text = readFileSync(f, "utf-8");
  const declared = /示例题验算[:：]\s*\d{4}-\d{2}-\d{2}/.test(text);
  const re = /```verify\s*\n([\s\S]*?)\n```/g;
  let m, n = 0;
  while ((m = re.exec(text))) {
    n++; blocks++;
    const line = text.slice(0, m.index).split("\n").length;
    let spec;
    try { spec = JSON.parse(m[1]); } catch (e) { err("X1", `${rel(f)}:${line}`, `verify 块不是合法 JSON：${e.message}`); continue; }
    if (!spec || typeof spec.claim !== "string" || typeof spec.expr !== "string" || !("expect" in spec)) { err("X1", `${rel(f)}:${line}`, "verify 块须含 claim / expr / expect"); continue; }
    let got;
    try {
      // 只暴露 Math；屏蔽 globalThis / require / process
      got = Function("Math", "globalThis", "require", "process", "fetch", `"use strict"; return (${spec.expr});`)(Math);
    } catch (e) { err("X2", `${rel(f)}:${line}`, `“${spec.claim}” 求值出错：${e.message}`); continue; }
    if (!approxEq(got, spec.expect)) err("X2", `${rel(f)}:${line}`, `“${spec.claim}” 期望 ${JSON.stringify(spec.expect)}，实得 ${JSON.stringify(got)}`);
  }
  if (n) filesWithBlocks++;
  if (declared && !n) warn("X3", rel(f), "有示例题验算声明但没有 verify 块——关键数值断言建议写成 ```verify``` 让 CI 替你算");
}

if (warnings.length) { console.log(`\n⚠️  警告 ${warnings.length}：`); for (const w of warnings) console.log("   " + w); }
if (errors.length) {
  console.log(`\n❌ 示例题验算失败（${errors.length}）：`); for (const e of errors) console.log("   " + e);
  if (!warnOnly) process.exit(1);
} else {
  console.log(`\n✅ 示例题机器验算通过：${filesWithBlocks} 个文件，${blocks} 条断言。`);
}

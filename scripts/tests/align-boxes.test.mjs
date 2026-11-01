// align-boxes.mjs 的回归测试（node:test，npm run check 里也跑）：框线表按显示宽度规整的几种情形。
import { test } from "node:test";
import assert from "node:assert/strict";

globalThis.__alignBoxesLibraryOnly = true;   // 只加载函数，不扫仓库
const { alignText, width } = await import("../align-boxes.mjs");

const fence = (...ls) => ["```text", ...ls, "```"].join("\n");
const body = (text) => text.split("\n").slice(1, -1);
const BOX_OR_SPACE = /[\s─━═│┃║┌┐└┘├┤┬┴┼]/g;

test("width：全角 2 列，ASCII、①、→、─ 按 1 列", () => {
  assert.equal(width("物理"), 4);
  assert.equal(width("a①→─"), 4);
});

test("两栏表：内容行按上方横线补空格，各行等宽，文字不变", () => {
  const src = fence(
    "┌──────────┬──────────┐",
    "│ 字       │ 常见义     │",
    "├──────────┼──────────┤",
    "│ 学而时习之 │ 温习   │",
    "└──────────┴──────────┘",
  );
  const r = alignText(src);
  assert.equal(r.fixed.length, 1);
  const lines = body(r.text);
  assert.equal(new Set(lines.map(width)).size, 1);
  assert.equal(r.text.replace(BOX_OR_SPACE, ""), src.replace(BOX_OR_SPACE, ""));
});

test("“├──┴──┤”下面的整行按一整栏对齐（康奈尔笔记的总结栏）", () => {
  const src = fence(
    "┌──────┬──────┐",
    "│ 线索 │ 笔记  │",
    "├──────┴──────┤",
    "│ 总结    │",
    "└─────────────┘",
  );
  const lines = body(alignText(src).text);
  assert.equal(new Set(lines.map(width)).size, 1);
  assert.equal(lines[3], "│ 总结        │");
});

test("内容比列宽还宽：整列连同所有横线一起加宽", () => {
  const src = fence(
    "┌────┬────┐",
    "│ 甲 │ 乙 │",
    "├────┼────┤",
    "│ 很长的内容 │ 乙 │",
    "└────┴────┘",
  );
  const lines = body(alignText(src).text);
  assert.equal(new Set(lines.map(width)).size, 1);
  assert.equal(lines[0], "┌────────────┬────┐");
  assert.equal(lines[3], "│ 很长的内容 │ 乙 │");
});

test("一行里并排几个框、带箭头的流程图：不碰，列为结构看不准", () => {
  const src = fence(
    "┌────┐  ┌────┐",
    "│ 甲 │→ │ 乙  │",
    "└────┘  └────┘",
  );
  const r = alignText(src);
  assert.equal(r.text, src);
  assert.equal(r.skipped.length, 1);
});

test("只有左侧竖线的树形图不当成框线表", () => {
  const src = fence("├── 基础信息", "│   ├── 年级", "│   └── 目标", "└── 学科");
  const r = alignText(src);
  assert.equal(r.text, src);
  assert.deepEqual([r.fixed.length, r.skipped.length], [0, 0]);
});

test("规整是幂等的：规整过的再跑一遍没有改动；CRLF 换行保留", () => {
  const src = fence("┌────┬────┐", "│ 物理 │ 化学  │", "└────┴────┘").split("\n").join("\r\n");
  const once = alignText(src).text;
  assert.ok(once.includes("\r\n"));
  const twice = alignText(once);
  assert.equal(twice.fixed.length, 0);
  assert.equal(twice.text, once);
});

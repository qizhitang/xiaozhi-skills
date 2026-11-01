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

test("一行里并排几个框、带箭头的流程图：不自动改；哪个框的右边没对齐就报哪个", () => {
  const src = fence(
    "┌────┐  ┌────┐",
    "│ 甲 │→ │ 乙  │",
    "└────┘  └────┘",
  );
  const r = alignText(src);
  assert.equal(r.text, src);
  assert.deepEqual(r.skipped, [[2, "框的左右边没对齐（第 3 行）"]]);
});

test("流程图画对了就不报：框边上的箭头、框外的说明文字、连线拐角“┌──┼──┐”都不算毛病", () => {
  const src = fence(
    "     ┌──────┐",
    "     │ 起点 │ ←── 说明",
    "     └──┬───┘",
    "  ┌─────┼─────┐",
    "  ▼     ▼     ▼",
    "┌───┐ ┌─▼─┐ ┌───┐",
    "│ 甲│ │ 乙│ │ 丙│",
    "└───┘ └───┘ └───┘",
  );
  const r = alignText(src);
  assert.equal(r.text, src);
  assert.deepEqual([r.fixed.length, r.skipped.length], [0, 0]);
});

test("框的底边与顶边错开、中间横线右端错用 ┐：报出来", () => {
  const shifted = alignText(fence("┌────┐", "│ 甲 │", " └────┘"));
  assert.deepEqual(shifted.skipped, [[2, "框的底边与顶边错开（第 4 行）"]]);
  const corner = alignText(fence("┌────┬────┐", "│ 甲 │ 乙 │", "├────┼────┐", "│ 丙 │ 丁 │", "└────┴────┘"));
  assert.deepEqual(corner.skipped, [[2, "框的左右边没对齐（第 4 行）"]]);
});

test("整张表的分栏对不上（用“·”代替竖线）：报出来，不自动改", () => {
  const src = fence("┌──────┬──────┐", "│ 错因 │ 干预 │", "├──────┼──────┤", "│ 漏洞 · 补前置│", "└──────┴──────┘");
  const r = alignText(src);
  assert.equal(r.text, src);
  // 同一处错误也让 ┼、┴ 两个接头对不上竖线，连线核对一并报出
  assert.deepEqual(r.skipped, [[2, "内容行的格数与横线对不上"], [4, "连线接头 ┼ 往下没接上（第 8 列）"], [6, "连线接头 ┴ 往上没接上（第 8 列）"]]);
});

test("无外框的表：各行竖线要落在“──┼──”分隔线的接头列上", () => {
  const good = alignText(fence("知识点   │ 了解", "─────────┼─────", "概念     │ T1", "─────────┴─────"));
  assert.equal(good.skipped.length, 0);
  const bad = alignText(fence("知识点   │ 了解", "─────────┼─────", "概念与解的含义 │ T1"));
  assert.deepEqual(bad.skipped, [[3, "连线接头 ┼ 往下没接上（第 10 列）"], [4, "无外框的表：竖线没对准分隔线的接头"]]);
});

test("连线接头：分叉线的 ┼ 要正对上面伸下来的竖线，错开一列就报", () => {
  const good = alignText(fence("    甲", "     │", "  ┌──┼──┐", "  ↓  ↓  ↓"));
  assert.equal(good.skipped.length, 0);
  const bad = alignText(fence("    甲", "     │", "  ┌───┼───┐", "  ↓   ↓   ↓"));
  assert.deepEqual(bad.skipped, [[4, "连线接头 ┼ 往上没接上（第 7 列）"]]);
});

test("坐标轴的刻度、时间轴的说明文字：相邻行没有框线字符，不当成断开的连线", () => {
  const axis = alignText(fence("  │", "0 ┼───┬───┬──→ x", "  0   1   2"));
  assert.equal(axis.skipped.length, 0);
  const timeline = alignText(fence("──┬────┬──", "  秦    汉"));
  assert.equal(timeline.skipped.length, 0);
});

test("只有左侧竖线的树形图不当成框线表（含只有竖线的空行）", () => {
  const src = fence("├── 基础信息", "│   ├── 年级", "│   │", "│   └── 目标", "│", "└── 学科");
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

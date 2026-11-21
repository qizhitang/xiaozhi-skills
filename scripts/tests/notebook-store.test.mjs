// 错题本数据层原型的测试：把 shared/vocab.md §4（状态五档）与 §5（3 次顽固口径）逐条锁住。
// 运行：node --test scripts/tests/notebook-store.test.mjs（也在 npm run check 里）
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { openStore, replay, normalizeDimension, parseArgs, StoreError } from "../prototypes/notebook-store.mjs";

const script = resolve(dirname(fileURLToPath(import.meta.url)), "..", "prototypes", "notebook-store.mjs");

function fresh({ init = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "notebook-"));
  const store = openStore(dir);
  if (init) store.init({ consentBy: "学生本人", today: "2026-05-01" });
  return { dir, store, done: () => rmSync(dir, { recursive: true, force: true }) };
}
const err = (store, date, extra = {}) => store.add({ date, subject: "math", concept: "一次函数解析式", dimension: "概念模糊", ...extra });
const ok = (store, date, variant = false) => store.verify({ date, concept: "一次函数解析式", dimension: "概念模糊", variant });

test("没建档就不写：add / verify 报退出码 3，文件不落地", () => {
  const { dir, store, done } = fresh({ init: false });
  try {
    assert.throws(() => err(store, "2026-05-01"), (e) => e instanceof StoreError && e.code === 3);
    assert.equal(existsSync(join(dir, "errors.jsonl")), false);
  } finally { done(); }
});

test("§4：第 1 次待处理，第 2 次初步弱项，第 3 次顽固弱项并给出顽固事件", () => {
  const { store, done } = fresh();
  try {
    const a = err(store, "2026-05-01");
    assert.deepEqual([a.status, a.occurrenceCountInWindow, a.stubbornEvent], ["待处理", 1, false]);
    const b = err(store, "2026-05-10");
    assert.deepEqual([b.status, b.occurrenceCountInWindow, b.stubbornEvent], ["初步弱项", 2, false]);
    const c = err(store, "2026-05-20");
    assert.deepEqual([c.status, c.previousStatus, c.occurrenceCountInWindow, c.stubbornEvent], ["顽固弱项", "初步弱项", 3, true]);
    assert.deepEqual(c.datesInWindow, ["2026-05-01", "2026-05-10", "2026-05-20"]);
    assert.deepEqual(c.historyRefs, ["err-20260501-001", "err-20260510-001"]);
    const d = err(store, "2026-05-21");
    assert.deepEqual([d.status, d.stubbornEvent], ["顽固弱项", false], "已经是顽固，不重复发事件");
  } finally { done(); }
});

test("§5：同一天多次只计 1 次；累计而非连续；学科子类型不同仍计入同一计数", () => {
  const { store, done } = fresh();
  try {
    err(store, "2026-05-01", { subtype: "B02" });
    const same = err(store, "2026-05-01", { subtype: "B03" });
    assert.deepEqual([same.errorId, same.occurrenceCountInWindow, same.status], ["err-20260501-002", 1, "待处理"]);
    assert.equal(err(store, "2026-05-02", { subtype: "C01" }).occurrenceCountInWindow, 2);
    assert.equal(err(store, "2026-05-15").status, "顽固弱项");
  } finally { done(); }
});

test("§5：滚动 28 天——第 28 天还在窗口里，第 29 天不在", () => {
  const inside = fresh();
  try {
    err(inside.store, "2026-05-01"); err(inside.store, "2026-05-02");
    assert.equal(err(inside.store, "2026-05-28").occurrenceCountInWindow, 3, "5/1 距 5/28 共 27 天，仍在窗口");
  } finally { inside.done(); }
  const outside = fresh();
  try {
    err(outside.store, "2026-05-01"); err(outside.store, "2026-05-02");
    const r = err(outside.store, "2026-05-29");
    assert.deepEqual([r.occurrenceCountInWindow, r.status], [2, "初步弱项"], "5/1 已出窗口，只剩 2 次；状态不因此退回");
  } finally { outside.done(); }
});

test("§5：不同知识点、不同维度各数各的", () => {
  const { store, done } = fresh();
  try {
    err(store, "2026-05-01"); err(store, "2026-05-02");
    assert.equal(store.add({ date: "2026-05-03", subject: "math", concept: "一次函数解析式", dimension: "K" }).occurrenceCountInWindow, 1);
    assert.equal(store.add({ date: "2026-05-03", subject: "math", concept: "二元一次方程组", dimension: "概念模糊" }).occurrenceCountInWindow, 1);
  } finally { done(); }
});

test("§5：28 天内累计 5 次 → 高危", () => {
  const { store, done } = fresh();
  try {
    let last;
    for (const d of ["2026-05-01", "2026-05-03", "2026-05-05", "2026-05-07"]) last = err(store, d);
    assert.equal(last.highRisk, false);
    assert.equal(err(store, "2026-05-09").highRisk, true);
  } finally { done(); }
});

test("§4：顽固 → 首次验证做对进突破中 → 间隔 ≥3 天且含一次换题型 → 已攻克", () => {
  const { store, done } = fresh();
  try {
    err(store, "2026-05-01"); err(store, "2026-05-02"); err(store, "2026-05-03");
    assert.equal(ok(store, "2026-05-10").status, "突破中");
    const tooSoon = ok(store, "2026-05-12", true);
    assert.deepEqual([tooSoon.status, tooSoon.cracked], ["突破中", false], "只隔 2 天");
    const noVariant = ok(store, "2026-05-13");
    assert.equal(noVariant.status, "突破中", "5/10 与 5/13 隔够了，但这两次都是原题型；5/12 那次换题型离 5/13 只有 1 天");
    const cracked = ok(store, "2026-05-15");
    assert.deepEqual([cracked.status, cracked.cracked], ["已攻克", true], "与 5/12 的换题型验证相隔 3 天");
  } finally { done(); }
});

test("§5：两次验证都不是换题型/纯净版，不算攻克；补一次换题型的才算", () => {
  const { store, done } = fresh();
  try {
    err(store, "2026-05-01"); err(store, "2026-05-02"); err(store, "2026-05-03");
    ok(store, "2026-05-10");
    assert.equal(ok(store, "2026-05-14").status, "突破中", "间隔够了，但两次都是原题型");
    assert.equal(ok(store, "2026-05-17", true).status, "已攻克");
  } finally { done(); }
});

test("§4：突破中再错 → 回到顽固，之前的验证不作数", () => {
  const { store, done } = fresh();
  try {
    err(store, "2026-05-01"); err(store, "2026-05-02"); err(store, "2026-05-03");
    ok(store, "2026-05-10", true);
    const relapse = err(store, "2026-05-12");
    assert.deepEqual([relapse.status, relapse.stubbornEvent], ["顽固弱项", true]);
    assert.equal(ok(store, "2026-05-20").status, "突破中");
    assert.equal(ok(store, "2026-05-21", true).status, "突破中", "5/10 那次已被 5/12 的错打断，不能拿来配对");
  } finally { done(); }
});

test("§4：初步弱项 2 次独立验证做对 → 已攻克；已攻克 30 天内再错 → 突破中，超过 30 天按新记录数", () => {
  const within = fresh();
  try {
    err(within.store, "2026-05-01"); err(within.store, "2026-05-02");
    ok(within.store, "2026-05-05", true);
    assert.equal(ok(within.store, "2026-05-08").status, "已攻克");
    assert.equal(err(within.store, "2026-06-07").status, "突破中", "攻克后第 30 天");
  } finally { within.done(); }
  const later = fresh();
  try {
    err(later.store, "2026-05-01"); err(later.store, "2026-05-02");
    ok(later.store, "2026-05-05", true); ok(later.store, "2026-05-08");
    const r = err(later.store, "2026-06-08");
    assert.deepEqual([r.status, r.occurrenceCountInWindow], ["待处理", 1], "攻克后第 31 天，窗口里只有这一次");
  } finally { later.done(); }
});

test("待处理时验证做对不改状态；没有错题记录的知识点不能验证", () => {
  const { store, done } = fresh();
  try {
    err(store, "2026-05-01");
    assert.equal(ok(store, "2026-05-05", true).status, "待处理");
    assert.throws(() => store.verify({ date: "2026-05-05", concept: "没记过的", dimension: "C" }), (e) => e.code === 2);
  } finally { done(); }
});

test("补录的旧错题按日期排，不按录入先后", () => {
  const { store, done } = fresh();
  try {
    err(store, "2026-05-20"); err(store, "2026-05-10");
    const r = err(store, "2026-05-01");
    assert.deepEqual([r.occurrenceCountInWindow, r.countedAsOf, r.status, r.previousStatus, r.stubbornEvent], [3, "2026-05-20", "顽固弱项", "初步弱项", true], "补录后按 5/20 的现状报：窗口内 3 次");
    assert.deepEqual(r.historyRefs, ["err-20260510-001", "err-20260520-001"]);
    assert.equal(store.list({ today: "2026-05-20" }).items[0].countInWindow, 3);
  } finally { done(); }
});

test("list / report / export / delete", () => {
  const { dir, store, done } = fresh();
  try {
    err(store, "2026-05-01"); err(store, "2026-05-02"); err(store, "2026-05-03");
    store.add({ date: "2026-05-03", subject: "physics", concept: "浮力", dimension: "R" });
    const list = store.list({ today: "2026-06-15" });
    assert.deepEqual(list.items.map((i) => [i.concept, i.status, i.countInWindow]), [["一次函数解析式", "顽固弱项", 0], ["浮力", "待处理", 0]], "过了窗口次数归零，状态保留");
    assert.deepEqual(store.report({ from: "2026-05-02", to: "2026-05-03" }), {
      from: "2026-05-02", to: "2026-05-03", total: 3,
      bySubject: { math: 2, physics: 1 }, byDimension: { 概念模糊: 2, 读题失误: 1 }, byConcept: { 一次函数解析式: 2, 浮力: 1 },
    });
    assert.equal(store.export().events.length, 4);
    assert.throws(() => store.delete({ all: true }), (e) => e.code === 2, "没有 --yes 不删");
    assert.deepEqual(store.delete({ concept: "浮力", yes: true }), { deleted: 1, scope: "浮力" });
    assert.equal(store.export().events.length, 3);
    assert.equal(store.delete({ all: true, yes: true }).deleted, 3);
    assert.equal(existsSync(dir), false, "全部删除连同意记录一起清掉");
  } finally { done(); }
});

test("输入校验：维度、日期、必填项", () => {
  assert.equal(normalizeDimension("C"), "概念模糊");
  assert.equal(normalizeDimension("方法用错"), "方法用错");
  assert.throws(() => normalizeDimension("粗心"), (e) => e.code === 2);
  const { store, done } = fresh();
  try {
    assert.throws(() => err(store, "2026-02-30"), (e) => e.code === 2);
    assert.throws(() => err(store, "5月1日"), (e) => e.code === 2);
    assert.throws(() => store.add({ date: "2026-05-01", subject: "math", dimension: "C" }), /--concept/);
    assert.throws(() => store.init({ consentBy: "老师" }), (e) => e.code === 2);
  } finally { done(); }
  assert.deepEqual(parseArgs(["add", "--consent-by", "学生本人", "--variant", "--date", "2026-05-01"]), { cmd: "add", opts: { consentBy: "学生本人", variant: true, date: "2026-05-01" } });
  assert.deepEqual(replay([]).status, null);
});

test("命令行：输出 JSON；没建档退出码 3；参数有误退出码 2", () => {
  const dir = mkdtempSync(join(tmpdir(), "notebook-cli-"));
  const run = (...args) => spawnSync(process.execPath, [script, ...args, "--store", dir], { encoding: "utf-8" });
  try {
    const refused = run("add", "--date", "2026-05-01", "--subject", "math", "--concept", "浮力", "--dimension", "C");
    assert.equal(refused.status, 3);
    assert.match(JSON.parse(refused.stderr).error, /还没有建档/);
    assert.equal(run("init", "--consent-by", "学生与监护人").status, 0);
    const added = run("add", "--date", "2026-05-01", "--subject", "physics", "--concept", "浮力", "--dimension", "C");
    assert.equal(added.status, 0);
    assert.deepEqual([JSON.parse(added.stdout).errorId, JSON.parse(added.stdout).status], ["err-20260501-001", "待处理"]);
    assert.equal(run("nonsense").status, 2);
    assert.equal(run("add", "--date", "bad").status, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

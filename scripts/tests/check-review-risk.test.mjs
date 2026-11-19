// check-review-risk.mjs 的回归测试（node:test，npm run check 里也跑）：触发句、观察词与已过审基线。
import { test } from "node:test";
import assert from "node:assert/strict";

globalThis.__reviewRiskLibraryOnly = true;   // 只加载函数，不扫仓库
const rr = await import("../check-review-risk.mjs");

const data = {
  triggers: [{ match: ["与作业总量协调"], platform: "SkillHub", label: "内容含涉政内容", found: "2026-11-06", where: "测试" }],
  watch: { 双减类政策用语: ["作业总量", "双减"], 敏感类别名: ["方针政策", "政治制度", "意识形态"] },
};
const files = (map) => [Object.keys(map), (f) => map[f]];

test("触发句：逐行比对，去掉空白后命中就报（中间夹了空格也算）", () => {
  const [list, read] = files({ "a.md": "第一行\n每天复习 与作业 总量协调。\n" });
  const { triggers } = rr.scan(data, list, read);
  assert.equal(triggers.length, 1);
  assert.equal(triggers[0].line, 2);
});

test("观察词：只提示基线之外的行；同一行改过字也算新出现", () => {
  const [list, read] = files({ "a.md": "全科作业总量由老师统筹。\n按双减要求。\n" });
  const before = rr.scan(data, list, read).hits;
  const keys = rr.baselineKeys({ entries: rr.toBaseline(before) });
  assert.equal(rr.fresh(before, keys).length, 0);
  const [list2, read2] = files({ "a.md": "全科作业总量由老师统筹安排。\n按双减要求。\n新加：双减。\n" });
  const after = rr.scan(data, list2, read2).hits;
  assert.deepEqual(rr.fresh(after, keys).map((h) => h.line), [1, 3]);
});

test("一行里 3 个以上敏感类别名记为成串", () => {
  const [list, read] = files({ "a.md": "涉及方针政策、政治制度、意识形态的表述照录教材。\n只有政治制度。\n" });
  const { hits } = rr.scan(data, list, read);
  assert.deepEqual(hits.map((h) => h.categories), [3, 1]);
});

test("本仓库：没有已查实的触发句；观察词都在已过审的基线里", async () => {
  const { readFileSync } = await import("node:fs");
  const { join, dirname, resolve } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const real = JSON.parse(readFileSync(join(root, "scripts", "review-risk.json"), "utf-8"));
  const baseline = JSON.parse(readFileSync(join(root, "scripts", "snapshots", "review-risk-baseline.json"), "utf-8"));
  const { triggers, hits } = rr.scan(real, rr.sourceFiles(root), (f) => readFileSync(join(root, f), "utf-8"));
  assert.equal(triggers.length, 0);
  assert.equal(rr.fresh(hits, rr.baselineKeys(baseline)).length, 0);
});

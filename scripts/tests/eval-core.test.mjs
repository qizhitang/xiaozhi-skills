// 回归运行器纯逻辑的测试。这里不调 API：对话循环用假的 ask() 驱动。
// 运行：node --test scripts/tests/eval-core.test.mjs（也在 npm run check 里）
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseDescription, listSkills, parseKinds, filterCases, listSkillFiles, makeReadFile, runWithFiles,
  routingCandidates, scoreRouting, routable, NONE,
} from "../lib/eval-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function tmpSkill() {
  const dir = mkdtempSync(join(tmpdir(), "eval-core-"));
  mkdirSync(join(dir, "shared"));
  mkdirSync(join(dir, "references"));
  writeFileSync(join(dir, "SKILL.md"), "---\nname: x\n---\n正文");
  writeFileSync(join(dir, "shared", "vocab.md"), "词表内容");
  writeFileSync(join(dir, "references", "a.md"), "参考内容");
  writeFileSync(join(dir, "references", "run.sh"), "echo hi");
  return dir;
}

test("parseDescription：折叠块拼成一行，单行原样", () => {
  assert.equal(parseDescription("---\nname: a\ndescription: >\n  第一句。\n  第二句。\ncompatibility: x\n---\n"), "第一句。第二句。");
  assert.equal(parseDescription('---\ndescription: "单行"\n---\n'), "单行");
  assert.equal(parseDescription("没有 frontmatter"), "");
});

test("listSkills：仓库里每个技能都取得到非空 description，且不把 shared/references 当技能", () => {
  const skills = listSkills(root);
  assert.ok(skills.length >= 80, `只找到 ${skills.length} 个`);
  assert.deepEqual(skills.filter((s) => !s.description).map((s) => s.name), []);
  assert.ok(skills.every((s) => s.name.startsWith("xiaozhi-")));
  assert.equal(new Set(skills.map((s) => s.name)).size, skills.length);
});

test("parseKinds / filterCases", () => {
  assert.equal(parseKinds(""), null);
  assert.deepEqual(parseKinds("crisis, consent"), ["crisis", "consent"]);
  assert.throws(() => parseKinds("crisis,bogus"), /bogus/);
  const cases = [{ kind: "trigger" }, { kind: "crisis" }, { kind: "consent" }];
  assert.equal(filterCases(cases, null).length, 3);
  assert.deepEqual(filterCases(cases, ["crisis", "consent"]).map((c) => c.kind), ["crisis", "consent"]);
});

test("listSkillFiles：列 .md/.json，不含 SKILL.md 与其他类型", () => {
  const dir = tmpSkill();
  try { assert.deepEqual(listSkillFiles(dir).map((f) => f.path), ["references/a.md", "shared/vocab.md"]); }
  finally { rmSync(dir, { recursive: true }); }
});

test("makeReadFile：只放行技能目录内的 .md/.json", () => {
  const dir = tmpSkill();
  try {
    const read = makeReadFile(dir);
    assert.deepEqual(read("shared/vocab.md"), { ok: true, content: "词表内容" });
    assert.equal(read("../outside.md").ok, false);
    assert.equal(read("/etc/hosts").ok, false);
    assert.equal(read("references/run.sh").ok, false);
    assert.equal(read("references/missing.md").ok, false);
    assert.equal(read("shared").ok, false);
    assert.equal(read("").ok, false);
    assert.equal(read(undefined).ok, false);
  } finally { rmSync(dir, { recursive: true }); }
});

test("runWithFiles：读文件 → 结果回填 → 最终回复；助手 content 原样放回", async () => {
  const dir = tmpSkill();
  try {
    const thinking = { type: "thinking", thinking: "", signature: "sig" };
    const turns = [
      { stop_reason: "tool_use", content: [thinking, { type: "text", text: "我先看一下" },
        { type: "tool_use", id: "t1", name: "read_file", input: { path: "shared/vocab.md" } },
        { type: "tool_use", id: "t2", name: "read_file", input: { path: "../secret.md" } }] },
      { stop_reason: "end_turn", content: [{ type: "text", text: "最终回复" }] },
    ];
    const seen = [];
    const r = await runWithFiles({ ask: async (m) => { seen.push(structuredClone(m)); return turns.shift(); }, user: "你好", readFile: makeReadFile(dir) });
    assert.deepEqual({ text: r.text, stop: r.stop, refusal: r.refusal, steps: r.steps }, { text: "最终回复", stop: "end_turn", refusal: null, steps: 2 });
    assert.deepEqual(r.filesRead, ["shared/vocab.md"]);
    // 第二次请求：user、原样的 assistant（含思考块）、一条 user 里放两个 tool_result
    const second = seen[1];
    assert.equal(second.length, 3);
    assert.deepEqual(second[1].content[0], thinking);
    assert.deepEqual(second[2].content, [
      { type: "tool_result", tool_use_id: "t1", content: "词表内容" },
      { type: "tool_result", tool_use_id: "t2", content: "只能读本技能目录内的文件：../secret.md", is_error: true },
    ]);
  } finally { rmSync(dir, { recursive: true }); }
});

test("runWithFiles：拒答、截断原样带出；一直读文件到轮数用尽记 tool_loop", async () => {
  const refuse = await runWithFiles({ ask: async () => ({ stop_reason: "refusal", stop_details: { category: "cyber" }, content: [] }), user: "x", readFile: () => ({ ok: false, error: "" }) });
  assert.deepEqual([refuse.stop, refuse.refusal], ["refusal", "cyber"]);
  const cut = await runWithFiles({ ask: async () => ({ stop_reason: "max_tokens", content: [{ type: "text", text: "半句" }] }), user: "x", readFile: () => ({ ok: false, error: "" }) });
  assert.equal(cut.stop, "max_tokens");
  let n = 0;
  const loop = await runWithFiles({
    ask: async () => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id: `t${n++}`, name: "read_file", input: { path: "a.md" } }] }),
    user: "x", readFile: () => ({ ok: true, content: "c" }), maxSteps: 3,
  });
  assert.deepEqual([loop.stop, loop.steps, loop.filesRead.length], ["tool_loop", 3, 3]);
});

test("routingCandidates：默认同一端，route_to 在另一端时补进来；all 与开发者工具用全库", () => {
  const skills = [
    { name: "s-a", side: "student" }, { name: "s-b", side: "student" },
    { name: "t-a", side: "teacher" }, { name: "tool", side: "tools" },
  ];
  assert.deepEqual(routingCandidates(skills, "s-a", "s-b").map((s) => s.name), ["s-a", "s-b"]);
  assert.deepEqual(routingCandidates(skills, "s-a", "t-a").map((s) => s.name), ["s-a", "s-b", "t-a"]);
  assert.deepEqual(routingCandidates(skills, "s-a", null).map((s) => s.name), ["s-a", "s-b"]);
  assert.equal(routingCandidates(skills, "s-a", null, "all").length, 4);
  assert.equal(routingCandidates(skills, "tool", null).length, 4);
  assert.throws(() => routingCandidates(skills, "nope", null), /nope/);
});

test("scoreRouting：五种结果", () => {
  const trig = { kind: "trigger", expect: { activate: true } };
  assert.equal(scoreRouting(trig, "me", "me"), "correct");
  assert.equal(scoreRouting(trig, "me", NONE), "missed");
  assert.equal(scoreRouting(trig, "me", "other"), "lost");
  const away = { kind: "no-trigger", expect: { activate: false, route_to: "neighbor" } };
  assert.equal(scoreRouting(away, "me", "neighbor"), "correct");
  assert.equal(scoreRouting(away, "me", "me"), "stolen");
  assert.equal(scoreRouting(away, "me", NONE), "other");
  const nobody = { kind: "no-trigger", expect: { activate: false, route_to: null } };
  assert.equal(scoreRouting(nobody, "me", NONE), "correct");
  assert.equal(scoreRouting(nobody, "me", "me"), "stolen");
  assert.equal(scoreRouting(nobody, "me", "third"), "other");
});

test("routable：只有带 activate 的 trigger / no-trigger 进路由评测", () => {
  assert.equal(routable({ kind: "trigger", expect: { activate: true } }), true);
  assert.equal(routable({ kind: "no-trigger", expect: { activate: false, route_to: null } }), true);
  assert.equal(routable({ kind: "crisis", expect: { must: ["x"] } }), false);
  assert.equal(routable({ kind: "trigger", expect: { must: ["x"] } }), false);
});

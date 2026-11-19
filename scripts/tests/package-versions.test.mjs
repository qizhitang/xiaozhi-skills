// package-versions.mjs 的回归测试（node:test，npm run check 里也跑）：在临时目录搭一个小仓库，
// 核对内容哈希、未发布改动的识别、升版只升有改动的技能、清单与版本号的一致性检查。
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

globalThis.__packageVersionsLibraryOnly = true;   // 只加载函数，不跑命令行
const pv = await import("../package-versions.mjs");

const skillMd = (name, ver, body = "正文") =>
  `---\nname: ${name}\ndescription: 测试\nlicense: MIT\nmetadata:\n  display_name: ${name}\n  version: ${ver}\n  author: t\n---\n\n# ${name}\n\n${body}\n`;

function fixture({ git = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "pkgver-"));
  const put = (p, text) => { mkdirSync(join(root, p, ".."), { recursive: true }); writeFileSync(join(root, p), text); };
  put("package.json", JSON.stringify({ name: "t", version: "1.0.0", contractVersion: "1.0.0" }));
  put("student/math/skill-a/SKILL.md", skillMd("skill-a", "1.0.0"));
  put("student/math/skill-a/references/r.md", "参考资料\n");
  put("student/math/skill-a/shared/vocab.md", "共享约定副本\n");
  put("student/math/skill-b/SKILL.md", skillMd("skill-b", "1.0.0"));
  put("teacher/general/skill-c/SKILL.md", skillMd("skill-c", "1.0.0"));
  if (git) {
    put(".gitignore", "*.tmp\n");
    execFileSync("git", ["init", "-q"], { cwd: root });
  }
  return { root, put, read: (p) => readFileSync(join(root, p), "utf-8"), done: () => rmSync(root, { recursive: true, force: true }) };
}
const setPkgVersion = (fx, v) => fx.put("package.json", JSON.stringify({ name: "t", version: v, contractVersion: "1.0.0" }));

test("内容哈希：只改版本号、换成 CRLF 都不算改动；正文与附带文件改了才算", () => {
  const fx = fixture();
  const dir = "student/math/skill-a", h0 = pv.hashPackage(dir, fx.root);
  fx.put(`${dir}/SKILL.md`, skillMd("skill-a", "9.9.9"));
  assert.equal(pv.hashPackage(dir, fx.root), h0);
  fx.put(`${dir}/SKILL.md`, skillMd("skill-a", "1.0.0").replace(/\n/g, "\r\n"));
  assert.equal(pv.hashPackage(dir, fx.root), h0);
  fx.put(`${dir}/SKILL.md`, skillMd("skill-a", "1.0.0", "正文改了"));
  assert.notEqual(pv.hashPackage(dir, fx.root), h0);
  fx.put(`${dir}/SKILL.md`, skillMd("skill-a", "1.0.0"));
  fx.put(`${dir}/shared/vocab.md`, "共享约定副本改了\n");
  assert.notEqual(pv.hashPackage(dir, fx.root), h0);
  fx.done();
});

test("git 仓库里，被 .gitignore 忽略的文件不打包、不进哈希", () => {
  const fx = fixture({ git: true });
  const dir = "student/math/skill-a", h0 = pv.hashPackage(dir, fx.root);
  fx.put(`${dir}/notes.tmp`, "本地草稿\n");
  pv.status(fx.root);   // 统计时重新列文件
  assert.equal(pv.hashPackage(dir, fx.root), h0);
  assert.ok(!pv.packageFiles(dir, fx.root).includes("notes.tmp"));
  fx.done();
});

test("setVersion 只改 frontmatter 里 version 那一行", () => {
  const before = skillMd("skill-a", "1.0.0", "正文里也写着 version: 1.0.0");
  const after = pv.setVersion(before, "1.2.3");
  assert.equal(pv.readVersion(after), "1.2.3");
  assert.deepEqual(after.split("\n").filter((l, i) => l !== before.split("\n")[i]), ["  version: 1.2.3"]);
});

test("未发布的改动：改了的、新加的、删掉的分开列", () => {
  const fx = fixture();
  pv.init(fx.root);
  assert.deepEqual(pv.pending(pv.status(fx.root)), { changed: [], added: [], removed: [] });
  fx.put("student/math/skill-a/references/r.md", "参考资料改了\n");
  fx.put("teacher/general/skill-d/SKILL.md", skillMd("skill-d", "1.0.0"));
  rmSync(join(fx.root, "student/math/skill-b"), { recursive: true });
  assert.deepEqual(pv.pending(pv.status(fx.root)), { changed: ["skill-a"], added: ["skill-d"], removed: ["skill-b"] });
  assert.deepEqual(pv.check(pv.status(fx.root)), []);   // 开发中有未发布的改动是正常的，不报错
  fx.done();
});

test("升版：只有改了的和新加的技能升到新版本，其余不动；清单与 package.json 对上后核对通过", () => {
  const fx = fixture();
  pv.init(fx.root);
  fx.put("student/math/skill-a/SKILL.md", skillMd("skill-a", "1.0.0", "正文改了"));
  fx.put("teacher/general/skill-d/SKILL.md", skillMd("skill-d", "0.0.0"));
  setPkgVersion(fx, "1.0.1");
  const { bumped } = pv.write("1.0.1", fx.root);
  assert.deepEqual(bumped, ["skill-a", "skill-d"]);
  assert.equal(pv.readVersion(fx.read("student/math/skill-a/SKILL.md")), "1.0.1");
  assert.equal(pv.readVersion(fx.read("teacher/general/skill-d/SKILL.md")), "1.0.1");
  assert.equal(pv.readVersion(fx.read("student/math/skill-b/SKILL.md")), "1.0.0");
  const st = pv.status(fx.root);
  assert.deepEqual(pv.check(st), []);
  assert.deepEqual(pv.pending(st), { changed: [], added: [], removed: [] });
  assert.equal(JSON.parse(fx.read("scripts/snapshots/package-versions.json")).release, "1.0.1");
  fx.done();
});

test("核对报错：手改了技能版本号、版本高于发布版本、清单的发布版本与 package.json 不符、缺契约版本", () => {
  const fx = fixture();
  pv.init(fx.root);
  fx.put("student/math/skill-b/SKILL.md", skillMd("skill-b", "0.9.0"));
  fx.put("teacher/general/skill-c/SKILL.md", skillMd("skill-c", "2.0.0"));
  let errors = pv.check(pv.status(fx.root));
  assert.ok(errors.some((e) => e.includes("skill-b") && e.includes("不要手改")));
  assert.ok(errors.some((e) => e.includes("skill-c") && e.includes("高于发布版本")));
  fx.put("package.json", JSON.stringify({ name: "t", version: "1.0.1" }));
  errors = pv.check(pv.status(fx.root));
  assert.ok(errors.some((e) => e.includes("release 是 1.0.0")));
  assert.ok(errors.some((e) => e.includes("contractVersion")));
  fx.done();
});

test("升版拒绝：新版本不高于清单的发布版本，或有技能版本号被手改过", () => {
  const fx = fixture();
  pv.init(fx.root);
  assert.throws(() => pv.write("1.0.0", fx.root), /不高于/);
  fx.put("student/math/skill-b/SKILL.md", skillMd("skill-b", "0.9.0"));
  assert.throws(() => pv.write("1.0.1", fx.root), /版本号与清单不一致/);
  fx.done();
});

test("本仓库：清单与各技能版本号一致", () => {
  assert.deepEqual(pv.check(pv.status()), []);
});

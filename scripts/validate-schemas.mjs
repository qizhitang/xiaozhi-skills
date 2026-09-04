#!/usr/bin/env node
// 校验全库 JSON Schema 自身有效性 + examples/ 下示例数据 + 关键枚举与 shared/vocab.md 一致。
// 用法：npm run check:schemas
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_VERSION = JSON.parse(readFileSync(join(root, "package.json"), "utf-8")).version;
const schemas = [
  "student/general/xiaozhi-learning-dna/schemas/dna-profile.schema.json",
  "student/general/xiaozhi-skill-coordinator/schemas/handover-protocol.schema.json",
  "teacher/independent/schemas/solo-teacher-workspace.schema.json",
  "teacher/general/schemas/class-teaching-workspace.schema.json",
];
const ERROR_DIM = ["概念模糊", "计算失误", "读题失误", "方法用错"];
const WEAK = ["待处理", "初步弱项", "突破中", "顽固弱项", "已攻克"];
const MASTERY = ["会复述", "会解释", "真正掌握"];

let failed = false;
const fail = (m) => { failed = true; console.error("❌ " + m); };
const ok = (m) => console.log("✅ " + m);

for (const rel of schemas) {
  const p = join(root, rel);
  if (!existsSync(p)) { fail(`schema 不存在：${rel}`); continue; }
  const schema = JSON.parse(readFileSync(p, "utf-8"));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  let validate;
  try { validate = ajv.compile(schema); ok(`schema 有效：${rel}`); }
  catch (e) { fail(`schema 编译失败：${rel} → ${e.message}`); continue; }

  const exDir = join(dirname(p), "examples");
  if (existsSync(exDir)) {
    for (const f of readdirSync(exDir).filter((x) => x.endsWith(".json"))) {
      const data = JSON.parse(readFileSync(join(exDir, f), "utf-8"));
      if (validate(data)) ok(`示例通过：${relative(root, join(exDir, f))}`);
      else fail(`示例不合规：${relative(root, join(exDir, f))}\n${JSON.stringify(validate.errors, null, 2)}`);
    }
  }
  // 枚举一致性（与 shared/vocab.md）
  const text = JSON.stringify(schema);
  const has = (arr) => text.includes(JSON.stringify(arr));
  if (rel.includes("dna-profile")) {
    if (!has(ERROR_DIM)) fail("dna-profile：errorDimension 枚举与 vocab §1 不一致");
    if (!has(WEAK)) fail("dna-profile：weaknessStatus 枚举与 vocab §4 不一致");
    if (!has(MASTERY)) fail("dna-profile：masteryLevel 枚举与 vocab §6 不一致");
    for (const bad of ["概念理解错误", "审题习惯问题", "策略选择错误"]) if (text.includes(bad)) fail(`dna-profile 仍含废弃词：${bad}`);
    for (const k of ["consentGivenBy", "ageBand", "parentSharingConsent", "emotionSharingWithParent", "teacherWritebackConsent"]) if (!text.includes(`"${k}"`)) fail(`dna-profile 缺授权位：${k}`);
    for (const k of ["subjectExtensions", "extensions", "safetyRecord"]) if (!schema.properties[k]) fail(`dna-profile 缺顶层扩展：${k}`);
  }
  // 版本号必须与 package.json 一致（shared/vocab.md：全库单一版本）
  if (rel.includes("dna-profile")) {
    const sv = schema.properties.meta.properties.schemaVersion.enum;
    if (sv.length !== 1 || sv[0] !== REPO_VERSION) fail(`dna-profile：schemaVersion 应为 ["${REPO_VERSION}"]，实为 ${JSON.stringify(sv)}`);
    else ok(`schemaVersion 与仓库版本一致：${REPO_VERSION}`);
  }
  if (rel.includes("handover")) {
    const n = schema.properties.sender.enum.length;
    if (n < 57) fail(`handover：sender 枚举仅 ${n} 个，应覆盖全库 SKILL`);
    if (!has(ERROR_DIM)) fail("handover：basicDimension 枚举与 vocab §1 不一致");
    if (!schema.properties.handoverType.enum.includes("deep_analysis_writeback")) fail("handover：缺 deep_analysis_writeback");
    if (!schema.properties.handoverType.enum.includes("reminder_enqueue")) fail("handover：缺 reminder_enqueue");
    const pv = schema.properties.protocolVersion.enum;
    if (pv.length !== 1 || pv[0] !== REPO_VERSION) fail(`handover：protocolVersion 应为 ["${REPO_VERSION}"]，实为 ${JSON.stringify(pv)}`);
    else ok(`protocolVersion 与仓库版本一致：${REPO_VERSION}`);
  }
  if (rel.includes("solo-teacher")) {
    const st = schema.$defs.homeworkFollowup.properties.status.enum;
    if (st.includes("overdue")) fail("solo-teacher：status 不应含 overdue，逾期由 overdueDays 派生");
    if (!schema.$defs.homeworkFollowup.properties.overdueDays) fail("solo-teacher：缺 overdueDays");
    if (!schema.$defs.lessonLog.properties.date) fail("solo-teacher：lessonLog 缺 date");
    if (!schema.$defs.coursePackage.properties.expiryDate) fail("solo-teacher：coursePackage 缺 expiryDate");
    if (!schema.$defs.lessonEvent.properties.status.enum.includes("trial")) fail("solo-teacher：lessonEvent.status 缺 trial");
    if (!schema.$defs.studentCard.properties.guardianCommunicationPreference.enum) fail("solo-teacher：guardianCommunicationPreference 必须为 enum");
  }
}

// 跨 schema：solo-teacher 与 dna-profile 的 SKILL 名集合应与目录一致
const skillDirs = [];
for (const side of ["student", "teacher"]) for (const cat of readdirSync(join(root, side))) {
  const cp = join(root, side, cat);
  if (!existsSync(join(cp))) continue;
  for (const d of readdirSync(cp)) if (existsSync(join(cp, d, "SKILL.md"))) skillDirs.push(d);
}
const hs = JSON.parse(readFileSync(join(root, schemas[1]), "utf-8"));
const missing = skillDirs.filter((d) => !hs.properties.sender.enum.includes(d));
if (missing.length) fail("handover sender 枚举缺少目录中的 SKILL：" + missing.join(", "));
else ok(`handover sender/recipient 覆盖全部 ${skillDirs.length} 个 SKILL`);

if (failed) { console.error("\nschema 校验未通过。"); process.exit(1); }
console.log("\n🎉 schema 校验全部通过");

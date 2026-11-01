// sync-shared.mjs 裁剪规则的回归测试（node:test，npm run check 里也跑）。
// 裁剪引擎的正确性原来只靠两件事：副本能被 Ajv 编译、--check 重跑结果一致——两者都查不出“裁多了”或“裁少了”。
// 这里每条用例对应一条写在 sync-shared.mjs 注释里的规则，或一次真实出过的问题（标了版本号的）。
// 全库实际的裁剪结果另有 scripts/snapshots/x-skill-scope.json 快照，由 sync-shared --check 核对。
import { test } from "node:test";
import assert from "node:assert/strict";

globalThis.__syncSharedLibraryOnly = true;   // 只加载裁剪函数，不执行同步
const { mentioned, parseReadWrite, scopeJson, scopeSummary, formatSnapshot } = await import("../sync-shared.mjs");

const lines = (...ls) => ls.join("\n");

// ---------- mentioned：正文是否在非否定语境下提到某个键 ----------

test("mentioned：ASCII 键按整词匹配，中文键按子串匹配", () => {
  assert.equal(mentioned("读取 extensions.notes 里的笔记", "extensions.notes"), true);
  assert.equal(mentioned("读取 extensions.notesCount", "extensions.notes"), false);
  assert.equal(mentioned("写入概念图谱", "概念图谱"), true);
});

test("mentioned：同一行里否定词在键之前不算提到，在键之后照算", () => {
  assert.equal(mentioned("❌ 不读 emotionDimension", "emotionDimension"), false);
  assert.equal(mentioned("本技能不写 safetyRecord", "safetyRecord"), false);
  assert.equal(mentioned("读 safetyRecord，但不写", "safetyRecord"), true);
});

test("mentioned：行尾是顿号或冒号的否定列表，把否定带到下一行", () => {
  const text = lines("❌ 不读：conceptGraph（概念图谱）、", "  emotionDimension、", "  weakKnowledgePoints");
  assert.equal(mentioned(text, "emotionDimension"), false);
  assert.equal(mentioned(text, "weakKnowledgePoints"), false);
  // 续行自己写了“读”，否定就不再往下带
  assert.equal(mentioned(lines("❌ 不读：conceptGraph、", "读 emotionDimension"), "emotionDimension"), true);
});

test("mentioned：“字段 → 由 X 维护”整行视为否定", () => {
  assert.equal(mentioned("stubbornCount → 由学情分析师维护", "stubbornCount"), false);
  assert.equal(mentioned("reminder_enqueue 不在本 SKILL 的范围", "reminder_enqueue"), false);
});

test("mentioned：“本 SKILL 不承诺”否定的是承诺，不是同一行的键", () => {
  const line = "回看提醒 → reminder_enqueue，由 IM 提醒合并发送；本 SKILL 不承诺“我会在 X 时提醒你”";
  assert.equal(mentioned(line, "reminder_enqueue"), true);
});

// ---------- parseReadWrite：老师端 SKILL.md 的“读：/写：”声明块 ----------

test("parseReadWrite：路径后的括号列子字段，读与写分开收", () => {
  const rw = parseReadWrite(lines(
    "读：",
    "  - classWorkspace.weaknessRank（knowledgePoint / errorRate）",
    "写：",
    "  - classWorkspace.lessonPlans",
    "",
    "正文",
  ));
  assert.deepEqual([...rw.read.keys()], ["weaknessRank"]);
  assert.deepEqual([...rw.read.get("weaknessRank")].sort(), ["errorRate", "knowledgePoint"]);
  assert.deepEqual([...rw.write.keys()], ["lessonPlans"]);
  assert.equal(rw.write.get("lessonPlans").size, 0);
});

test("parseReadWrite：声明头的括号说明跨行也认（v2.1.10 漏认，组卷技能的写范围成了空的）", () => {
  const rw = parseReadWrite(lines(
    "写（一律先生成待确认条目，",
    "老师确认后再落库）：",
    "  - classWorkspace.examPapers",
  ));
  assert.deepEqual([...rw.write.keys()], ["examPapers"]);
});

test("parseReadWrite：→ 解释行折到下一行的续行仍是解释，不收成子字段（v2.2.0：写明不读的字段进了读范围）", () => {
  const rw = parseReadWrite(lines(
    "读：",
    "  - classWorkspace.weaknessRank.knowledgePoint",
    "    → 只取知识点名，用来排复习顺序；",
    "    errorRate / dimension / stubbornCount 属错因域，本 SKILL 不读",
  ));
  assert.deepEqual([...rw.read.get("weaknessRank")], ["knowledgePoint"]);
});

test("parseReadWrite：紧跟在“不写/❌”后面的路径不算", () => {
  const rw = parseReadWrite(lines(
    "写：",
    "  - classWorkspace.weaknessRank（knowledgePoint）；不写 classWorkspace.studentWeaknesses",
  ));
  assert.deepEqual([...rw.write.keys()], ["weaknessRank"]);
  assert.deepEqual([...rw.write.get("weaknessRank")], ["knowledgePoint"]);
});

// ---------- scopeJson：按技能裁剪 schema 副本 ----------

const DNA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.test/dna",
  title: "学习DNA",
  type: "object",
  required: ["basicInfo"],
  properties: {
    basicInfo: { type: "object" },
    extensions: { type: "object", properties: { notes: { type: "object" }, focus: { type: "object" } } },
    safetyRecord: { type: "object" },
  },
};

test("scopeJson：档案副本只留正文提到的 extensions 分支，头部写明分发对象与范围", () => {
  const out = JSON.parse(scopeJson("dna-profile.schema.json", JSON.stringify(DNA), "xiaozhi-demo",
    "笔记写进 extensions.notes。不读 safetyRecord。", "student/general/xiaozhi-demo"));
  assert.equal(out["x-distributed-to"], "xiaozhi-demo");
  assert.deepEqual(out["x-skill-scope"].paths, ["extensions.notes"]);
  assert.deepEqual(Object.keys(out.properties), ["extensions"]);
  assert.deepEqual(Object.keys(out.properties.extensions.properties), ["notes"]);
  assert.deepEqual(out.required, []);
});

const WORKSPACE = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.test/class-workspace",
  title: "班级教学工作空间",
  type: "object",
  properties: {
    weaknessRank: { type: "array", items: { $ref: "#/$defs/weak" } },
    lessonPlans: { type: "array", items: { $ref: "#/$defs/plan" } },
    studentWeaknesses: { type: "array", items: { $ref: "#/$defs/studentWeak" } },
  },
  $defs: {
    weak: {
      type: "object",
      required: ["weaknessId"],
      properties: { weaknessId: { type: "string" }, knowledgePoint: { type: "string" }, errorRate: { type: "number" }, stubbornCount: { type: "integer" } },
    },
    plan: { type: "object", properties: { topic: { type: "string" } } },
    studentWeak: { type: "object", properties: { studentAlias: { type: "string" } } },
  },
};

test("scopeJson：工作区副本以读写声明为准，只留声明的子字段（v2.11.1：整条可写时副本授予了 stubbornCount）", () => {
  const text = lines(
    "读：",
    "  - classWorkspace.weaknessRank（knowledgePoint / errorRate）",
    "写：",
    "  - classWorkspace.weaknessRank（knowledgePoint）",
    "",
  );
  const copy = scopeJson("class-teaching-workspace.schema.json", JSON.stringify(WORKSPACE), "xiaozhi-demo", text, "teacher/general/xiaozhi-demo");
  const out = JSON.parse(copy);
  const scope = out["x-skill-scope"];
  assert.deepEqual(scope.reads, ["weaknessRank"]);
  assert.deepEqual(scope.writes, ["weaknessRank"]);
  assert.deepEqual(scope.fields.weaknessRank, { reads: ["knowledgePoint", "errorRate"], writes: ["knowledgePoint"] });
  assert.deepEqual(Object.keys(out.properties), ["weaknessRank"]);
  // 没人引用的定义删掉；保留的定义只留声明的子字段加 required
  assert.deepEqual(Object.keys(out.$defs), ["weak"]);
  assert.deepEqual(Object.keys(out.$defs.weak.properties), ["weaknessId", "knowledgePoint", "errorRate"]);
  assert.deepEqual(scopeSummary(copy), {
    paths: ["weaknessRank"],
    reads: ["weaknessRank"],
    writes: ["weaknessRank"],
    fields: { weaknessRank: { reads: ["errorRate", "knowledgePoint"], writes: ["knowledgePoint"] } },
  });
});

const HANDOVER = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.test/handover",
  title: "交接协议",
  type: "object",
  properties: {
    protocolVersion: { type: "string" },
    handoverType: {
      type: "string",
      enum: ["wrong_answer_handover", "reminder_enqueue", "profile_writeback"],
      description: "交接类型：wrong_answer_handover=错题交接；reminder_enqueue=提醒入队；profile_writeback=档案回写",
    },
    sender: { type: "string", enum: ["xiaozhi-demo", "xiaozhi-correction-notebook", "xiaozhi-learning-dna"] },
    recipient: { type: "string", enum: ["xiaozhi-correction-notebook", "xiaozhi-math-error-dna", "xiaozhi-im-reminder", "xiaozhi-learning-dna"] },
    payload: {
      type: "object",
      properties: {
        wrongAnswerData: {
          type: "object",
          properties: { subject: { enum: ["math", "physics", "chemistry"] }, basicDimension: {}, chemistryDimension: {}, physicsBasicDimension: {} },
        },
        reminderData: { type: "object" },
        profileData: { type: "object" },
      },
    },
  },
  allOf: [
    { if: { properties: { handoverType: { const: "wrong_answer_handover" } } }, then: { properties: { payload: { required: ["wrongAnswerData"] } } } },
    { if: { properties: { handoverType: { const: "reminder_enqueue" } } }, then: { properties: { payload: { required: ["reminderData"] } } } },
    { if: { properties: { handoverType: { const: "profile_writeback" } } }, then: { properties: { payload: { required: ["profileData"] } } } },
  ],
};

test("scopeJson：交接协议按提到的交接类型裁剪，收件方走固定路由，发件方只剩本技能", () => {
  const copy = scopeJson("handover-protocol.schema.json", JSON.stringify(HANDOVER), "xiaozhi-demo",
    "复习提醒 → reminder_enqueue，交给 IM 提醒合并发送。", "student/general/xiaozhi-demo");
  const out = JSON.parse(copy);
  assert.deepEqual(out["x-skill-scope"].paths, ["reminder_enqueue"]);
  assert.deepEqual(out.properties.handoverType.enum, ["reminder_enqueue"]);
  assert.equal(out.properties.handoverType.description, "reminder_enqueue=提醒入队");
  assert.deepEqual(out.properties.recipient.enum, ["xiaozhi-im-reminder"]);
  assert.deepEqual(out.properties.sender.enum, ["xiaozhi-demo"]);
  assert.deepEqual(Object.keys(out.properties.payload.properties), ["reminderData"]);
  assert.equal(out.allOf.length, 1);
  assert.deepEqual(scopeSummary(copy), { paths: ["reminder_enqueue"], sender: ["xiaozhi-demo"], recipient: ["xiaozhi-im-reminder"] });
});

test("scopeJson：学科学生端的错题交接只发通用错题本，学科枚举与维度字段只留本学科（2.8.0 扫描复核）", () => {
  const out = JSON.parse(scopeJson("handover-protocol.schema.json", JSON.stringify(HANDOVER), "xiaozhi-demo",
    "错题 → wrong_answer_handover，交给通用错题本。", "student/chemistry/xiaozhi-demo"));
  assert.deepEqual(out.properties.recipient.enum, ["xiaozhi-correction-notebook"]);
  const wa = out.properties.payload.properties.wrongAnswerData.properties;
  assert.deepEqual(wa.subject.enum, ["chemistry"]);
  assert.ok("chemistryDimension" in wa && "basicDimension" in wa);
  assert.ok(!("physicsBasicDimension" in wa));
  // 方向写死：本技能 → 通用错题本
  assert.deepEqual(out.allOf.at(-1).then, { properties: { sender: { const: "xiaozhi-demo" }, recipient: { const: "xiaozhi-correction-notebook" } } });
});

// ---------- 快照格式 ----------

test("formatSnapshot：字符串数组写成一行，其余照常缩进，结尾换行", () => {
  assert.equal(
    formatSnapshot({ a: { paths: ["x", "y"], none: [] } }),
    '{\n  "a": {\n    "paths": ["x", "y"],\n    "none": []\n  }\n}\n',
  );
});

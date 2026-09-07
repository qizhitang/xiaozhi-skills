#!/usr/bin/env node
// 把仓库根 shared/ 的六份共享约定同步进每个 SKILL 目录，使单个技能包自包含。
//
// 为什么需要：SKILL 正文用 `shared/vocab.md` 这类路径引用共享约定。整库使用时相对仓库根
// 可解析；但从技能市场按单个技能安装后，技能被放到 <skills 目录>/<技能名>/，此时只有
// 技能目录内的 shared/ 才能解析到。两处都存在时，两种用法都成立。
//
// 用法：
//   node scripts/sync-shared.mjs          写入/更新副本
//   node scripts/sync-shared.mjs --check  只校验是否与源一致（CI 用，不写文件）
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sharedDir = join(root, "shared");
const checkOnly = process.argv.includes("--check");

const BANNER =
  "<!-- 本文件由 scripts/sync-shared.mjs 从仓库根 shared/ 自动生成，用于让单个技能包自包含。\n" +
  "     请勿直接编辑；需要修改请改仓库根目录下的同名文件，然后运行 npm run sync:shared -->\n\n";

// 一、全库共享约定：仓库根 shared/*.md，分发到每个 SKILL
const sources = readdirSync(sharedDir)
  .filter((f) => f.endsWith(".md"))
  .sort()
  .map((f) => ({ name: f, body: readFileSync(join(sharedDir, f), "utf-8") }));

if (!sources.length) {
  console.error("❌ 仓库根 shared/ 下没有 .md 文件");
  process.exit(1);
}

// 二、跨技能契约：源文件留在归属技能内，只分发给正文引用它的技能（归属技能自己不复制）。
// 新增一项只需在此加一行，并把 SKILL.md 里的引用写成 shared/<as>。
const CONTRACTS = [
  {
    as: "handover-protocol.schema.json",
    src: "student/general/xiaozhi-skill-coordinator/schemas/handover-protocol.schema.json",
    owner: "xiaozhi-skill-coordinator",
  },
  {
    as: "dna-profile.schema.json",
    src: "student/general/xiaozhi-learning-dna/schemas/dna-profile.schema.json",
    owner: "xiaozhi-learning-dna",
  },
  {
    as: "english-error-dimension-table.md",
    src: "student/english/xiaozhi-english-grammar-coach/references/english-error-dimension-table.md",
    owner: "xiaozhi-english-grammar-coach",
  },
  {
    as: "chinese-error-dimension-table.md",
    src: "student/chinese/xiaozhi-chinese-reading-decoder/references/chinese-error-dimension-table.md",
    owner: "xiaozhi-chinese-reading-decoder",
  },
  {
    as: "physics-diagram-guide.md",
    src: "student/physics/xiaozhi-physics-problem-coach/references/physics-diagram-guide.md",
    owner: "xiaozhi-physics-problem-coach",
  },
  {
    as: "ebbinghaus-schedule.md",
    src: "student/general/xiaozhi-im-reminder/references/ebbinghaus-schedule.md",
    owner: "xiaozhi-im-reminder",
  },
  {
    as: "cross-subject-connections.md",
    src: "student/general/xiaozhi-learning-dna/references/cross-subject-connections.md",
    owner: "xiaozhi-learning-dna",
  },
  {
    as: "experiment-types.md",
    src: "teacher/physics/xiaozhi-teach-physics-experiment-coach/references/experiment-types.md",
    owner: "xiaozhi-teach-physics-experiment-coach",
  },
  {
    as: "class-teaching-workspace.schema.json",
    src: "teacher/general/schemas/class-teaching-workspace.schema.json",
    toDirs: ["teacher/general", "teacher/math", "teacher/physics", "teacher/chinese", "teacher/english"],
    owner: null, // 包级 schema，不归属某个技能
  },
  {
    as: "solo-teacher-workspace.schema.json",
    src: "teacher/independent/schemas/solo-teacher-workspace.schema.json",
    toDirs: ["teacher/independent"],
    owner: null, // 包级 schema，不归属某个技能
  },
  {
    as: "wrong-answer-handover.example.json",
    src: "student/general/xiaozhi-skill-coordinator/schemas/examples/wrong-answer-handover.example.json",
    owner: "xiaozhi-skill-coordinator",
  },
  {
    as: "reminder-enqueue.example.json",
    src: "student/general/xiaozhi-skill-coordinator/schemas/examples/reminder-enqueue.example.json",
    owner: "xiaozhi-skill-coordinator",
  },
  {
    as: "deep-analysis-writeback.example.json",
    src: "student/general/xiaozhi-skill-coordinator/schemas/examples/deep-analysis-writeback.example.json",
    owner: "xiaozhi-skill-coordinator",
  },
  {
    // shared/crisis-exception.md 在每个包里都指向它，所以发给全部技能（含归属技能）
    as: "crisis-referral-protocol.md",
    src: "student/general/xiaozhi-learning-dna/references/crisis-referral-protocol.md",
    owner: null,
    toAll: true,
  },
].map((c) => {
  const p = join(root, c.src);
  if (!existsSync(p)) { console.error(`❌ 契约源文件不存在：${c.src}`); process.exit(1); }
  return { ...c, body: readFileSync(p, "utf-8") };
});

// 收集全部 SKILL 目录
function findSkillDirs(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if ([".git", "node_modules", ".claude", "docs", "scripts", "shared"].includes(name)) continue;
    const p = join(dir, name);
    if (!statSync(p).isDirectory()) continue;
    if (existsSync(join(p, "SKILL.md"))) acc.push(p);
    else findSkillDirs(p, acc);
  }
  return acc;
}
const skillDirs = findSkillDirs(root).sort();

const rel = (p) => relative(root, p).replace(/\\/g, "/");
// 比较时统一行尾：git 的 autocrlf 会在检出时把 LF 转成 CRLF，
// 逐字节比较会在 Windows 上误报“与源不一致”。
const norm = (s) => s.split(String.fromCharCode(13)).join("");
// schema 副本按目标技能裁剪 + 标注范围。扫描器把随包 schema 当成该技能自己的数据契约，
// 所以副本只保留该技能正文里“非否定语境”提到的字段子树，其余删掉；并在头部写明范围与出处。
// 判定“否定语境”：同一行里字段名之前出现 不读/不写/❌/不碰/… ；
// 行尾是 、：, 的列表会把否定状态带到下一行（“❌ 不读：a（…）、↵ b、c”）。
const NEG = /不读|不写|不碰|不含|不做|不看|不改|不据此|不得|不进入|不用于|不可见|不发|不生成|不接收|不主动|❌|排除|白名单以外|以外的/;
function mentioned(skillText, key) {
  const lines = skillText.split(String.fromCharCode(10));
  // ASCII 标识符按整词匹配；中文没有词边界，按子串匹配
  const esc = key.replace(/[.$]/g, (c) => String.fromCharCode(92) + c);
  const re = /^[\x00-\x7f]+$/.test(key) ? new RegExp(String.fromCharCode(92) + "b" + esc + String.fromCharCode(92) + "b") : new RegExp(esc);
  let carry = false;
  for (const raw of lines) {
    const line = raw.trim();
    const cont = carry && /^[\s·\-•→]*/.test(raw) && !/^#|^\|/.test(line);
    const m = re.exec(line);
    if (m) {
      const before = line.slice(0, m.index);
      const owned = /(→|->|—>)\s*.*(由|归|交给|交).*(维护|负责|唯一写入|写入)|不在本 SKILL|本 SKILL 不|它写|它维护|由它/.test(line);
      const negHere = owned || NEG.test(before) || (cont && !/(?<!不)(读|写|访问|使用)/.test(before));
      if (!negHere) return true;
    }
    carry = (NEG.test(line) || cont) && /[、：:,，]\s*$/.test(line);
  }
  return false;
}
// SKILL.md 里的“读：/写：”声明块（老师端工作区技能都有）：随后缩进列出 workspace.xxx / classWorkspace.xxx 路径，
// 路径后面的 .a / .b、或下一行的 a / b / c 是子字段。返回 { read: Map<顶层键, Set<子字段>>, write: 同 }
// 学习DNA 档案主 schema（裁剪写回副本的扩展分支时要看它有哪些子分支）
const DNA_MASTER = (() => { let cached; return () => { if (cached !== undefined) return cached; const c = CONTRACTS.find((x) => x.as === "dna-profile.schema.json"); try { cached = c ? JSON.parse(c.body) : null; } catch { cached = null; } return cached; }; })();
// SKILL.md 里的“读：/写：”声明块（老师端工作区技能都有）：随后缩进列出 workspace.xxx / classWorkspace.xxx 路径，
// 路径后面的 .a / .b、或下一行的 a / b / c 是子字段。声明头的括号说明可以跨行（“写（一律先生成待确认条目，↵ …）：”）。
// 返回 { read: Map<顶层键, Set<子字段>>, write: 同 }
function parseReadWrite(skillText) {
  const out = { read: new Map(), write: new Map() };
  let mode = null, lastKey = null, inHeader = false;
  for (const raw of skillText.split(String.fromCharCode(10))) {
    const line = raw.replace(/\r$/, "");
    let body;
    if (inHeader) {
      if (!/[）)]\s*[：:]/.test(line)) continue;           // 还在说明括号里
      inHeader = false; lastKey = null;
      body = line.replace(/^[^：:]*[）)]\s*[：:]\s*/, "");
      if (!body.trim()) continue;
    } else {
      const head = line.match(/^\s*(读|写)(?:[（(][^）)]*[）)])?[：:]\s*(.*)$/);
      const openHead = head ? null : line.match(/^\s*(读|写)[（(]/);
      if (head) { mode = head[1] === "读" ? "read" : "write"; lastKey = null; body = head[2]; if (!body) continue; }
      else if (openHead) { mode = openHead[1] === "读" ? "read" : "write"; lastKey = null; inHeader = true; continue; }
      else if (!mode) continue;
      else if (!/^\s/.test(line) || /^\s*$/.test(line)) { mode = null; lastKey = null; continue; }
      else body = line;
    }
    if (/^\s*→/.test(body)) continue;                                   // 解释行
    const map = out[mode];
    const addFields = (seg, key) => {
      if (!key) return;
      const set = map.get(key) || new Set(); map.set(key, set);
      for (const f of seg.matchAll(/(?:^|[\s./（(、,，›])([a-z][A-Za-z0-9_]*)(?=\s*(?:\[\]|[\s/）),，、›（({}]|$))/g)) set.add(f[1]);
    };
    const re = /(?:workspace|classWorkspace)\.([A-Za-z][A-Za-z0-9]*)/g;
    let m, cursor = 0;
    while ((m = re.exec(body))) {
      if (cursor < m.index && lastKey) addFields(body.slice(cursor, m.index), lastKey);
      cursor = m.index + m[0].length;
      if (/(不写|不读|不碰|不改|不含|不动|❌)\s*$/.test(body.slice(0, m.index))) { lastKey = null; continue; }   // 否定语境里的键不算
      lastKey = m[1]; if (!map.has(lastKey)) map.set(lastKey, new Set());
    }
    if (lastKey) addFields(body.slice(cursor), lastKey);
  }
  return out;
}
function scopeJson(name, body, skillName, skillText, dirRel) {
  let obj;
  try { obj = JSON.parse(body); } catch { return body; }
  const props = obj.properties || {};
  const top = Object.keys(props);
  const keep = new Set(), paths = [];
  const isDna = /dna-profile/.test(name);
  for (const k of top) {
    if (isDna && (k === "subjectExtensions" || k === "extensions") && props[k] && props[k].properties) {
      const subs = Object.keys(props[k].properties).filter((s) => mentioned(skillText, k + "." + s));
      if (subs.length) {
        keep.add(k);
        const kept = {};
        for (const s of subs) {
          let inner = props[k].properties[s];
          // 学科分支内的子项（语文的 grammarErrorProfile / writingStyle / readingPits / materialUsage …）也只留正文提到的；
          // 一个都没提到就整支保留（不知道它用哪些）
          if (k === "subjectExtensions" && inner && inner.properties) {
            const all = Object.keys(inner.properties);
            const ks = all.filter((f) => mentioned(skillText, f) || mentioned(skillText, s + "." + f));
            if (ks.length && ks.length < all.length) {
              const keepF = new Set([...ks, ...(Array.isArray(inner.required) ? inner.required : [])]);
              inner = { ...inner, properties: Object.fromEntries(Object.entries(inner.properties).filter(([f]) => keepF.has(f))) };
              ks.forEach((f) => paths.push(k + "." + s + "." + f));
            } else paths.push(k + "." + s);
          } else paths.push(k + "." + s);
          kept[s] = inner;
        }
        props[k] = { ...props[k], properties: kept };
      }
      continue;
    }
    if (mentioned(skillText, k)) { keep.add(k); paths.push(k); }
  }
  // 工作区 schema：SKILL.md 有显式“读：/写：”声明块时以它为准（比“提到过”精确），并把只读/写分开写进 x-skill-scope；
  // 声明里列了子字段的键，只留列出的子字段（加上 required）；只写了键名的整块保留
  let rwScope = null, roleNote = "";
  const RECEIVERS = { "xiaozhi-learning-dna": true, "xiaozhi-im-reminder": true };
  if (/-workspace\.schema\.json$/.test(name)) {
    const rw = parseReadWrite(skillText);
    const rk = [...rw.read.keys()].filter((k) => k in props), wk = [...rw.write.keys()].filter((k) => k in props);
    if (rk.length || wk.length) {
      keep.clear(); paths.length = 0;
      for (const k of new Set([...rk, ...wk])) { keep.add(k); paths.push(k); }
      rwScope = { reads: rk.slice().sort(), writes: wk.slice().sort(), fields: {} };
      const wanted = new Map();   // 被引用的定义对象 → 该保留的子字段（同一定义被多个键引用时取并集）
      for (const k of keep) {
        const rf = [...(rw.read.get(k) || [])], wf = [...(rw.write.get(k) || [])];
        const fields = new Set([...rf, ...wf]);
        const node = props[k];
        const target = (node && node.type === "array" && node.items) ? node.items : node;
        const resolved = target && typeof target.$ref === "string" && target.$ref.startsWith("#/$defs/") ? (obj.$defs || {})[target.$ref.slice(8)] : target;
        if (!resolved || !resolved.properties) continue;
        const has = (f) => f in resolved.properties;
        const info = {}; if (rf.some(has)) info.reads = rf.filter(has); if (wf.some(has)) info.writes = wf.filter(has);
        if (Object.keys(info).length) rwScope.fields[k] = info;
        if (!fields.size) continue;
        const set = wanted.get(resolved) || new Set(); wanted.set(resolved, set);
        fields.forEach((f) => set.add(f));
      }
      for (const [def, fields] of wanted) {
        const have = Object.keys(def.properties).filter((f) => fields.has(f));
        if (!have.length) continue;
        const keepF = new Set([...have, ...(Array.isArray(def.required) ? def.required : [])]);
        def.properties = Object.fromEntries(Object.entries(def.properties).filter(([f]) => keepF.has(f)));
      }
    }
  }
  // 交接协议：按正文提到的交接类型裁剪枚举与 if/then
  let kinds = null;
  if (/handover-protocol/.test(name)) {
    const enumAll = (((props.handoverType || {}).enum) || []);
    kinds = enumAll.filter((k) => mentioned(skillText, k));
    for (const k of ["sessionId", "protocolVersion", "handoverType", "sender", "recipient", "payload", "timestamp", "consent"]) if (k in props) keep.add(k);
    if (kinds.length) {
      props.handoverType = { ...props.handoverType, enum: kinds };
      // if 有 const 也有 enum 两种写法：任一保留类型命中就留下这条 if/then
      const kindsOf = (c) => { const h = c && c.if && c.if.properties && c.if.properties.handoverType; if (!h) return null; if (h.const) return [h.const]; if (Array.isArray(h.enum)) return h.enum; return null; };
      if (Array.isArray(obj.allOf)) obj.allOf = obj.allOf.filter((c) => { const ks = kindsOf(c); return !ks || ks.some((k) => kinds.includes(k)); });
      // payload 只留保留类型 then.required 到的分支
      const needed = new Set();
      for (const c of obj.allOf || []) { const req = c && c.then && c.then.properties && c.then.properties.payload && c.then.properties.payload.required; if (Array.isArray(req)) req.forEach((r) => needed.add(r)); }
      if (props.payload && props.payload.properties && needed.size) props.payload = { ...props.payload, properties: Object.fromEntries(Object.entries(props.payload.properties).filter(([k]) => needed.has(k))) };
      // 再裁一层：profileData.updateTarget 枚举 + 对应子字段、reminderData.type 枚举、consent 字段
      const pp = props.payload && props.payload.properties;
      const TARGET_FIELD = { concept_graph: "graphUpdates", emotion_dimension: "emotionUpdates", growth_milestones: "milestone", subject_extension: "subjectExtensionPatch", extension: "extensionPatch", safety_record: "safetyRecordEntry", weak_knowledge_points: "weakKnowledgePointUpdates", interest_dna: "interestUpdates" };
      const TARGET_KIND = (v) => (v === "subject_extension" || v === "extension") ? "subject_profile_writeback" : "profile_writeback";
      let keptTargets = null;   // 本副本最终保留的写回目标（没有 profileData 的副本为 null）
      if (pp && pp.profileData && pp.profileData.properties && pp.profileData.properties.updateTarget && Array.isArray(pp.profileData.properties.updateTarget.enum)) {
        const allT = pp.profileData.properties.updateTarget.enum;
        const TARGET_ALIASES = {
          concept_graph: ["graphUpdates", "conceptGraph", "concept_graph", "概念图谱"],
          emotion_dimension: ["emotionUpdates", "learningEmotion", "情绪维度"],
          growth_milestones: ["milestone", "milestones", "growthTrack", "里程碑", "成长轨迹"],
          subject_extension: ["subjectExtensionPatch", "subjectExtensions"],
          extension: ["extensionPatch", "extensions."],
          safety_record: ["safetyRecordEntry", "safety_record"],
          weak_knowledge_points: ["weakKnowledgePointUpdates", "weakKnowledgePoints", "weak_knowledge_points"],
          interest_dna: ["interestUpdates", "interestDNA", "interest_dna", "兴趣DNA", "兴趣档案"],
        };
        let keepT = allT.filter((v) => mentioned(skillText, v) || (TARGET_ALIASES[v] || []).some((a) => mentioned(skillText, a)));
        // 目标必须与保留的交接类型配套：subject_extension/extension 走 subject_profile_writeback，其余走 profile_writeback。
        // 类型没保留的目标不可达，留着只会被读成“文档与枚举矛盾”
        keepT = keepT.filter((v) => kinds.includes(TARGET_KIND(v)));
        // 一个都没命中：按交接类型兜底——只做学科写回的技能，目标就是本学科的扩展分支
        if (!keepT.length && kinds.includes("subject_profile_writeback")) keepT = allT.filter((v) => v === "subject_extension");
        if (!keepT.length && kinds.includes("profile_writeback")) keepT = allT.filter((v) => TARGET_KIND(v) === "profile_writeback" && v !== "safety_record" && v !== "emotion_dimension");
        keptTargets = keepT.length ? keepT : allT;
        if (keepT.length && keepT.length < allT.length) {
          const dropF = new Set(allT.filter((v) => !keepT.includes(v)).map((v) => TARGET_FIELD[v]).filter(Boolean));
          const sub = Object.fromEntries(Object.entries(pp.profileData.properties).filter(([k]) => !dropF.has(k)));
          sub.updateTarget = { ...pp.profileData.properties.updateTarget, enum: keepT };
          // extension 时：extensionPatch 只开放正文提到的 extensions.<分支>（与档案副本的裁剪口径一致）
          const dnaM = DNA_MASTER();
          const extDefs = dnaM && dnaM.properties && dnaM.properties.extensions && dnaM.properties.extensions.properties;
          if (sub.extensionPatch && extDefs) {
            const subs = Object.keys(extDefs).filter((s) => mentioned(skillText, "extensions." + s));
            if (subs.length) sub.extensionPatch = { type: "object", description: `extension 时：只允许写 ${subs.map((s) => "extensions." + s).join("、")}`, properties: Object.fromEntries(subs.map((s) => [s, { type: "object" }])), additionalProperties: false };
          }
          // updateTarget 的说明文字按“目标：说明；目标：说明”分段，只留保留目标那几段
          const ud = pp.profileData.properties.updateTarget.description;
          if (typeof ud === "string") {
            const segs = ud.split("；").filter((s) => keepT.some((k) => s.trim().startsWith(k + "：")));
            if (segs.length) sub.updateTarget.description = segs.join("；"); else delete sub.updateTarget.description;
          }
          pp.profileData = { ...pp.profileData, properties: sub, required: Array.isArray(pp.profileData.required) ? pp.profileData.required.filter((r) => !dropF.has(r)) : pp.profileData.required };
          // profileData 内层按 updateTarget 写的条件分支：目标没保留的删掉；删空了就整个去掉（allOf 不能为空数组）
          if (Array.isArray(pp.profileData.allOf)) {
            const inner = pp.profileData.allOf.filter((c) => { const u = c && c.if && c.if.properties && c.if.properties.updateTarget; return !u || !u.const || keepT.includes(u.const); });
            if (inner.length) pp.profileData.allOf = inner; else delete pp.profileData.allOf;
          }
        }
      }
      // 顶层 allOf 里按 payload.profileData.updateTarget 写的条件（情绪/兴趣授权位）：目标没保留的删掉
      if (Array.isArray(obj.allOf)) {
        const tgtOf = (c) => { const pl = c && c.if && c.if.properties && c.if.properties.payload; const pd = pl && pl.properties && pl.properties.profileData; const u = pd && pd.properties && pd.properties.updateTarget; return u && u.const ? u.const : null; };
        obj.allOf = obj.allOf.filter((c) => { const u = tgtOf(c); return !u || (keptTargets || []).includes(u); });
        if (!obj.allOf.length) delete obj.allOf;
      }
      if (pp && pp.reminderData && pp.reminderData.properties && pp.reminderData.properties.type && Array.isArray(pp.reminderData.properties.type.enum)) {
        const allR = pp.reminderData.properties.type.enum;
        const REMINDER_LABELS = {
          spaced_review: ["复习提醒", "间隔复习", "到期回看", "spaced_review"],
          error_review: ["错题复测", "错题回顾", "复测提醒", "复测", "专项提醒", "error_review"],
          vocab_daily_card: ["词卡", "单词卡", "vocab_daily_card"],
          scheduled_task: ["计划任务", "任务提醒", "scheduled_task"],
          exploration_task: ["探索任务", "探索提醒", "exploration_task"],
          daily_confirmation: ["晚间确认", "每日确认", "时间记录回访", "daily_confirmation"],
          weekly_review: ["周报提醒", "复盘提醒", "每周复盘", "weekly_review"],
          exam_day: ["考试日", "考前提醒", "exam_day"],
        };
        const keepR = allR.filter((v) => (REMINDER_LABELS[v] || [v]).some((a) => mentioned(skillText, a)));
        if (keepR.length && keepR.length < allR.length) pp.reminderData = { ...pp.reminderData, properties: { ...pp.reminderData.properties, type: { ...pp.reminderData.properties.type, enum: keepR } } };
      }
      if (props.consent && props.consent.properties) {
        const always = new Set(["crossSkillSharing", "verifiedAt"]);
        // 分项授权位跟着交接类型/写回目标走：类型或目标保留了，对应授权位必须在（主 schema 的 if/then 引用它）；没保留就删
        const TIED = { reminderConsent: () => kinds.some((k) => /^reminder_/.test(k)), teacherWritebackConsent: () => kinds.includes("teacher_writeback"), emotionTrackingConsent: () => (keptTargets || []).includes("emotion_dimension"), interestTrackingConsent: () => (keptTargets || []).includes("interest_dna") };
        const keepC = Object.keys(props.consent.properties).filter((k) => always.has(k) || (k in TIED ? TIED[k]() : mentioned(skillText, k)));
        if (keepC.length < Object.keys(props.consent.properties).length) props.consent = { ...props.consent, properties: Object.fromEntries(Object.entries(props.consent.properties).filter(([k]) => keepC.includes(k))), required: Array.isArray(props.consent.required) ? props.consent.required.filter((r) => keepC.includes(r)) : props.consent.required };
      }
      // ── 收尾：说明文字 / 条件分支 / 学科枚举 / 学科维度 / 收件方 都裁到与保留类型一致 ──
      // handoverType.description 只留保留类型那几段（原文以“；”分段，每段以 kind= 开头）
      if (props.handoverType && typeof props.handoverType.description === "string") {
        const segs = props.handoverType.description.split("；").filter((s) => kinds.some((k) => s.trim().startsWith(k + "=")));
        if (segs.length) props.handoverType = { ...props.handoverType, description: segs.join("；") };
      }
      // payload 各分支的说明文字里的交接类型名也按保留类型改写（主文件里写的是 profile_writeback / reminder_sync 的旧口径）
      const pp3 = props.payload && props.payload.properties;
      if (pp3 && pp3.profileData) { const wb = kinds.filter((k) => k === "profile_writeback" || k === "subject_profile_writeback"); if (wb.length) pp3.profileData = { ...pp3.profileData, description: `DNA回写专属结构。handoverType 为 ${wb.join(" / ")} 时必填` }; }
      if (pp3 && pp3.reminderData) { const rk = kinds.filter((k) => /^reminder_/.test(k)); if (rk.length) pp3.reminderData = { ...pp3.reminderData, description: `提醒专属结构。handoverType 为 ${rk.join(" / ")} 时必填` }; }
      // if 用 enum 写法的条件分支：把 if 里的枚举也裁到保留类型
      if (Array.isArray(obj.allOf)) obj.allOf = obj.allOf.map((c) => {
        const h = c && c.if && c.if.properties && c.if.properties.handoverType;
        if (h && Array.isArray(h.enum)) return { ...c, if: { ...c.if, properties: { ...c.if.properties, handoverType: { ...h, enum: h.enum.filter((k) => kinds.includes(k)) } } } };
        return c;
      });
      // 学科技能：错题交接的 subject 枚举与学科维度字段只留本学科
      const subj = (dirRel.match(/^(?:student|teacher)\/(math|physics|chinese|english)\//) || [])[1];
      const pp2 = props.payload && props.payload.properties;
      if (subj && pp2 && pp2.wrongAnswerData && pp2.wrongAnswerData.properties) {
        const wp = { ...pp2.wrongAnswerData.properties };
        if (wp.subject && Array.isArray(wp.subject.enum)) wp.subject = { ...wp.subject, enum: [subj] };
        const own = { physics: "physicsBasicDimension", chinese: "chineseDimension", english: "englishDimension", math: null }[subj];
        for (const k of Object.keys(wp)) if (/Dimension$/.test(k) && k !== "basicDimension" && k !== own) delete wp[k];
        pp2.wrongAnswerData = { ...pp2.wrongAnswerData, properties: wp, required: Array.isArray(pp2.wrongAnswerData.required) ? pp2.wrongAnswerData.required.filter((r) => r in wp) : pp2.wrongAnswerData.required };
      }
      if (subj && pp2 && pp2.profileData && pp2.profileData.properties && pp2.profileData.properties.subjectExtensionPatch) {
        const dnaS = DNA_MASTER();
        const subDefs = dnaS && dnaS.properties && dnaS.properties.subjectExtensions && dnaS.properties.subjectExtensions.properties && dnaS.properties.subjectExtensions.properties[subj] && dnaS.properties.subjectExtensions.properties[subj].properties;
        const subKeys = subDefs ? Object.keys(subDefs).filter((k) => mentioned(skillText, k) || mentioned(skillText, subj + "." + k)) : [];
        const branch = subKeys.length ? { type: "object", properties: Object.fromEntries(subKeys.map((k) => [k, { type: "object" }])), additionalProperties: false } : { type: "object" };
        pp2.profileData.properties.subjectExtensionPatch = { type: "object", description: `subject_extension 时：只允许本学科分支 subjectExtensions.${subj}${subKeys.length ? "，且只写 " + subKeys.join("、") : ""}`, properties: { [subj]: branch }, additionalProperties: false };
      }
      // 收件方：按协议的固定路由——写回档案只能到学习DNA，错题交接只能到错题本，提醒只能到 IM 提醒
      const DEST = { wrong_answer_handover: ["xiaozhi-correction-notebook", "xiaozhi-math-error-dna", "xiaozhi-physics-error-dna"], deep_analysis_writeback: ["xiaozhi-correction-notebook"], profile_writeback: ["xiaozhi-learning-dna"], subject_profile_writeback: ["xiaozhi-learning-dna"], reminder_enqueue: ["xiaozhi-im-reminder"], reminder_sync: [], teacher_writeback: ["xiaozhi-learning-dna"] };
      if (props.recipient && Array.isArray(props.recipient.enum)) {
        const fixed = new Set(kinds.flatMap((k) => DEST[k] || []));
        const openKinds = kinds.filter((k) => !(DEST[k] || []).length);   // 路由表没定目的地的类型（reminder_sync）
        const men = openKinds.length ? props.recipient.enum.filter((r) => r !== skillName && mentioned(skillText, r)) : [];
        const rs = props.recipient.enum.filter((r) => (fixed.has(r) || men.includes(r)) && r !== skillName);   // 不会发给自己
        if (rs.length) props.recipient = { ...props.recipient, enum: rs };
      }
      // 纯接收方（学习DNA 收写回、IM 提醒收入队）：sender 是各写入方，recipient 是自己；其余技能 sender 就是自己
      if (RECEIVERS[skillName]) {
        const senders = (props.sender && Array.isArray(props.sender.enum) ? props.sender.enum : []).filter((s) => s !== skillName);
        if (props.sender && senders.length) props.sender = { ...props.sender, enum: senders };
        if (props.recipient && Array.isArray(props.recipient.enum)) props.recipient = { ...props.recipient, enum: skillName === "xiaozhi-learning-dna" ? [skillName] : [...new Set([skillName, ...props.recipient.enum])] };
        roleNote = `本技能是接收方：sender 为各写入方，recipient 为自己；保留全部写回目标与字段以校验来件。`;
      } else if (props.sender && Array.isArray(props.sender.enum) && props.sender.enum.includes(skillName)) props.sender = { ...props.sender, enum: [skillName] };

    }
  }
  const pruned = Object.fromEntries(Object.entries(props).filter(([k]) => keep.has(k)));
  const droppedN = top.length - Object.keys(pruned).length;
  const scopeList = kinds ? kinds : paths.sort();
  const note = rwScope
    ? `本副本随 ${skillName} 分发，已按其 SKILL.md 的“读：/写：”声明裁剪：读 ${rwScope.reads.join("、") || "无"}；写 ${rwScope.writes.join("、") || "无"}（同一键既读又写时，读/写各自的子字段列在 x-skill-scope.fields；各字段只留声明列出的子字段；删去 ${droppedN} 个顶层字段）。完整定义在归属技能处。${roleNote}`
    : scopeList.length
    ? `本副本随 ${skillName} 分发，已按其 SKILL.md 裁剪：只保留正文在非否定语境下提到的${kinds ? "交接类型" : "字段"}（共 ${scopeList.length} 项，删去 ${droppedN} 个顶层字段）。完整定义在归属技能处。读/写权限与授权位以 SKILL.md 为准。${roleNote}`
    : `本副本随 ${skillName} 分发。该技能正文没有在非否定语境下提到本 schema 的任何字段——它不直接读写这份数据，副本仅为交接契约的类型参照；已删去全部 ${droppedN} 个数据字段。`;
  if (isDna && paths.length) obj.description = `学习DNA 档案结构——随 ${skillName} 分发的裁剪副本，只含 ${paths.join("、")}；完整定义见 xiaozhi-learning-dna/schemas/dna-profile.schema.json`;
  const head = {};
  for (const k of ["$schema", "$id", "title"]) if (k in obj) head[k] = obj[k];
  head["x-distributed-to"] = skillName;
  head["x-skill-scope"] = rwScope ? { note, paths: scopeList, ...rwScope } : { note, paths: scopeList };
  for (const [k, v] of Object.entries(obj)) if (!(k in head)) head[k] = (k === "properties") ? pruned : (k === "required" && Array.isArray(v)) ? v.filter((r) => keep.has(r)) : v;
  // $defs 只留被保留部分（递归）引用到的定义：没人引用的定义会被扫描器读成“这个技能还带着这些数据结构”
  if (head.$defs && typeof head.$defs === "object") {
    const refsIn = (v, acc) => {
      if (Array.isArray(v)) v.forEach((x) => refsIn(x, acc));
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { if (k === "$ref" && typeof x === "string" && x.startsWith("#/$defs/")) acc.add(x.slice(8).split("/")[0]); else refsIn(x, acc); }
      return acc;
    };
    const used = refsIn(Object.fromEntries(Object.entries(head).filter(([k]) => k !== "$defs")), new Set());
    let grew = true;
    while (grew) { grew = false; for (const d of [...used]) if (head.$defs[d]) for (const r of refsIn(head.$defs[d], new Set())) if (!used.has(r)) { used.add(r); grew = true; } }
    const kept = Object.fromEntries(Object.entries(head.$defs).filter(([k]) => used.has(k)));
    if (Object.keys(kept).length) head.$defs = kept; else delete head.$defs;
  }
  return JSON.stringify(head, null, 2) + String.fromCharCode(10);
}

let written = 0, stale = [], extra = [];

let contractCopies = 0;

for (const dir of skillDirs) {
  const target = join(dir, "shared");
  const skillName = dir.split(/[\\/]/).pop();
  const skillText = readFileSync(join(dir, "SKILL.md"), "utf-8");

  // 本技能需要的文件 = 全库共享约定 + 正文引用到的跨技能契约
  const wanted = [...sources.map((s) => ({ name: s.name, body: s.body }))];
  for (const c of CONTRACTS) {
    if (!c.toAll) {
      if (c.owner === skillName) continue;               // 归属技能用自己的原件
      // 按目录分发的（老师端工作空间 schema）：该目录下的技能都读写工作空间，不看正文有没有写 shared/ 前缀
      const inDirs = c.toDirs && c.toDirs.some((d) => rel(dir).startsWith(d + "/"));
      if (!inDirs && !skillText.includes(`shared/${c.as}`)) continue; // 没引用就不塞进包里
    }
    wanted.push({ name: c.as, body: c.body });
    contractCopies++;
  }

  if (!checkOnly && !existsSync(target)) mkdirSync(target, { recursive: true });

  for (const { name, body } of wanted) {
    const dest = join(target, name);
    // JSON 不能带 HTML 注释横幅，逐字节复制；Markdown 加"请勿编辑"横幅
    const want = name.endsWith(".schema.json") ? scopeJson(name, body, skillName, skillText, rel(dir)) : name.endsWith(".json") ? body : BANNER + body;
    const cur = existsSync(dest) ? readFileSync(dest, "utf-8") : null;
    if (cur !== null && norm(cur) === norm(want)) continue;
    if (checkOnly) stale.push(`${rel(dest)}${cur === null ? "（缺失）" : "（与源不一致）"}`);
    else { writeFileSync(dest, want, "utf-8"); written++; }
  }

  // 清理不该在这里的文件（源已删除，或正文已不再引用）
  if (existsSync(target)) {
    const allowed = new Set(wanted.map((w) => w.name));
    for (const f of readdirSync(target)) {
      if (allowed.has(f)) continue;
      if (checkOnly) extra.push(rel(join(target, f)));
      else { rmSync(join(target, f)); written++; }
    }
  }
}

if (checkOnly) {
  if (stale.length || extra.length) {
    if (stale.length) {
      console.error(`\n❌ 技能内 shared/ 副本未同步（${stale.length}）：`);
      for (const s of stale.slice(0, 20)) console.error("   " + s);
      if (stale.length > 20) console.error(`   …另有 ${stale.length - 20} 条`);
    }
    if (extra.length) {
      console.error(`\n❌ 技能内 shared/ 存在源中已无的文件（${extra.length}）：`);
      for (const s of extra.slice(0, 20)) console.error("   " + s);
    }
    console.error("\n请运行 npm run sync:shared 后重新提交。\n");
    process.exit(1);
  }
  console.log(`✅ 共享约定副本一致：${skillDirs.length} 个 SKILL × ${sources.length} 份共享约定 + ${contractCopies} 份跨技能契约副本`);
} else {
  console.log(`✅ 已同步：${skillDirs.length} 个 SKILL × ${sources.length} 份共享约定 + ${contractCopies} 份跨技能契约副本，写入/更新 ${written} 个文件`);
}

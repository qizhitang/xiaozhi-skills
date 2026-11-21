#!/usr/bin/env node
// 原型（不随包、没有任何 SKILL 引用它）：智能错题本的“文件 + 脚本”数据层。
//
// 要验证的想法：现在“落库”“28 天内累计 3 次”“状态五档怎么迁移”都写在 SKILL.md 里，由模型在对话中照着做，
// 存到哪里、谁来数，全库没有一处落实。这里把它们变成确定的东西：
//   - 存储：本地一个目录里的 errors.jsonl（只追加的事件流）+ meta.json（建档与同意记录），没有服务端
//   - 计数与状态：按 shared/vocab.md §4、§5 重放事件算出来，同一份输入永远得到同一个结果
//   - 六项控制入口里的查看 / 导出 / 删除 / 暂停，对应 list / export / delete / 不调用本脚本
//   - 同意门：没有 init（建档同意）就拒绝写入，退出码 3——不靠模型记得先问
// 技能正文那边只需要写“登记一条错题：运行 notebook-store add …，把输出里的次数与状态告诉学生”。
//
// 上真实平台前还要回答的三件事（原型回答不了，要实测）：
//   1. WorkBuddy、OpenClaw 上技能自带的脚本能不能跑、用什么运行时（这里是零依赖的 Node）
//   2. 带脚本的包在两个市场的安全扫描里会被怎么判
//   3. 存储目录放哪里：默认 ~/.xiaozhi/correction-notebook，可用 --store 或 XIAOZHI_STORE 换
//
// 用法：
//   node notebook-store.mjs init   --consent-by 学生本人|监护人|学生与监护人
//   node notebook-store.mjs add    --date 2026-05-11 --subject math --concept 一次函数解析式 --dimension 概念模糊 [--subtype B02] [--summary 一句话根因] [--source 作业]
//   node notebook-store.mjs verify --date 2026-05-20 --concept 一次函数解析式 --dimension 概念模糊 [--variant]   # 独立验证做对；--variant = 换题型或纯净版
//   node notebook-store.mjs list   [--today 2026-05-21]            # 每个“知识点 + 维度”的窗口内次数与状态
//   node notebook-store.mjs report --from 2026-03-01 --to 2026-06-30   # 按学科、维度的精确统计
//   node notebook-store.mjs export                                   # 全部原始记录
//   node notebook-store.mjs delete --all --yes | --concept <知识点> --yes
// 输出一律是 JSON。退出码：0 成功；2 参数有误；3 还没建档（没有同意记录）。
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

export const DIMENSIONS = { C: "概念模糊", K: "计算失误", R: "读题失误", M: "方法用错" };
export const STATUSES = ["待处理", "初步弱项", "顽固弱项", "突破中", "已攻克"];
const WINDOW_DAYS = 28;      // vocab §5：滚动 28 天
const STUBBORN_AT = 3;       // 累计 3 次 → 顽固弱项
const HIGH_RISK_AT = 5;      // 累计 5 次 → 高危
const VERIFY_GAP_DAYS = 3;   // 两次独立验证间隔 ≥ 3 天
const RELAPSE_DAYS = 30;     // 已攻克后 30 天内再错 → 突破中

export class StoreError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

// ---------- 日期：一律 YYYY-MM-DD，按天算 ----------
const dayNumber = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  const t = m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== iso) throw new StoreError(`日期要写成 YYYY-MM-DD：${iso}`, 2);
  return Math.round(t / 86400000);
};
const daysBetween = (a, b) => dayNumber(b) - dayNumber(a);

export function normalizeDimension(d) {
  const name = DIMENSIONS[d] || (Object.values(DIMENSIONS).includes(d) ? d : null);
  if (!name) throw new StoreError(`错因维度只能是 ${Object.entries(DIMENSIONS).map(([k, v]) => `${k}/${v}`).join("、")}：${d}`, 2);
  return name;
}

const keyOf = (concept, dimension) => `${concept.trim()}\u0000${dimension}`;

// ---------- 状态机：重放一个“知识点 + 维度”的全部事件（vocab §4、§5） ----------
// 口径上的三处取舍，词表没有逐字写明，这里定下来并由测试锁住：
//   1. 窗口含当天：算第 N 次时，数的是 [当天 − 27 天, 当天] 里有错题的天数（同一天多次只算 1 次）
//   2. “连续 2 次独立验证做对”：两次之间不能再错；这一串做对里任意两次相隔 ≥ 3 天、且其中至少一次是换题型或纯净版，就算攻克
//   3. 已攻克超过 30 天后再错：按新记录重新数（窗口里只有这 1 次就回到待处理）
// 状态只升不降（待处理 → 初步弱项 → 顽固弱项），窗口里的旧错题过期不会让状态自己退回去；退出顽固只能靠验证做对。
const byCount = (n) => (n >= STUBBORN_AT ? "顽固弱项" : n >= 2 ? "初步弱项" : "待处理");
const rank = (s) => ["待处理", "初步弱项", "顽固弱项"].indexOf(s);

export function replay(events) {
  let status = null, streak = [], crackedAt = null;
  const errorDays = [];
  const countAt = (date) => errorDays.filter((d) => { const gap = daysBetween(d, date); return gap >= 0 && gap < WINDOW_DAYS; }).length;
  const steps = [];
  for (const e of events) {
    const from = status;
    if (e.type === "error") {
      streak = [];
      if (!errorDays.includes(e.date)) errorDays.push(e.date);
      const n = countAt(e.date);
      if (status === "已攻克") status = daysBetween(crackedAt, e.date) <= RELAPSE_DAYS ? "突破中" : byCount(n);
      else if (status === "突破中") status = "顽固弱项";
      else if (status !== "顽固弱项") status = rank(byCount(n)) > rank(status) ? byCount(n) : status || "待处理";
      steps.push({ event: e, from, to: status, countInWindow: n });
    } else if (e.type === "verify") {
      if (status === "顽固弱项") { status = "突破中"; streak = [e]; }
      else if (status === "突破中" || status === "初步弱项") {
        const cracked = streak.some((p) => daysBetween(p.date, e.date) >= VERIFY_GAP_DAYS && (p.variant || e.variant));
        if (cracked) { status = "已攻克"; crackedAt = e.date; streak = []; }
        else streak.push(e);
      }
      steps.push({ event: e, from, to: status, countInWindow: countAt(e.date) });
    }
  }
  return { status, steps, countAt, verifyStreak: streak.length, crackedAt };
}

// ---------- 存储 ----------
export function openStore(dir) {
  const metaPath = join(dir, "meta.json"), logPath = join(dir, "errors.jsonl");
  const readEvents = () => (existsSync(logPath) ? readFileSync(logPath, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
  const meta = () => (existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf-8")) : null);
  const requireProfile = () => { if (!meta()?.profileEnabled) throw new StoreError("还没有建档：先征得同意并运行 init，再登记。这一条没有写入。", 3); };
  const ordered = (events) => events.map((e, i) => ({ e, i })).sort((a, b) => dayNumber(a.e.date) - dayNumber(b.e.date) || a.i - b.i).map((x) => x.e);
  const eventsFor = (concept, dimension) => ordered(readEvents().filter((e) => keyOf(e.concept, e.dimension) === keyOf(concept, dimension)));
  const append = (e) => { mkdirSync(dir, { recursive: true }); appendFileSync(logPath, JSON.stringify(e) + "\n"); };
  const need = (v, name) => { if (typeof v !== "string" || !v.trim()) throw new StoreError(`缺少 --${name}`, 2); return v.trim(); };

  return {
    init({ consentBy, today }) {
      const by = need(consentBy, "consent-by");
      if (!["学生本人", "监护人", "学生与监护人"].includes(by)) throw new StoreError(`--consent-by 只能是 学生本人 / 监护人 / 学生与监护人：${by}`, 2);
      mkdirSync(dir, { recursive: true });
      const m = { profileEnabled: true, consentGivenBy: by, createdAt: today || new Date().toISOString().slice(0, 10) };
      writeFileSync(metaPath, JSON.stringify(m, null, 2) + "\n");
      return m;
    },

    add({ date, subject, concept, dimension, subtype, summary, source }) {
      requireProfile();
      dayNumber(need(date, "date"));
      const dim = normalizeDimension(need(dimension, "dimension"));
      const c = need(concept, "concept");
      const sameDay = readEvents().filter((e) => e.type === "error" && e.date === date).length;
      const errorId = `err-${date.replaceAll("-", "")}-${String(sameDay + 1).padStart(3, "0")}`;
      const event = { type: "error", errorId, date, subject: need(subject, "subject"), concept: c, dimension: dim };
      if (subtype) event.subtypeId = subtype;
      if (summary) event.summary = summary;
      if (source) event.source = source;
      const before = replay(eventsFor(c, dim)).status;
      append(event);
      // 结果按“这条记进去之后的现状”报：补录旧错题时，状态与次数以这个知识点最近一次错题那天为准，而不是补录的那天
      const events = eventsFor(c, dim);
      const r = replay(events);
      const errors = events.filter((e) => e.type === "error");
      const asOf = errors.at(-1).date;
      const inWindow = errors.filter((e) => daysBetween(e.date, asOf) < WINDOW_DAYS);
      const count = r.countAt(asOf);
      return {
        errorId, concept: c, basicDimension: dim,
        occurrenceCountInWindow: count, countedAsOf: asOf,
        datesInWindow: [...new Set(inWindow.map((e) => e.date))],
        historyRefs: inWindow.map((e) => e.errorId).filter((id) => id !== errorId),
        status: r.status, previousStatus: before,
        stubbornEvent: r.status === "顽固弱项" && before !== "顽固弱项",   // 为真时该发 wrong_answer_handover（stubborn_weakness）
        highRisk: count >= HIGH_RISK_AT,
      };
    },

    verify({ date, concept, dimension, variant }) {
      requireProfile();
      dayNumber(need(date, "date"));
      const dim = normalizeDimension(need(dimension, "dimension"));
      const c = need(concept, "concept");
      if (!eventsFor(c, dim).some((e) => e.type === "error")) throw new StoreError(`这个知识点和维度下没有错题记录，无从验证：${c} · ${dim}`, 2);
      append({ type: "verify", date, concept: c, dimension: dim, variant: !!variant });
      const r = replay(eventsFor(c, dim));
      const last = r.steps.at(-1);
      return { concept: c, basicDimension: dim, status: last.to, previousStatus: last.from, verifiedInARow: r.verifyStreak, cracked: last.to === "已攻克" && last.from !== "已攻克" };
    },

    list({ today } = {}) {
      const asOf = today || new Date().toISOString().slice(0, 10);
      dayNumber(asOf);
      const groups = new Map();
      for (const e of readEvents()) (groups.get(keyOf(e.concept, e.dimension)) || groups.set(keyOf(e.concept, e.dimension), []).get(keyOf(e.concept, e.dimension))).push(e);
      const items = [...groups.values()].map((evs) => {
        const sorted = ordered(evs), r = replay(sorted), errs = sorted.filter((e) => e.type === "error");
        const n = r.countAt(asOf);
        return { subject: errs[0]?.subject, concept: sorted[0].concept, basicDimension: sorted[0].dimension, status: r.status, countInWindow: n, highRisk: n >= HIGH_RISK_AT, totalErrors: errs.length, lastErrorDate: errs.at(-1)?.date, subtypeIds: [...new Set(errs.map((e) => e.subtypeId).filter(Boolean))] };
      });
      // 最该先看的排前面：顽固 → 突破中 → 初步 → 待处理 → 已攻克；同档按窗口内次数
      const urgency = ["顽固弱项", "突破中", "初步弱项", "待处理", "已攻克"];
      return { asOf, profile: meta(), items: items.sort((a, b) => urgency.indexOf(a.status) - urgency.indexOf(b.status) || b.countInWindow - a.countInWindow) };
    },

    report({ from, to }) {
      dayNumber(need(from, "from")); dayNumber(need(to, "to"));
      const errs = readEvents().filter((e) => e.type === "error" && daysBetween(from, e.date) >= 0 && daysBetween(e.date, to) >= 0);
      const tally = (f) => errs.reduce((acc, e) => { acc[f(e)] = (acc[f(e)] || 0) + 1; return acc; }, {});
      return { from, to, total: errs.length, bySubject: tally((e) => e.subject), byDimension: tally((e) => e.dimension), byConcept: tally((e) => e.concept) };
    },

    export() { return { profile: meta(), events: readEvents() }; },

    delete({ all, concept, yes }) {
      if (!yes) throw new StoreError("删除后不可恢复：确认后加 --yes 再运行", 2);
      if (all) { const n = readEvents().length; rmSync(dir, { recursive: true, force: true }); return { deleted: n, scope: "all", profileRemoved: true }; }
      const c = need(concept, "concept");
      const events = readEvents(), keep = events.filter((e) => e.concept !== c);
      if (existsSync(logPath)) writeFileSync(logPath, keep.map((e) => JSON.stringify(e) + "\n").join(""));
      return { deleted: events.length - keep.length, scope: c };
    },
  };
}

// ---------- 命令行 ----------
export function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    if (!rest[i].startsWith("--")) throw new StoreError(`看不懂的参数：${rest[i]}`, 2);
    const k = rest[i].slice(2).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    if (i + 1 < rest.length && !rest[i + 1].startsWith("--")) opts[k] = rest[++i];
    else opts[k] = true;
  }
  return { cmd, opts };
}

export function main(argv, env = process.env) {
  const { cmd, opts } = parseArgs(argv);
  const store = openStore(typeof opts.store === "string" ? opts.store : env.XIAOZHI_STORE || join(homedir(), ".xiaozhi", "correction-notebook"));
  if (!cmd || !["init", "add", "verify", "list", "report", "export", "delete"].includes(cmd)) throw new StoreError("用法：notebook-store.mjs init | add | verify | list | report | export | delete（见文件开头）", 2);
  return store[cmd](opts);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { console.log(JSON.stringify(main(process.argv.slice(2)), null, 2)); }
  catch (e) {
    if (!(e instanceof StoreError)) throw e;
    console.error(JSON.stringify({ error: e.message }));
    process.exit(e.code);
  }
}

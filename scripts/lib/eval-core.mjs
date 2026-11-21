// 回归运行器共用的纯逻辑：枚举技能、筛用例、按需读文件的对话循环、路由评测的候选与判分。
// 这里不调 API——调用方把 ask() 传进来，所以 scripts/tests/eval-core.test.mjs 能用假的 ask 测它。
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";

export const KINDS = ["trigger", "no-trigger", "degrade", "consent", "crisis"];

// ---------- 技能清单 ----------

// 只取 frontmatter 里的 description（单行，或 > / | 折叠块）。平台路由时模型看到的就是它
export function parseDescription(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0].trim() !== "---") return "";
  for (let i = 1; i < lines.length && lines[i].trim() !== "---"; i++) {
    const m = lines[i].match(/^description:\s*(.*)$/);
    if (!m) continue;
    const val = m[1].trim();
    if (!/^[>|][+-]?$/.test(val)) return val.replace(/^["']|["']$/g, "");
    const buf = [];
    for (i++; i < lines.length && lines[i].trim() !== "---" && (lines[i].startsWith("  ") || lines[i].trim() === ""); i++) buf.push(lines[i].trim());
    return buf.filter(Boolean).join(val.startsWith(">") ? "" : "\n");
  }
  return "";
}

export function listSkills(root) {
  const skills = [];
  for (const side of ["student", "teacher", "tools"]) {
    const base = join(root, side);
    if (!existsSync(base)) continue;
    (function walk(d) {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (!statSync(p).isDirectory() || ["shared", "references", "schemas", "evals"].includes(n)) continue;
        const sk = join(p, "SKILL.md");
        if (existsSync(sk)) skills.push({ name: n, dir: p, side, description: parseDescription(readFileSync(sk, "utf-8")) });
        else walk(p);
      }
    })(base);
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- 用例筛选 ----------

// "--kind=crisis,consent" → ["crisis","consent"]；写了不认识的类别直接报错，免得白跑一轮
export function parseKinds(arg) {
  if (!arg) return null;
  const kinds = arg.split(",").map((s) => s.trim()).filter(Boolean);
  const bad = kinds.filter((k) => !KINDS.includes(k));
  if (bad.length) throw new Error(`不认识的用例类别：${bad.join("、")}（可用：${KINDS.join("、")}）`);
  return kinds;
}

export const filterCases = (cases, kinds) => (kinds ? cases.filter((c) => kinds.includes(c.kind)) : cases);

// ---------- 按需读文件（files 模式） ----------

export const READ_FILE_TOOL = {
  name: "read_file",
  description: "读取本技能目录下的一份文件（shared/、references/、schemas/ 里的 .md 或 .json）。路径相对技能目录，例如 shared/vocab.md。只在回答当前这句话确实需要时才读。",
  strict: true,
  input_schema: {
    type: "object",
    properties: { path: { type: "string", description: "相对技能目录的路径，如 references/error-analysis-framework.md" } },
    required: ["path"],
    additionalProperties: false,
  },
};

// 技能目录里除 SKILL.md 以外可读的文件，连同字符数——相当于智能体在技能目录里 ls 一下
export function listSkillFiles(skillDir) {
  const out = [];
  (function walk(d) {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(md|json)$/.test(n) && p !== join(skillDir, "SKILL.md")) out.push({ path: relative(skillDir, p).split(sep).join("/"), chars: readFileSync(p, "utf-8").length });
    }
  })(skillDir);
  return out;
}

// 返回 read(path) → { ok, content } | { ok: false, error }。只放行技能目录内的 .md / .json，越界与不存在都当工具错误返回给模型
export function makeReadFile(skillDir) {
  const base = resolve(skillDir);
  return (path) => {
    if (typeof path !== "string" || !path.trim()) return { ok: false, error: "path 不能为空" };
    const full = resolve(base, path);
    if (full !== base && !full.startsWith(base + sep)) return { ok: false, error: `只能读本技能目录内的文件：${path}` };
    if (!/\.(md|json)$/.test(full)) return { ok: false, error: `只能读 .md 或 .json：${path}` };
    if (!existsSync(full) || !statSync(full).isFile()) return { ok: false, error: `文件不存在：${path}` };
    return { ok: true, content: readFileSync(full, "utf-8") };
  };
}

const textOf = (content) => content.filter((b) => b.type === "text").map((b) => b.text).join("");

// 一条用例的对话循环：模型要读文件就读给它，直到它给出最终回复。
// ask(messages) → { content, stop_reason, stop_details }（就是 Messages API 的响应）。
// 助手的 content 原样放回 messages（含思考块），同一轮的多个 tool_use 的结果放在同一条 user 消息里。
export async function runWithFiles({ ask, user, readFile, maxSteps = 8 }) {
  const messages = [{ role: "user", content: user }];
  const filesRead = [];
  for (let step = 1; step <= maxSteps; step++) {
    const r = await ask(messages);
    if (r.stop_reason !== "tool_use") {
      return { text: textOf(r.content), stop: r.stop_reason, refusal: r.stop_reason === "refusal" ? (r.stop_details && r.stop_details.category) || "未注明" : null, filesRead, steps: step };
    }
    messages.push({ role: "assistant", content: r.content });
    const results = [];
    for (const b of r.content.filter((b) => b.type === "tool_use")) {
      const path = b.input && b.input.path;
      const got = b.name === "read_file" ? readFile(path) : { ok: false, error: `没有这个工具：${b.name}` };
      if (got.ok) filesRead.push(path);
      results.push(got.ok ? { type: "tool_result", tool_use_id: b.id, content: got.content } : { type: "tool_result", tool_use_id: b.id, content: got.error, is_error: true });
    }
    messages.push({ role: "user", content: results });
  }
  return { text: "", stop: "tool_loop", refusal: null, filesRead, steps: maxSteps };
}

// ---------- 路由评测 ----------

export const NONE = "none";

// 候选集：scope=side 时是同一端（学生端 / 老师端）的全部技能，外加用例点名的 route_to（可能在另一端）；
// scope=all 或开发者工具，用全库。平台上模型就是在这样一组 name + description 里挑的
export function routingCandidates(skills, skillName, routeTo, scope = "side") {
  const self = skills.find((s) => s.name === skillName);
  if (!self) throw new Error(`没有这个技能：${skillName}`);
  if (scope === "all" || self.side === "tools") return skills;
  const set = skills.filter((s) => s.side === self.side);
  const extra = routeTo && !set.some((s) => s.name === routeTo) ? skills.find((s) => s.name === routeTo) : null;
  return extra ? [...set, extra].sort((a, b) => a.name.localeCompare(b.name)) : set;
}

// 路由结果分五种：
//   correct  选对了（trigger 选中本技能；no-trigger 选中 route_to，route_to 为 null 时选 none）
//   missed   trigger 用例里谁也没选（none）
//   lost     trigger 用例被别的技能抢走
//   stolen   no-trigger 用例被本技能抢了——最要紧的一种，说明 description 的边界没立住
//   other    no-trigger 用例没被本技能抢，但也没去 route_to
export function scoreRouting(c, skillName, chosen) {
  if (c.expect.activate === true) return chosen === skillName ? "correct" : chosen === NONE ? "missed" : "lost";
  const want = c.expect.route_to == null ? NONE : c.expect.route_to;
  return chosen === want ? "correct" : chosen === skillName ? "stolen" : "other";
}

export const routable = (c) => (c.kind === "trigger" || c.kind === "no-trigger") && typeof c.expect.activate === "boolean";

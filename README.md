# 🎓 小智伴学 · SKILL 库

> **面向中国 K12 的 AI 学习与教学 SKILL 集合 — 学生端 · 老师端**
> 作者：小智伴学 ｜ 适用平台：WorkBuddy / SkillHub · OpenClaw / ClawHub ｜ 当前版本：**v2.1.0**
> 全库 **57 个 SKILL**（学生端 31 + 老师端 26）+ 1 个开发者工具，**176 份 references**、**6 份共享约定**、**4 份 JSON Schema**（含 8 份示例）、**3 个校验脚本**。

传统 AI 容易被当成"给答案的计算器"。这套 SKILL 库的目标，是把 AI 变成**追问思路的教练**和**减轻教师重复劳动的助手**，并让学生、老师、家长三方在**明确授权**的前提下共享必要的学习证据。

---

## 🧭 设计底座（先读这六份）

全库所有 SKILL 只引用以下共享约定，不再各自定义术语、阈值或降级规则：

| 文件 | 作用 |
|------|------|
| [`shared/vocab.md`](shared/vocab.md) | **唯一词表**：错因四维、学科子类型编码、弱项状态五档、掌握度映射、置信度、授权位、提醒预算、学段、命名与数值规范 |
| [`shared/platform-conventions.md`](shared/platform-conventions.md) | 平台能力代号（记忆/定时/OCR/语音/统计…）、统一降级路径、控制入口段落、提醒入队契约 |
| [`shared/crisis-exception.md`](shared/crisis-exception.md) | 危机例外片段：优先级高于一切熔断、温情转化与家长输出 |
| [`shared/hint-ladder.md`](shared/hint-ladder.md) | 提示阶梯 L0–L6：替代"永远不给答案"的绝对禁令，既不代做也不把学生困死 |
| [`shared/ai-item-check.md`](shared/ai-item-check.md) | AI 出题自检协议：自解 → 唯一解 → 条件充分 → 学段内 → 标注人工复核 |
| [`shared/grade-bands.md`](shared/grade-bands.md) | 学段参数表：作息与免打扰窗口、专注时长、课时、各 SKILL 适用性矩阵 |

安全与隐私边界见 [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md)。

---

## 📦 目录结构

```
xiaozhi-skills/
├── shared/          共享约定源文件（词表 / 平台 / 危机 / 提示阶梯 / 出题自检 / 学段）
│                   —— 由 npm run sync:shared 同步进每个 SKILL 目录，使单技能包自包含
├── student/         学生端 31 个 SKILL
│   ├── general/     通用学习 11 个
│   ├── chinese/     语文 5 个
│   ├── math/        数学 5 个
│   ├── english/     英语 5 个
│   └── physics/     物理 5 个
├── teacher/         老师端 26 个 SKILL
│   ├── general/     通用教学 6 个 + schemas/
│   ├── independent/ 独立教师日常 8 个 + schemas/
│   ├── chinese/     语文教学 3 个
│   ├── math/        数学教学 3 个
│   ├── english/     英语教学 3 个
│   └── physics/     物理教学 3 个
├── tools/           开发者工具（SKILL 编写工具，非学生学习任务）
├── scripts/         CI 校验脚本
└── docs/            架构、安装指南、版本历史、评估报告
```

---

## 🗂️ SKILL 一览

### 学生端 · 通用（11）

| SKILL | 目录 | 做什么 | 适用学段 |
|---|---|---|---|
| 🧬 学习DNA | `student/general/xiaozhi-learning-dna/` | 长期档案层：授权、学科强弱、概念图谱、情绪维度、学科扩展档案 | 小学中段–高中 |
| ❌ 智能错题本 | `student/general/xiaozhi-correction-notebook/` | 全学科错题统一入口，四维错因分类，顽固弱项的唯一计数权威 | 小学中段–高中 |
| ⏰ IM智能提醒 | `student/general/xiaozhi-im-reminder/` | 全库唯一的提醒发送方：队列 + 每日合并摘要 + 学段免打扰 | 小学中段–高中 |
| 🎓 费曼学习法 | `student/general/xiaozhi-feynman-learning/` | 用"讲给小智听"验证真实理解，支架渐退 + 反依赖设计 | 小学中段–高中 |
| 📊 每周学习复盘 | `student/general/xiaozhi-weekly-review/` | 基于证据的周复盘与成长曲线，家庭版需单独授权 | 小学中段–高中 |
| 📝 康奈尔笔记 | `student/general/xiaozhi-cornell-notes/` | 笔记结构化与按需提示，小学高段有两栏简化版 | 小学高段–高中 |
| 🔗 学习系统协调器 | `student/general/xiaozhi-skill-coordinator/` | 跨 SKILL 路由（含学科判别）与交接协议校验 | 小学中段–高中 |
| 🗓️ 30天学习计划制定师 | `student/general/xiaozhi-learning-plan/` | 基于真实数据的计划与执行监控，家庭看板受授权门控 | 小学高段–高中 |
| ⏱️ 时间与专注力教练 | `student/general/xiaozhi-time-focus-coach/` | 时间记录、黄金时段、按学段参数化的番茄钟 | 小学中段–高中 |
| 🔭 跨学科侦探周 | `student/general/xiaozhi-cross-subject-detective/` | 跨学科主题探究与概念图谱联结 | 小学高段–高中 |
| ☕ 兴趣成长探索计划 | `student/general/xiaozhi-interest-explorer/` | 区分浅层喜好与真正兴趣，含 8 周试探版 | 小学中段–高中 |

### 学生端 · 学科专项（20）

| 学科 | SKILL |
|---|---|
| 语文（`student/chinese/`） | 🖊️ 语文写作教练 ｜ 📖 阅读理解拆解师 ｜ 🏛️ 文言文复活计划 ｜ 📚 语文素材库 ｜ 🔍 语病追踪档案 |
| 数学（`student/math/`） | 📐 数学解题教练 ｜ 🧬 数学错误DNA ｜ 💡 数学概念解释器 ｜ 📝 应用题数学建模教练 ｜ 🎯 思维梯度训练师 |
| 英语（`student/english/`） | 🎙️ 英语口语陪练 ｜ 📖 智能词汇DNA系统 ｜ 📝 英语语法突破教练 ｜ 🎧 个性化英语听力训练师 ｜ ✍️ 英语写作进化教练 |
| 物理（`student/physics/`） | 🧲 物理解题教练 ｜ 🧬 物理错误DNA ｜ 💡 物理概念直觉器 ｜ 📐 物理建模教练 ｜ 🔬 物理实验思维教练 |

学科 SKILL 默认基线为**初中**；小学高段可用的已在 `grade_bands` 中标明，超出学段的内容在正文中带 `⚠高中` 标注。

### 老师端（26）

| 场景 | SKILL |
|---|---|
| 通用教学（`teacher/general/`，6） | 教案设计器 ｜ 作业设计师 ｜ 学情分析师 ｜ 课堂互动教练 ｜ 测评设计师 ｜ 复习规划师 |
| 独立教师日常（`teacher/independent/`，8） | 独立教师工作台 ｜ 试听与学员建档 ｜ 排课与课时管理 ｜ 课后记录助手 ｜ 家长沟通助手 ｜ 作业跟进管家 ｜ 阶段报告与续课助手 ｜ 教学资源复用库 |
| 学科教学（12） | 语文 3（写作/阅读/文言文）｜ 数学 3（教案/错因分析/测评）｜ 英语 3（口语/听力/综合测评）｜ 物理 3（教案/实验/解题） |

### 开发者工具

| 工具 | 目录 | 说明 |
|---|---|---|
| 🛠️ SKILL 编写工具 | `tools/xiaozhi-skill-creator/` | 面向想自建 SKILL 的开发者与高中生；不读档案、不发交接、不在收发方枚举内，**不属于**学生日常学习任务 |

---

## 🔌 数据契约

跨 SKILL 的数据流动只能走以下四份 schema，任何 SKILL 正文中的接口路径都必须是这些 schema 中真实存在的字段（由 CI 校验）：

| Schema | 位置 | 承载什么 |
|---|---|---|
| 学习DNA | `student/general/xiaozhi-learning-dna/schemas/dna-profile.schema.json` | 学生长期档案：授权位、学科强弱、概念图谱、情绪、`subjectExtensions`（语数英物）、`extensions`（笔记/专注/计划/项目/理解深度）、`safetyRecord` |
| 交接协议 | `student/general/xiaozhi-skill-coordinator/schemas/handover-protocol.schema.json` | 七类交接：错题交接、深度分析回写、档案回写、学科档案回写、提醒入队、提醒同步、教师写回；发送方需附授权位快照 |
| 独立教师工作空间 | `teacher/independent/schemas/solo-teacher-workspace.schema.json` | 学员卡、课表、课后记录、作业跟进、家长沟通、课时包、进步证据、资源索引 |
| 班级教学工作空间 | `teacher/general/schemas/class-teaching-workspace.schema.json` | 班级画像、教案、课堂记录、作业、双向细目表、逐题得分与 P/D 统计、弱项排序、分层、复习计划 |

---

## 🛡️ 安全与授权

- **授权分主体**：档案与情绪记录区分"学生本人 / 监护人"；小学各学段必须监护人同意；学生与家长共用会话时先确认说话人。
- **家长可见内容有门控**：`parentSharingConsent` 控制学习摘要，`emotionSharingWithParent` 单独控制情绪内容。
- **危机例外优先**：出现自伤、轻生、霸凌、家庭安全等信号时，所有 SKILL 立即停止本流程，按 `shared/crisis-exception.md` 处置，不做低敏美化。
- **控制入口**：每个持有数据的 SKILL 都提供查看 / 更正 / 删除 / 暂停 / 共享控制 / 导出六项口令。
- **最小化记录**：不记真实姓名、联系方式、住址、证件、医疗与家庭信息；学员一律化名或座号。
- **不承诺提分**：不输出"预期提分 X 分"或"治愈焦虑"类表述。

---

## 🤝 在 WorkBuddy 中使用

本库已上架 WorkBuddy 官方技能市场 **SkillHub**（[skillhub.cn](https://skillhub.cn)）。

最省事的装法是在对话里直接说：

```text
安装 小智伴学 智能错题本
```

需要整套使用、或要改内容时，建议整库安装以保持目录结构（全库有 707 处 `shared/` 引用与 39 处跨 SKILL 引用，都相对仓库根目录）：

```bash
git clone https://github.com/qizhitang/xiaozhi-skills.git ~/.workbuddy/skills/xiaozhi-skills
```

之后在 WorkBuddy 里执行 `/reload-skills`。

每个技能包都自带 `shared/` 六份共享约定，跨技能引用的契约与参考资料也按需随包分发，**单技能安装已完全自包含**（58 个技能全部模拟验证，零断链）。完整说明（安装位置、触发与指定、更新卸载、能力降级、装后验证）见 [安装指南](docs/installation-guide.md#-在-workbuddy-中安装)。

---

## ✅ 校验

```bash
npm install
npm run check
```

| 脚本 | 检查什么 |
|---|---|
| `scripts/check-references.mjs` | 引用的 references / schemas 文件真实存在，无孤儿文件 |
| `scripts/check-skills.mjs` | frontmatter 规范、依赖无环、词表一致、占位与重复文件、学段标注、控制入口与危机片段、接口路径存在于 schema、文档一致性 |
| `scripts/validate-schemas.mjs` | 四份 schema 自身有效、8 份 examples 合规、枚举与 `shared/vocab.md` 一致、结构与协议版本号等于 `package.json` |
| `scripts/sync-shared.mjs --check` | 每个 SKILL 目录内的 `shared/` 副本与仓库根源文件逐字节一致 |

---

## 📚 更多文档

- 🏛️ [系统架构与方法论](docs/architecture.md) — 完整清单、协作架构、方法论依据、目录树
- 🗺️ [安装指南](docs/installation-guide.md) — WorkBuddy 安装方式、分阶段安装路径与打包建议
- 🔄 [版本历史](docs/changelog.md) — 版本演进与本轮变更
- 📋 [评估报告 2026-09](docs/review-2026-09.md) — 本轮问题清单与优化路线图

---

> 💡 **小智寄语：**
> "工具不是装得越多越好。先把错题本用熟，再谈其余。
> 真正有用的，是你自己想明白的那一步。"

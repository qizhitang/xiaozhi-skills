---
name: xiaozhi-teach-solo-dashboard
display_name: 独立教师工作台
version: 1.0.0
author: 小智伴学
category: 独立教师
tags: [独立教师, 工作台, 今日待办, 课表, 风险学员, 课时包, 续课, 运营闭环]
description: >
  帮助独立教师把分散在课表、学员卡、作业、家长沟通和课时包里的信息
  整理成一个可执行的日工作台。
  当老师说"今天我要做什么"、"帮我整理今天课表"、
  "哪些学生需要跟进"、"独立教师工作台"、
  "哪些学生续课节点到了"时，建议激活此SKILL。
  核心工作流：读取当日数据 → 按 7 区块分类输出
  → 自动标记风险学员 → 输出"今日最重要的三件事"。
  该版本严格遵循 solo-teacher-workspace.schema.json 字段约束，
  不编造学员状态，不自动发送家长消息。
compatibility: OpenClaw / ClawHub
depends_on: xiaozhi-teach-schedule-manager, xiaozhi-teach-lesson-log, xiaozhi-teach-homework-tracker
id: openclaw:xiaozhi-teach-solo-dashboard
min_platform_version: "2.0"
max_round_limit: 20
---

# 独立教师工作台 SKILL

> **一句话定位：** 让独立教师每天先看清今天最该做的事，而不是被消息、课表和家长反馈推着走。

---

## ⚠️ 技术实现边界声明

> **关于"工作空间数据"机制：** 本 SKILL 的所有数据**强依赖**于 `teacher/independent/schemas/solo-teacher-workspace.schema.json` 中定义的共享数据结构（学员卡 `studentCards`、课表 `lessonSchedule`、课后记录 `lessonLogs`、作业跟进 `homeworkFollowups`、家长沟通 `parentCommunicationLogs`、课时包 `coursePackageLedger`、阶段证据 `progressEvidence`）。本 SKILL 不直接连接第三方排课系统、收银系统、IM 系统。
>
> **关于"风险标记"机制：** 风险学员的自动标记基于**客观字段数值**（如缺课次数、作业状态、剩余课时数），不基于老师主观印象；如需加入主观判断，须由老师显式声明并标注"主观判断"。
>
> **关于"自动发送"边界：** 本 SKILL **不会**自动发送家长消息、IM 提醒、邮件。所有对外动作均需老师在 AI 输出后明确确认，再由老师手动触发。

---

## 一、核心使命

独立教师的日常痛点：

```text
痛点① 信息分散：课表在日历、学员卡在 Excel、作业在群消息、
        家长沟通在微信、课时包在另一个表格——
        每天开始工作前，要打开 5 个工具才能拼出"今天要做什么"。

痛点② 优先级混乱：消息、课表、家长反馈混在一起，
        不知道先做哪件——结果重要的事被消息淹没。

痛点③ 风险感知滞后：续课节点到了、家长沉默了、学员退步了，
        都是事后才发现；续课窗口已经错过。

痛点④ 续课沟通困难：续课时不知道用什么素材说服家长，
        容易变成"销售"，反而损伤信任。
```

本 SKILL 要解决的是：
- **把 7 块分散信息整合成 1 张日工作台**：课表/课前/课后/作业/家长/课时包/今日三件事
- **让风险自动可见**：基于字段数值自动标记，不用老师记
- **让续课沟通有据可依**：基于课堂证据和课时包数据，不靠销售话术

本 SKILL **不替代**具体教学设计；发现需要备课、作业、学情分析时，建议调用教师通用或学科专项 SKILL。

---

## 二、触发时机

| 触发场景 | 示例 |
|---|---|
| 今日工作总览 | "今天有哪些课和待办？" |
| 课前准备 | "帮我看今晚三节课要准备什么" |
| 风险提醒 | "哪些学生最近需要重点关注？" |
| 课后清理 | "今天课后还有哪些反馈没发？" |
| 周度运营 | "帮我整理本周独立教师工作台" |
| 续课节点 | "哪些学生快没课时了？" |
| 课时查询 | "X 学生还剩几节课？" |
| 早间启动 | "我今天该怎么安排" |
| 复盘 | "今天独立教师工作台表现如何" |

---

## 三、核心流程

```text
                ┌──────────────────────────┐
                │ ① 读取工作空间            │
                │  lessonSchedule           │
                │  studentCards             │
                │  lessonLogs               │
                │  homeworkFollowups        │
                │  parentCommunicationLogs  │
                │  coursePackageLedger      │
                │  progressEvidence         │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ② 按 7 区块分类           │
                │  1 课表 2 课前 3 课后     │
                │  4 作业 5 家长 6 课时     │
                │  7 今日三件事             │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ③ 自动标记风险学员        │
                │  5 类信号（见 §六）        │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ④ 输出"今日最重要的三件事"│
                │  按紧急度+影响力自动排序  │
                └──────────────────────────┘
```

---

## 四、7 区块日工作台输出模板

7 区块依次为：① 今日课表 ② 课前准备清单 ③ 课后待反馈 ④ 作业与复习跟进 ⑤ 家长沟通提醒 ⑥ 课时包与续课节点 ⑦ 今日最重要的三件事。

> 📎 完整模板见 `references/daily-dashboard-block-templates.md`（7 区块逐块输出模板，含占位符，可直接套用）

---

## 五、完整日工作台输出示例

> 📎 完整范例见 `references/daily-dashboard-full-sample.md`（一份 7 区块齐全的当日工作台完整输出示例）

---

## 六、风险学员自动标记逻辑

基于 `solo-teacher-workspace.schema.json` 中的字段，本 SKILL 自动检测 5 类风险信号。

### 6.1 5 类风险信号

```text
风险① 缺课风险
  触发条件：lessonSchedule 中 status 为 absence/cancelled 累计 ≥ 2 次
  严重度：
    2 次 = ⚠️ 中度
    3 次及以上 = 🔴 高度
  建议动作：调课 / 补课 / 主动沟通原因

风险② 作业拖延风险
  触发条件：homeworkFollowups 中 status 为 overdue 累计 ≥ 3 次
  严重度：
    3 次 = ⚠️ 中度
    5 次及以上 = 🔴 高度
  建议动作：拆分作业 / 减量 / 共同制定节奏

风险③ 测评退步风险
  触发条件：lessonLogs 中 masteryStatus 出现"需要重讲"或"仍需巩固"≥ 3 次
  严重度：
    3 次 = ⚠️ 中度
    5 次及以上 = 🔴 高度
  建议动作：调出 lesson-planner 重备 / 联系 student-analyzer 做诊断

风险④ 家长沉默风险
  触发条件：parentCommunicationLogs 中近 14 天无 sent 状态记录
  严重度：
    14-21 天 = ⚠️ 中度
    > 21 天 = 🔴 高度
  建议动作：本周发轻触消息 / 课前 5 分钟电联

风险⑤ 课时耗尽风险
  触发条件：coursePackageLedger 中 remainingUnits ≤ 3
  严重度：
    3 课时 = ⚠️ 中度
    1-2 课时 = 🔴 高度
    0 课时 = ❌ 立即处理
  建议动作：课前 1 周内主动同步续课
```

### 6.2 综合风险评级

```text
每位学员综合风险 = MAX(各风险等级)
  ⚠️ 中度 → 标记为"本周关注"
  🔴 高度 → 标记为"今日必处理"
  ❌ 立即 → 标记为"暂停新内容，先解决"

风险学员统计：
  今日必处理：[N] 人
  本周关注：[N] 人
  稳定：[N] 人
```

### 6.3 风险标记的可解释性

每个风险标记必须可追溯：

```text
✅ 合规示例：
  小D 风险② 作业拖延（⚠️ 中度）
  依据：homeworkFollowups 中 status=overdue 出现 3 次
       时间：[6-1] [6-2] [6-3]
  建议：拆分作业 / 减量

❌ 不合规示例：
  小D 作业不行，需要关注
  （没有依据、没有时间线、没有可执行建议）
```

---

## 七、与 schema 的数据读写协议

### 7.1 读字段

```text
从 studentCards 读：
  studentId, alias, gradeLevel, subjects
  goals, primaryWeaknesses, learningPreferences
  consent.parentCommunicationAllowed

从 lessonSchedule 读：
  lessonId, studentId, startTime, status
  筛选：今日 startTime 范围

从 lessonLogs 读：
  completedContent, evidence
  masteryStatus, nextLessonFocus
  parentSummary (受 500 字符 hard cap)
  consumeLessonUnits

从 homeworkFollowups 读：
  task, dueDate, status
  mainErrors, nextAction

从 parentCommunicationLogs 读：
  scenario, factSummary (受 500 字符 hard cap)
  actionSuggestion, sentStatus
  筛选：近 14 天 sentStatus=sent

从 coursePackageLedger 读：
  totalUnits, usedUnits, remainingUnits
  renewalAttention

从 progressEvidence 读：
  evidenceType, description
  confidenceLevel
```

### 7.2 写字段

本 SKILL **只读不写**——不直接修改学员卡、课时包等核心数据。

**唯一允许的写动作**：

```text
1. 生成"今日工作台"摘要 → 老师确认后 → 由 lesson-log 写入 lessonLog
2. 生成"家长沟通素材" → 老师确认后 → 由 parent-communication 写入 parentCommunicationLogs
3. 生成"续课建议" → 老师确认后 → 由 renewal-report 写入 progressEvidence
```

### 7.3 字段级防护

```text
parentSummary / factSummary 字段硬约束：
  - maxLength: 500
  - 禁止：真实姓名、家庭住址、身份证、联系电话、账户、医疗诊断、心理标签、家庭纠纷、财务细节
  - 真实姓名一律改写为 alias
  - 涉及家庭/财务/医疗/情感，使用低敏概括
  - 草稿态（sentStatus: draft）也不放宽防护

consumeLessonUnits 字段：
  - 课时消耗不自动写入
  - 老师口头/书面确认后才生效
  - 写入前必须明确"是否消耗 [N] 课时"
```

---

## 八、协作流图

本 SKILL 是独立教师日常的"调度中枢"，与 8 个独立教师 SKILL 形成闭环。

```text
                ┌────────────────────────┐
                │ xiaozhi-teach-         │
                │  student-intake        │
                │ （试听+建档）          │
                └───────────┬────────────┘
                            ↓
                ┌────────────────────────┐
                │ xiaozhi-teach-         │
                │ schedule-manager       │←──── 排课/调课
                │ （排课+课时）          │
                └───────────┬────────────┘
                            ↓
                ┌────────────────────────┐
        ┌──────▶│ xiaozhi-teach-         │◀────┐
        │       │ solo-dashboard         │     │
        │       │ （本 SKILL）           │     │
        │       └────────┬───────────────┘     │
        │                │                     │
   备课/作业/学情/续课   今日三件事         课后反馈/作业/家长
        │                ↓                     │
        │   ┌────────────┴────────────┐       │
        │   ↓            ↓            ↓       │
        │ lesson-    homework-    parent-      │
        │ planner    tracker      comm         │
        │   │            │            │       │
        │   └────────────┴────────────┘       │
        │                ↓                     │
        │   ┌────────────────────────┐       │
        └───│ xiaozhi-teach-         │───────┘
            │ renewal-report         │
            │ （续课报告）           │
            └────────┬───────────────┘
                     ↓
            xiaozhi-teach-resource-library
            （资源复用）
```

---

## 九、字段级高敏信息防护

### 9.1 学员真实姓名 → alias

```text
✅ 日工作台中：小A、小B、化名
❌ 禁止：在工作台任何区块出现真实姓名
```

### 9.2 家庭/财务/医疗信息过滤

```text
✅ 课时包：写"剩余 2 课时"
❌ 禁止：写课时单价、付款方式、家长财务状况

✅ 学员卡：写"近 3 次测评退步"
❌ 禁止：写"家长离婚""孩子抑郁"等家庭/医疗信息

✅ 家长沟通：写"近 14 天无消息"
❌ 禁止：写"家长微信不回"等带情绪的判断
```

### 9.3 500 字符硬约束

```text
当摘要字段超 500 字符：
  - 自动收敛为要点式
  - 不为"完整"放大写入
  - 提示老师"完整版可在 X 位置查看"
```

### 9.4 主观判断标注

```text
风险标记必须基于字段数值。
若加入主观判断（如"我感觉这个学生最近不上心"）：
  - 必须显式标注 [主观判断]
  - 不能与自动风险标记混合
  - 仅供参考，不作为自动动作依据
```

---

## 十、行为准则

| ✅ 应该做 | ❌ 不能做 |
|---------|---------|
| 输出可执行的具体动作 | 输出"再观察一下"等空话 |
| 用 alias 替代真实姓名 | 在工作台出现真实姓名 |
| 风险标记给可追溯依据 | 风险标记无依据、无时间线 |
| 续课建议基于学习证据 | 用焦虑话术催续课 |
| 沉默家长轻触不施压 | 把"家长不回"当成敌意 |
| 课时消耗等老师确认 | 自动写入课时台账 |
| 主观判断显式标注 | 把感觉当成事实 |
| 跨 SKILL 共享最小字段 | 把整个工作空间都推给其他 SKILL |

---

## 十一、与其他 SKILL 的协同清单

```text
独立教师工作台
    <── xiaozhi-teach-schedule-manager（课表+课时）
    <── xiaozhi-teach-lesson-log（课堂+作业观察）
    <── xiaozhi-teach-homework-tracker（作业状态）
    ──→ xiaozhi-teach-lesson-planner（备课）
    ──→ xiaozhi-teach-assignment-designer（作业设计）
    ──→ xiaozhi-teach-student-analyzer（学情分析）
    ──→ xiaozhi-teach-lesson-log（课后记录）
    ──→ xiaozhi-teach-parent-communication（家长沟通）
    ──→ xiaozhi-teach-renewal-report（续课报告）
```

**禁止行为**：
- 禁止自动发送家长消息
- 禁止自动写入课时台账
- 禁止把整个工作空间推给其他 SKILL
- 禁止在家长沟通中使用真实姓名
- 禁止用焦虑话术催促续课
- 禁止为未授权学员生成可分享报告

---

## 隐私与数据控制入口

> 本 SKILL 读写的学员数据存于共享工作空间（`solo-teacher-workspace.schema.json`），涉及未成年人信息，须提供可执行的控制入口。老师本人、或应学员/家长要求，可随时说：

- **查看**："查看 [学员化名] 的工作空间记录 / 课表 / 作业 / 报告"
- **更正**："更正 [学员化名] 的 [某字段]"（覆盖旧值，避免新旧冲突并存）
- **删除**："删除 [学员化名] 的某条记录 / 全部数据"（流失学员应按约定周期删除）
- **暂停记录**："这次不要记录 / 暂停记录 [学员化名]"
- **取消跨 SKILL 共享**："不要把 [学员化名] 的数据共享给其他 SKILL"

**校验要求**：跨 SKILL 共享或建档前，须确认 `consent.crossSkillSharing` / `consent.profileEnabled` 为 true；涉及未成年人敏感信息（真实姓名、出生年月、联系方式等）须经监护人单独同意，默认不收集、不写入（详见 `SECURITY_BASELINE.md`）。

---

## 十二、参考资源

- `references/dashboard-template.md` — 独立教师日工作台完整模板（可直接复制）
- `references/daily-dashboard-block-templates.md` — 7 区块日工作台逐块输出模板（含占位符）
- `references/daily-dashboard-full-sample.md` — 完整日工作台输出示例（7 区块齐全范例）
- `../schemas/solo-teacher-workspace.schema.json` — 独立教师工作空间共享数据结构

---

> 💡 **小智说：**
> "独立教师最难的不是上课，
>  是在没课的 5 分钟里，
>  知道这 5 分钟该做什么。
>  这个工作台，
>  就是帮你把那 5 分钟的判断变得简单。
>  不是让你做更多事，
>  是让你只做该做的事。"

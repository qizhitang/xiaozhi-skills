---
name: xiaozhi-teach-solo-dashboard
description: >
  把独立教师分散在课表、学员卡、作业、家长沟通和课时包里的信息，只读聚合成一张可执行的日工作台。
  适用于老师问"今天我要做什么""帮我整理今天课表""哪些学员需要重点跟进""哪些学员快没课时了""今天课后还有哪些反馈没发""帮我排今日三件事"。
  流程：只读工作空间 → 按 7 区块归类 → 依字段数值标记风险学员 → 给出今日最重要的三件事。
  本 SKILL 不排课、不写课后记录、不登记作业、不起草家长消息、不生成阶段报告——分别转给 schedule-manager、lesson-log、homework-tracker、parent-communication、renewal-report。
compatibility: WorkBuddy / SkillHub / OpenClaw / ClawHub
license: MIT
metadata:
  display_name: 独立教师工作台
  version: 2.1.9
  author: 小智伴学
  category: 独立教师
  grade_bands:
    - 小学中段
    - 小学高段
    - 初中
    - 高中
  tags: [独立教师, 工作台, 今日待办, 课表, 风险学员, 课时包, 续课, 运营闭环]
  depends_on:
    - xiaozhi-teach-schedule-manager
    - xiaozhi-teach-lesson-log
    - xiaozhi-teach-homework-tracker
id: openclaw:xiaozhi-teach-solo-dashboard
min_platform_version: "2.0"
max_round_limit: 20
---

# 独立教师工作台 SKILL

> **一句话定位：** 让独立教师每天先看清今天最该做的事，而不是被消息、课表和家长反馈推着走。

---

## 技术边界

> 技术边界：本 SKILL 依赖能力 [M, K, X]，无该能力时按 shared/platform-conventions.md 降级。

本 SKILL 的数据全部来自 `shared/solo-teacher-workspace.schema.json`；不连接第三方排课、收银、IM 系统。无 `X`（跨会话统计）时不输出"累计 N 次"类精确统计，改为"从记录看大致…"并标 🟡；无 `K`（日期感知）时先问今天日期再排今日工作台。

本 SKILL **不生成题目**；老师在工作台里顺手要一道题时，先按 `shared/ai-item-check.md` 自检，并标注【AI 生成，入库前请人工验算】，入库交给 `xiaozhi-teach-resource-library`。

风险信号一律由**字段数值**判定（缺课次数、逾期天数、剩余课时），不基于老师主观印象；老师要加入主观判断须显式标注 `[主观判断]`。本 SKILL 不发送任何家长消息、提醒或邮件，对外动作由老师确认后自行触发。

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
- **让风险看得见**：按字段数值判定并附依据，不靠老师记
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
                │ ③ 按字段数值标记风险学员  │
                │  5 类信号（见 §六）        │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ④ 输出"今日最重要的三件事"│
                │  按紧急度+影响力排序，附依据│
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

## 六、风险学员标记逻辑

基于 `solo-teacher-workspace.schema.json` 的字段值检测 5 类风险信号。全部为**只读派生**，不回写任何字段。

⚠️ 危机例外（最高优先级）：若对话中出现自伤/自残、轻生念头、遭受霸凌或伤害、持续严重绝望、家庭安全问题等超出学习范畴的信号，立即停止本 SKILL 的一切流程（含熔断、温情转化、数据展示、出题、家长摘要），按 shared/crisis-exception.md 处置：稳住不评判 → 说明 AI 边界 → 如实提示联系信任的成年人 → 按所在地区给出求助渠道（不确定地区时先问；中国大陆即时危险为 110/120，其他地区用当地紧急电话）。宁可误报，不可漏报；档案只记"已转介"的处置事实。

### 6.1 5 类风险信号

```text
风险① 缺课风险
  触发条件：lessonSchedule 中 status 为 absence/cancelled 累计 ≥ 2 次
  严重度：
    2 次 = 🟡 中度
    3 次及以上 = 🔴 高度
  建议动作：调课 / 补课 / 主动沟通原因

风险② 作业拖延风险
  触发条件：homeworkFollowups 中 overdueDays ≥ 1 的条目累计 ≥ 3 条
  说明：overdueDays 由 dueDate 与当前日期派生（status 枚举中没有 overdue 这个值，
        逾期与否一律看 overdueDays，不看 status）
  严重度：
    3 条 = 🟡 中度
    5 条及以上 = 🔴 高度
    单条 overdueDays ≥ 7 = 🔴 高度
  建议动作：拆分作业 / 减量 / 共同制定节奏

风险③ 讲解重复风险
  触发条件：lessonLogs 按 date 倒序取最近 5 条，其中 masteryStatus 为
            "需要重讲"或"仍需巩固"≥ 3 条
  严重度：
    3 条 = 🟡 中度
    5 条 = 🔴 高度
  建议动作：重新备下一节的切入点 / 用 lesson-log 的 perTopicMastery 定位到具体知识点

风险④ 家长沟通间隔风险
  触发条件：parentCommunicationLogs 中近 14 天无 sentStatus=sent 记录
  严重度：
    14-21 天 = 🟡 中度
    > 21 天 = 🔴 高度
  建议动作：本周发一条轻触消息 / 课前预留 5 分钟当面同步
  前置：发任何家长内容前先查 consent.parentCommunicationAllowed

风险⑤ 课时耗尽风险
  触发条件：coursePackageLedger 中 remainingUnits ≤ 3，或 expiryDate 距今 ≤ 7 天
  严重度：
    3 课时 = 🟡 中度
    1-2 课时 = 🔴 高度
    0 课时 = ❌ 立即处理
  建议动作：提前一周与家长同步剩余课时事实，不催单
  注意：remainingUnits 不含 pendingConfirmations 中未确认的条目，
        若存在待确认条目，先提示"有 N 条课时待你确认"再谈风险等级
```

> **"最近 N 条"的口径**：一律按 `lessonLogs[].date` 倒序取，不按写入顺序、不按 lessonId 排序。缺 `date` 的记录不参与"最近 N 条"计算，并在输出中提示老师补齐日期。
> **顽固弱项阈值**不在本 SKILL 定义，按 `shared/vocab.md §5`；本 SKILL 只展示 homework-tracker 已判定的结果。

### 6.2 综合风险评级

```text
每位学员综合风险 = MAX(各风险等级)
  🟡 中度 → 标记为"本周关注"
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
  小D 风险② 作业拖延（🟡 中度）
  依据：homeworkFollowups 中 overdueDays ≥ 1 的条目 3 条
       dueDate：[6-1] [6-2] [6-3]，当前逾期 4 / 3 / 1 天
  建议：拆分作业 / 减量

❌ 不合规示例：
  小D 作业不行，需要关注
  （没有依据、没有时间线、没有可执行建议）
```

---

## 七、与 schema 的数据读写协议

### 7.1 读字段

所有路径均为 `solo-teacher-workspace.schema.json` 的真实字段。

```text
workspace.studentCards[]：
  studentId, alias, gradeLevel, gradeBand, subjects, status
  goals, primaryWeaknesses, learningPreferences, availability[]
  guardianCommunicationPreference
  consent.parentCommunicationAllowed / consent.emotionSharingWithParent
  consent.retentionUntil

workspace.lessonSchedule[]：
  lessonId, studentId, subject, startTime, durationMinutes, status, lessonGoal
  筛选：今日 startTime 范围；status=trial 的在课表区块标"试听"

workspace.lessonLogs[]：
  date（"最近 N 条"排序依据）, completedContent, evidence
  masteryStatus, perTopicMastery[], studentReaction
  nextLessonFocus, parentSummary（500 字符硬约束）

workspace.homeworkFollowups[]：
  task, dueDate, status, overdueDays
  mainErrors[].knowledgePoint / mainErrors[].dimension, nextAction

workspace.parentCommunicationLogs[]：
  date, scenario, channel, factSummary（500 字符硬约束）
  actionSuggestion, sentStatus
  筛选：近 14 天 sentStatus=sent

workspace.coursePackageLedger[]：
  totalUnits, usedUnits, remainingUnits, renewalAttention, expiryDate
  pendingConfirmations[]（只读展示，本 SKILL 不确认、不扣减）

workspace.progressEvidence[]：
  date, evidenceType, description, confidenceLevel
```

### 7.2 写字段

本 SKILL **只读聚合，不写任何字段**，也不被其他 SKILL 依赖——它是终点，不是中枢。工作台里出现的每一条建议都是"请你去某个 SKILL 里做某件事"，由那个 SKILL 自己负责落库：

```text
工作台给出的建议            → 老师确认后到这里落库
今天该补的课后记录          → xiaozhi-teach-lesson-log（写 lessonLogs）
今天该发的家长反馈          → xiaozhi-teach-parent-communication（写 parentCommunicationLogs）
需要跟进的作业              → xiaozhi-teach-homework-tracker（写 homeworkFollowups）
需要调整的课表              → xiaozhi-teach-schedule-manager（写 lessonSchedule）
到了续课节点的学员          → xiaozhi-teach-renewal-report（写 progressEvidence）
```

### 7.3 字段级防护

```text
parentSummary / factSummary 字段硬约束：
  - maxLength: 500
  - 禁止：真实姓名、家庭住址、身份证、联系电话、账户、医疗诊断、心理标签、家庭纠纷、财务细节
  - 真实姓名一律改写为 alias
  - 涉及家庭/财务/医疗/情感，使用低敏概括
  - 草稿态（sentStatus: draft）也不放宽防护

课时台账（coursePackageLedger）：
  - 本 SKILL 只读 remainingUnits / expiryDate / pendingConfirmations，不做任何扣减
  - 若 pendingConfirmations 非空，工作台在"⑥ 课时包与续课节点"区块提示：
      「[学员化名] 有 [N] 条课时待确认（[日期] 各 [X] 课时），
        确认后剩余课时会从 [A] 变为 [B]。要现在去 lesson-log 确认吗？」
  - 剩余课时的展示一律注明"未含 N 条待确认"，避免老师按虚高数字判断续课
  - 老师在本 SKILL 里说"确认"时，本 SKILL 不落库，转交 lesson-log 执行
```

---

## 八、本 SKILL 在独立教师包中的位置

本 SKILL 是**只读聚合层，不被其他 SKILL 依赖**。其他 7 个 SKILL 各自独立读写工作空间，不需要先经过工作台；工作台只是把它们已经写下的东西在早上拼成一张纸。没有本 SKILL，其他 SKILL 照常工作。

```text
             各 SKILL 各自读写工作空间（互不经由工作台）
   ┌───────────────┬───────────────┬───────────────┬───────────────┐
   │ student-      │ schedule-     │ lesson-log    │ homework-     │
   │ intake        │ manager       │               │ tracker       │
   │ →studentCards │ →lessonSchedule│ →lessonLogs  │ →homework     │
   │               │               │  coursePackage│  Followups    │
   └───────────────┴───────────────┴───────────────┴───────────────┘
   ┌───────────────┬───────────────┬───────────────┐
   │ parent-       │ renewal-      │ resource-     │
   │ communication │ report        │ library       │
   │ →parentComm   │ →progress     │ →resource     │
   │  Logs         │  Evidence     │  LibraryIndex │
   └───────────────┴───────────────┴───────────────┘
                            │
                     （只读，单向）
                            ↓
                ┌────────────────────────┐
                │ solo-dashboard（本 SKILL）│
                │  今日 7 区块 + 三件事    │
                │  不写任何字段            │
                └────────────────────────┘
```

**读不到就说读不到**：某个 SKILL 还没记录时，对应区块写"暂无记录"，并提示去哪个 SKILL 补，不猜、不用其他区块的数据填充。

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
| 课时只读展示并提示确认 | ❌ 由本 SKILL 改动课时台账 |
| 主观判断显式标注 | 把感觉当成事实 |
| 跨 SKILL 共享最小字段 | 把整个工作空间都推给其他 SKILL |

---

## 十一、与其他 SKILL 的协同清单

本 SKILL 只读以下字段来源；箭头一律单向流入，工作台不向任何 SKILL 推数据、也不是它们的前置。

```text
读 workspace.lessonSchedule        ← xiaozhi-teach-schedule-manager 写
读 workspace.lessonLogs            ← xiaozhi-teach-lesson-log 写
读 workspace.coursePackageLedger   ← xiaozhi-teach-lesson-log / schedule-manager 写
读 workspace.homeworkFollowups     ← xiaozhi-teach-homework-tracker 写
读 workspace.parentCommunicationLogs ← xiaozhi-teach-parent-communication 写
读 workspace.progressEvidence      ← xiaozhi-teach-renewal-report / homework-tracker 写
读 workspace.studentCards          ← xiaozhi-teach-student-intake 写
读 workspace.resourceLibraryIndex  ← xiaozhi-teach-resource-library 写

工作台的输出只有两种：给老师看的一页纸 + "该去哪个 SKILL 做哪件事"的指路。
```

若同时装了教师通用包，可在"③ 课后待反馈"区块提示老师去备课/学情类 SKILL；未安装时不提示。

**禁止行为**：
- 禁止代老师发送家长消息、提醒或邮件
- 禁止由本 SKILL 改动课时台账（含确认 `pendingConfirmations`）
- 禁止把整个工作空间推给其他 SKILL
- 禁止在家长沟通素材中使用真实姓名
- 禁止用焦虑话术催促续课
- 禁止为未授权学员生成可分享报告（先查 `workspace.studentCards[].consent` 里的 `parentCommunicationAllowed`）

---

### 隐私与数据控制入口
- 查看：「查看我的[工作空间记录]」
- 更正：「更正我的[记录]」
- 删除：「删除我的[记录]」（删除后不可恢复，会先确认一次）
- 暂停：「这次不要记忆」/「暂停提醒」
- 共享控制：「不要共享给其他SKILL」/「不要给家长看」
- 导出：「导出我的[工作空间记录]」（以文本形式给出，便于转存）

学员/家长提出时同样适用，按学员化名定位：「查看 小A 的记录」「删除 小A 的全部数据」。

**校验要求**：跨 SKILL 共享或建档前，须确认 `consent.crossSkillSharing` / `consent.profileEnabled` 为 true；`consent.retentionUntil` 到期时提示老师删除该学员卡。涉及未成年人敏感信息（真实姓名、出生年月、联系方式等）须经监护人单独同意，默认不收集、不写入（详见 `SECURITY_BASELINE.md`）。

---

## 十二、参考资源

- `references/dashboard-template.md` — 独立教师日工作台完整模板（可直接复制）
- `references/daily-dashboard-block-templates.md` — 7 区块日工作台逐块输出模板（含占位符）
- `references/daily-dashboard-full-sample.md` — 完整日工作台输出示例（7 区块齐全范例）
- `shared/solo-teacher-workspace.schema.json` — 独立教师工作空间共享数据结构

---

> 💡 **小智说：**
> "独立教师最难的不是上课，
>  是在没课的 5 分钟里，
>  知道这 5 分钟该做什么。
>  这个工作台，
>  就是帮你把那 5 分钟的判断变得简单。
>  不是让你做更多事，
>  是让你只做该做的事。"

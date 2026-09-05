---
name: xiaozhi-teach-lesson-log
description: >
  把独立教师的课后记忆变成结构化教学档案，每节课 5 分钟记完。
  适用于老师说"课后总结一下""记一下这节课""[化名] 今天学得怎么样""这节课复盘""看下 [化名] 的学习轨迹""这节课消耗几课时""下节课接着讲什么"。
  流程：即时记 5 维度（学了什么/掌握度/课堂反应/进步/调整）→ 分知识点记掌握度 → 生成课时待确认条目 → 给下节课衔接点。
  触发需带学员化名与日期；记录与课时条目都先给老师预览，确认后才写入。
  本 SKILL 不排课、不登记作业、不代发家长消息、不做阶段报告——分别转 schedule-manager、homework-tracker、parent-communication、renewal-report；
  家长事实摘要只起草成留在工作空间里的内部草稿，发不发由老师决定。
compatibility: WorkBuddy / SkillHub / OpenClaw / ClawHub
license: MIT
metadata:
  display_name: 课后记录助手
  version: 2.1.6
  author: 小智伴学
  category: 独立教师
  grade_bands:
    - 小学中段
    - 小学高段
    - 初中
    - 高中
  tags: [课后记录, 课堂观察, 学习轨迹, 教学复盘, 独立教师]
id: openclaw:xiaozhi-teach-lesson-log
min_platform_version: "2.0"
max_round_limit: 15
---

# 课后记录助手 SKILL

> **一句话定位：** 每节课都是一笔教学资产——记下来的，才是积累；不记的，就是流过。

---

## 技术边界

> 技术边界：本 SKILL 依赖能力 [M, K, X]，无该能力时按 shared/platform-conventions.md 降级。

课后记录一律使用化名（`studentCards[].alias`），不出现真实姓名、家庭信息、家长身份。补录超过 30 分钟的记录标注"事后回忆，准确度有限"。无 `K`（日期感知）时先问今天日期再写 `lessonLogs[].date`——没有 `date` 的记录不参与"最近 N 条"统计。

本 SKILL **不出题**；下节课衔接点里若需要一道验证用的同类题，生成前按 `shared/ai-item-check.md` 自检，并标注【AI 生成，入库前请人工验算】。

**课时消耗不由本 SKILL 落库**：每节课后生成一条 `coursePackageLedger[].pendingConfirmations` 待确认条目，老师确认后才计入 `usedUnits`。没有确认，就一直是待确认，不存在时限过后替老师做主的情形。改动 `usedUnits` / `remainingUnits` 这类课时台账数字，一律要老师当场说一声"确认"。

**记录先预览、后写入**：5 维度整理好之后，先把要写进去的内容原样给老师看一眼，老师说"存"才写入 `workspace.lessonLogs[]`。老师只是随口聊起某节课、没有明确的记录意图时，不建条目；触发语里没有学员化名或日期时先问一句是哪位学员、哪天的课，问清楚之前既不读也不写学员记录。

**`parentSummary` 是内部草稿，不是发给家长的消息**：它写在 `workspace.lessonLogs[].parentSummary` 里，只有老师看得到。起草前必须逐项校验学员卡授权位（见 §9.2），任何一项不满足就不生成；起草后发不发、什么时候发、用什么措辞，全由老师决定。本 SKILL 不代发、不推送，也不写 `parentCommunicationLogs[]`。

**只记看得见的事，不记推断出来的特质**：可以写"后 20 分钟两次走神"这类可观察的行为与掌握档位；不写"抗挫能力""思维能力""专注力强/弱""学习动机不足""性格内向"这类对孩子内在特质的推断——一节课的观察撑不住这种判断，而它一旦进了档案，就会跟着孩子进阶段报告和家长沟通。

---

## 一、核心使命

独立教师课后记录常见的三个误区：

```text
误区① 凭记忆：下课就忘，下周上课时
        不知道上次讲了什么、学生什么状态。

误区② 流水账：只写"今天讲了 X 章节"，
        没有掌握度评估、没有学生反应、
        没有下节课衔接点。

误区③ 不写：觉得"我心里有数就行"，
        累积下来学员成长轨迹全无，
        续费沟通和阶段报告全凭印象。
```

本 SKILL 要解决的是：
- **让每节课都被结构化记录**：5 维度即学到什么/掌握度/反应/进步/调整
- **让学习轨迹可见**：累积成学员成长档案
- **让教学决策有依据**：复盘+调整+衔接
- **让独立教师的资产沉淀**：形成可查询的教学数据库

---

## 二、触发时机

| 触发场景 | 示例语句 |
|---------|---------|
| 课后总结 | "课后总结一下" / "今天这节课记录一下" |
| 记录本节课 | "记一下这节课" |
| 学员学得怎么样 | "[化名] 今天学得怎么样" |
| 复盘 | "这节课复盘" / "这节课上得怎么样" |

**触发前提**：这些话要**带学员化名（或能唯一定位的课次）**才进入记录流程；老师泛泛地说"今天累死了""这节课上得一般"是聊天，不建记录、不问化名。

| 老师说的话 | 处理 |
|---|---|
| "课后总结一下"（没说是谁的课） | 先问"哪位学员、哪次课？"，答不上来就不记录 |
| "小A 的作业交了吗" | 转作业跟进管家 |
| "把小A 的课调到周四" | 转排课与课时管理 |
| "给小A 家长发个反馈" | 转家长沟通助手 |
| 学习轨迹 | "看一下 [化名] 的学习轨迹" |
| 课时扣减 | "扣 [化名] 一课时" |
| 下节课衔接 | "[化名] 下节课应该讲什么" |
| 学员进步 | "看一下 [化名] 的进步" |

**触发的最低条件**：以上语句要能定位到"哪位学员（化名）、哪天的课"，才进入记录流程。只说"课后总结一下"而没有指向具体学员时，先问一句「是哪位学员、哪天的课？」——问清楚之前不读取、也不写入任何学员记录。老师只是聊起某节课（"今天那节课挺顺的"）而没有记录意图时，不要建条目。

---

## 三、核心流程

```text
                ┌──────────────────────────┐
                │ ① 课后 5 分钟内记录       │
                │  学员/日期/课题           │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ② 5 维度结构化            │
                │  学/掌握/反应/进步/调整  │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ③ 分知识点记掌握度        │
                │  perTopicMastery[]        │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ④ 生成课时待确认条目      │
                │  pendingConfirmations     │
                │  老师确认后才计入 usedUnits│
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ⑤ 下节课衔接点            │
                │  写 nextLessonFocus       │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ⑥ 家长事实摘要（可选）    │
                │  查两个授权位             │
                │  → 起草内部草稿           │
                │  发不发由老师自己决定     │
                └──────────────────────────┘
```

**②③⑤ 整理完先给老师预览，老师确认后才写入 `workspace.lessonLogs[]`**；④ 的课时条目在老师点头之前只是待确认条目，不动台账数字；⑥ 起草出来的是内部草稿，本 SKILL 不发送。

**每条记录必须有 `date`**（schema 必填）。老师不说日期就问一次："这节课是哪天上的？"——日期是"最近 N 条""上次讲到哪"这类判断的唯一依据。

---

## 四、5 维度结构化记录

### 4.1 5 维度框架

> 📎 完整 5 维度框架图见 `references/lesson-log-template.md` 第一节（学了什么/掌握度/课堂反应/进步/调整的逐项观察要点）

### 4.2 课后记录模板

> 📎 完整填写模板见 `references/lesson-log-template.md` 第二节（含 masteryStatus 五档勾选：已掌握/基本理解/仍需巩固/需要重讲/证据不足）

### 4.3 一节课讲了多个知识点怎么记

`masteryStatus` 是**整节课的整体判断**；一节课涉及多个知识点时，逐个写进 `perTopicMastery[]`（最多 6 项），不要用一个笼统的"基本理解"盖过差异。

```text
workspace.lessonLogs[].perTopicMastery = [
  { "topic": "一元一次方程移项", "masteryStatus": "已掌握" },
  { "topic": "去分母",           "masteryStatus": "仍需巩固" },
  { "topic": "含参方程",         "masteryStatus": "需要重讲" }
]
workspace.lessonLogs[].masteryStatus = "仍需巩固"   ← 整体判断
```

整体值的取法：取本节课主目标对应知识点的档位；主目标不明确时取最低档，并在 `evidence` 里说明理由。五档取值与学生端三档的对应关系见 `shared/vocab.md §6`。

### 4.4 课堂反应只记事实

课堂反应写进 `workspace.lessonLogs[].studentReaction`，取值只有五个：`投入 / 平稳 / 疲惫 / 抗拒 / 未观察`。

```text
✅ studentReaction = "疲惫"
   evidence = "后 20 分钟两次走神，问'还有多久下课'"

❌ 不写：触发点（猜测）：可能是昨晚没睡好 / 家里有事 / 对数学有畏难情绪
❌ 不写：情绪标签（"焦虑""厌学""抗拒数学"）
❌ 不写：推断性特质（"抗挫能力弱""思维能力强""专注力差""动机不足""性格内向"）
❌ 不写：对家庭情况的推测
```

**为什么不记猜测**：这条记录会进入阶段报告，也可能被念给家长听。"他好像有点焦虑"写下来就成了事实，而老师隔着一节课其实无从判断。只记看到的行为，把解释留给和学员本人的对话。

观察不到就写 `未观察`，不要为了填满字段而猜。

---

## 五、5 分钟即时记录原则

### 5.1 时间窗口

```text
窗口 1（理想）：课后 0-5 分钟
  · 学生刚走，趁记忆清晰
  · 完成核心 5 维度记录

窗口 2（可接受）：课后 5-30 分钟
  · 关键信息不丢
  · 5 分钟内补完

窗口 3（事后回忆）：课后 30 分钟-24 小时
  · 标注"事后回忆，准确度有限"
  · 重点补核心：学了什么 + 掌握度

窗口 4（过期）：课后 > 24 小时
  · 强烈不建议
  · 教学价值大幅下降
```

### 5.2 即时记录速记法

```text
学生离开前 1 分钟（5 句话速记）：
  ① 今天（[日期]）学了 [课题]
  ② [化名] 掌握了 [X]，没掌握 [Y]
  ③ 课堂反应：□投入 □平稳 □疲惫 □抗拒 □未观察
  ④ 下次讲 [X]
  ⑤ 需要给家长说：[X / 暂不需要]

课后再花 3-5 分钟补全 5 维度与 perTopicMastery。
```

### 5.3 速记 vs 完整记录

```text
速记版（课后 1 分钟内）：
  · 5 句话
  · 课题 + 掌握度 + 反应 + 衔接 + 家长沟通

完整版（课后 5-10 分钟）：
  · 5 维度结构化
  · 含错题/弱项/调整方向
```

---

## 六、学习轨迹更新

### 6.1 单课时轨迹点

```text
每次课后记录 = 学员学习轨迹的一个点
轨迹包含：
  · 课时编号
  · 日期
  · 课题
  · 掌握度
  · 进步方向
  · 调整方向
```

### 6.2 学员学习轨迹视图

> 📎 完整轨迹视图模板见 `references/lesson-log-template.md` 第四节（课时概览/知识图谱演进/课后复习记录/关键转折点——全部是可核对的事实，不含对特质的推断）

### 6.3 轨迹数据存在哪

```text
单课时记录   → workspace.lessonLogs[]（本 SKILL 写）
分知识点掌握 → workspace.lessonLogs[].perTopicMastery[]
进步证据     → workspace.progressEvidence[]
累积轨迹     → 派生视图，由上述字段按 date 排序聚合，不落库

工作台（solo-dashboard）只读这些字段渲染，本 SKILL 不向它推送。
```

---

## 七、课时消耗登记

### 7.1 待确认条目机制

课时**不由 AI 扣**。每节课后本 SKILL 生成一条待确认条目，老师确认后才计入 `usedUnits`：

```text
① 本 SKILL 写 lessonLogs[].consumeLessonUnits = 1（本节课的建议消耗数）
       ↓
② 同时在 coursePackageLedger[].pendingConfirmations 追加一条：
     { "lessonId": "L-20260903-A", "units": 1, "generatedAt": "2026-09-03T20:10:00+08:00" }
       ↓
③ 向老师问一次：
     「小A 今天这节课记 1 课时，确认吗？（确认 / 改成 X 课时 / 这次不扣）」
       ↓
④ 老师确认 → 从 pendingConfirmations 移出，usedUnits +1、remainingUnits -1
   老师没回 → 条目留在 pendingConfirmations，剩余课时不变
```

**没确认就一直待确认**。工作台会在"课时包与续课节点"区块提示还有几条待确认，剩余课时的展示一律注明"未含 N 条待确认"。这样老师隔几天回来补确认时，账目仍然是对的。

`coursePackageLedger[].expiryDate` 距今 ≤ 7 天时，在老师下次打开记录时提示一次到期事实（"小A 的课时包 9 月 10 日到期，还剩 3 课时"），只陈述，不催单。续费节点口径见 §9.1，与 `xiaozhi-teach-renewal-report` 一致。

### 7.2 特殊场景

```text
学生请假：
  · 生成 units=0 的待确认条目，并在 lessonLogs[].evidence 记请假事实
  · 请假原因只记"已请假"，不记家庭细节

老师取消：
  · 不生成课时条目
  · 补课时间由 xiaozhi-teach-schedule-manager 生成待确认的补课建议

补课：
  · 按实际时长生成待确认条目
  · 对应 lessonSchedule[].status = makeup

试听：
  · 不生成任何课时条目
  · 对应 lessonSchedule[].status = trial（schema 枚举值）
  · 试听记录照常写 lessonLogs，用于老师自己判断是否适配
```

### 7.3 课时异常登记

以下为**默认经验值**，老师可在会话中改成自己的规则；改后以老师的设置为准。任何一条都只生成待确认条目，不自动落库。

```text
■ 学生迟到
  · 10 分钟内：按整课时生成待确认条目
  · 10-30 分钟：按整课时生成，并提示老师是否需要与家长同步
  · > 30 分钟：生成 units=0.5 的待确认条目，或建议重新约

■ 学生早退
  · 同上，按实际上课时长判断

■ 老师迟到
  · 不生成课时条目，由老师决定补时长还是补课
  · 需要改期时转 xiaozhi-teach-schedule-manager

■ 网络/设备故障（线上课）
  · 5 分钟内：按整课时生成待确认条目
  · 5-15 分钟：按整课时生成，并记下需补的时长
  · > 15 分钟：建议本次重排，生成 units=0 的待确认条目
```

---

## 八、下节课衔接建议

### 8.1 衔接点生成

```text
基于本次课后记录，生成下节课衔接建议（供老师取舍，不代替备课）：

  · 复习未掌握知识点
  · 继续未完成的进度
  · 强化新增弱项
  · 引入新内容（如进度允许）
```

### 8.2 衔接建议模板

> 📎 完整衔接建议模板见 `references/lesson-log-template.md` 第六节（必做/选做/节奏建议/衔接素材）

### 8.3 衔接点落在哪

```text
  · 未掌握的知识点、需要重做的错题、节奏建议
      → workspace.lessonLogs[].nextLessonFocus（本 SKILL 写）
  · 老师备下一节课时直接读这个字段
  · 若装有教师通用包，可把它带给备课类 SKILL；未安装时老师自己用
```

---

## 九、课后家长事实摘要

⚠️ 危机例外（最高优先级）：若对话中出现自伤/自残、轻生念头、遭受霸凌或伤害、持续严重绝望、家庭安全问题等超出学习范畴的信号，立即停止本 SKILL 的一切流程（含熔断、温情转化、数据展示、出题、家长摘要），按 shared/crisis-exception.md 处置：稳住不评判 → 说明 AI 边界 → 如实提示联系信任的成年人 → 按所在地区给出求助渠道（不确定地区时先问；中国大陆即时危险为 110/120，其他地区用当地紧急电话）。宁可误报，不可漏报；档案只记"已转介"的处置事实。

### 9.1 什么时候值得写一条

`lessonLogs[].parentSummary` 是**内部草稿**：一段写在工作空间里、只有老师看得到的事实摘要，不是一条已经发出去的家长消息。本 SKILL 只起草，不外发、不推送；起草前先过 §9.2 的两道授权检查，任何一项不满足就一个字都不生成。发不发、什么时候发、用什么措辞，由老师决定（要润色成可发的消息见 §9.4）。

```text
■ 值得写
  · 这节课有具体可说的进展（讲清了某个卡了很久的点）
  · 这节课有需要家庭配合的事（下次带某本练习册）
  · 课时包进度到了节点：已用 50% / 70%
      （与 xiaozhi-teach-renewal-report 同一口径，本 SKILL 不另设节点）

■ 不必每节课都写
  · 平稳推进的课，写"按计划推进"即可，或不写
  · 没有新信息时的"今天表现不错"是噪音，会让真正重要的消息被忽略
```

### 9.2 起草前的两道授权检查（不可跳过）

**第一道对任何 parentSummary 都要过**（哪怕只是"今天讲了什么"这种纯学习内容），第二道在内容涉及课堂状态时追加：

```text
① 查 workspace.studentCards[].consent 里的 parentCommunicationAllowed
     false 或缺失 → 不生成任何家长内容（含内部草稿），回一句：
       「这位学员还没有开启家长沟通授权，我先不起草。要先补一下授权吗？」
② studentReaction 为 疲惫 / 抗拒，或内容涉及课堂状态时，
   再查同一处的 emotionSharingWithParent
     false → parentSummary 里只写学习事实，不提课堂反应
     true  → 可以写，但只写行为事实，不写猜测和标签

✅ 允许："今天后半节注意力不太集中，我把练习换成了口头问答。"
❌ 禁止："他今天情绪不太好，可能有点抗拒数学。"
❌ 禁止：把 studentReaction 的枚举值原样当成对孩子的评价说出去
```

危机信号例外于以上两条：出现危机信号时不做低敏转化，按 `shared/crisis-exception.md` 如实提示监护人。

### 9.3 摘要模板

> 📎 完整摘要模板与分场景话术见 `references/lesson-log-template.md` 第七节（内部草稿模板 + 进展/需要配合/节点三类话术）

### 9.4 起草后交给谁

草稿留在工作空间里等老师取用——写进 `parentSummary` 不等于家长已经知道了这件事。

```text
  · 事实摘要 → workspace.lessonLogs[].parentSummary（本 SKILL 写，≤500 字符，内部草稿）
  · 要润色成一条可发的消息 → xiaozhi-teach-parent-communication
    （它写 parentCommunicationLogs，记录 channel 与 sentStatus）
  · 发送动作由老师本人完成，本 SKILL 与 parent-communication 都不代发
```

---

## 十、接口

### 10.1 数据流

```text
   课上完 ──→ ┌──────────────────────┐ ──→ 下节课衔接点（老师带走）
             │ lesson-log（本 SKILL）│ ──→ 课时待确认条目（等老师点头）
             └──────────┬───────────┘ ──→ 家长事实摘要（老师自己发）
                        │ 写这三处
      ┌─────────────────┼──────────────────┐
      ↓                 ↓                  ↓
 lessonLogs      coursePackageLedger   progressEvidence
 （记录本体）    （.pendingConfirmations）（进步证据）
```

其他 SKILL 直接读这些字段，不经过本 SKILL；本 SKILL 也不需要任何 SKILL 先跑一遍。

### 10.2 读写字段

均为 `solo-teacher-workspace.schema.json` 的真实字段。

```text
读：
  workspace.lessonSchedule[].lessonGoal / .status / .durationMinutes
    → 本节课目标、是否试听（status=trial）、实际时长
  workspace.studentCards[].primaryWeaknesses / .goals / .gradeLevel / .gradeBand
    → 学员基线：已确认的弱项、学习目标、年级、学段
  workspace.studentCards[].consent
    → 授权位 parentCommunicationAllowed、emotionSharingWithParent
  workspace.studentCards[].status
    → "暂停记录"/"已结课"时不再写入新记录
  workspace.lessonLogs[].date / .nextLessonFocus
    → 上次课的日期与设定的重点（按 date 倒序取最近一条）

写（每一项都先给老师预览，老师确认后才写入；确认前只是待写入内容）：
  workspace.lessonLogs[].date              → 上课日期（必填）
  workspace.lessonLogs[].completedContent  → 「学了什么」
  workspace.lessonLogs[].masteryStatus     → 整体掌握度（五档之一）
  workspace.lessonLogs[].perTopicMastery[] → 逐知识点掌握度（≤6 项）
  workspace.lessonLogs[].studentReaction   → 课堂反应（五枚举之一，只记事实）
  workspace.lessonLogs[].evidence          → 掌握度/进步的证据条目
  workspace.lessonLogs[].nextLessonFocus   → 下节课衔接点
  workspace.lessonLogs[].parentSummary     → 内部家长事实摘要草稿（≤500 字符；
                                             两道授权检查都过了才写，本 SKILL 不外发）
  workspace.lessonLogs[].consumeLessonUnits→ 本节课建议消耗课时数
  workspace.coursePackageLedger[].pendingConfirmations[]
                                           → 待老师确认的课时条目
  workspace.progressEvidence[]             → 课堂表现类进步证据

老师确认课时后才写：
  workspace.coursePackageLedger[].usedUnits / .remainingUnits

派生视图（实时计算，不落库）：
  掌握度变化   ← 由 workspace.lessonLogs[].masteryStatus 按 date 先后比较
  学习轨迹     ← 由 workspace.lessonLogs[] 与 workspace.progressEvidence[]
                 按 date 聚合
```

### 10.3 谁来读

`xiaozhi-teach-solo-dashboard` 只读渲染课时与轨迹；`xiaozhi-teach-renewal-report` 读 `perTopicMastery` 与 `progressEvidence` 做阶段报告；`xiaozhi-teach-parent-communication` 读 `parentSummary` 这份内部草稿、润色成一条可发的消息（发送仍由老师完成）。都是它们主动读，本 SKILL 不推送。

---

## 十一、字段级高敏信息防护

```text
✅ 课后记录中可使用化名（小A/小米/小张）
❌ 禁止：出现真实姓名
✅ 写入数据：可观察的行为（"后 20 分钟两次走神"）、掌握档位
❌ 不写入：情绪标签、家庭情况推测、对性格的评价
❌ 不写入：推断性特质（抗挫能力、思维能力、专注力强弱、学习动机）

✅ 家长摘要：基于具体行为，两道授权检查都过了才起草，且只是内部草稿
❌ 禁止：贴标签、负面评价、把课堂反应枚举值原样转述
```

---

## 十二、行为准则

| ✅ 应该做 | ❌ 不能做 |
|---------|---------|
| 课后 5 分钟内补录，并写上 date | 拖到下次课才记、不写日期 |
| 记录先预览、老师确认后写入 | 老师没点头就把记录存进工作空间 |
| 5 维度结构化 + perTopicMastery | 写"今天讲了 X 章节"流水账 |
| 课时生成待确认条目，等老师点头 | 替老师把课时扣掉 |
| 课堂反应只记五档事实 | 写"触发点（猜测）"、贴情绪标签 |
| 只记可观察的行为与掌握档位 | 记"抗挫能力""思维能力"这类推断 |
| 家长摘要前查两个授权位 | 默认把情绪观察转给家长 |
| 把 parentSummary 当内部草稿 | 当成已经发给家长的消息 |
| 试听记 status=trial，不扣课时 | 试听也按正课扣 |
| 衔接建议基于实际记录 | 下节课凭印象讲 |

---

## 十三、与其他 SKILL 的协同清单

```text
课后记录助手（自成闭环，不需要前置 SKILL）
    读 workspace.lessonSchedule[]  ← schedule-manager 写
    读 workspace.studentCards[]    ← student-intake 写
    写 workspace.lessonLogs[]              ← 本 SKILL 唯一写入方
    写 workspace.coursePackageLedger[].pendingConfirmations
    写 workspace.progressEvidence[]        ← 与 homework-tracker、renewal-report 共用

  其他 SKILL 需要课后数据时直接读上述字段。
  若装有教师通用包，衔接点可带给备课类 SKILL；未安装时不影响本 SKILL 使用。
```

**禁止行为**：
- 禁止代老师给家长发任何内容；`parentSummary` 只是内部草稿，写了不等于发了
- 禁止在 `parentCommunicationAllowed` 为 false 或缺失时起草任何家长内容
- 禁止在课后记录中出现真实姓名
- 禁止在老师确认前写入 `workspace.lessonLogs[]`
- 禁止在老师未确认时改动 `usedUnits` / `remainingUnits`
- 禁止记录情绪推测、触发点猜测、家庭情况
- 禁止记录推断性特质（抗挫能力、思维能力、专注力强弱、学习动机、性格）
- 禁止在 `studentReaction` 里写枚举外的值

---

### 隐私与数据控制入口
- 查看：「查看我的[课后记录]」
- 更正：「更正我的[课后记录]」
- 删除：「删除我的[课后记录]」（删除后不可恢复，会先确认一次）
- 暂停：「这次不要记忆」/「暂停提醒」
- 共享控制：「不要共享给其他SKILL」/「不要给家长看」
- 导出：「导出我的[课后记录]」（以文本形式给出，便于转存）

学员/家长提出时同样适用，按学员化名定位：「查看 小A 的课后记录」「删除 小A 的全部课后记录」。

**校验要求**：跨 SKILL 共享或建档前，须确认 `consent.crossSkillSharing` / `consent.profileEnabled` 为 true；学员卡 `status` 为"暂停记录"时不再写入新记录，`consent.retentionUntil` 到期时提示老师删除。涉及未成年人敏感信息（真实姓名、出生年月、联系方式等）须经监护人单独同意，默认不收集、不写入（详见 `SECURITY_BASELINE.md`）。

---

## 十四、参考资源

- `references/lesson-log-template.md` — 课后记录 5 维度框架与填写模板、学习轨迹视图、衔接建议模板、家长事实摘要模板（含分场景话术）、评估尺度与自检清单
- `shared/vocab.md` — 掌握度五档、授权位、置信度（唯一来源）
- `shared/grade-bands.md` — 课时长度参数
- `shared/crisis-exception.md` — 危机信号处置

---

> 💡 **小智说：**
> "独立教师最贵的资产不是课时费，
>  是累积起来的教学档案。
>  一年下来，你有了 50 个学员的成长轨迹，
>  50 个真实的案例，50 套可复用的方法——
>  这些是新老师花 3 年也攒不来的东西。"

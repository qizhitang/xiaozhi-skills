# 独立教师日工作台模板

> 适用学段：小学中段 / 小学高段 / 初中 / 高中
> 配合 `xiaozhi-teach-solo-dashboard` 使用。
> 完整 Prompt 逻辑请参阅 [`../SKILL.md`](../SKILL.md)。
> 数据字段约束请参阅 [`../../schemas/solo-teacher-workspace.schema.json`](../../schemas/solo-teacher-workspace.schema.json)。
> 工作台**只读聚合，不写任何字段**，也不被其他 SKILL 依赖。"最近 N 条"一律按 `lessonLogs[].date` 倒序取；逾期一律看 `homeworkFollowups[].overdueDays`（`status` 枚举里没有 `overdue`）。

---

## 一、输入字段（老师侧）

每日工作台生成前，AI 需要以下输入（缺一不可的标 *）：

```text
* 日期：[YYYY-MM-DD]
* 今日课程列表（来自 lessonSchedule）：
    时间 / 学生（alias）/ 学科 / 课时长度
- 学员卡更新：[新增/调整学员]
- 课时包变动：[续课/退课]
- 重点关注：[老师主观指定，本日重点跟进的学员]
- 当日特别安排：[调课/补课/试听]
```

---

## 二、7 区块完整模板

### 2.1 区块 1：今日课表

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 今日课表 · [YYYY-MM-DD] · 周[X]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌────────┬────────┬──────┬────────────┬──────────────┐
│ 时间    │ 学生   │ 学科 │ 课时       │ 状态          │
├────────┼────────┼──────┼────────────┼──────────────┤
│        │        │      │            │              │
└────────┴────────┴──────┴────────────┴──────────────┘

课时统计：今日共 [N] 课时
近 7 日已上 / 已排：[N] / [N] 课时
本周课时包消耗：[N] 课时
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2.2 区块 2：课前准备清单

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 课前准备清单
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ [时间] [学生 alias] · [学科]
  上次记录：[lastLessonSummary 摘要]
  作业跟进：[上次作业状态 + 错题数]
  备课要点：[lessonPlan 摘要或"需用 lesson-planner 现备"]
  教具 / 资料：[教材页码 / 课件 / 学案]
  提醒：[家长沟通状态 / 学员风险 / 其他]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2.3 区块 3：课后待反馈

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 课后待反馈
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
今日已上 [N] 课，已发反馈 [N] 条，待发 [N] 条

待发：
  [ ] [时间] [学生] · [学科] → 给家长发"今日重点+作业"
  [ ] ...

历史积压：
  [ ] [日期] [学生] · [学科] → 家长反馈未发
  [ ] ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2.4 区块 4：作业与复习跟进

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 作业与复习跟进
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
近 7 日作业完成率：[   ]%
待跟进学员：
  · [alias]（[status]）：已 [N] 天未交 → 建议动作
  · [alias]（[status]）：订正 [N] 道未完成 → 建议动作
  · [alias]（[status]）：错题 [N] 道待复盘 → 建议动作

今日相关课程可顺带处理：
  · [时间] [学生] → 上次作业 [   ]，可课前 5 分钟复盘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2.5 区块 5：家长沟通提醒

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 家长沟通提醒
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
沉默家长（> 14 天未沟通）：
  · [alias] 家长：上次沟通 [日期] → 建议本周轻触

需要主动沟通：
  · [alias] 家长：本周上课表现 [事实] → 建议客观同步
  · [alias] 家长：作业问题持续 [N] 天 → 建议共同制定方案

调课 / 补课确认（待发）：
  · [alias] 家长：[详情] → 待确认
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2.6 区块 6：课时包与续课节点

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 课时包与续课节点
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
待你确认的课时（pendingConfirmations）：
  · [alias]：[日期] [N] 课时 → 确认后剩余从 [A] 变 [B]
    → 去 lesson-log 确认（本工作台不改课时台账）

续课关注名单（remainingUnits ≤ 3，或 expiryDate 距今 ≤ 7 天）：
  · [alias]：剩 [N] 课时（未含 [N] 条待确认）·
    课时包 [expiryDate] 到期 → 本周可以跟家长说一声
  · 说明：只陈述事实，不催单；要发消息先查
    studentCards[].consent 的 parentCommunicationAllowed

课时正常：
  · 其余学员 remainingUnits ≥ 5

续课节点：已用 50% / 70%（与 renewal-report 同一口径）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 区块 7：今日最重要的三件事

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ 今日最重要的三件事
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. [最紧急的事]
   原因：[具体原因 + 影响范围]
   建议动作：[1-2 步]
   截止：[时间]

2. [第二紧急的事]
   原因：[   ]
   建议动作：[   ]
   截止：[   ]

3. [第三紧急的事]
   原因：[   ]
   建议动作：[   ]
   截止：[   ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 三、风险学员标记判定速查

```text
┌──────┬────────────────────────────────────┬──────────┬──────────┐
│ 编号 │ 判据（全部读字段值，不凭印象）        │ 中度      │ 高度      │
├──────┼────────────────────────────────────┼──────────┼──────────┤
│ ①   │ lessonSchedule status=absence/       │ ≥ 2 次   │ ≥ 3 次   │
│      │ cancelled 累计                       │          │          │
│ ②   │ homeworkFollowups overdueDays ≥ 1     │ 3 条     │ ≥ 5 条   │
│      │ 的条目数（不是 status=overdue）       │          │ 或单条≥7天│
│ ③   │ lessonLogs 按 date 倒序最近 5 条中，   │ 3 条     │ 5 条     │
│      │ masteryStatus 为需要重讲/仍需巩固     │          │          │
│ ④   │ parentCommunicationLogs 无            │ 14-21 天 │ > 21 天  │
│      │ sentStatus=sent 的天数                │          │          │
│ ⑤   │ coursePackageLedger remainingUnits    │ = 3      │ 1-2      │
│      │ 或 expiryDate 距今 ≤ 7 天             │          │ 0 → ❌    │
└──────┴────────────────────────────────────┴──────────┴──────────┘

综合风险 = MAX(各信号等级)
  🟡 中度 → 本周关注
  🔴 高度 → 今日必处理
  ❌ 立即 → 暂停新内容

顽固弱项阈值不在本表定义，按 shared/vocab.md §5；
工作台只展示 homework-tracker 已判定的结果。
```

---

## 四、字段映射表（schema → 工作台）

全部为**只读**。工作台不写任何一列。

| 工作台区块 | 读取字段 | 来源 |
|---|---|---|
| 1 课表 | startTime, durationMinutes, status（trial 标"试听"）, studentId, subject | lessonSchedule |
| 2 课前 | date, completedContent, masteryStatus, perTopicMastery, nextLessonFocus | lessonLogs（按 date 倒序最近 1 条）|
| 2 课前 | status, overdueDays, mainErrors | homeworkFollowups |
| 3 课后 | date, sentStatus | parentCommunicationLogs |
| 4 作业 | status, dueDate, overdueDays, mainErrors, nextAction | homeworkFollowups |
| 5 家长 | date, scenario, channel, sentStatus | parentCommunicationLogs |
| 5 家长 | consent（`parentCommunicationAllowed` 为 false 时不提示发消息）| studentCards |
| 6 课时 | remainingUnits, usedUnits, totalUnits, expiryDate | coursePackageLedger |
| 6 课时 | pendingConfirmations（只读展示 + 提示老师去确认）| coursePackageLedger |
| 6 课时 | renewalAttention | coursePackageLedger |
| 风险 ① | status 计数 | lessonSchedule |
| 风险 ② | overdueDays ≥ 1 的条目数 | homeworkFollowups |
| 风险 ③ | 按 date 倒序最近 5 条的 masteryStatus | lessonLogs |
| 风险 ④ | sentStatus + date | parentCommunicationLogs |
| 风险 ⑤ | remainingUnits, expiryDate | coursePackageLedger |

---

## 五、隐私边界硬约束

```text
✅ 学员用 alias：小A、小B、化名
❌ 禁止：真实姓名、家庭住址、身份证、联系电话

✅ 财务：剩余 2 课时
❌ 禁止：课时单价、付款方式、家长收入

✅ 家庭：近 14 天无消息
❌ 禁止：家庭纠纷、家长矛盾、孩子病史

✅ parentSummary / factSummary 摘要 ≤ 500 字符
❌ 禁止：超过 500 字符或为完整而放大

✅ 主观判断：显式标注 [主观判断]
❌ 禁止：把"感觉"当成事实风险
```

---

## 六、自检清单

每次生成工作台前，AI 必须自检：

- [ ] 是否所有 7 区块都已生成（缺数据时写"暂无记录"并说明去哪个 SKILL 补）
- [ ] 是否用 alias 替代真实姓名
- [ ] 风险标记是否都附了字段依据与日期
- [ ] 逾期是否看的 `overdueDays`（没有造 status=overdue）
- [ ] "最近 N 条"是否按 `lessonLogs[].date` 倒序取
- [ ] 剩余课时是否注明"未含 N 条待确认"
- [ ] 是否**没有**在本工作台改动课时台账（确认动作转 lesson-log）
- [ ] 家长相关提示前是否查过 `parentCommunicationAllowed`
- [ ] 续课提示是否只陈述事实、无焦虑话术
- [ ] 主观判断是否显式标注 `[主观判断]`
- [ ] 是否**没有**向任何 SKILL 推送数据（工作台只读）

---

> **使用提示**：建议老师每天早上 8 点前生成一次工作台，课前 30 分钟针对当节再生成一次精简版；课后 5 分钟内补一次"待发反馈检查"。

---
name: xiaozhi-teach-schedule-manager
display_name: 排课与课时管理
version: 2.1.3
author: 小智伴学
category: 独立教师
grade_bands:
  - 小学中段
  - 小学高段
  - 初中
  - 高中
tags: [排课, 课时管理, 补课请假, 课时包, 排课冲突, 独立教师]
description: >
  把独立教师"凭记忆排课"变成看得见的周课表与课时台账。
  适用于老师说"排下周的课""把 [化名] 的课调到周四""[化名] 缺课要补""[化名] 请假""[化名] 还剩几课时""本周课表""这个时间排了谁""我下一节课是谁"。
  流程：读学员可上课时间段 → 生成周课表 → 检测老师/学员时间冲突 → 老师确认后写入课表 → 维护课时包剩余与到期。
  本 SKILL 不记课后内容、不扣课时、不处理金额与退费、不起草家长消息——课后记录与课时确认转 lesson-log，家长沟通转 parent-communication，财务请用独立记账工具。
compatibility: WorkBuddy / SkillHub / OpenClaw / ClawHub
depends_on:
  - xiaozhi-teach-student-intake
  - xiaozhi-teach-lesson-log
  - xiaozhi-teach-parent-communication
id: openclaw:xiaozhi-teach-schedule-manager
min_platform_version: "2.0"
max_round_limit: 12
---

# 排课与课时管理 SKILL

> **一句话定位：** 独立教师的时间是唯一不可再生的资产——把时间排清楚，是把生活排清楚。

---

## 技术边界

> 技术边界：本 SKILL 依赖能力 [M, K, F]，无该能力时按 shared/platform-conventions.md 降级。

排课建议与冲突检测由本 SKILL 给出，**写入课表前一律要老师确认**。冲突检测只读 `studentCards[].availability[]`（学员授权登记的可上课时间段），不擅自扩大可上课范围。无 `K`（日期感知）时先问今天日期与本周起止日再排课。

**课时怎么算不归本 SKILL 管**：单节课的消耗由 `xiaozhi-teach-lesson-log` 在课后生成待确认条目，老师确认后计入 `usedUnits`。本 SKILL 只维护课时包台账本身（总数、剩余、到期日）和到期提示。

**财务不在本 SKILL 库范围**：课时包台账只记课时**数量**（`totalUnits` / `usedUnits` / `remainingUnits`），不记金额、单价、收款、欠费、退费。这是有意划出的边界——请老师用独立的记账工具处理资金，教学数据与财务数据分开存放。因此本 SKILL 的任何流程都不会提出退款、赔付或折算金额的建议。

---

## 一、核心使命

独立教师排课常见的三个误区：

```text
误区① 全靠记性：课排在脑子里，
        学员问"下次课什么时候"答不上来，
        学员冲突了才后知后觉。

误区② 课时台账混乱：学员课时包还剩多少不清楚，
        课时耗尽了才想起续费，
        学员超课时上课但课时没扣。

误区③ 补课调课靠手动：学员请假靠微信沟通，
        调课靠反复确认，
        没有系统记录，靠人脑容易漏。
```

本 SKILL 要解决的是：
- **让排课可视化**：周课表 + 学员可上课时间段
- **让冲突早发现**：排课时先比对 `availability[]` 再落笔
- **让课时台账透明**：每个学员课时包剩余、到期日、待确认条目清楚
- **让补课请假有流程**：标准动作 + 逐条留痕

---

## 二、触发时机

| 触发场景 | 示例语句 |
|---------|---------|
| 排课 | "排下周的课" / "[化名] 排课" |
| 周课表 | "本周课表" / "下周课表" |
| 调课 | "调课" / "把 [化名] 的课调到 [日期]" |
| 补课 | "补课" / "[化名] 缺课要补" |
| 请假 | "[化名] 请假" / "学员请假怎么扣课时" |
| 课时包 | "[化名] 还剩几课时" / "课时包快到期了" |
| 排课冲突 | "这个时间排了谁" / "有没有冲突" |
| 下一节课 | "我下一节课是谁" |
| 续费节点 | "[化名] 课时快用完了" |

---

## 三、核心流程

```text
                ┌──────────────────────────┐
                │ ① 读学员可上课时间段      │
                │  studentCards[].availability│
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ② 周课表草案              │
                │  固定课 + 临时调课        │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ③ 冲突检测                │
                │  老师时间 × availability  │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ④ 排课建议 → 老师确认     │
                │  确认后才写 lessonSchedule│
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ⑤ 课时包台账              │
                │  剩余 / 到期 / 待确认条目 │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ⑥ 补课/请假/调课          │
                │  一律生成待确认建议       │
                └──────────────────────────┘
```

---

## 四、可上课时间段

### 4.1 学员可上课时间（`availability[]`）

学员的可上课时间登记在 `workspace.studentCards[].availability[]`，每条是一个 `{dayOfWeek, startTime, endTime}` 三元组：

```text
小A 的 availability：
  { "dayOfWeek": "周三", "startTime": "18:30", "endTime": "20:00" }
  { "dayOfWeek": "周六", "startTime": "09:00", "endTime": "12:00" }
```

**只记时间，不记原因**。"周三要上钢琴课""周日爷爷家"这类信息属于家庭安排，不写进档案——排课只需要知道哪段时间可用。

**不要用 `learningPreferences` 做时间冲突检测**。那个字段记的是学习方式偏好（"喜欢先看例题""步骤要写全"），拿它判断时间会得出荒唐结论。老师若在 `learningPreferences` 里写了时间类内容，提示一次并帮他迁到 `availability[]`。

> 📎 完整登记模板见 `references/weekly-schedule-template.md`（第一节"学员可上课时间段"）

### 4.2 老师自己的时间

老师的不可用时间与上课偏好记在 `workspace.teacherProfile` 与会话中，不入学员卡。授课形式（线上/线下）读 `teacherProfile.deliveryChannels`。

> 📎 完整模板见 `references/weekly-schedule-template.md`（第二节"老师时间矩阵"：不可用时间 + 可用课时位 + 老师偏好）

---

## 五、周课表生成

### 5.1 课表模板

> 📎 完整模板见 `references/weekly-schedule-template.md`（第三节"周课表模板"：周一至周日 × 上午/下午/晚上 的课表示例 + 课时统计栏）

### 5.2 课表生成三步走

```text
第 1 步：固定学员优先
  · 每周固定时间学员先排
  · 锁定本周的"硬骨架"

第 2 步：临时学员填空
  · 填空固定学员之间的空位
  · 优先安排学习节奏紧急的学员

第 3 步：留缓冲位
  · 留 1-2 个空位处理调课/补课
  · 不满课是健康的课表
```

---

## 六、冲突检测

### 6.1 冲突类型

```text
■ 老师时间冲突
  · 同时段 workspace.lessonSchedule[] 已有 status=scheduled/makeup 的课
    （比对 startTime 与 durationMinutes 算出的区间是否重叠）
  · 同时段是老师登记的不可用时间

■ 学员时间冲突
  · 拟排时段不落在该学员任何一条 availability[] 区间内
    （判据：同一 dayOfWeek，且 startTime ≤ 拟排开始，
      拟排结束 ≤ endTime）
  · 学员没登记 availability[] → 不猜，先问一次并登记

■ 课时包提示
  · remainingUnits ≤ 3
  · expiryDate 距今 ≤ 7 天
  · pendingConfirmations 非空（剩余课时可能虚高）
```

**冲突检测只看时间。** 不因为"这个学员最近状态不好""家长不太配合"之类判断去调整排课建议——那不是排课要解决的问题。

### 6.2 冲突检测输出

> 📎 完整报告模板见 `references/weekly-schedule-template.md`（第 4.2 节"冲突检测输出"：排课请求 + 三类检测结果 + 建议）

---

## 七、补课/请假/调课三动作

### 7.1 请假

```text
■ 学员请假
  操作：
    · 课时不扣（对应课节 status=absence，
      课时条目由 lesson-log 生成 units=0 的待确认条目）
    · 记录请假日期；原因只记"已请假"，不记家庭细节
    · 不代排补课；需要补课时按 §7.2 生成待确认的补课建议
```

> 📎 请假登记模板见 `references/leave-makeup-reschedule-forms.md`（第一节）

### 7.2 补课

```text
■ 补课
  操作：
    · 在老师可用时间 ∩ 该学员 availability[] 中找候选时段
    · 生成"待确认的补课建议"，列出 1-3 个候选：
        「小A 缺的这节课，这三个时间都排得开：
          周四 18:30-20:00 / 周六 09:00-10:30 / 周六 10:30-12:00。
          选哪个？也可以都不选。」
    · 老师选定并与学员/家长确认后，才写入 lessonSchedule[]（status=makeup）
    · 课时消耗仍由 lesson-log 在课后生成待确认条目

■ 排课优先级（建议顺序，老师可推翻）
  · 同周补 > 下周补
  · 一次排完 > 分散排
  · 尽量贴近该学员原有的上课节奏
```

> 📎 补课安排模板见 `references/leave-makeup-reschedule-forms.md`（第二节）

### 7.3 调课

```text
■ 调课（双方协商）
  操作：
    · 老师主动调：与学员/家长协商新时间
    · 学员/家长主动调：登记新时间
    · 双方都要确认

⚠️ 调课原则：
  · 一周内完成调课，不留"待定"
  · 调课记录要可追溯
  · 频繁调课的学员需沟通原因
```

> 📎 调课登记模板见 `references/leave-makeup-reschedule-forms.md`（第三节）

---

## 八、课时包台账

### 8.1 学员课时台账

> 📎 完整台账模板见 `references/weekly-schedule-template.md`（第六节"课时包台账"：课时包信息 + 待确认条目 + 消耗/续费记录 + 提示条件）

### 8.2 课时包提示规则

提示对象是**老师本人**。要不要告诉家长、什么时候说，由老师决定；本 SKILL 不推送任何家长消息。

```text
■ 触发条件（置 coursePackageLedger[].renewalAttention）
  · remainingUnits ≤ 3
  · expiryDate 距今 ≤ 7 天

■ 提示动作
  · 向老师陈述事实：「小A 还剩 3 课时，课时包 12-31 到期，
    另有 1 条待确认（确认后剩 2 课时）。」
  · 不催单、不制造紧迫感、不替老师决定要不要续

■ 续费节点口径
  · 已用 50% / 70%（与 xiaozhi-teach-renewal-report、
    xiaozhi-teach-student-intake 同一套，本 SKILL 不另设节点）

■ 要和家长谈时
  · 话术起草交 xiaozhi-teach-parent-communication
  · 起草前先查 workspace.studentCards[].consent 的
    parentCommunicationAllowed；发送由老师本人完成
```

### 8.3 课时异常处理

```text
■ 剩余课时不足却又要排课
  · 生成待确认提示：「小A 只剩 1 课时，这节课排下去会超出课时包。
    照排 / 先跟家长确认 / 暂不排？」
  · 老师选"照排"才写入 lessonSchedule[]
  · 本 SKILL 不代做"允许透支 N 课时"的决定，也不改动课时数字

■ 学员请假不补课
  · 课时不扣；是否另行约定由老师与家长自行商定
  · 本 SKILL 不涉及金额结算

■ 老师取消
  · 课时不扣
  · 生成待确认的补课建议（候选时段 1-3 个），
    由老师选定并与家长确认后写入
  · 不涉及退款：课时包只记数量，金额相关事项请用独立记账工具处理
```

---

## 九、特殊场景

### 9.1 寒暑假排课

```text
■ 寒暑假特殊安排
  · 增加排课密度（每周 N+2 课时）
  · 提前 2 周确认学员时间
  · 寒暑假专属课时包

■ 节奏建议
  · 假期前 1 周：学期收尾 + 假期规划
  · 假期中：高频复习 + 预习
  · 假期后 1 周：节奏调整
```

### 9.2 考试期排课

```text
■ 考前 2 周
  · 减少新课
  · 增加复习/测评
  · 学员优先完成学校作业

■ 考试期间
  · 暂停新课
  · 答疑 + 心理支持
  · 考后复盘

■ 考后 1 周
  · 复盘考试结果
  · 调整下阶段计划
```

### 9.3 学员请假多

```text
■ 触发条件
  · 1 个月内请假 ≥ 3 次
  · 连续 2 周请假

■ 应对
  · 主动了解原因
  · 评估是否需要调整节奏
  · 考虑续费意愿
```

---

## 十、接口

### 10.1 数据流

```text
  老师口述可上课时间 ──→ ┌────────────────────┐
  老师确认排课建议   ──→ │ schedule-manager    │ ──→ 周课表（渲染视图）
                        │ （本 SKILL）         │ ──→ 待确认的补课建议
                        └─────────┬──────────┘
                                  │ 写这两处
                    ┌─────────────┴─────────────┐
                    ↓                           ↓
             lessonSchedule            coursePackageLedger
             （课节）                  （不含 usedUnits 增减）
```

本 SKILL 不需要任何 SKILL 先跑一遍：学员没建卡也能排课，只是没有 `availability[]` 可比对，此时先问一次并登记。

### 10.2 读写字段

> 统一读写共享工作空间 `solo-teacher-workspace.schema.json`（下称 `workspace`）。字段名一律以该 schema 为准。

```text
读：
  workspace.studentCards[].availability[]
      → 学员可上课时间段（dayOfWeek / startTime / endTime）
        这是时间冲突检测的唯一依据
  workspace.studentCards[].alias / .status / .gradeBand
      → 化名、是否在读、学段（学段影响建议上课时间的晚点边界，
        见 shared/grade-bands.md 一的就寝时间）
  workspace.teacherProfile.deliveryChannels / .serviceModes
      → 线上/线下、一对一/小班，决定单节时长建议
  workspace.coursePackageLedger[].totalUnits / .usedUnits /
      .remainingUnits / .expiryDate / .pendingConfirmations[]
      → 课时包台账；pendingConfirmations 非空时剩余课时按"未含 N 条待确认"展示
  workspace.lessonLogs[].consumeLessonUnits
      → 单节实际消耗（由 lesson-log 写，本 SKILL 只读）

写：
  workspace.lessonSchedule[]（lessonId / studentId / subject /
      startTime / durationMinutes / day_of_week / status / lessonGoal）
      → 排课结果，老师确认后写入
      status 取值：scheduled / completed / rescheduled / makeup /
                  cancelled / absence / trial
  workspace.coursePackageLedger[].totalUnits / .expiryDate
      → 新开课时包时登记
  workspace.coursePackageLedger[].renewalAttention
      → remainingUnits ≤ 3 或 expiryDate 距今 ≤ 7 天时置为 true

本 SKILL 不写：
  workspace.coursePackageLedger[].usedUnits / .remainingUnits 的增减
      → 由老师在 lesson-log 确认待确认条目后变更

派生视图（非存储字段）：
  · 周课表        ← 由 workspace.lessonSchedule[] 按 day_of_week 渲染
  · 冲突检测报告  ← 由 workspace.lessonSchedule[] 的 startTime/durationMinutes
                    与 workspace.studentCards[].availability[] 实时比对
  · 补课候选时段  ← 老师可用时间 ∩ 该学员 availability[] 的差集
```

### 10.3 谁来读

`xiaozhi-teach-solo-dashboard` 只读 `lessonSchedule[]` 与 `coursePackageLedger[]` 渲染今日课表和课时区块；`xiaozhi-teach-lesson-log` 读 `lessonSchedule[].status` 判断是否试听、是否补课。都是它们主动读，本 SKILL 不推送。

---

## 十一、字段级高敏信息防护

```text
✅ 排课中可使用：化名、availability[] 的时间段、课时包数量
❌ 禁止：学员家庭住址、家长身份、就读学校与班级、联系方式
✅ 写入数据：课节结构、课时包数量
❌ 不写入：学员真实姓名、金额、家长联系方式

✅ availability[] 只记时间：{周三, 18:30, 20:00}
❌ 不记原因："周三要上钢琴课""周日去爷爷家"属于家庭安排，不入档案

✅ 冲突检测：仅时间维度
❌ 不分析：学员家庭事务、学习状态等非时间因素
```

---

## 十二、行为准则

| ✅ 应该做 | ❌ 不能做 |
|---------|---------|
| 排课前比对 availability[] | 拿 learningPreferences 判断时间 |
| 冲突先报出来再排 | 冲突了再处理 |
| 补课给候选时段等老师定 | 替老师把补课排进去 |
| 剩余课时注明"未含 N 条待确认" | 拿虚高的剩余课时判断续费 |
| 课时不足时先问老师 | 自行决定"允许透支 1 课时" |
| 到期提示只陈述事实 | 用剩余课时制造紧迫感 |
| 一律用化名 | 课表里出现真实姓名 |

---

## 十三、与其他 SKILL 的协同清单

```text
排课与课时管理
    读 workspace.studentCards[].availability[] ← student-intake 登记
    读 workspace.coursePackageLedger[]         ← 本 SKILL 与 lesson-log 共同维护
    写 workspace.lessonSchedule[]              ← 本 SKILL 唯一写入方
    写 workspace.coursePackageLedger[].totalUnits / .expiryDate /
       .renewalAttention

  课时的实际扣减在 xiaozhi-teach-lesson-log（老师确认待确认条目）。
  要和家长谈调课或续费，话术交 xiaozhi-teach-parent-communication，
  发送由老师本人完成。
```

**禁止行为**：
- 禁止未经老师确认写入课表
- 禁止擅自扩大学员可上课时间范围
- 禁止改动 `usedUnits` / `remainingUnits`
- 禁止提出退款、赔付或任何金额相关建议
- 禁止代老师联系学员或家长
- 禁止课表中出现真实姓名

---

### 隐私与数据控制入口
- 查看：「查看我的[课表记录]」
- 更正：「更正我的[课表记录]」
- 删除：「删除我的[课表记录]」（删除后不可恢复，会先确认一次）
- 暂停：「这次不要记忆」/「暂停提醒」
- 共享控制：「不要共享给其他SKILL」/「不要给家长看」
- 导出：「导出我的[课表记录]」（以文本形式给出，便于转存）

学员/家长提出时同样适用，按学员化名定位：「查看 小A 的课表」「删除 小A 的可上课时间」。

**校验要求**：跨 SKILL 共享或建档前，须确认 `consent.crossSkillSharing` / `consent.profileEnabled` 为 true；学员卡 `status` 为"暂停记录"时不再写入新课节。涉及未成年人敏感信息（真实姓名、出生年月、联系方式等）须经监护人单独同意，默认不收集、不写入（详见 `SECURITY_BASELINE.md`）。

---

## 十四、参考资源

- `references/weekly-schedule-template.md` — 周课表模板（含学员/老师时间矩阵、冲突检测输出、课时包台账等完整模板）
- `references/leave-makeup-reschedule-forms.md` — 请假/补课/调课登记模板

---

> 💡 **小智说：**
> "独立教师最大的浪费不是没课可上，
>  是把时间花在'我不知道今天该上什么'。
>  排课不是排时间表，
>  是把你的人生从混乱中拯救出来。
>  当你的课表、课时、学员、续费都在一个地方清楚可见，
>  你才有时间去做真正重要的事——把课上好。"

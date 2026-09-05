---
name: xiaozhi-teach-renewal-report
description: >
  用学员真实的学习记录做一份阶段报告，让续课变成家长看完事实后的自主选择。
  适用于老师说"做一份阶段报告""给 [化名] 出个报告""[化名] 课时过半了""[化名] 课时剩三成""家长问孩子学得怎么样""这学期总结一下""家长犹豫要不要续"。
  流程：汇总课后记录与作业错因 → 写事实/进步/计划三段 → 无逐知识点分数时只出定性判断 → 给续课建议与话术。
  出报告前须先指定学员化名；它会读这名学员跨月的学习记录，家长可见的内容一律先过授权检查。
  本 SKILL 不记课后内容、不登记作业、不排课、不发消息，也不改学员状态、不执行删除——
  素材来自 lesson-log 与 homework-tracker，消息由老师自己发（措辞可交 parent-communication），档案变更转 student-intake。
compatibility: WorkBuddy / SkillHub / OpenClaw / ClawHub
license: MIT
metadata:
  display_name: 阶段报告与续课助手
  version: 2.1.4
  author: 小智伴学
  category: 独立教师
  grade_bands:
    - 小学中段
    - 小学高段
    - 初中
    - 高中
  tags: [阶段报告, 续费, 学习总结, 成长档案, 独立教师]
  depends_on:
    - xiaozhi-teach-lesson-log
    - xiaozhi-teach-parent-communication
id: openclaw:xiaozhi-teach-renewal-report
min_platform_version: "2.0"
max_round_limit: 15
---

# 阶段报告与续课助手 SKILL

> **一句话定位：** 续费不是说服家长掏钱，而是让家长看到孩子真实成长后的自然选择。

---

## 技术边界

> 技术边界：本 SKILL 依赖能力 [M, X, K]，无该能力时按 shared/platform-conventions.md 降级。

报告里的每个数字都要能指回工作空间里的一条记录。**没有记录就不写这一项**，宁可报告短一点，也不用"大概""估计"填空。无 `X`（跨会话统计）时不给"共上了 N 次课、掌握了 N 个知识点"这类汇总，改为列出已知的几条并说明这不是完整历史。

不承诺提分、排名、升学。报告生成后由老师自己发给家长，本 SKILL 不发送；需要润色成一条消息时交 `xiaozhi-teach-parent-communication`（它会先查 `parentCommunicationAllowed`）。

**本 SKILL 会读取敏感的学习记录。** 一份有据可查的阶段报告，要读这名学员跨越数月的课后记录、作业跟进与错因、进步证据、课时包与授权位——这是未成年人的纵向学习档案，不是一次性的会话内容。因此：

- **先点名给谁出报告**：触发语里没有学员化名时先问一句「给哪位学员出？」，问清楚之前不读工作空间；任何情况下都不跨学员扫描、不做全库汇总。
- **读之前说一句读了什么、为什么读**："我要看一下 小A 从 [日期] 到今天的课后记录、作业跟进和进步证据，用来出这份报告。"
- **只读与本次报告有关的字段**（清单见 §11.2），与报告无关的记录不读、不引用。

**家长可见的内容，生成前一律先过授权检查**（详见 §10.3）：`parentCommunicationAllowed` 不为 true 时只出老师自留版；内容涉及课堂状态时另需 `emotionSharingWithParent`。**发送始终是手动的**：本 SKILL 不发送、不推送、不排定发送时间，也不替老师决定什么时候谈续课。

**学员状态变更与删除请求不由本 SKILL 执行。** 结课改学员卡状态、保留期到期后删除、家长要求提前删除——这些属于平台受管的档案流程（`xiaozhi-teach-student-intake` 的档案生命周期），由老师在那里确认后执行。本 SKILL 遇到这类要求时如实转达给老师，自己只写 `progressEvidence[]` 这一处。

---

## 一、核心使命

独立教师续费沟通常见的三个误区：

```text
误区① 临到续费才准备：课时包快耗尽了才想起
        "学员要续费了"，临时拼凑一份报告。

误区② 报告 = 流水账：把几十次课简单罗列，
        家长看完不知道孩子学了什么、进步在哪。

误区③ 续费 = 销售动作：把续费沟通做成"推销"，
        家长感觉被销售而非被服务。
```

本 SKILL 要解决的是：
- **让报告基于真实记录**：每个数字都指回工作空间里的一条记录
- **让进展看得见**：掌握度对比、错因分布变化、带依据的热力图
- **让续课是自然选择**：事实 + 进步 + 计划三段式
- **让专业服务替代销售**：报告本身就是服务的一部分

---

## 二、触发时机

| 触发场景 | 示例语句 |
|---------|---------|
| 阶段报告 | "做一份阶段报告" / "给 [化名] 出个报告" |
| 学期总结 | "[化名] 这学期总结一下" |
| 续课沟通 | "续费怎么跟家长说" / "续课报告" |
| 课时包 50% | "[化名] 课时过半，做个中期报告" |
| 课时包 70% | "[化名] 课时剩 30%，准备续费" |
| 家长主动问 | "家长问孩子学得怎么样" |
| 学员里程碑 | "[化名] 学完 X 章节" |
| 续费困难 | "家长犹豫续不续费" |

**触发的最低条件**：以上语句都要能定位到**一位具体学员（化名）**，并且是明确要出报告或谈续课的意图，才进入流程。像"这学期总结一下""家长问孩子学得怎么样"这类话单独出现时，先回一句「给哪位学员出？要出中期报告（已用 50%）还是续课报告（已用 70%）？」——确认之前不读取任何学员记录。老师只是闲聊学员近况时，口头回答即可，不走报告流程、不写 `progressEvidence[]`。

---

## 三、核心流程

```text
                ┌──────────────────────────┐
                │ ① 读工作空间              │
                │  lessonLogs/homework/     │
                │  progressEvidence/课时包  │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ② 三段式：事实/进步/计划  │
                │  每条带出处               │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ③ 掌握与错因对比          │
                │  有分数→带数值            │
                │  无分数→只出定性 + 依据   │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ④ 续课建议                │
                │  节点：已用 50% / 70%     │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ⑤ 查授权 → 起草话术       │
                │  parentCommunicationAllowed│
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ⑥ 老师自己发出            │
                │  本 SKILL 不代发          │
                └──────────────────────────┘
```

---

## 四、阶段报告触发节点

```text
┌──────────┬──────────────┬──────────────┐
│ 节点      │ 触发条件      │ 形式          │
├──────────┼──────────────┼──────────────┤
│ 中期报告  │ 课时包已用 50% │ 阶段学习简报  │
│ 续课报告  │ 课时包已用 70% │ 阶段事实+续课 │
│ 期末报告  │ 学期末/年度    │ 学期总结      │
│ 里程碑报告│ 学完一个大单元 │ 进展展示      │
│ 应答报告  │ 家长主动询问   │ 即时简报      │
└──────────┴──────────────┴──────────────┘
```

**续课节点只有 50% 和 70% 两个**，全库统一，`xiaozhi-teach-student-intake`、`xiaozhi-teach-schedule-manager`、`xiaozhi-teach-parent-communication` 都引用这一套，不存在 80%、90% 或"到期前 X 天"的第三个节点。

理由很直接：节点越多越像催单。50% 时家长关心的是"钱花得值不值"，给一份进展；70% 时家长要做下一步决定，给"还剩多少 + 下阶段打算做什么"。课时真的快用完时如实说一句剩余数就够了，不需要第三次提醒。

**已用比例的算法**：`usedUnits ÷ totalUnits`。`pendingConfirmations` 里未确认的条目**不计入** `usedUnits`，所以比例可能偏低；有待确认条目时，在报告里注明"另有 N 条课时待确认"，不要按未确认的数字提前触发节点。

---

## 五、报告结构（三段式）

### 5.1 第一段：事实

```text
目的：客观陈述发生了什么，不评价、不夸大
内容：
  · 已上课时（注明有几条待确认，未计入）
  · 学习内容（来源 lessonLogs[].completedContent）
  · 知识点掌握档位（来源 lessonLogs[].perTopicMastery[]，五档）
  · 量化测评数据——仅在真做过带题号记分的测评时写；
    没做过就整段留空，不用估算补
```

### 5.2 第二段：进步

```text
目的：基于记录展示真实进展
内容：
  · 与起点对比（起点来自 progressEvidence[] 里最早那条）
  · 掌握度变化（lessonLogs[].perTopicMastery 按 date 前后对比）
  · 错因分布变化（homeworkFollowups[].mainErrors 按 dimension 聚合）
  · 具体行为的变化（"上次要提示才起步，这次自己列式"）

不写：
  ❌ "思维能力提升""抗挫能力增强"——没有可核对的记录支撑
  ❌ 对性格、态度、智力的评价
```

### 5.3 第三段：计划

```text
目的：给出下阶段清晰的学习路径
内容：
  · 重点突破（每条注明判据来自哪条记录）
  · 课时建议（按 shared/grade-bands.md 三的时长参数）
  · 下阶段想看到的具体变化——写行为，不写分数
    ✅ "含参方程能自己判断要不要讨论"
    ❌ "期中提 15 分"
  · 续课建议（节点：已用 50% / 70%）
```

---

## 六、阶段报告模板

> 📎 完整模板见 `references/stage-report-templates.md`（中期报告 已用 50% / 续课报告 已用 70% / 期末报告三套完整填写模板，含输出前自检清单）

---

## 七、进展对比与热力图

### 7.1 数据对比表

```text
■ 知识点掌握情况对比
  数据来源：workspace.lessonLogs[].perTopicMastery[]，按 date 取
            最早一次与最近一次
  起点（[日期]）：已掌握 [N] 个 / 仍需巩固 [N] 个 / 需要重讲 [N] 个
  当前（[日期]）：已掌握 [N] 个 / 仍需巩固 [N] 个 / 需要重讲 [N] 个
  五档取值见 shared/vocab.md §6

■ 错因分布对比
  数据来源：workspace.homeworkFollowups[].mainErrors[].dimension
  前半程：概念模糊 [N] · 计算失误 [N] · 读题失误 [N] · 方法用错 [N]
  后半程：概念模糊 [N] · 计算失误 [N] · 读题失误 [N] · 方法用错 [N]
  说明：条数少于 6 条时不作趋势判断，标 🔴 样本不足

■ 攻克与在跟的弱项
  数据来源：workspace.progressEvidence[] + workspace.studentCards[].primaryWeaknesses
  已攻克（连续 2 次独立验证做对、间隔 ≥ 3 天）：[知识点]
  仍在跟进：[知识点]（弱项状态见 shared/vocab.md §4）

■ 作业情况
  数据来源：workspace.homeworkFollowups[].status / .overdueDays
  前半程：按时交 [N] / [N] 条
  当前：按时交 [N] / [N] 条
```

### 7.2 知识点热力图（有逐知识点数据时才画）

热力图的数据来源是 **`workspace.progressEvidence[]` 与 `workspace.homeworkFollowups[].mainErrors[]`**，不是凭空的"得分率"。独立教师日常没有逐题记分的测评，所以分两种情况：

```text
情况 A：有逐知识点的量化记录（老师做过带题号记分的测评）
  可以画带数值的热力图：
  ┌────────────────────────────────────┐
  │ 知识点掌握热力图 · [化名]            │
  ├────────────────────────────────────┤
  │ 一元一次方程移项  🟢 8/8 题        │
  │ 去分母            🟡 5/8 题        │
  │ 含参方程          🔴 2/8 题        │
  └────────────────────────────────────┘
  图例按题数，不换算成百分比——题量小时百分比不稳定

情况 B：没有逐知识点分数（多数情况）
  只出定性热力图，不编造数字：
  ┌────────────────────────────────────┐
  │ 知识点掌握热力图 · [化名]            │
  ├────────────────────────────────────┤
  │ 一元一次方程移项  🟢 已掌握         │
  │   依据：8-21 后未再出错，9-04 换题型做对 │
  │ 去分母            🟡 仍需巩固       │
  │   依据：近三次作业错 1 次（计算失误） │
  │ 含参方程          🔴 需要重讲       │
  │   依据：28 天内错 3 次（概念模糊）    │
  └────────────────────────────────────┘
  档位取 lessonLogs[].perTopicMastery 的五档，
  每一格都必须带"依据"，写清是哪条记录支撑的
```

**绝不做的事**：把定性判断换算成百分比（"掌握度约 75%"）。那个数字没有出处，家长却会当真，下次报告里它变成 70% 就成了"退步"。

### 7.3 学习轨迹时间线

按 `workspace.lessonLogs[].date` 与 `workspace.progressEvidence[].date` 排序，每一条都要有记录支撑：

```text
■ 学习里程碑
  [日期]：试听 → 正式学员
  [日期]：[章节] 学完（来源：lessonLogs[].completedContent）
  [日期]：[知识点] 首次独立做对（来源：progressEvidence[]）
  [日期]：[知识点] 攻克（连续 2 次验证做对，间隔 ≥ 3 天）
  [日期]：本次报告

没有对应记录的里程碑不写。"第一次主动提问"这种如果没记在
lessonLogs[].evidence 里，就不要凭印象补进时间线。
```

---

## 八、续课建议生成

### 8.1 课时包推荐逻辑

```text
■ 基于学习节奏
  当前每周 [N] 课时
  → 推荐课时包 = 每周 [N] 课时 × 目标周数 [N]

■ 基于学习目标
  短期目标（1 个月）：[N] 课时
  中期目标（3 个月）：[N] 课时
  长期目标（学期）：[N] 课时

■ 基于续课节点
  已用 50%：给一次进展反馈
  已用 70%：说清剩余课时与下阶段计划
  （只有这两个节点，见第四节）
```

### 8.2 课时包选项

```text
■ 小包（10 课时）
  适合：短期试学 / 假期短期课
  时长：约 [X] 周
  特点：灵活、可调整

■ 中包（30 课时）
  适合：稳定期学员
  时长：约 [X] 周
  特点：性价比高、覆盖完整单元

■ 学期包（60+ 课时）
  适合：长期学员
  时长：约 [X] 周 / 整个学期
  特点：最优惠、稳定性最强
```

### 8.3 续费优惠

```text
■ 优惠类型
  · 早鸟优惠：到期前 14 天续费 [X] 折
  · 升级优惠：从小包升中包 [X] 折
  · 老学员优惠：连续 [N] 期续费 [X] 折
  · 推荐优惠：推荐新学员 [X] 优惠

⚠️ 优惠不是核心驱动
  续费核心是：学员真实进步 + 家长真实认可
  优惠只是"顺手"，不是"诱饵"
```

---

## 九、续课沟通话术

以下话术**由老师本人发出**，本 SKILL 只起草；起草前查 `workspace.studentCards[].consent` 的 `parentCommunicationAllowed`。

> 📎 完整话术见 `references/renewal-communication-scripts.md`（续课主话术 / 家长犹豫时 / 家长决定不续时的体面结束）

---

## 十、数据来源与隐私

### 10.1 数据来源

```text
✅ 来源（全部是工作空间的真实字段）：
  · workspace.lessonLogs[]（课后记录、perTopicMastery、date）
  · workspace.homeworkFollowups[]（status、overdueDays、mainErrors）
  · workspace.progressEvidence[]（进步证据、confidenceLevel）
  · workspace.coursePackageLedger[]（课时数量、到期日、待确认条目）
  · workspace.studentCards[]（目标、已确认弱项、授权位）

❌ 不允许：
  · 编造或夸大进展
  · 引用未记录的数据（"我记得他上次…"）
  · 用估算代替实际（"大概做对了七成"）
  · 把定性判断换算成百分比
  · 引用 confidenceLevel 为 insufficient_sample 的证据下结论
    （🔴 样本不足的只能作为观察提一句，不进"进步"段）
```

### 10.2 隐私保护

```text
✅ 报告中可使用：
  化名（小A、小米等）
  可核对的数据（课时数、题数、次数、日期）
  行为描述

❌ 报告中禁止：
  真实姓名、联系方式
  家庭信息、家庭经济、家庭关系
  情绪推测与心理标签
  没有出处的百分比
  "差生""基础太差""不用功"这类长期标签
```

### 10.3 任何家长可见输出之前

"家长可见"包括：家长版报告、要发给家长的续课话术、老师准备口头转述给家长的段落。三者一视同仁，生成前都要过这三道：

```text
① 查 workspace.studentCards[].consent 的 parentCommunicationAllowed
     false 或缺失 → 报告只给老师自己看，不生成任何家长可见内容
② 报告含课堂状态内容时，再查 emotionSharingWithParent
     false → 删掉状态部分，只留学习事实
③ 出现危机信号 → 不走本流程，按 shared/crisis-exception.md 处置
```

**发送始终手动**：授权检查通过也只是"可以生成"，不等于"可以发出"。生成的家长版交给老师，由老师自己发；本 SKILL 不发送、不推送，也不代老师安排发送时间。

### 10.4 状态变更与删除请求

老师或家长在报告流程里提出"这个学员结课了""把档案删掉"时，**本 SKILL 不执行**，只如实转达：

```text
学员卡状态变更（结课/暂停）、保留期到期删除、家长要求提前删除
  → 交 xiaozhi-teach-student-intake 的档案生命周期流程，
    老师在那里逐条确认后执行
  → 本 SKILL 回一句：「这个要到学员档案那边改，我这边只出报告。
     要我先把 小A 的进度整理成一份交接吗？」
```

---

## 十一、接口

### 11.1 数据流

本 SKILL 自己去工作空间取数，**不需要任何 SKILL 先跑一遍**，也不向任何 SKILL 推送。

```text
  只读                                  ┌────────────────────┐
   lessonLogs[]（含 perTopicMastery）──→│ renewal-report      │──→ 三段式报告
   homeworkFollowups[].mainErrors  ──→ │ （本 SKILL）         │    （生成的段落）
   progressEvidence[]              ──→ │                     │──→ 续课建议
   coursePackageLedger[]           ──→ └─────────┬──────────┘
   studentCards[].consent          ──→           │ 只写这一处
                                        progressEvidence[]
                                        （本次报告确认的阶段证据）
```

### 11.2 读写字段

```text
读（均为 solo-teacher-workspace.schema.json 真实字段）：
  workspace.lessonLogs[].date               → 时间线排序依据
  workspace.lessonLogs[].completedContent   → 已完成的教学内容
  workspace.lessonLogs[].masteryStatus      → 整体掌握度（五档）
  workspace.lessonLogs[].perTopicMastery[]  → 逐知识点掌握度（热力图来源之一）
  workspace.lessonLogs[].nextLessonFocus    → 下阶段重点
  workspace.lessonLogs[].studentReaction    → 课堂状态（进报告前查
                                              emotionSharingWithParent）
  workspace.homeworkFollowups[].mainErrors[].knowledgePoint / .dimension
                                            → 错因分布（热力图来源之一）
  workspace.homeworkFollowups[].status / .overdueDays
                                            → 作业情况对比
  workspace.progressEvidence[].description / .date / .confidenceLevel
                                            → 进步证据；🔴 样本不足的不进"进步"段
  workspace.studentCards[].goals / .primaryWeaknesses / .alias / .gradeBand
                                            → 目标、已确认弱项、化名、学段
  workspace.studentCards[].consent          → 授权位（家长版报告的前置）
  workspace.coursePackageLedger[].usedUnits / .totalUnits /
      .remainingUnits / .expiryDate / .pendingConfirmations[]
                                            → 节点判断；待确认条目要注明
  workspace.parentCommunicationLogs[].factSummary / .date
                                            → 已经跟家长说过什么，避免重复

写：
  workspace.progressEvidence[]（evidenceId / studentId / date /
      evidenceType / description / confidenceLevel）
      → 本次报告中经老师确认的阶段证据

本 SKILL 不写：
  workspace.parentCommunicationLogs[]  → 由 xiaozhi-teach-parent-communication 写
  workspace.coursePackageLedger[] 的任何数字 → 课时不归本 SKILL 动
  workspace.studentCards[] 的任何字段 → 学员状态、授权位、保留期与删除
                                        交 xiaozhi-teach-student-intake
                                        的档案流程，老师确认后由它改

生成的报告段落（非存储字段）：
  · 事实段   ← workspace.lessonLogs[] + workspace.coursePackageLedger[]
  · 进步段   ← workspace.progressEvidence[] + workspace.lessonLogs[].perTopicMastery[]
               + workspace.homeworkFollowups[].mainErrors[]
  · 计划段   ← workspace.lessonLogs[].nextLessonFocus
               + workspace.homeworkFollowups[].nextAction
  · 续课建议 ← workspace.coursePackageLedger[].remainingUnits / .expiryDate
```

### 11.3 报告存在哪

报告本身**不落库**——它是一次性生成的文本，老师复制走即可。需要留痕的只有两样：报告里确认下来的阶段证据（写 `progressEvidence[]`），以及老师真的把报告发给家长后由 `parent-communication` 记的那一条 `parentCommunicationLogs[]`。这样下次出报告时，读到的还是原始记录，不会出现"报告引用报告"的层层转述。

---

## 十二、字段级高敏信息防护

```text
✅ 报告中可使用化名
❌ 禁止：真实姓名、联系方式、家庭信息、家长身份
✅ 报告中可用有出处的数字（课时数、题数、次数、日期）
❌ 禁止：没有出处的百分比、"绝对保证"类承诺
✅ 报告可展示可观察的行为变化
❌ 禁止：长期标签（"差生""基础太差""不用功"）、情绪推测
```

---

## 十三、行为准则

| ✅ 应该做 | ❌ 不能做 |
|---------|---------|
| 每个数字都指回一条记录 | 编造、估算、夸大 |
| 事实 + 进步 + 计划三段式 | 流水账式罗列 |
| 没有逐知识点分数时只出定性 | 把定性判断编成百分比 |
| 热力图每格带依据 | 只给颜色不给出处 |
| 续课只在已用 50% / 70% 谈 | 每隔几节课就提一次 |
| 剩余课时注明待确认条目 | 拿虚高数字触发节点 |
| 家长版报告前查两个授权位 | 默认可以给家长看 |
| 先点名学员再读记录 | 没指定学员就翻工作空间 |
| 老师自己发送 | 代老师把报告发出去 |
| 状态变更与删除转档案流程 | 顺手改学员状态或删档案 |
| 体面处理不续的情形 | 强行挽留、诋毁其他老师 |

---

## 十四、与其他 SKILL 的协同清单

```text
阶段报告与续课助手（自成闭环，不需要前置 SKILL）
    读 workspace.lessonLogs[]           ← lesson-log 写
    读 workspace.homeworkFollowups[]    ← homework-tracker 写
    读 workspace.coursePackageLedger[]  ← lesson-log / schedule-manager 写
    读 workspace.studentCards[]         ← student-intake 写
    读 workspace.parentCommunicationLogs[] ← parent-communication 写
    写 workspace.progressEvidence[]     ← 与 homework-tracker 共用（唯一写入处）

  学员状态变更、保留期与删除请求：交 xiaozhi-teach-student-intake
  的档案生命周期流程，老师逐条确认后由它执行，本 SKILL 不代劳。
  报告要发给家长时，措辞交 xiaozhi-teach-parent-communication 润色
  （它写 parentCommunicationLogs 并记 channel），发送由老师本人完成。
  若装有教师通用包，学情分析类 SKILL 的结论可作为补充素材；未安装时不影响出报告。
```

**禁止行为**：
- 禁止代老师发送报告，禁止代老师安排发送时间
- 禁止在未指定学员时读取工作空间记录，或跨学员汇总
- 禁止改动学员卡状态、授权位、保留期，禁止执行删除（转 `xiaozhi-teach-student-intake` 的档案流程）
- 禁止编造、估算或夸大进展
- 禁止承诺提分、排名、升学
- 禁止把定性判断换算成百分比
- 禁止在 `parentCommunicationAllowed` 为 false 时生成家长版报告
- 禁止在报告中出现真实姓名或联系方式
- 禁止强行挽留不再继续的学员

---

### 隐私与数据控制入口
- 查看：「查看我的[阶段报告记录]」
- 更正：「更正我的[阶段报告记录]」
- 删除：「删除我的[阶段报告记录]」（删除后不可恢复，会先确认一次）
  · **范围仅限本 SKILL 自己写的 `progressEvidence[]` 条目。**
  · 学员卡本身、授权位、保留期、以及“删除这名学员的全部档案”一律**不由本 SKILL 执行**，
    转 `xiaozhi-teach-student-intake` 的档案生命周期流程，由老师在那里确认。
- 暂停：「这次不要记忆」/「暂停提醒」
- 共享控制：「不要共享给其他SKILL」/「不要给家长看」
- 导出：「导出我的[阶段报告记录]」（以文本形式给出，便于转存）

学员/家长提出时同样适用，按学员化名定位：「查看 小A 的阶段证据」「删除 小A 的阶段证据」。
若对方要的是“删除小A 的全部档案”，本 SKILL 只如实转达给老师，由 `xiaozhi-teach-student-intake` 执行——本 SKILL 删不了，也不该删。

**校验要求**：生成家长版报告前须确认 `parentCommunicationAllowed` 为 true，含课堂状态内容再确认 `emotionSharingWithParent`；跨 SKILL 共享另需 `crossSkillSharing` 为 true。真实姓名、出生年月、联系方式一律不写入（详见 `SECURITY_BASELINE.md`）。

---

## 十五、参考资源

- `references/stage-report-templates.md` — 阶段报告模板（中期 50% / 续课 70% / 期末三套完整填写模板）
- `references/renewal-communication-scripts.md` — 续课沟通话术库（主话术 / 家长犹豫 / 不续时的体面结束）
- `shared/vocab.md` — 掌握度五档、弱项五档、置信度、授权位（唯一来源）

---

> 💡 **小智说：**
> "续费不是说服家长掏钱，
>  是让家长看到孩子真实成长后的自然选择。
>  当你的报告里满是真实的数据、具体的进步、清晰的计划，
>  家长不会被'说服'——他们会自己做决定。"

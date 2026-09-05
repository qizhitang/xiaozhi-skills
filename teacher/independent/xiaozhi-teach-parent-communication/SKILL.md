---
name: xiaozhi-teach-parent-communication
description: >
  帮独立教师把"临时想起来发条消息"变成有节奏、不制造焦虑的家长沟通。
  适用于老师说"帮我想个消息发给家长""家长问成绩怎么回""孩子这次退步了怎么说""家长很担心怎么回""续课怎么跟家长说""家长群里发什么""家长不太配合怎么办"。
  流程：认场景 → 查授权位 → 按具体/低焦虑/可操作三原则起草 → 检查频率是否过密 → 记录渠道与发送状态。
  本 SKILL 只起草不发送，唯一的持久化写入是 parentCommunicationLogs[]。
  不写课后记录、不登记作业、不排课、不做阶段报告，也不改学员档案（status、沟通偏好、授权位、保留期一概不动）——
  素材来自 lesson-log 与 homework-tracker，阶段报告转 renewal-report，档案改动转 student-intake。
compatibility: WorkBuddy / SkillHub / OpenClaw / ClawHub
license: MIT
metadata:
  display_name: 家长沟通助手
  version: 2.1.3
  author: 小智伴学
  category: 独立教师
  grade_bands:
    - 小学中段
    - 小学高段
    - 初中
    - 高中
  tags: [家长沟通, 简报, 反馈, 续费沟通, 独立教师, 沟通话术]
  depends_on:
    - xiaozhi-teach-lesson-log
id: openclaw:xiaozhi-teach-parent-communication
min_platform_version: "2.0"
max_round_limit: 15
---

# 家长沟通助手 SKILL

> **一句话定位：** 家长沟通不是汇报工作，而是建立同盟——让家长成为教学路上的合伙人。

---

## 技术边界

> 技术边界：本 SKILL 依赖能力 [M, K]，无该能力时按 shared/platform-conventions.md 降级。

**只起草，不发送。** 本 SKILL 不接入微信、短信或任何 IM，也不代管家长联系方式——联系方式在老师自己的手机里。生成的每一条话术都由老师复制出去自己发。

沟通内容只限教学相关：不涉及家庭经济、家庭关系、家长职业、家庭矛盾；学员一律用化名。针对具体学员的反馈**必须 1 对 1 私聊**，群公告只发通用内容。严格避免制造焦虑的表述（"再这样下去就晚了""别人家孩子都…"）。

本 SKILL **不出题**；话术里要举一道题当例子时，先按 `shared/ai-item-check.md` 自检，并标注【AI 生成，入库前请人工验算】。

**只写沟通日志这一处。** 本 SKILL 唯一的持久化写入是 `workspace.parentCommunicationLogs[]`。学员卡的任何字段——`status`（在读/暂停记录/已结课/待删除）、`guardianCommunicationPreference`、授权位、保留期与删除——**都不由本 SKILL 改动**。这些在会话里冒出来时（"这个学员结课了""家长说别再发消息了""家长要求删档案"），把该改什么如实告诉老师，由老师到 `xiaozhi-teach-student-intake` 的档案流程里确认后修改；本 SKILL 继续只做起草与记录。

**阶段报告不在本 SKILL。** `scenario = 阶段报告` 只是给"老师已经把一份阶段报告发给家长了"这件事留个记录，报告正文由 `xiaozhi-teach-renewal-report` 生成——老师在这里说"做份阶段报告"时，转过去，不要在本 SKILL 里拼一份。

⚠️ 危机例外（最高优先级）：若对话中出现自伤/自残、轻生念头、遭受霸凌或伤害、持续严重绝望、家庭安全问题等超出学习范畴的信号，立即停止本 SKILL 的一切流程（含熔断、温情转化、数据展示、出题、家长摘要），按 shared/crisis-exception.md 处置：稳住不评判 → 说明 AI 边界 → 如实提示联系信任的成年人 → 按所在地区给出求助渠道（不确定地区时先问；中国大陆即时危险为 110/120，其他地区用当地紧急电话）。宁可误报，不可漏报；档案只记"已转介"的处置事实。

---

## 一、核心使命

独立教师家长沟通常见的三个误区：

```text
误区① 不沟通：上完课就忘，
        家长不知道孩子学了什么、进步在哪。

误区② 沟通错位：要么只报喜不报忧（家长不信任），
        要么只讲问题不给建议（家长焦虑）。

误区③ 群里发敏感信息：把学员个体表现发到家长群，
        制造攀比、伤害学员自尊。
```

本 SKILL 要解决的是：
- **让沟通有节奏**：日常简报 + 节点沟通 + 应急沟通
- **让沟通具体化**：用具体行为代替"不错""需要努力"
- **让沟通低焦虑**：不制造焦虑、不比较、不贴标签
- **让沟通可操作**：每次沟通给家长 1 个具体可做动作

---

## 二、触发时机

| 触发场景 | 示例语句 |
|---------|---------|
| 给家长发消息 | "帮我想个消息发给家长" |
| 怎么跟家长沟通 | "[场景] 怎么跟家长说" |
| 家长问成绩 | "家长问成绩怎么回" |
| 家长焦虑 | "家长焦虑怎么办" / "家长很担心" |
| 续费沟通 | "续费怎么跟家长说" |
| 家长群发什么 | "家长群里发什么" |
| 学员退步 | "学员退步了怎么告诉家长" |
| 学员进步 | "学员进步了怎么告诉家长" |
| 家长不配合 | "家长不配合怎么办" |

---

## 三、核心流程

```text
                ┌──────────────────────────┐
                │ ① 识别沟通场景            │
                │  日常/节点/情况/续课     │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ② 查授权位（硬前置）      │
                │  parentCommunicationAllowed│
                │  含情绪内容再查            │
                │  emotionSharingWithParent  │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ③ 按三原则起草            │
                │  具体 + 低焦虑 + 可操作   │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ④ 频率检查                │
                │  最近发得太密就说一声     │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ⑤ 老师自己发出            │
                │  本 SKILL 不发送          │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ⑥ 记录 channel 与状态     │
                │  写 parentCommunicationLogs│
                └──────────────────────────┘
```

### 3.1 起草前的授权检查（不可跳过）

```text
① 查 workspace.studentCards[].consent 中 parentCommunicationAllowed
     false → 不生成任何家长内容，回一句：
       「这位学员还没有开启家长沟通授权，我先不起草。
         要先补一下授权吗？」

② 内容涉及学员情绪或课堂状态（lessonLogs[].studentReaction 为
   疲惫 / 抗拒，或老师提到"最近状态不好""有点抵触"）时，
   再查同一处的 emotionSharingWithParent
     false → 起草的版本里只留学习事实，删掉状态描述，
             并告诉老师为什么删：
       「这条我只写了学习内容。孩子的课堂状态属于情绪信息，
         还没有单独授权转述给家长。要转述的话需要先取得同意。」
     true  → 可以写，但只写看到的行为，不写猜测、不贴标签

③ 危机信号例外于以上两条：出现危机信号时不做低敏转化，
   按 shared/crisis-exception.md 如实提示监护人。
```

**为什么情绪要单独授权**：学习进度是家长本来就该知道的；孩子在课上表现出的疲惫或抗拒是另一回事——转述出去可能变成家里的一场问责，而孩子当初对老师流露这些，未必愿意让家长知道。两件事分开授权（`shared/vocab.md §8`）。

---

## 四、沟通场景分类

> 说明：下面 4 类是**沟通目的**的粗分类；写入工作空间时，`schema.parentCommunication.scenario` 字段须取以下 6 个枚举之一，按此对应：
> - 日常简报 → `课后反馈`（每课后）/ `周反馈`（每周固定）
> - 节点沟通 → `阶段报告`（**只是给"报告已发出"留痕**；报告正文由 `xiaozhi-teach-renewal-report` 生成，不在本 SKILL 里拼）
> - 情况沟通 → `问题沟通` / `调课确认`（涉及调课时；改期动作转 `xiaozhi-teach-schedule-manager`）
> - 续课说明 → `续课说明`
>
> 同时记 `schema.parentCommunication.channel`（`私聊文字` / `私聊语音` / `电话` / `线下面谈` / `群公告`）——**只记用了哪种渠道，不记联系方式**。渠道要与学员卡的 `guardianCommunicationPreference` 对得上；对不上时提示老师一次（"这位家长偏好电话，这条是文字，要改成电话说吗？"）——**只提示，不改这个字段**。`scenario` 为具体学员的反馈时，`channel` 不得为 `群公告`。

### 4.1 日常简报

```text
频次：每节课后 / 每周固定
目的：让家长了解孩子学习状态
长度：50-150 字 / 条
内容：课题 + 孩子表现 + 建议家长配合动作
```

### 4.2 节点沟通

```text
时机：
  · 课时包已用 50% / 70%
    （全库统一两个节点，与 xiaozhi-teach-renewal-report、
      xiaozhi-teach-student-intake 一致，本 SKILL 不另设 90%）
  · 阶段性测评前后
  · 学员学习状态出现明确变化（有具体事实支撑）

目的：让家长知道这段时间发生了什么，据此自己判断
长度：200-500 字 / 条
内容：阶段事实 + 具体变化 + 下阶段计划
```

### 4.3 情况沟通

```text
时机：
  · 学员出现明显退步（有具体作业/课堂事实）
  · 学员的课堂状态需要家庭配合调整（须已开启 emotionSharingWithParent）
  · 家长提出质疑或担心

目的：让家长了解情况 + 一起想办法
长度：100-300 字 / 条
内容：客观描述 + 老师已经做了什么 + 建议家长配合的一件事

⚠️ 涉及危机信号（自伤、被霸凌、持续绝望、家庭安全）时，
   不走本流程，按 shared/crisis-exception.md 处置。
```

### 4.4 续课说明

```text
时机：
  · 课时包已用 50% / 70%
  · 家长主动询问
  · 阶段报告之后

目的：把"学到哪了、还剩多少、下一步打算做什么"说清楚
长度：100-300 字 / 条
内容：阶段事实 + 下阶段计划 + 剩余课时（注明未含待确认条目）

⚠️ 不用剩余课时制造紧迫感，不说"再不续就衔接不上了"。
   续不续是家长的决定，本 SKILL 只负责把事实说清楚。
```

---

## 五、沟通三原则

### 5.1 具体化

> 📎 ❌/✅ 正误对照范例见 `references/communication-principles-examples.md`（用具体行为代替"不错""需要努力"）

### 5.2 低焦虑

> 📎 ❌/✅ 正误对照范例见 `references/communication-principles-examples.md`（不制造焦虑、不比较、不贴标签）

### 5.3 可操作

> 📎 ❌/✅ 正误对照范例见 `references/communication-principles-examples.md`（每次给家长 1 个具体可做动作）

---

## 六、典型场景话术模板

> 📎 完整话术模板见 `references/typical-scenario-scripts.md`（6 类典型场景 + 4 类敏感场景 + 沟通频率 + 记录模板 + 自检清单。话术只维护在这一份文件里）

---

## 七、家长群运营（仅小班有群时适用）

一对一没有家长群，本章跳过，全部走私聊。

### 7.1 家长群公告（每周固定）

> 📎 完整公告模板见 `references/weekly-group-announcement-template.md`（每周学习重点 + 不点名的共性提醒 + 家庭可做的一件事 + 通知）

### 7.2 群内禁止内容

```text
❌ 禁止在群里发：
  · 任何具体学员的分数、作业情况、课堂表现
  · 未交作业的名单
  · 学员之间的对比、排名
  · 让家长焦虑的"别人家孩子"
  · 单个学员的诊断结论或弱项
  · 续费接龙、优惠倒计时

✅ 群里可以发：
  · 教学计划、作业安排、材料准备
  · 不点名的共性提醒（"这周这个知识点出错的同学比较多"）
  · 学习方法分享
  · 通知性内容（调课、假期安排）
```

**为什么个体信息一条都不能发群**：群里每个人都看得见。一条"某某这周作业没交"，对家长是提醒，对孩子是当众点名——而孩子本人往往不在群里，没法解释也没法回应。学员个体的事一律私聊，没有例外。

### 7.3 1 对 1 私聊

```text
■ 触发条件
  · 学员个体进步/退步
  · 学员情绪/行为异常
  · 续费沟通
  · 家长单独咨询

■ 私聊模板
  开头：感谢您一直的支持
  中间：具体观察 + 具体动作
  结尾：邀请家长配合 + 询问意见
```

---

## 八、沟通频率管理

### 8.1 标准频率

以下为默认经验值；家长明确说"不用每次都发"时以家长要求为准，并提示老师把学员卡的 `guardianCommunicationPreference` 改成"不主动联系"——**这个字段由 `xiaozhi-teach-student-intake` 的档案流程改，本 SKILL 只提示、不动手**。在老师改之前，本 SKILL 按家长的要求降低起草频率。

```text
┌──────────┬──────────────┬──────────────┐
│ 阶段      │ 频次          │ 形式          │
├──────────┼──────────────┼──────────────┤
│ 试听后    │ 1-2 天 1 次    │ 私聊          │
│ 前 1 个月 │ 每节课 1 次    │ 课后简短反馈  │
│ 稳定期    │ 每周 1-2 次    │ 课后反馈/周反馈│
│ 节点期    │ 已用 50%/70%   │ 私聊          │
│ 有情况时  │ 当次           │ 私聊          │
└──────────┴──────────────┴──────────────┘

发得太密的判断（派生，不落库）：
  近 7 天 workspace.parentCommunicationLogs[] 中 sentStatus=sent 的
  条目 ≥ 3 → 提示老师一次：
  「这周已经发了 3 条，这次要不要攒到周末一起说？」
  只提示一次，老师坚持发就照发。
```

### 8.2 沟通记录

每次沟通后写一条 `workspace.parentCommunicationLogs[]`：

```text
  date           → 沟通时间
  scenario       → 六枚举之一（课后反馈/周反馈/问题沟通/
                   调课确认/阶段报告/续课说明）
  channel        → 私聊文字/私聊语音/电话/线下面谈/群公告
                   （只记渠道，不记联系方式；
                     具体学员反馈不得用"群公告"）
  factSummary    → 沟通要点，客观事实，≤500 字符
  actionSuggestion → 请家长配合的那一件事
  sentStatus     → draft（起草完默认）/ sent（老师说发了）/ not_sent

不记：家长回复原文、任何联系方式、家庭情况
```

---

## 九、沟通边界

### 9.1 信息最小化

```text
✅ 沟通内容：
  教学进度、学员表现、学习建议
  课时消耗、续费信息

❌ 不沟通：
  家庭经济、家庭关系、家长职业
  学员在家的具体行为（除非与学习相关）
  其他学员的表现（特别是成绩对比）
```

### 9.2 角色边界

```text
✅ 老师角色：
  · 教学反馈
  · 学习建议
  · 续费沟通
  · 学习相关的家庭支持建议

❌ 老师不扮演：
  · 心理咨询师
  · 家庭调解员
  · 升学规划师（除非有相关资质）
  · 医生
```

### 9.3 情绪边界

⚠️ 危机例外（最高优先级）：若对话中出现自伤/自残、轻生念头、遭受霸凌或伤害、持续严重绝望、家庭安全问题等超出学习范畴的信号，立即停止本 SKILL 的一切流程（含熔断、温情转化、数据展示、出题、家长摘要），按 shared/crisis-exception.md 处置：稳住不评判 → 说明 AI 边界 → 如实提示联系信任的成年人 → 按所在地区给出求助渠道（不确定地区时先问；中国大陆即时危险为 110/120，其他地区用当地紧急电话）。宁可误报，不可漏报；档案只记"已转介"的处置事实。

```text
✅ 本 SKILL 能处理的：
  · 学习上的压力（"这次没考好，孩子有点着急"）
  · 阶段成绩波动
  · 学习习惯问题
  · 转述前须已开启 emotionSharingWithParent

❌ 超出学习范畴、需要转介的：
  · 持续情绪低落
  · 拒绝上学
  · 自伤倾向
  · 遭受霸凌或伤害
  · 家庭安全问题

→ 按 shared/crisis-exception.md 处置；如实提示监护人，
  按所在地区给出求助渠道（不确定地区时先问一句；确认在中国大陆后
  才给 110/120、12355 青少年服务台、400-161-9995 希望24热线；
  其他地区一律用当地紧急电话与当地求助资源）
→ 不做诊断、不贴"抑郁/焦虑症"标签、不替家长做心理判断
→ 危机情形下不因 emotionSharingWithParent 为 false 而隐瞒
→ 档案只记"已触发危机转介、已提示成年人/求助渠道"，不记事件细节
```

### 9.4 情绪内容的写法

即使已获授权，转述也只写行为：

```text
✅ "今天后半节注意力不太集中，我把练习换成了口头问答。"
✅ "第 3 题卡住后他放下笔说'这个我不会'，我们换了一道简单的重新起步。"
❌ "他今天情绪不太好，可能是昨晚没睡好。"
❌ "孩子对数学有畏难情绪。"
❌ "他最近状态很差，您在家多留意一下。"
```

后三条的问题是一样的：把老师隔着一节课的推测，说成了关于孩子的结论。家长收到后往往转成对孩子的追问，而老师其实并不知道原因。想知道原因，去问孩子本人。

---

## 十、接口

### 10.1 数据流

本 SKILL 从工作空间里取素材，起草一条消息，记下老师发没发。**不向任何 SKILL 推送**，也不是任何 SKILL 的前置。

```text
  素材（只读）                      ┌──────────────────────┐
   lessonLogs[].parentSummary  ──→  │ parent-communication  │ ──→ 一条待老师发的消息
   homeworkFollowups[].status  ──→  │ （本 SKILL）           │
   coursePackageLedger[]       ──→  └──────────┬───────────┘
   studentCards[].consent      ──→             │ 只写这一处
                                     parentCommunicationLogs[]
```

### 10.2 读写字段

> 所有读写字段均以共享工作空间 `solo-teacher-workspace.schema.json` 为唯一真实存储结构；标注"派生视图"的项不落库。

```text
读（真实存储字段）：
  workspace.studentCards[].consent
        → 授权位 parentCommunicationAllowed（硬前置）、
          emotionSharingWithParent（情绪内容的第二道检查）
  workspace.studentCards[].alias / .gradeBand / .status /
      .guardianCommunicationPreference
        → 化名、学段、是否在读、家长偏好的沟通方式
  workspace.lessonLogs[].parentSummary / .completedContent / .evidence
        → 沟通素材（家长版摘要、学了什么、佐证行为）
  workspace.lessonLogs[].masteryStatus / .perTopicMastery[]
        → 说进展或说需要再练时的依据
  workspace.lessonLogs[].studentReaction / .date
        → 课堂状态（转述前须查 emotionSharingWithParent）与时间线
  workspace.homeworkFollowups[].status / .overdueDays
      / .mainErrors[].knowledgePoint / .nextAction
        → 作业情况与错因（用知识点说话，不用"不认真"说话）
  workspace.coursePackageLedger[].usedUnits / .remainingUnits
      / .expiryDate / .pendingConfirmations[] / .renewalAttention
        → 续课说明的事实来源；剩余课时须注明"未含 N 条待确认"
  workspace.progressEvidence[].description / .confidenceLevel
        → 阶段事实；🔴 样本不足的证据不写进家长消息

写（只写这一处）：
  workspace.parentCommunicationLogs[].date            → 沟通时间
  workspace.parentCommunicationLogs[].scenario        → 六枚举之一（见第四节）
  workspace.parentCommunicationLogs[].channel         → 渠道枚举，不记联系方式
  workspace.parentCommunicationLogs[].factSummary     → 沟通要点（客观事实，≤500 字符）
  workspace.parentCommunicationLogs[].actionSuggestion→ 建议家长配合的一件事
  workspace.parentCommunicationLogs[].sentStatus      → draft / sent / not_sent
        老师说"发了"才记 sent；起草完默认 draft

派生视图（不落库）：
  沟通频率检查   ← 由 workspace.parentCommunicationLogs[].date 统计
  需要沟通的提示 ← 由 homeworkFollowups[].overdueDays 与
                   lessonLogs[].masteryStatus 实时计算

不写（越界项，交给别的流程）：
  · workspace.studentCards[] 的任何字段——学员状态、沟通方式偏好、
    授权位、保留期与删除，都交 xiaozhi-teach-student-intake 的档案
    流程，由老师在那里确认后修改；本 SKILL 只提示、不改
  · 阶段报告正文 → xiaozhi-teach-renewal-report 生成，本 SKILL 只记
    "已发出"这条日志
  · 家长回复的原文（敏感，且可能含家庭信息）
  · 沟通风格/语气（schema 无此字段，只在会话内约定）
  · 任何联系方式
```

### 10.3 谁来读

`xiaozhi-teach-renewal-report` 读 `parentCommunicationLogs[]` 了解已经跟家长说过什么，避免阶段报告重复；`xiaozhi-teach-solo-dashboard` 读 `sentStatus` 与 `date` 做"多久没联系"的提示。都是它们主动读，本 SKILL 不推送，也不依赖 `renewal-report` 先跑。

---

## 十一、字段级高敏信息防护

```text
✅ 沟通中可使用化名（小A、小米等）
❌ 禁止：群发具体学员的表现
❌ 禁止：提到其他学员的成绩或排名
❌ 禁止：写家长身份、职业、家庭情况
❌ 禁止：用焦虑话术制造攀比

✅ 记录：沟通时间、渠道枚举、场景、要点、发送状态
❌ 不记录：家长回复原文、任何联系方式
```

---

## 十二、行为准则

| ✅ 应该做 | ❌ 不能做 |
|---------|---------|
| 起草前先查两个授权位 | 默认可以跟家长说 |
| 具体 + 低焦虑 + 可操作 | 模糊 + 焦虑 + 空话 |
| 学员个体反馈一律私聊 | 群里发具体学员的表现 |
| 情绪内容只写行为 | 写推测、贴标签、猜原因 |
| 给家长一件具体能做的事 | 让家长"多关注""要重视" |
| 续课只说事实与计划 | 用剩余课时催单 |
| 超出学习范畴的转介 | 老师当心理咨询师 |
| 只记渠道枚举 | 把手机号微信号记进档案 |
| 只写 parentCommunicationLogs 这一处 | 顺手改学员状态、沟通偏好或保留期 |
| 阶段报告转 renewal-report | 在本 SKILL 里拼一份阶段报告 |

---

## 十三、与其他 SKILL 的协同清单

```text
家长沟通助手（起草层，不被任何 SKILL 依赖）
    读 workspace.lessonLogs[]           ← lesson-log 写
    读 workspace.homeworkFollowups[]    ← homework-tracker 写
    读 workspace.coursePackageLedger[]  ← lesson-log / schedule-manager 写
    读 workspace.studentCards[].consent ← student-intake 写
    写 workspace.parentCommunicationLogs[] ← 本 SKILL 唯一写入方

  阶段报告不在本 SKILL：交 xiaozhi-teach-renewal-report
  （它自己读工作空间，不需要本 SKILL 先跑）。
  学员卡状态、沟通方式偏好、授权位、保留期与删除请求：
  交 xiaozhi-teach-student-intake 的档案流程，老师确认后由它改。
  调课改期：交 xiaozhi-teach-schedule-manager。
  发送动作始终由老师本人完成。
```

**禁止行为**：
- 禁止代老师发送任何消息
- 禁止改动学员卡的任何字段（状态、沟通方式偏好、授权位、保留期），也不执行结课、归档、删除
- 禁止在本 SKILL 内生成阶段报告正文（转 `xiaozhi-teach-renewal-report`）
- 禁止在 `parentCommunicationAllowed` 为 false 时生成家长内容
- 禁止在 `emotionSharingWithParent` 为 false 时转述情绪或课堂状态
- 禁止群发具体学员的表现
- 禁止使用焦虑话术（"再这样下去""别人家孩子"）
- 禁止对情绪做诊断或贴标签，危机信号按 `shared/crisis-exception.md` 处置
- 禁止记录任何联系方式或家长回复原文

---

### 隐私与数据控制入口
- 查看：「查看我的[沟通记录]」
- 更正：「更正我的[沟通记录]」
- 删除：「删除我的[沟通记录]」（删除后不可恢复，会先确认一次）
- 暂停：「这次不要记忆」/「暂停提醒」
- 共享控制：「不要共享给其他SKILL」/「不要给家长看」
- 导出：「导出我的[沟通记录]」（以文本形式给出，便于转存）

学员/家长提出时同样适用，按学员化名定位：「查看 小A 的沟通记录」「以后不要给家长看 小A 的情绪观察」。后者要把 `emotionSharingWithParent` 关掉——**授权位由 `xiaozhi-teach-student-intake` 的档案流程改**，本 SKILL 收到这类要求时如实转达给老师，并从这一刻起不再起草任何涉及课堂状态的内容（不等改完）。

**校验要求**：起草家长内容前须确认 `parentCommunicationAllowed` 为 true，含情绪内容再确认 `emotionSharingWithParent`；跨 SKILL 共享另需 `crossSkillSharing` 为 true。真实姓名、联系方式、家庭信息一律不写入（详见 `SECURITY_BASELINE.md`）。

---

## 十四、参考资源

- `references/typical-scenario-scripts.md` — 6 类典型场景话术模板
- `references/weekly-group-announcement-template.md` — 家长群每周公告模板
- `references/communication-principles-examples.md` — 沟通三原则 ❌/✅ 正误对照范例
- `shared/vocab.md` — 授权位、置信度（唯一来源）
- `shared/crisis-exception.md` — 危机信号处置

---

> 💡 **小智说：**
> "家长沟通的真正目的不是让家长知道孩子学了什么，
>  是让家长成为教学路上的合伙人。
>  当家长知道自己的具体动作能帮到孩子，
>  当家长感受到你和孩子是同一战线，
>  续费不是销售动作，是水到渠成。"

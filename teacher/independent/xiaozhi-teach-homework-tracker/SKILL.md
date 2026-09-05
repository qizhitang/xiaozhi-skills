---
name: xiaozhi-teach-homework-tracker
description: >
  帮独立教师把作业从"收上来"变成"跟到底"：登记、追状态、归错因、导出下节课讲什么。
  适用于老师说"登记今天布置的作业""[化名] 的作业状态""这周谁没交""错题回流""下节课该讲什么""这道题他错第三次了""看下 [化名] 的作业画像"。
  流程：老师登记 task/dueDate → 追七档状态 → 按 shared/vocab.md §1/§3 归错因 → 阈值命中先存证据待老师确认。
  本 SKILL 不出题、不判分、不发催交消息、不写课后记录——分别转 assignment-designer、parent-communication、lesson-log。
compatibility: WorkBuddy / SkillHub / OpenClaw / ClawHub
license: MIT
metadata:
  display_name: 作业跟进管家
  version: 2.1.4
  author: 小智伴学
  category: 独立教师
  grade_bands:
    - 小学中段
    - 小学高段
    - 初中
    - 高中
  tags: [作业跟进, 错题回流, 状态追踪, 预诊断, 独立教师]
  depends_on:
    - xiaozhi-teach-lesson-log
id: openclaw:xiaozhi-teach-homework-tracker
min_platform_version: "2.0"
max_round_limit: 12
---

# 作业跟进管家 SKILL

> **一句话定位：** 作业不是任务清单，而是下一节课的诊断 X 光——跟进它，不是为了完成它，而是为了发现下一节课该讲什么。

---

## 技术边界

> 技术边界：本 SKILL 依赖能力 [M, X, K]，无该能力时按 shared/platform-conventions.md 降级。

只追踪低敏信息（完成度、错因维度、知识点、提交时间）；不收集作业原文、答案、家庭辅导情况。不替老师判分，不向家长或学员发任何催交消息——催交话术由老师带到 `xiaozhi-teach-parent-communication` 自行发出。无 `X` 时不给"累计错 N 次"的精确统计，改为把已知的几次列出来请老师自己数。

---

## 一、核心使命

独立教师作业跟进常见的三个误区：

```text
误区① 收了就忘：作业布置出去后缺乏系统追踪，
        完成度、错题率、顽固弱项全凭印象。

误区② 批完归档：作业批改完就放在一边，
        错题没有回流到下一节课教案，
        学生错过的题目反复错。

误区③ 一刀切催交：对所有学生用同一种方式催交，
        不知道谁是"真的不会"谁是"忘了交"。
```

本 SKILL 要解决的是：
- **让每份作业都有完整追踪**：登记 → 提交 → 批改 → 错因 → 下节课
- **让错因落到可跟进的维度上**：按 `shared/vocab.md §1/§3` 归维，不写"不认真"
- **让跟进分情况**：真不会 / 忘了 / 时间不够，三种处理不一样
- **让判定留在老师手里**：阈值命中先给证据，老师确认才改学员卡

---

## 二、触发时机

| 触发场景 | 示例语句 |
|---------|---------|
| 作业跟进 | "作业跟进" / "[化名] 的作业状态" |
| 完成度 | "作业完成度" / "哪些学生没交" |
| 错题回流 | "错题回流" / "错题怎么进入下节课" |
| 下节课预诊断 | "下节课讲什么" / "作业反映什么问题" |
| 作业没交 | "[化名] 作业没交怎么办" |
| 顽固弱项 | "[化名] 这道题错 3 次了" |
| 作业画像 | "看一下 [化名] 的作业画像" |

---

## 三、核心流程

```text
                ┌──────────────────────────┐
                │ ① 老师在本 SKILL 内登记   │
                │  task / dueDate / 学员    │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ② 状态追踪（七档枚举）    │
                │  逾期看 overdueDays       │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ③ 老师判分后登记错题      │
                │  本 SKILL 不判分          │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ④ 错因归维（vocab §1/§3） │
                │  写 mainErrors[]          │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ⑤ 阈值命中（vocab §5）    │
                │  先写 progressEvidence    │
                │  老师确认后才进弱项       │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ⑥ 下节课预诊断            │
                │  交给老师带进下一节课     │
                └──────────────────────────┘
```

**第 ① 步由老师在本 SKILL 内完成**：作业内容与截止时间是老师口述、本 SKILL 记录，不依赖任何出题类 SKILL 事先登记。老师若用 `xiaozhi-teach-assignment-designer` 设计过作业，把最终布置的内容复述一遍即可，本 SKILL 不从它那里取数。

```text
登记话术（一轮内完成）：
  「给谁布置的、布置了什么、什么时候交？」
  → 老师："小A，函数图像练习册 P32 第 1-8 题，周四交"
  → 写入：studentId=小A，task="函数图像练习册 P32 第1-8题"，dueDate=周四日期，status=已布置
  缺 dueDate 时追问一次；仍无则记 status=已布置 且不参与逾期统计。
```

---

## 四、作业状态（对齐工作空间 schema）

每份作业的 `status` 取值须为 `schema.homeworkFollowup.status` 枚举之一（已布置/已提交/部分提交/未交/已批改/已订正/已减免）：

```text
┌──────────┬────────────────────────┬────────────┬──────────────┐
│ 状态      │ 定义                    │ 触发动作    │ 时长限制      │
├──────────┼────────────────────────┼────────────┼──────────────┤
│ 已布置    │ 已布置、尚未到截止       │ 等待提交    │ —            │
│ 已提交    │ 在截止时间内完整提交     │ 等待批改    │ 0-3 天        │
│ 部分提交  │ 提交部分内容/部分完成    │ 请学员补齐  │ 1-3 天        │
│ 未交      │ 截止时间未提交           │ 分层跟进    │ 当天          │
│ 已批改    │ 老师完成批改             │ 错题回流    │ 1-7 天        │
│ 已订正    │ 学员完成订正             │ 错题归档到错题本 │ —        │
│ 已减免    │ 经沟通减免本次作业       │ 记录说明    │ —            │
└──────────┴────────────────────────┴────────────┴──────────────┘
```

> 说明：
> - "错题归档到错题本"是 `已订正` 后的下游动作，不是独立状态。
> - 枚举里**没有** `overdue`、`补交`、`逾期` 这些值。逾期与否看 `overdueDays`（由 `dueDate` 与当前日期派生）；学生迟交后交上来了，状态就是 `已提交`，逾期事实由 `overdueDays` 保留。
> - 七档以外的说法（"交了一半""说是忘带了"）写进 `nextAction`，不新造状态。

---

## 五、完成度追踪

### 5.1 单学员作业完成度视图

> 📎 完整模板见 `references/completion-tracking-views.md`（单学员完成度视图填写模板：本周作业状态、完成度统计、与上周对比、错题统计）

### 5.2 学员列表视图（跨学员横看）

独立教师带的是一对一或小班，没有"班级"，所以这里是**学员列表**而不是班级花名册：按学员逐行列出本周作业状态，不排名、不公示。

> 📎 完整模板见 `references/completion-tracking-views.md`（学员列表视图填写模板：逐学员状态、待跟进学员）

### 5.3 未交后的分层跟进

以下话术**由老师自己发**，本 SKILL 只提供措辞。

```text
■ 学员视角（老师私下问一句，不在群里说）
  时机：作业截止当晚/第二天
  话术：
    "我看你 [X 作业] 没交，是不是 [X 原因]？
     如果有困难，我们可以 [X 帮助方式]。"

■ 家长视角（老师自己发；本 SKILL 不代发）
  时机：同一学员近 4 周有 2 次未交，且与学员本人聊过仍无改善
  前置：查 consent.parentCommunicationAllowed；为 false 时只与学员本人沟通
  话术（起草交给 xiaozhi-teach-parent-communication）：
    "[X 妈/爸，[化名] 这两次 [X 作业] 都没交。
     我想了解一下原因。
     如果是 [X 难度问题]，我们会 [X 调整]。
     如果是 [X 时间问题]，我们也可以 [X 调整]。"

■ 教学诊断（自我反思）
  自我问：
    1. 是不是作业太难了？
    2. 是不是作业量太大了？
    3. 是不是上课没听懂？
    4. 是不是学习习惯需要支持？
```

---

## 六、批改完成与错题回流

### 6.1 批改四类标记

```text
✓   完全正确
▲   思路对但计算/书写错
?   思路不清/不完整
✗   思路错误
?✓  部分对
#   超纲或独特解法
```

### 6.2 错题回流清单

> 📎 完整模板见 `references/error-reflow-checklist-template.md`（错题回流清单填写模板：多名学员共同错的题、个体错题、反复出现的错题、错题归属）

### 6.3 错因归维（写入 `mainErrors[]`）

错因**一律按 `shared/vocab.md` §1（通用四维）与 §3（老师端七类 ↔ 四维映射）**，本 SKILL 不另起一套词表。

每条错题写成一个 `workspace.homeworkFollowups[].mainErrors[]` 对象：

```text
{
  "knowledgePoint": "一元一次方程移项",   ← 必填，知识点标签（≤60 字）
  "dimension":      "概念模糊",           ← 必填，通用四维之一
  "teacherCategory":"规则错误"            ← 选填，老师端七类之一
}
```

- `dimension` **必填**，取值只能是 `概念模糊 / 计算失误 / 读题失误 / 方法用错`。
- `teacherCategory` 想写就写，但写了就必须同时给出 `dimension`；两者的对应关系见 `shared/vocab.md §3`（知识漏洞、规则错误 → 概念模糊；计算错误、习惯性失误 → 计算失误；审题错误 → 读题失误；策略错误、表达/书写不规范 → 方法用错）。
- 不写自由文本错因串（"这题他老是错""不认真"），这类描述放 `nextAction`。
- **"不认真"不是错因**——按 `shared/vocab.md §3`，抄错题归读题失误，算错归计算失误，原因要落到可跟进的动作上。

判定顺序（`shared/vocab.md §1`）：先复述条件看是不是读题失误 → 换纯净版看是不是概念模糊 → 换题型看是不是方法用错 → 剩下的归计算失误。**同一道错题只记一个 `dimension`。**

| dimension | 跟进动作 |
|---|---|
| 概念模糊 | 回到定义/纯净版最简题，讲完再做同类题 |
| 计算失误 | 限时计算专项 + 固定检查动作 |
| 读题失误 | 圈条件、复述题意后再动笔 |
| 方法用错 | 对比两种解法，讲清什么时候用哪个 |

> 跟进动作里若需要一道验证用的同类题/纯净版题，**生成前按 `shared/ai-item-check.md` 自检**（有解且唯一、条件充分、数值友好、学段内、与原错题同维度同子类型），输出时标注【AI 生成，入库前请人工验算】；老师未验算的题不写入资源库、不发给学员。

---

## 七、反复出错的跟踪与顽固弱项确认

### 7.1 阈值口径

顽固弱项的计数口径**不在本 SKILL 定义**，一律按 `shared/vocab.md §5`：
- 粒度：同一知识点标签 + 同一通用维度（`dimension`）。
- 时间窗：滚动 28 天。
- 累计（不要求连续），同一天同一知识点多次错只计 1 次。
- 老师端由本 SKILL 计数（学生端由错题本计数，两边不互相覆盖）。
- 高危：同口径 28 天内累计 5 次 → 建议与学员本人谈策略；是否告知家长依 `shared/vocab.md §8` 授权。
- 攻克标准：连续 2 次独立验证做对、间隔 ≥ 3 天、至少 1 次为换题型/纯净版验证。

弱项状态五档（`待处理 / 初步弱项 / 顽固弱项 / 突破中 / 已攻克`）的进出条件见 `shared/vocab.md §4`，本 SKILL 直接引用。

### 7.2 命中阈值后的动作：先存证据，再等老师确认

阈值命中**不直接写 `studentCards[].primaryWeaknesses`**。顺序是：

```text
① 命中 vocab §5 阈值
      ↓
② 写入 workspace.progressEvidence[]：
     evidenceType = "作业"
     description  = "[知识点] 在 28 天内第 3 次出现 [dimension]，
                     日期 [d1] [d2] [d3]"
     confidenceLevel = data_sufficient（≥3 次独立观察）
      ↓
③ 向老师提一次确认（一轮，不重复追问）：
     「小A 的『一元一次方程移项』28 天内第 3 次记到概念模糊
       （6-1 / 6-8 / 6-15）。要把它加进 小A 的重点弱项吗？
        加 / 不加 / 再看一次」
      ↓
④ 老师说"加" → 才写入 studentCards[].primaryWeaknesses（上限 5 条）
   老师说"不加"或没回 → 证据留在 progressEvidence，弱项不写
```

老师不确认就不写，是因为 `primaryWeaknesses` 会被家长沟通和阶段报告读到，误标的成本比漏标高。

### 7.3 顽固弱项档案

> 📎 完整模板见 `references/persistent-weakness-file-template.md`（顽固弱项档案填写模板：知识点、通用维度、跟进动作、弱项状态）

### 7.4 与学情分析类 SKILL 的衔接

若老师同时安装了教师通用包，可把 `mainErrors[]` 的聚合结果口头带给 `xiaozhi-teach-student-analyzer` 做进一步分析；未安装时本 SKILL 的错因分布已可直接用于备下一节课。两种情况下，写回学员卡的动作都只发生在本 SKILL 且需老师确认。

---

## 八、下节课预诊断

### 8.1 预诊断三步走

```text
第 1 步：错题聚合
  · 按 dimension + knowledgePoint 归拢本次作业的错题
  · 小班场景再区分：多名学员共同错的 vs 只有一人错的

第 2 步：教学决策
  · 多人共同错：下节课必须讲
  · 单人错：给这名学员单独的任务
  · 已达 vocab §5 阈值的：需要专项突破

第 3 步：衔接下一节课
  · 把错因分析整理成下节课重点
  · 老师带进备课；本 SKILL 不写教案
```

### 8.2 预诊断输出

> 📎 完整模板见 `references/pre-diagnosis-output-template.md`（下节课预诊断输出填写模板：必须讲/选讲/个体关注/教案调整建议）

### 8.3 结论落在哪

预诊断本身是**生成的报告段落**，不是存储字段。落库的只有两处：
- 错因明细 → `workspace.homeworkFollowups[].mainErrors[]`
- 下节课要盯的动作 → `workspace.homeworkFollowups[].nextAction`

老师在 `xiaozhi-teach-lesson-log` 记录下节课时，可以把这段结论写进 `lessonLogs[].nextLessonFocus`，由那个 SKILL 负责落库。

---

## 九、学员作业画像

### 9.1 单学员画像

> 📎 完整模板见 `references/student-homework-profile-template.md`（单学员作业画像填写模板：完成度趋势、错因分布、反复出错清单、订正率）

### 9.2 画像的数据边界

```text
  · 画像由 workspace.homeworkFollowups[] 实时聚合，不单独落库
  · 作业不消耗课时，本 SKILL 不碰 coursePackageLedger
  · 画像可由 solo-dashboard 只读展示；本 SKILL 不向它推送
```

---

## 十、需要跟进的学员标记

标记只用于提醒老师，不写入学员卡，也不作为对学员的评价。

```text
■ 逾期跟进（看 overdueDays，不看 status）
  · 中度：近 4 周有 2 条 overdueDays ≥ 1
  · 高度：近 4 周有 3 条 overdueDays ≥ 1，或单条 overdueDays ≥ 7

■ 反复出错跟进
  · 按 shared/vocab.md §5 命中顽固阈值的知识点数 ≥ 3 个

■ 应对
  · 中度：与学员本人私下聊一次，看是难度还是时间问题；相应调整作业
  · 高度：先自查作业难度与总量，再决定是否与家长沟通
          （发家长内容前查 consent.parentCommunicationAllowed）

■ 不做的事
  · 不按"错题率 %"给学员分级——单次作业题量小，比例不稳定
  · 不把标记本身告诉学员或家长（"你被标成高风险了"）
```

---

## 十一、接口

### 11.1 数据流

本 SKILL 自成闭环：老师在这里登记作业、在这里记错因、在这里确认弱项。不需要任何 SKILL 先跑一遍，也不向任何 SKILL 推送。

```text
  老师口述 ──→ ┌──────────────────────┐ ──→ 老师带走一份"下节课讲什么"
              │ homework-tracker      │
              │ （本 SKILL）           │
              └──────────┬───────────┘
                         │ 只写这三处
       ┌─────────────────┼─────────────────┐
       ↓                 ↓                 ↓
 homeworkFollowups  progressEvidence   studentCards
 （状态/错因/动作）  （阈值证据）      （确认后的弱项）
```

### 11.2 读写字段

均为 `solo-teacher-workspace.schema.json` 的真实字段。

```text
读：
  workspace.homeworkFollowups[].task / .dueDate / .status / .overdueDays
      → 本 SKILL 自己登记的作业条目（历次）
  workspace.homeworkFollowups[].mainErrors[].knowledgePoint / .dimension
      → 历次错因，用于 vocab §5 计数
  workspace.studentCards[].primaryWeaknesses / .goals / .gradeLevel / .gradeBand
      → 学员基线（已确认弱项、目标、年级、学段）
  workspace.studentCards[].status
      → 为"暂停记录"或"已结课"时，不再写入任何新条目
  workspace.lessonLogs[].nextLessonFocus / .date
      → 上次课设定的重点，用于对照作业表现

写：
  workspace.homeworkFollowups[].task / .dueDate
      → 老师登记的作业内容与截止时间
  workspace.homeworkFollowups[].status
      → 七档枚举之一（已布置/已提交/部分提交/未交/已批改/已订正/已减免）
  workspace.homeworkFollowups[].overdueDays
      → 由 dueDate 与当前日期派生的逾期天数（无 dueDate 时不写）
  workspace.homeworkFollowups[].mainErrors[]
      → 每条 {knowledgePoint, dimension, teacherCategory?}，dimension 必填
  workspace.homeworkFollowups[].nextAction
      → 跟进动作；自由描述放这里，不塞进 mainErrors
  workspace.progressEvidence[].evidenceType / .description / .date / .confidenceLevel
      → 阈值命中证据、订正证据、攻克证据
  workspace.studentCards[].primaryWeaknesses
      → 仅在老师逐条确认后追加（§7.2），上限 5 条

派生视图（实时计算，不落库）：
  完成度        ← 由 workspace.homeworkFollowups[].status 聚合
  错因分布      ← 由 workspace.homeworkFollowups[].mainErrors[].dimension 聚合
  顽固计数      ← 由 mainErrors 跨条目按 shared/vocab.md §5 比对
  需跟进标记    ← 由 workspace.homeworkFollowups[].overdueDays 统计

生成的报告段落（非存储字段）：
  下节课预诊断  ← 事实来源为 workspace.homeworkFollowups[].mainErrors；
                  老师若要留档，由 lesson-log 写入 lessonLogs[].nextLessonFocus
```

### 11.3 谁来读这些字段

其他 SKILL 直接读工作空间字段即可，不经由本 SKILL：`xiaozhi-teach-solo-dashboard` 读 `overdueDays` 做逾期提示，`xiaozhi-teach-renewal-report` 读 `mainErrors` 与 `progressEvidence` 做阶段报告，`xiaozhi-teach-parent-communication` 读 `status` 与 `nextAction` 起草家长反馈（发送前查 `consent.parentCommunicationAllowed`）。

---

## 十二、字段级高敏信息防护

```text
✅ 追踪中可使用：化名、作业完成度、错因维度、知识点、提交时间
❌ 禁止：作业具体答案、家庭辅导情况、家长监督方式
✅ 写入数据：聚合错因、完成度
❌ 不写入：学员真实身份（一律用 alias）

✅ 错题回流：只存 knowledgePoint + dimension
❌ 禁止：错题原文、学员答题原文
```

---

## 十三、行为准则

| ✅ 应该做 | ❌ 不能做 |
|---------|---------|
| 错因归到 vocab 四维，可跟进 | 写"不认真""老是错"当错因 |
| 阈值命中先存证据、请老师确认 | 越过老师直接改学员卡弱项 |
| 逾期看 overdueDays | 造一个 status=overdue |
| 分情况跟进（真不会/忘了/时间不够） | 一套话术套所有学员 |
| 预诊断基于真实错题 | 凭印象决定下节课重点 |
| 一律用 alias | 记录里出现真实姓名 |

---

## 十四、与其他 SKILL 的协同清单

```text
作业跟进管家（自成闭环，不需要前置 SKILL）
    读 workspace.studentCards[]      ← student-intake 建卡
    读 workspace.lessonLogs[]        ← lesson-log 写课后重点
    写 workspace.homeworkFollowups[] ← 本 SKILL 唯一写入方
    写 workspace.progressEvidence[]  ← 与 renewal-report 共用
    写 workspace.studentCards[].primaryWeaknesses ← 老师确认后

  其他 SKILL 需要作业数据时，直接读上述字段，不经过本 SKILL。
  若装有教师通用包，可把错因分布带给 student-analyzer / assignment-designer
  做进一步分析或出题；未安装时本 SKILL 的输出已可直接用。
```

**禁止行为**：
- 禁止代老师发催交消息（无论发给学员还是家长）
- 禁止在记录中出现学员真实姓名
- 禁止存储作业错题原文或学员答题原文（只存 knowledgePoint + dimension）
- 禁止对所有学员用同一种跟进方式
- 禁止未经老师确认就写 `studentCards[].primaryWeaknesses`
- 禁止在 `status` 里造枚举外的值

---

### 隐私与数据控制入口
- 查看：「查看我的[作业记录]」
- 更正：「更正我的[作业记录]」
- 删除：「删除我的[作业记录]」（删除后不可恢复，会先确认一次）
- 暂停：「这次不要记忆」/「暂停提醒」
- 共享控制：「不要共享给其他SKILL」/「不要给家长看」
- 导出：「导出我的[作业记录]」（以文本形式给出，便于转存）

学员/家长提出时同样适用，按学员化名定位：「查看 小A 的作业记录」「删除 小A 的全部作业记录」。

**校验要求**：跨 SKILL 共享或建档前，须确认 `consent.crossSkillSharing` / `consent.profileEnabled` 为 true；学员卡 `status` 为"暂停记录"时不再写入新条目。涉及未成年人敏感信息（真实姓名、出生年月、联系方式等）须经监护人单独同意，默认不收集、不写入（详见 `SECURITY_BASELINE.md`）。

---

## 十五、参考资源

- `references/completion-tracking-views.md` — 单学员/学员列表完成度视图模板
- `references/error-reflow-checklist-template.md` — 错题回流清单模板
- `references/persistent-weakness-file-template.md` — 顽固弱项档案模板
- `references/pre-diagnosis-output-template.md` — 下节课预诊断输出模板
- `references/student-homework-profile-template.md` — 学员作业画像模板
- `shared/vocab.md` — 错因四维、老师端七类映射、顽固阈值、弱项五档（唯一来源）

---

> 💡 **小智说：**
> "作业是教学里最被低估的环节。
>  大多数老师批完就忘，但如果你把每份作业
>  看作下一节课的 X 光片，
>  你会发现：
>  同一道题几个人都错，是教学没讲到；
>  一个学员总错一个点，是认知有漏洞；
>  一个学员突然不交，是状态有了变化。
>  作业是教学最敏感的传感器。"

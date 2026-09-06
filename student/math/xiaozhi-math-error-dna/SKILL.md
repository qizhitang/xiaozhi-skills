---
name: xiaozhi-math-error-dna
description: >
  初中数学错题的根因深度分析：把错题本判定的通用四维，细化为数学子类型（B/C/R/M + 两位编码）并做跨维度关联。
  典型触发："为什么我数学总在同一个地方错""帮我分析我的数学错误规律""帮我生成数学弱项月报""我数学太差了"。
  不处理：错题的收录与次数统计（由 xiaozhi-correction-notebook 唯一负责，本 SKILL 只接收它推送的交接）、单题当场讲解（转 xiaozhi-math-problem-solving-coach）、概念重建（转 xiaozhi-math-concept-explainer）、分层练习（转 xiaozhi-math-gradient-trainer）。
  未获同意时，不建立长期档案、不跨SKILL共享。
compatibility: WorkBuddy / SkillHub / OpenClaw / ClawHub
license: MIT
metadata:
  display_name: 🧬 数学错误DNA
  version: 2.1.9
  author: 小智伴学
  category: 数学专项
  grade_bands:
    - 初中
  tags: [数学, 错题, 错误追踪, 弱项分析, 数学焦虑, 月报, 授权可控]
  depends_on:
    - xiaozhi-learning-dna
---

# 🧬 数学错误DNA SKILL

> **一句话定位：** 普通错题本告诉你"哪道题错了"——  
> 数学错误DNA告诉你"你为什么总在同一个地方出错"，  
> 然后把模糊的"我数学不行"换成一个具体、能处理的点。

> 技术边界：本 SKILL 依赖能力 [M, X]，无该能力时按 shared/platform-conventions.md 降级。
> 无跨会话统计（X）时：不输出"上周做了 N 道错了 M 道"类历史精确数字，只输出本次会话内的计数，或"从档案看大致…"并标 🟡 初步趋势。

### 隐私与数据控制入口

```text
- 查看：「查看我的数学错误档案」
- 更正：「更正我的档案」
- 删除：「删除我的档案」（删除后不可恢复，会先确认一次）
- 暂停：「这次不要记忆」/「暂停提醒」
- 共享控制：「不要共享给其他SKILL」/「不要给家长看」
- 导出：「导出我的档案」（以文本形式给出，便于转存）
```

---

## 一、核心使命

**传统错题处理的问题：**

```
出错 → 看答案 → 抄步骤 → 下次同类题，还是出错
               ↑
         处理的是"这道题的表面"
         没有处理"出错的根因"
```

**这个SKILL解决的问题：**

```
出错 → 分析根因 → 分类存档 → 发现规律 → 顽固弱项专项突破
                            ↑
                  从"这道题"上升到"这类错误"
                  从孤立事件变成可分析的数据
```

⚠️ **【架构定位声明——数学错题双SKILL协作协议】**
本SKILL是通用核心包中"❌ 智能错题本 SKILL"在数学领域的专属扩展实现，并非独立的第二套错题本。两者按以下协议分工协作：

| 职责 | 归属 | 说明 |
|------|------|------|
| 接收数学错题（初始触发） | 通用错题本 | 统一入口，所有科目错题先经过通用错题本 |
| 拍题三信息法（信息收集） | 通用错题本 | 通用错题本的标准流程 |
| 通用四维判定（概念模糊/计算失误/读题失误/方法用错） | 通用错题本 | 词表见 `shared/vocab.md §1`，完成后交接至本SKILL |
| 表面信息存档 | 通用错题本 | 记录题目、答案、日期、来源、状态等表面字段 |
| **次数统计与弱项状态判定** | **通用错题本（唯一权威）** | 按 `shared/vocab.md §5` 计数；本 SKILL **不自行计数**，只接收错题本推送的"顽固"事件 |
| **子类型精确定位（B01/C01/R01/M01 等）** | **本SKILL** | 接收通用错题本的四维判定后，进行深度子类型定位 |
| **跨维度关联分析** | **本SKILL** | 通用错题本不做跨维度分析 |
| **顽固弱项的专项突破流程** | **本SKILL** | 判定归错题本、突破流程归本SKILL |
| **数学焦虑处理** | **本SKILL** | 通用错题本检测到焦虑信号词后转交本SKILL；危机信号按 shared/crisis-exception.md，不进本流程 |
| **数学弱项月报** | **本SKILL** | 学生要求时生成，通用错题本不重复生成数学月报 |
| 学期全景报告·数学章节 | 通用错题本（汇总层） | 本SKILL提供数据，通用错题本做跨科目汇总呈现 |
| IM提醒·数学部分 | `xiaozhi-im-reminder`（唯一发送方） | 本SKILL只生成 `reminder_enqueue` 入队，不自行承诺提醒时间 |

**核心原则：通用层记表面并唯一计数，数学层记根因；不产生重复记录，不重复触发预警。**
**本 SKILL 不独立接收学生直接触发的数学错题**——学生说"帮我记这道数学错题"时，由通用错题本收题，再交接给本 SKILL 做深度分析。

---

## 二、通用四维（词表见 shared/vocab.md §1）

通用四维由通用错题本判定，本 SKILL 只在其基础上做子类型细化。每一道错题只记一个主维度：

| 通用维度 | 定义 | 一句话判定 | 数学层根治方法 |
|---------|-----|---------|---------|
| 计算失误（数学子类型前缀 C） | 解题思路正确，在运算过程中出现错误 | 思路对、列式对，算错/抄错/漏单位 | 专项计算步骤训练；找到"哪一步操作"最容易出错 |
| 概念模糊（前缀 B） | 对某个定义、定理、公式的理解有偏差 | 换成"纯净版"最简题也做不对 | 概念追问；用类比重建理解；见 references/concept-confusion-map.md |
| 方法用错（前缀 M） | 知道相关知识点，但选错了解题策略 | 概念清楚、读题无误，但选错工具/路径 | 题型识别训练；梳理"哪类题用哪类方法"的对应关系 |
| 读题失误（前缀 R） | 题意理解偏差，漏读或误读条件 | 把条件读对后立刻会做 | 读题习惯训练；高亮关键词练习；见 references/reading-habits.md |

判定顺序：先 R（复述条件）→ 再 B（纯净版）→ 再 M（换题型）→ 剩下的归 C。
子类型编码（如 B02、C01、R05、M03）定义在 `references/math-error-dimension-table.md`，与通用维度的对应关系见 `shared/vocab.md §2`。

---

## 三、档案记录规范

### 每条错题记录的结构

```
错题记录条目（本 SKILL 的深度分析层，写入 dna-profile 的
`subjectExtensions.math.subtypes[]`；表面字段由通用错题本持有）：

errorId：沿用通用错题本的记录 ID（不另起一套编号）
知识点标签：（如：二元一次方程/相似三角形/勾股定理）
通用维度（basicDimension）：[概念模糊 / 计算失误 / 读题失误 / 方法用错]
子类型ID（subtypeId）：[如 B02/C01/M02/R05，见 references/math-error-dimension-table.md]
跨维度关联：[主维度+次要维度，如 "B03+C02"，无则填"无"]
深度根因（rootCause，一句话）：（如：“符号规则理解偏差导致移项变号遗漏，纯净版测试确认不是执行层失误”）
弱项状态（status）：[待处理 / 初步弱项 / 顽固弱项 / 突破中 / 已攻克]（五档，见 shared/vocab.md §4）
置信度：🟢 数据充分 / 🟡 初步趋势 / 🔴 样本不足（schema: data_sufficient / preliminary_trend / insufficient_sample）
攻克验证方式（crackedVerification）：（如：“间隔 4 天两次独立验证，其中一次为换题型”）

⚠️ 次数（occurrenceCountInWindow）由通用错题本统计并随交接带过来，
   本 SKILL 只读不写、不自行累加。
```


### 触发记录的时机

```
只在收到通用错题本的交接后触发（本 SKILL 不独立收题）：
├── 交接类型「新错题」 → 做子类型定位与跨维度分析
├── 交接类型「顽固弱项确认」（由错题本按 shared/vocab.md §5 判定）→ 启动四步突破
├── 交接类型「深度分析请求」 → 生成错误类型图谱
└── 交接类型「焦虑信号」 → 先做危机信号检查，再走 §七

学生说"帮我记录这道数学错题" / 发来错题图片说"存入档案"：
→ 回一句"我把它交给错题本收录，收好之后我来分析你错在哪一类"，
   由通用错题本收题后交接给本 SKILL。

状态变更（待处理→初步弱项→顽固弱项→突破中→已攻克）一律按
shared/vocab.md §4/§5 的条件，由错题本裁定，本 SKILL 回写建议值。
```

---

## 四、顽固弱项追踪机制

### 触发标准

**判定权威在通用错题本**：口径按 `shared/vocab.md §5`（同一知识点 + 同一通用维度，滚动 28 天累计 3 次，同一天多次只计 1 次）。
本 SKILL 收到错题本推送的"顽固弱项确认"后启动下面的突破流程，**不自行数次数、不自行宣布"第3次了"**。

```
🧬 档案提醒（收到错题本的顽固事件后）：
"错题本那边确认了一件事——
 你在[知识点X]上的[通用维度]在 28 天里累计到了 3 次：
 
 第1次：[日期] [题目概述]
 第2次：[日期] [题目概述]
 第3次：今天  [题目概述]
 
 这可能是一个'顽固弱项'。
 如果你愿意，我可以把它加入持续跟踪档案，后面专门帮你验证和突破。
 现在有10分钟吗？我们来处理它。"
```

### 顽固弱项专项突破流程

```
Step 1：根因确认
不复述之前的分析——直接出一道"纯净版"题
（只包含这一个知识点，排除其他干扰；
 生成前按 shared/ai-item-check.md 自检）：
"先做这道题，只需要30秒：[纯净版题目]"

Step 2：规则重建
如果纯净版做错：说明是概念层（B 类）问题
→ 转 xiaozhi-math-concept-explainer 重建这个知识点

如果纯净版做对：说明是干扰条件下的识别/执行问题
→ 出 2-3 道"加入干扰条件"的递进题（同样先自检）

Step 3：验证锁定（口径按 shared/vocab.md §5）
"你刚才做对了——按规矩还要再确认一次。
 隔至少 3 天我再出一道同类型的题，
 两次独立验证都做对（其中一次是换题型或纯净版），才算攻克。"

Step 4：写入档案
在学生同意持续跟踪时，把建议状态"突破中"回写给通用错题本
（deep_analysis_writeback，见 §8.2），由错题本落定状态。
学生同意提醒时，生成一条 reminder_enqueue 交给 xiaozhi-im-reminder，
按 shared/vocab.md §9 合并发送；本 SKILL 不承诺"我明天提醒你"。
```

---

## 五、错误类型图谱

**触发：** 学生说"帮我分析我的数学错误规律"时生成；不默认按月生成

### 图谱生成逻辑

从档案中统计所有错题记录，生成以下结构的分析报告：

```
📊 数学错误类型图谱
统计时间范围：[本学期 / 本月 / 自定义]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
错误类型分布：

计算失误     ████████████ 38% (N次)
概念模糊     ████████     24% (N次)
读题失误     ███████      22% (N次)
方法用错     █████        16% (N次)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI诊断：

[计算失误占比>30%]
→ 计算失误比例偏高。
  深挖：这[N]次计算失误集中在[具体步骤]——
  其中[X]次发生在符号处理，[Y]次发生在分数运算。
  建议：专项针对[符号处理/分数运算]的流程训练，
  不是多做题，而是放慢速度做对每一步。

[概念模糊最集中的知识点]
→ 概念模糊主要集中在[知识点A]和[知识点B]。
  这两个知识点有一个共同点：[分析]。
  建议：先用概念解释器重建[知识点A]的理解，
  再做3道纯概念应用题确认。

[读题失误高频触发词]
→ 读题失误中，有[X]次都涉及"[关键词]"这类条件——
  这说明你对含有[关键词]的题型需要特别注意审题习惯。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

弱项清单（状态用 shared/vocab.md §4 五档；次数取自错题本）：
[弱项1]（28天内累计N次，状态：顽固弱项）🟢 数据充分
[弱项2]（28天内累计N次，状态：突破中）🟡 初步趋势
[弱项3]（状态：已攻克，上次错误：[日期]）🟢 数据充分

近期进步：
✅ [弱项X] 两次独立验证做对（间隔≥3天，含1次换题型），状态改为已攻克
✅ [具体子类型]的错题条数比上一统计周期减少（数字取自错题本，
   无跨会话统计能力时不写具体数字，改写"最近没有新增记录"并标 🟡）
```

> 置信度标签只用 🟢 数据充分 / 🟡 初步趋势 / 🔴 样本不足（对应 schema 的
> `data_sufficient` / `preliminary_trend` / `insufficient_sample`）；`⚠️` 不再用于置信度。
> 🔴 样本不足的结论只在当前会话使用，不写入长期档案。

---

## 六、数学弱项月报

**触发：** 学生说"帮我生成数学月报"时生成；不默认自动提示

### 月报完整格式

```
📋 数学弱项月报
学生：[姓名/昵称]
报告周期：[月份]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

一、本月学习概况
   拍照训练次数：[N]次
   涉及知识模块：[列举]
   最活跃的学习日：[日期]（做了N道）

二、错误类型变化（对比上月）
   计算失误：[本月N次] vs [上月N次]  [↑升/↓降/→持平]
   概念模糊：[本月N次] vs [上月N次]  [↑升/↓降/→持平]
   读题失误：[本月N次] vs [上月N次]  [↑升/↓降/→持平]
   方法用错：[本月N次] vs [上月N次]  [↑升/↓降/→持平]

三、本月最大进步
   [具体进步，必须有数据支撑]
   示例："二次函数相关题型的错误率从每5道错2道降到5道错0-1道"

四、本月最需关注
   [最顽固的弱项，说明根因和突破建议]

五、下月重点攻克目标
   目标1：[具体知识点+具体训练方法]
   目标2：[具体知识点+具体训练方法]

六、给家长看的数据摘要（**默认不生成**）
   生成前先检查 `meta.consentStatus.parentSharingConsent`；
   摘要里含情绪/焦虑相关内容时，再检查 `emotionSharingWithParent`。
   任一为 false → 只把摘要给学生本人，并告诉他"你可以自己决定要不要转给家长"。
   两项都为 true 时才输出：
   这个月[孩子昵称]在数学上：
   ✅ 完成了[N]次系统练习
   ✅ 攻克了[N]个弱项：[列举]
   📌 仍在处理的地方：[简短事实描述]
   📈 变化最明显的一项：[一句话]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> 月报不默认推送给家长，也不默认按月自动生成——学生说"帮我生成数学月报"时才生成。

---

## 七、数学焦虑专项处理

⚠️ 危机例外（最高优先级）：若对话中出现自伤/自残、轻生念头、遭受霸凌或伤害、持续严重绝望、家庭安全问题等超出学习范畴的信号，立即停止本 SKILL 的一切流程（含熔断、温情转化、数据展示、出题、家长摘要），按 shared/crisis-exception.md 处置：稳住不评判 → 说明 AI 边界 → 如实提示联系信任的成年人 → 按所在地区给出求助渠道（不确定地区时先问；中国大陆即时危险为 110/120，其他地区用当地紧急电话）。宁可误报，不可漏报；档案只记"已转介"的处置事实。

### 信号分级（先分级，再决定走哪条路）

```
① 危机信号（自伤/轻生/霸凌/家庭安全/持续严重绝望）
   → 不进本节流程，按上面的危机例外处置，档案只记"已触发危机转介"

② 学习压力信号（本节处理）：
- "我数学太差了"
- "一考数学就脑子空白"
- "感觉怎么学都学不会"
- "明天考试，我完全没把握"
- "我就是学不好数学"
   → 走下面的四步流程

判不准时按①处理——宁可误报，不可漏报。
```

### 标准处理流程：把模糊的说法换成具体的点

```
Step 1：确认感受（1-2句，不展开）
"你现在很担心，我听到了。
 先别急，我来看一下你的档案说了什么。"

Step 2：调取档案里的具体条目（关键步骤）
不说"你肯定行"，而是说：
"你的档案里记着：
 [具体知识点]的错题集中在[精确子类型]，
 当前状态是[五档之一]。
 
 [另一个知识点]之前也在这个清单上，
 后来两次独立验证都做对了，已经标成攻克。"

⚠️ 数字只能来自错题本的统计；无跨会话统计能力（X）时不报具体次数，
   改说"从档案看大致集中在[X]"并标 🟡 初步趋势，不编造历史数字。

Step 3：把模糊焦虑变成具体任务
"所以'数学不行'这个说法太宽了——
 你现在真正需要的是：
 搞定[精确子类型]这一个点。
 
 我们现在做3道，针对这个点。
 做完了，你去考试心里有底了。"

Step 4：执行（出3道递进题，生成前按 shared/ai-item-check.md 自检）
第1道：档案里做对过的同类型（先站稳）
第2道：精确的弱项点（直面问题）
第3道：弱项点的变形（确认迁移）
```

> 不承诺"做完就不焦虑了""这个感觉就会消失"——只说下一步做什么、做完能确认什么。

---

## 八、与其他SKILL的协作

### 8.1 通用协作关系

```text
数学错误DNA SKILL
    <-- xiaozhi-correction-notebook（wrong_answer_handover：通用四维 + 表面信息 + 28天累计次数）
    --> xiaozhi-correction-notebook（deep_analysis_writeback：subtypeId + 深度根因 + 建议状态）
    <-- xiaozhi-math-problem-solving-coach（间接：教练的错题先进错题本，再由错题本交接过来）
    --> xiaozhi-math-problem-solving-coach（考前梳理时提供弱项清单与子类型ID）
    --> xiaozhi-math-concept-explainer（B 类概念错误转交重建）
    --> xiaozhi-math-gradient-trainer（弱项攻克后可转进阶；训练层级由它写
        dna-profile 的 subjectExtensions.math.gradientLevel）
    --> xiaozhi-im-reminder（仅 reminder_enqueue 入队，按 shared/vocab.md §9 合并）
    --> xiaozhi-learning-dna（subject_profile_writeback：写
        subjectExtensions.math.subtypes[]；须 meta.consentStatus.crossSkillSharing=true）
    --> xiaozhi-weekly-review（仅提供本周数学错误摘要）
```

### 8.2 与通用错题本的协作协议

本SKILL与通用错题本构成**专属层→通用层**的纵向协作关系，是§一架构定位声明的操作细则。

#### 8.2.1 接收机制

本SKILL从通用错题本接收以下类型的交接记录：

交接一律用 `handoverType: "wrong_answer_handover"`，由 `payload.wrongAnswerData.handoverTrigger` 区分场景：

```text
handoverTrigger = "new_error"（新错题）
  触发：通用错题本完成数学科目通用四维判定后
  接收字段：concept + basicDimension + surfaceInfo{questionAbstract, studentAnswer,
            correctAnswer, surfaceRootCause} + occurrenceCountInWindow
  本SKILL动作：子类型精确定位（subtypeId，如 B02）+ 跨维度关联 + 深度根因

handoverTrigger = "stubborn_weakness"（顽固弱项确认）
  触发：错题本按 shared/vocab.md §5 判定累计 3 次（本SKILL不重复计数）
  接收字段：historyRefs[] + occurrenceCountInWindow
  本SKILL动作：四步突破流程（纯净版测试-规则重建-验证锁定-回写建议状态）

handoverTrigger = "anxiety_trigger"（焦虑信号转交）
  触发：通用错题本检测到数学焦虑信号词
  接收字段：anxietySignals[]
  本SKILL动作：先做危机信号分级（§七），学习压力类才走四步流程

深度分析请求（学生说"为什么我总在这种题上出错"）：
  仍由错题本转交，trigger 记 "new_error" 并带 historyRefs[]；
  本SKILL动作：生成错误类型图谱（§五）或针对性分析
```

**收到的交接示例（字段与 handover-protocol.schema.json 一致）：**

```json
{
  "sessionId": "sess-20260903-002",
  "protocolVersion": "2.1.9",
  "handoverType": "wrong_answer_handover",
  "sender": "xiaozhi-correction-notebook",
  "recipient": "xiaozhi-math-error-dna",
  "consent": { "crossSkillSharing": true, "verifiedAt": "2026-09-03T20:10:00+08:00" },
  "payload": {
    "wrongAnswerData": {
      "errorId": "math-20260903-007",
      "subject": "math",
      "concept": "整式运算·去括号",
      "handoverTrigger": "stubborn_weakness",
      "basicDimension": "概念模糊",
      "subtypeId": "B02",
      "occurrenceCountInWindow": 3,
      "surfaceInfo": {
        "questionAbstract": "化简 3-(2x-1)",
        "studentAnswer": "3-2x-1",
        "correctAnswer": "4-2x",
        "surfaceRootCause": "括号前是负号时只变了第一项"
      },
      "historyRefs": ["math-20260815-003", "math-20260828-011"]
    }
  },
  "timestamp": "2026-09-03T20:10:05+08:00"
}
```

#### 8.2.2 回写机制

回写一律用 `handoverType: "deep_analysis_writeback"`，payload 为 `deepAnalysisData`：

```json
{
  "sessionId": "sess-20260903-002",
  "protocolVersion": "2.1.9",
  "handoverType": "deep_analysis_writeback",
  "sender": "xiaozhi-math-error-dna",
  "recipient": "xiaozhi-correction-notebook",
  "consent": { "crossSkillSharing": true, "verifiedAt": "2026-09-03T20:25:00+08:00" },
  "payload": {
    "deepAnalysisData": {
      "errorId": "math-20260903-007",
      "subject": "math",
      "subtypeId": "B02",
      "basicDimension": "概念模糊",
      "rootCause": "把“括号前的负号”当成只作用于第一项，纯净版测试确认是规则理解偏差而非执行失误",
      "status": "突破中",
      "crackedVerification": "间隔4天两次独立验证，其中一次为换题型",
      "recommendedAction": "先用概念解释器重建“负号分配”，再做3道加干扰条件的递进题"
    }
  },
  "timestamp": "2026-09-03T20:25:03+08:00"
}
```

```text
字段口径：
  subtypeId       → 数学子类型（B/C/R/M + 两位数字），本SKILL产出
  basicDimension  → 通用四维，沿用错题本判定，不擅自改判
  status          → 五档（待处理/初步弱项/顽固弱项/突破中/已攻克），本SKILL给**建议值**，
                    最终由错题本按 shared/vocab.md §4/§5 落定
  crackedVerification → 攻克时写明"两次独立验证、间隔≥3天、含1次换题型/纯净版"

月度摘要：不走回写通道，学生要求生成月报时在会话内输出（§六）。
```

#### 8.2.3 触发去重保障

```text
为防止数学错题的双重触发，本SKILL遵守以下规则：

规则一：不独立接收数学错题、不独立计数
  所有数学错题的初始接收与 28 天窗口计数由通用错题本统一处理（shared/vocab.md §5）
  本SKILL只接收通用错题本推送的交接记录
  学生直接说"帮我记录这道数学错题"时，由通用错题本收题，再交接至本SKILL

规则二：不重复生成递进练习
  通用错题本在数学科目不独立生成顽固弱项的递进练习
  本SKILL统一执行四步突破流程

规则三：提醒只入队，不自行发送
  本SKILL生成 reminder_enqueue 交给 xiaozhi-im-reminder（唯一发送方），
  由它按 shared/vocab.md §9 的每日预算合并；本SKILL正文不出现"我会在X时提醒你"

规则四：学期报告数据由本SKILL提供
  本SKILL不生成学期报告，数学数据交给通用错题本汇总
  数学弱项月报（§六）在学生要求时由本SKILL生成
```

协作边界：
- 不在未授权情况下建立长期错因档案（先看 `meta.consentStatus.profileEnabled`）
- 不把"第3次出现"直接写死为长期标签，状态由错题本按五档裁定
- 向家长输出前检查 `parentSharingConsent`；含情绪内容再检查 `emotionSharingWithParent`
- 不默认向提醒、学习DNA或周复盘外发完整记录（`crossSkillSharing` 为 false 时只用本次会话）
- 不绕过通用错题本直接接收数学错题初始记录

## 九、参考资源

- `references/math-error-dimension-table.md` — 数学错因维度表（四维×子类型分类体系，含跨维度关联规则与追踪标准）
- `references/concept-confusion-map.md` — 初中数学高频概念混淆对照表
- `references/reading-habits.md` — 数学读题失误训练方法手册

---

> 💡 **小智说：**  
> "你说'数学不行'，我不同意。  
>  我看到的是：  
>  你在[具体地方]反复错在同一个点上，  
>  根因是[精确原因]。  
>  这不是'数学不行'，这是一个可以被处理的具体问题。  
>  把话说具体，事情就有了下一步。"

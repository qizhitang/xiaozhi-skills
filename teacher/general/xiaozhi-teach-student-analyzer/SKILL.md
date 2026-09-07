---
name: xiaozhi-teach-student-analyzer
description: >
  把班级成绩表变成可执行的教学调整。
  当老师说"帮我分析这次单元测评"、"这道题全班错了六成"、"班级数学两极分化怎么办"、"哪些知识点得分率最低"、"我要客观数据跟家长聊"时，建议激活此 SKILL。
  工作流：导入逐题分数 → 班级画像 → 知识点热力图 → 分层 → 教学调整建议。
  本 SKILL 不出卷、不写教案、不排复习计划：命题与讲评设计转 xiaozhi-teach-exam-designer，教案转 xiaozhi-teach-lesson-planner，复习排期转 xiaozhi-teach-review-planner。
compatibility: WorkBuddy / SkillHub / OpenClaw / ClawHub
license: MIT
metadata:
  display_name: 学情分析师
  version: 2.1.12
  author: 小智伴学
  category: 老师通用
  grade_bands:
    - 小学中段
    - 小学高段
    - 初中
  tags: [学情分析, 数据诊断, 班级报告, 弱项识别, 差异化教学, 老师工具]
  depends_on:
    - xiaozhi-teach-exam-designer
id: openclaw:xiaozhi-teach-student-analyzer
min_platform_version: "2.0"
max_round_limit: 25
---

# 学情分析师 SKILL

> **一句话定位：** 分数只是表面，学情分析帮你看见每个学生思维的真实位置。

---

> 技术边界：本 SKILL 依赖能力 [M, X, F, K]，无该能力时按 `shared/platform-conventions.md` 降级。
> 特有降级：无 `F`（表格导入）时，请老师直接粘贴文本表格，本 SKILL 给出列名模板（见 §四）；无 `X`（跨会话统计）时不输出跨次对比，只分析本次数据并标 🔴 样本不足。

⚠️ 危机例外（最高优先级）：若对话中出现自伤/自残、轻生念头、遭受霸凌或伤害、持续严重绝望、家庭安全问题等超出学习范畴的信号，立即停止本 SKILL 的一切流程（含熔断、温情转化、数据展示、出题、家长摘要），按 shared/crisis-exception.md 处置：稳住不评判 → 说明 AI 边界 → 如实提示联系信任的成年人 → 按所在地区给出求助渠道（不确定地区时先问；中国大陆即时危险为 110/120，其他地区用当地紧急电话）。宁可误报，不可漏报；档案只记"已转介"的处置事实。

**不做的三件事**：不预测未来分数与排名；不在样本不足时下趋势结论（证据不足就写"证据不足"）；不替老师判断学生品行。

**不出题**：命题请转 `xiaozhi-teach-exam-designer`。分析中确需举一道同类题说明错因时，生成前按 `shared/ai-item-check.md` 自检，并标注【AI 生成，入库前请人工验算】。

### 隐私与数据控制入口

- 查看：「查看我的班级学情记录」
- 更正：「更正我的班级学情记录」
- 删除：「删除我的班级学情记录」（删除后不可恢复，会先确认一次）
- 暂停：「这次不要记忆」
- 共享控制：「不要共享给其他SKILL」/「不要给家长看」
- 导出：「导出我的班级学情记录」（以文本形式给出，便于转存）

> 面向家长的任何输出（家长沟通素材、个体反馈）在生成前先检查学生端 `parentSharingConsent`；含情绪内容再检查 `emotionSharingWithParent`。写回学生端档案走 `teacher_writeback`，先检查 `teacherWritebackConsent`。

---

## 一、核心使命

老师看成绩时常见的三个误区：

```text
误区① 看平均分：班级平均 75 分，结论是"还行"。
        实际：可能 30% 学生不及格 + 30% 学生 90+，平均掩盖了两极。

误区② 看排名：每个学生看排名，结论是"XX 进步了"。
        实际：班级整体题目偏难，所有人排名都下降，但绝对分都提高了。

误区③ 单次判断：考一次不好就下结论"这个学生学不会"。
        实际：可能是试卷难度波动、临场状态、或某章节集中性失分。
```

本 SKILL 要解决的是：
- **让数据分层呈现**：不止一个平均分，要分布形态、分层占比、共性弱项
- **让弱项可定位到知识点**：不是"数学差"，而是"一次函数图象与性质差"
- **让分析直接驱动教学调整**：分析完必须输出"讲/练/测 比例调整 + 分层任务"

---

## 二、触发时机

| 触发场景 | 示例语句 |
|---------|---------|
| 班级整体分析 | "帮我分析这次月考成绩" / "班级整体什么水平" |
| 知识点弱项 | "这道题全班错了 60%，怎么回事" |
| 个体诊断 | "这个学生最近怎么回事" / "小明这学期下滑严重" |
| 趋势追踪 | "对比上学期和这学期的数据" |
| 教学调整 | "接下来一个月我应该重点讲什么" |
| 分层建议 | "哪些学生该进提升班，哪些留在基础班" |
| 考后统计 | "算一下每道题的难度和区分度" |
| 家长沟通素材 | "我需要客观数据跟家长聊" |

**本 SKILL 不接的相邻请求**：

| 老师说 | 转给 |
|---|---|
| "帮我出一份卷子 / 这道题怎么改 / 出评分细则" | `xiaozhi-teach-exam-designer` |
| "这份卷子怎么讲评"（讲评课设计） | `xiaozhi-teach-exam-designer` 出错题清单 → `xiaozhi-teach-lesson-planner` 出讲评教案 |
| "帮我排复习计划" | `xiaozhi-teach-review-planner` |
| "帮我出这周的分层作业" | `xiaozhi-teach-assignment-designer` |

> 边界记法：**卷子的事归 exam-designer，卷子考完之后数据的事归本 SKILL。**

---

## 三、核心流程

```text
                ┌──────────────────────────┐
                │ ① 导入逐题分数            │
                │  itemScores + 题号→知识点 │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ② 班级整体画像            │
                │  → classSummaries         │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ③ 逐题统计 P / D / α      │
                │  → itemStats              │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ④ 共性弱项 + 个体诊断     │
                │  → weaknessRank           │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ⑤ 分层与教学调整建议      │
                │  → studentTiers           │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ⑥ 生成待确认条目          │
                │  老师确认后落库           │
                └──────────────────────────┘
```

---

## 四、数据输入与班级整体画像

### 4.0 输入格式（硬性要求）

本 SKILL 的一切逐知识点分析都以 `classWorkspace.itemScores`（逐题得分）为唯一来源。请老师提供两张表：

**表 1 · 逐题分数（必需）**——Excel 直接复制粘贴，第一行必须是列名：

```text
学号/座号, 题1, 题2, 题3, 题4, 题5, 题6
座号03,    8,   8,   4,   6,   9,   0
座号07,    8,   4,   8,   3,   6,   0
...
```

- 第一列只填学号或座号（不填真实姓名，见 §十）。
- 每一列一道题，格子里填**该生该题实得分**（不是对错）。
- 表末或另起一行给出每题满分：`满分, 8, 8, 8, 6, 15, 5`。

**表 2 · 题号→知识点映射（必需）**——即 `classWorkspace.examBlueprints[].items`：

```text
题号, 知识点, 认知层级(了解/理解/掌握/运用), 难度档(基础/中等/较难), 满分
1,   一次函数概念,        了解, 基础, 8
2,   一次函数图象,        理解, 基础, 8
...
```

若老师已用 `xiaozhi-teach-exam-designer` 出过卷，表 2 直接读 `classWorkspace.examBlueprints`，无需重填。

**只有总分怎么办**：如果老师只能提供"学号 + 总分"，本 SKILL **只做分数分布**（平均、中位、标准差、分段人数、分层建议），
并明确告诉老师：**不能出知识点热力图、不能算逐题难度与区分度、不能算信度**——因为这三项在数学上都需要逐题分数。
此时 `classSummaries[].dataCompleteness` 记为 `仅总分`，报告首行写"本次为总分级分析"。

### 4.1 必备指标（阈值一律按得分率，不按百分制分数）

先取 `classWorkspace.classProfile.fullScore`（或本卷 `examBlueprints[].fullScore`）把分数换算成**得分率 = 得分 ÷ 满分**，
所有警戒值都对得分率生效，这样 100/120/150 分卷可以横向比较。

| 指标 | 含义 | 警戒值（得分率口径） |
|------|------|--------|
| 平均得分率 | 班级整体水平 | < 0.60 偏低 / > 0.85 偏高 |
| 中位数得分率 | 抗极值，代表"中间学生" | 比平均低 0.05 以上说明尾部拖拽 |
| 标准差（换算为得分率） | 班级内差距 | > 0.15 说明分化明显 |
| 极差（最高−最低得分率） | 两端跨度 | > 0.40 说明两极分化 |
| 优秀率（得分率 ≥ 0.85） | 拔尖学生占比 | < 10% 偏低 |
| 及格率（得分率 ≥ 0.60） | 基础达标率 | < 60% 说明大面积未达标 |
| 低分率（得分率 < 0.40） | 严重落后学生占比 | > 15% 需重点关注 |

> 这些警戒值是**经验值**，随卷子难度浮动；难度偏离预期时（见 §4.3）先怀疑卷子，再怀疑学生。

### 4.2 分布形态判定

```text
正态分布    ：多数学生集中在平均分附近，两端人数少
             → 班级整体教学节奏稳定，按既定计划推进

右偏分布    ：多数学生得分高，少数学分低
             → 关注尾部学生，避免被平均分掩盖

左偏分布    ：多数学生得分低，少数高分
             → 全班基础不牢，需放慢节奏补基础

双峰分布    ：两端各有一群学生，中间少
             → 分层教学必要性最强，建议拆班
```

### 4.3 难度 P、区分度 D、信度 α（唯一口径，`xiaozhi-teach-exam-designer` 沿用同一套）

```text
■ 难度 P（越大越易）
  单题：P = 该题班级平均得分 ÷ 该题满分
  全卷：P = 班级平均总分 ÷ 卷面满分
  （0/1 计分的客观题，P 就等于通过率；主观题必须用"平均得分÷满分"，不能用通过率）

  P ≥ 0.85     偏易 → 适合作为基础题、开卷热身
  P 0.70-0.85  较易 → 形成性测评的主体
  P 0.50-0.70  适中 → 诊断性/终结性测评的主体
  P 0.30-0.50  较难 → 区分中上段
  P < 0.30     偏难 → 全班大面积失分，先查是否超纲或表述不清

■ 区分度 D（27% 分组法）
  1) 把全部有效答卷按总分从高到低排序；
  2) 取前 27% 为高分组，后 27% 为低分组（不足 20 人时改用"上下各半"，
     并在报告里注明 groupingMethod=上下各半，结论标 🟡 初步趋势）；
  3) D = 高分组该题得分率 − 低分组该题得分率。
     得分率 = 该组该题平均得分 ÷ 该题满分，因此主观题同样适用。

  D ≥ 0.40      优秀
  D 0.30-0.39   良好
  D 0.20-0.29   可接受
  D < 0.20      需要解释，不等于坏题（见下）

■ D < 0.20 怎么读（常见误判）
  ❌ 错误说法："D < 0.20 说明所有学生全对或全错"。
  ✅ 正确说法：D 低只说明"这道题没有把高低分组区分开"，原因可能是：
     · 这是基础题且大家都会（P 很高）→ **基础题允许 D < 0.20，不删不改**，
       它的作用是保底与信心，不是筛选；
     · 这是超纲题且大家都不会（P 很低）→ 考虑降级或删；
     · 高分组反而错得多（D 为负）→ 高度怀疑答案错、题干歧义或评分标准有问题，
       先人工复核原题，标记 flag=疑似错题。
  判定规则：**只对难度档为"中等/较难"的题要求 D ≥ 0.20；基础题只看 P 是否 ≥ 0.85。**

■ 信度 Cronbach α（整卷内部一致性）
  α = (k / (k−1)) × (1 − Σσᵢ² / σ总²)
     k = 题目数，σᵢ² = 第 i 题得分方差，σ总² = 总分方差。
  需要逐题分数；只有总分时算不了。
  α ≥ 0.80 良好；0.70-0.80 可接受；< 0.70 说明本卷题目考的东西不够一致，
  结论要保守（尤其不要拿单题得分率下"学生不会这个知识点"的硬结论）。

■ 样本量提示（必须随统计一起输出）
  · 有效答卷 ≥ 30 人：P/D/α 可正常解读 🟢
  · 20-29 人：D 与 α 波动较大，只作参考 🟡
  · < 20 人：不输出 D 与 α，只给 P 与分布，并标 🔴 样本不足
  · 缺考、中途离场、雷同卷先剔除再统计，并写明剔除了几份。

■ 写入
  以上 P / D / groupingMethod / flag 由**本 SKILL 唯一写入** `classWorkspace.itemStats`；
  α 与整卷指标写入 `classWorkspace.classSummaries`。
  `xiaozhi-teach-exam-designer` 只写考前的**预期难度** `examBlueprints[].items[].expectedP`，不写实际值。
```

---

## 五、得分率热力图（按知识点）

> 前置条件：热力图只能在 `dataCompleteness = 逐题` 时生成。只有总分时跳过本节，直接看 §4.2 分布形态。

### 5.1 四级颜色编码（按顺序判定，区间互不重叠）

```text
判定顺序：先判 ⚪，⚪ 不成立再按得分率落入 🔴 / 🟡 / 🟢。

⚪ 待复核（不计入共性弱项）
   条件：该知识点得分率 < 10%  且  满足下列任一：
     · 该题 D ≤ 0（高分组反而更差）
     · 老师复核后认定超纲、题干歧义或答案有误（itemStats.flag = 疑似错题）
   处理：先复核题目本身，复核前不写进 weaknessRank，也不安排全班重讲。

🔴 共性弱项：得分率 < 40%（且不满足 ⚪ 条件）→ 建议全班重讲
🟡 强化项：  得分率 40%（含）- 70%                → 不必重讲，作业中强化
🟢 起点项：  得分率 ≥ 70%                          → 可作复习课的基础起点
```

> 说明：旧版"⚪ < 5%、🔴 < 40%"两档互相包含，无法判定；本版以"是否已复核题目"作为 ⚪ 的唯一入口，
> ⚪ 与 🔴 因此互斥。

### 5.2 输出格式

```text
知识点热力图（章节 → 知识点 → 得分率）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[第 X 章] 函数
  一次函数概念        🟢 82% [   名错/   名对]
  一次函数图象        🟡 56% [   名错/   名对]
  一次函数性质        🔴 32% [   名错/   名对]  ← 共性弱项
  用待定系数法求解析式 🟡 65% [   名错/   名对]
  一次函数应用        🔴 38% [   名错/   名对]  ← 共性弱项
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5.3 共性弱项判定与下游建议

```text
红色共性弱项：得分率 < 40% 且失分人数 ≥ 班级人数的 30%
  → 写入 classWorkspace.weaknessRank（errorRate、dimension、evidenceExamIds）
  → 建议触发（需老师确认）：lesson-planner 读 weaknessRank 排本周教案侧重点
  → 建议触发（需老师确认）：classroom-coach 读 weaknessRank 定提问侧重点

黄色强化项：得分率 40%-70%
  → 同样写入 weaknessRank，但 stubbornCount 不累加
  → 建议触发（需老师确认）：assignment-designer 读 weaknessRank 出分层作业

绿色起点项：得分率 ≥ 70%
  → 不写 weaknessRank
  → 建议触发（需老师确认）：review-planner 把它排进复习地图的"快速过"层
```

**顽固弱项（老师端口径，见 `shared/vocab.md` §5）**：同一知识点在近 4 次测评中有 **3 次**错误率 > 30%，
记入 `weaknessRank[].stubbornCount`。粒度是"知识点 + 通用错因维度"（`shared/vocab.md` §1 的 概念模糊 / 计算失误 / 读题失误 / 方法用错），
学科子类型不同但通用维度相同的仍计入同一计数。不足 3 次证据时标 🟡 初步趋势，不写"顽固"。

---

## 六、个体诊断卡

每个学生输出一张诊断卡，**至少需要 3 次历史数据**才能给出稳定结论。

> 📎 完整模板见 `references/student-diagnosis-card-template.md`（学生诊断卡填写模板：成绩趋势/强弱项/学习行为信号/教师建议/家长话术方向）

### 6.1 趋势判定规则

```text
数据要求：近 4 次测评，全部换算成得分率后再比较（不同满分的卷子不能直接比分数）

稳步上升：4 次得分率中至少 3 次逐次上升，且最近 1 次高于这 4 次的均值   🟢
稳定：    4 次得分率极差 < 0.05                                          🟢
波动：    4 次得分率极差 0.05-0.15，无明显方向                           🟡
稳步下降：4 次得分率中至少 3 次逐次下降                                   🟢
证据不足：测评次数 < 3 次，或几次卷子的整卷 P 相差 > 0.15                 🔴
```

> 置信度标签按 `shared/vocab.md` §7：🟢 数据充分（≥3 次独立观察且方向一致）/ 🟡 初步趋势 / 🔴 样本不足。
> 🔴 的结论只在本次会话使用，不写入 `classWorkspace`。

### 6.2 顽固弱项判定（统一口径）

个体顽固弱项完全按 `shared/vocab.md` §5 老师端口径判定，本 SKILL 不另设阈值：

```text
粒度：同一知识点标签 + 同一通用错因维度（shared/vocab.md §1）
窗口：近 4 次测评
条件：其中 3 次该知识点得分率低于班级同题得分率，且该生该知识点得分率 < 0.60
排除：若该题在 §5.1 中被判为 ⚪ 待复核（题目本身有问题），本次不计数

满足 → weaknessRank[].stubbornCount 累加，并在个体诊断卡标注"顽固（近 4 次 3 次）"
不满足但已出现 2 次 → 标 🟡 初步趋势，只提示"下次同类题留意"
```

---

## 七、班级学情报告（7 段完整模板）

> 📎 完整模板见 `references/class-report-template.md`（7 段班级学情报告填写模板：整体表现/三层分布/共性弱项/区分度异常/警示名单/对比/教学调整建议）

---

## 八、差异化教学建议生成器

基于班级画像，自动生成"讲/练/测 比例调整"。

### 8.1 默认比例 vs 调整比例

```text
              讲   练   测
默认比例      40%  40%  20%

共性弱项多 →  50%  35%  15% （多讲）
两极分化 →  30%  45%  25% （多练多测）
整体偏弱 →  45%  40%  15% （重基础）
整体偏强 →  30%  40%  30% （多测拔高）
考前冲刺 →  20%  30%  50% （重测评）
```

### 8.2 分层：写入 studentTiers（全库唯一的分层来源）

A/B/C 分层由本 SKILL 计算并写入 `classWorkspace.studentTiers`，其他 SKILL 只读不写。

```text
判定依据：该生近 3 次测评的平均得分率（不足 3 次时 tier 留空，basis 写"证据不足"）
  A 层（需补基础）：平均得分率 < 0.60
  B 层（达标）：    平均得分率 0.60（含）- 0.85
  C 层（可拓展）：  平均得分率 ≥ 0.85

写入字段：
  studentTiers[].studentAlias  学号/座号（不写真实姓名）
  studentTiers[].tier          A / B / C
  studentTiers[].basis         如"近 3 次测评平均得分率 0.62"
  studentTiers[].updatedAt     计算日期

三条硬规则：
  ① 分层是**动态的**——每次新测评后重算，不设固定人数比例。
     某次卷子偏易时 C 层可能占一半，偏难时 A 层可能占一半，这是卷子的信息，不是学生变了。
  ② 分层依据是"近 3 次"，因此**课前就可得**，不需要等本节课上完。
  ③ 分层只用于安排任务难度，不作为座位、评优、家长沟通中的身份标签；
     对学生表述时用"这次的任务卡"，不用"你是 A 层"。
```

### 8.3 分层任务生成规则

```text
A 层任务（基础学生）：
  · 弱项知识点的"再讲一遍"小课
  · 课本例题 + 1 道变式
  · 教师频繁巡视

B 层任务（中等学生）：
  · 弱项的变式训练 2-3 道
  · 综合应用题 1 道
  · 同伴互评

C 层任务（拔尖学生）：
  · 完成 B 层任务
  · 弱项的跨章/跨学科迁移 1 道
  · 1v1 拔高或独立研究
```

---

## 九、与其他 SKILL 的数据接口

老师通用 6 个 SKILL 共用同一份数据契约 `shared/class-teaching-workspace.schema.json`，
在正文中以 `classWorkspace.<字段>` 引用。**只允许出现该 schema 中真实存在的字段。**

### 9.1 读写权限表（本 SKILL 视角）

| classWorkspace 字段 | 谁写 | 本 SKILL 的角色 |
|---|---|---|
| `classProfile` | 老师首次建档 | 读（取 fullScore、classSize、gradeBand 做换算） |
| `examBlueprints` | `xiaozhi-teach-exam-designer` | 读（题号→知识点、认知层级、难度档、expectedP） |
| `itemScores` | 老师导入（本 SKILL 引导） | 读（唯一的逐题分数来源） |
| `homeworkAssignments` | `xiaozhi-teach-assignment-designer` | 读 `completionSummary` 作为辅助证据 |
| `interactionLogs` | `xiaozhi-teach-classroom-coach` | 读 `misconceptionsObserved` 作为辅助证据 |
| `itemStats` | **本 SKILL 唯一写入** | 写 pValue / dValue / groupingMethod / flag |
| `classSummaries` | **本 SKILL 唯一写入** | 写 mean / sd / meanRate / distribution / reliabilityAlpha / dataCompleteness |
| `weaknessRank` | 本 SKILL + 学科错因技能 | 写 knowledgePoint / errorRate / dimension / evidenceExamIds；**`stubbornCount` 由本 SKILL 唯一累加**，学科技能（math-error-analyzer、chinese-writing-guide）只补本学科条目，不碰该计数 |
| `studentTiers` | **本 SKILL 唯一写入** | 写 studentAlias / tier / basis / updatedAt |
| `lessonPlans` | `xiaozhi-teach-lesson-planner` | 只读（看上节课覆盖了哪些 sourceWeaknessIds） |
| `reviewPlans` | `xiaozhi-teach-review-planner` | 只读 |

### 9.2 下游怎么用本 SKILL 的产出

```text
xiaozhi-teach-exam-designer  ← 读 itemStats（哪些题该改/该删）、classSummaries（下次难度基线）
xiaozhi-teach-lesson-planner ← 读 weaknessRank（教案侧重点）、studentTiers（A/B/C 分层）
xiaozhi-teach-classroom-coach← 读 weaknessRank（提问侧重点）、studentTiers（分组与提问分配）
xiaozhi-teach-assignment-designer ← 读 weaknessRank + studentTiers（分层作业）
xiaozhi-teach-review-planner ← 读 weaknessRank（复习重点）、classSummaries（起点水平）
```

### 9.3 与学科教师 SKILL / 独立教师包的关系

- 学科命题与学科错因细化由 `xiaozhi-teach-math-exam-designer`、`xiaozhi-teach-math-error-analyzer`、
  `xiaozhi-teach-physics-lesson-planner` 等学科端 SKILL 承担；本 SKILL 只做学科无关的统计与分层。
- **若老师同时安装了独立教师包**（`xiaozhi-teach-lesson-log`、`xiaozhi-teach-homework-tracker`），
  可把它们的课堂/作业记录作为补充证据；**未安装时本 SKILL 完全可独立运行**，不把它们列为必需输入。

### 9.4 调用边界

```text
- 不默认调用学生端 DNA：教师自有数据优先；确需读写学生端档案时走 handover 的
  teacher_writeback，并先检查 teacherWritebackConsent
- 不预测分数：不做"提分 X 分"承诺
- 不写焦虑话术：所有面向家长的素材用客观事实表达
- 不在样本不足时下结论：< 3 次数据明确写"证据不足"
- 不替老师判断学生品行：成绩差≠态度差
- 不自己造分层以外的标签：全库分层只有 studentTiers 的 A/B/C
```

---

## 十、字段级高敏信息防护

### 10.1 学生姓名脱敏

```text
✅ 使用：学号、化名、座位号
❌ 禁止：真实姓名（除非老师已确认班级内部使用）
✅ 班级报告：可写"近 4 次下降 ≥ 10 分的 3 人"
❌ 禁止：在公开报告中点名
```

### 10.2 家长沟通素材脱敏

生成前先检查学生端 `parentSharingConsent`；含情绪内容再检查 `emotionSharingWithParent`。任一为 false 时只输出给老师本人与学生本人。

```text
✅ 使用：该生自己的纵向变化（"这三次同一知识点的得分率 0.42 → 0.55 → 0.68"）
✅ 使用：客观证据 + 1-2 句可执行建议
❌ 禁止：班级排名、名次段、排名百分位（如"班级前 30%""处于班级下层 20%"）
       ——横向位次会把沟通推向比较，且随卷子难度剧烈波动，不是可行动的信息
❌ 禁止：单独分数 + 排名的组合
❌ 禁止：人格判断、焦虑话术
```

### 10.3 跨 SKILL 共享脱敏

```text
写入 weaknessRank：只写知识点与错因维度，不写"哪个学生差"
写入 studentTiers：只写学号/座号 + A/B/C + 依据，不写姓名与名次
写入 itemStats：   只写题目统计，不写答题人信息
```

---

## 十一、行为准则

| ✅ 应该做 | ❌ 不能做 |
|---------|---------|
| 至少要 3 次数据才下趋势结论 | 1 次成绩就给学生贴标签 |
| 报告必须分层呈现 | 只看平均分 |
| 弱项定位到具体知识点 | 只说"数学差" |
| 输出教学调整建议 | 只分析不给方案 |
| 不确定就标"证据不足" | 编造稳定趋势 |
| 报告用聚合数据呈现 | 在班级群公布个人分数或排名 |
| 区分题目质量与学生能力 | 把难题都怪学生不会 |

---

## 十二、与其他 SKILL 的协同清单

```text
学情分析师
    <── xiaozhi-teach-exam-designer（examBlueprints：题号→知识点）
    <── xiaozhi-teach-assignment-designer（homeworkAssignments：作业完成情况）
    <── xiaozhi-teach-classroom-coach（interactionLogs：课堂观察）
    ──→ xiaozhi-teach-lesson-planner（weaknessRank / studentTiers）
    ──→ xiaozhi-teach-classroom-coach（weaknessRank / studentTiers）
    ──→ xiaozhi-teach-review-planner（weaknessRank / classSummaries）
    ──→ xiaozhi-teach-exam-designer（itemStats：题目质量）
    ──→ 学科教师 SKILL（xiaozhi-teach-math-error-analyzer 等，做学科错因细化）
    ··→ 若已安装独立教师包：xiaozhi-teach-lesson-log / homework-tracker 可作补充证据（可选）
```

**禁止行为**：
- 禁止预测未来分数或排名
- 禁止用单一测评给学生贴长期标签
- 禁止在公开报告中点名
- 禁止在没有数据时输出稳定趋势判断
- 禁止把班级整体偏弱归因为"学生笨"

---

## 十三、参考资源

- `references/analysis-framework.md` — 学情分析框架与模板
- `references/student-diagnosis-card-template.md` — 学生个体诊断卡填写模板
- `references/class-report-template.md` — 班级学情报告（7 段完整模板）

---

> 💡 **小智说：**
> "分数告诉你'发生了什么'，
>  学情分析告诉你'为什么发生'和'接下来该怎么办'。
>  真正有效的教学调整，
>  不是哪个学生'不行'，而是
>  哪一步设计没让他能行。"

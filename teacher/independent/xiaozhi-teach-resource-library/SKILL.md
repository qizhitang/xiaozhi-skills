---
name: xiaozhi-teach-resource-library
description: >
  把独立教师散在文件夹、微信收藏和笔记本里的讲义、题目、讲评话术、错因案例收进一个可检索的库。
  适用于老师说"帮我找一下 [X] 的讲义""有没有 [X 题型] 的题""这类错题怎么讲评""这个讲义存一下""教过的类似案例""这个教案能给别的学员用吗""资源怎么分类"。
  流程：入库时打标签与版权状态 → 按知识点/难度检索 → 改编适配后复用 → 记录用过几次、效果如何。
  本 SKILL 不出题、不备课、不批改、不联系家长——只管资源的存、找、改；AI 生成的题必须老师验算后才算入库。
compatibility: WorkBuddy / SkillHub / OpenClaw / ClawHub
license: MIT
metadata:
  display_name: 教学资源复用库
  version: 2.1.12
  author: 小智伴学
  category: 独立教师
  grade_bands:
    - 小学中段
    - 小学高段
    - 初中
    - 高中
  tags: [资源库, 讲义题库, 讲评话术, 错因案例, 教学复用, 独立教师]
  depends_on:
    - xiaozhi-teach-homework-tracker
id: openclaw:xiaozhi-teach-resource-library
min_platform_version: "2.0"
max_round_limit: 20
---

# 教学资源复用库 SKILL

> **一句话定位：** 独立教师最贵的资产不是学员名单，而是你积累的教学经验——把它从"脑子里"搬到"库里"，才算真的拥有。

---

## 技术边界

> 技术边界：本 SKILL 依赖能力 [M, F]，无该能力时按 shared/platform-conventions.md 降级。

资源库不向学员推送任何东西，只在老师检索时给出候选。学员案例入库必须完全脱敏（化名、模糊学段、去掉可识别细节），不允许反查到具体学员。

**版权**：每条资源必须有 `copyrightStatus`，取值只有 `shared/vocab.md §11` 的四档——`自有` / `改编` / `公开可引用` / `仅存索引`。**教辅原题与历年真题一律 `仅存索引`**，只记书名、页码、题号，不录入题干。禁止存储盗版扫描件与未授权转载的网络资源。

**AI 生成的题**：本 SKILL 自己不出题，但会接收其他环节生成的题。凡是 AI 生成的，`aiGenerated` 置为 true，入库时**必须**带上【AI 生成，入库前请人工验算】标注；老师逐题验算并把 `verifiedByTeacher` 置为 true 之前，这条资源不得用于学员。生成规则见 `shared/ai-item-check.md`。

---

## 一、核心使命

独立教师资源管理常见的三个误区：

```text
误区① 资源散落：讲义在电脑文件夹、题库在微信收藏、
        讲评话术在脑子里、错题案例在笔记本上，
        需要时找不到，找到时已过时。

误区② 从零开始：每个新学员/新学期都从零备课，
        之前教过的优秀案例、题库、讲评话术
        都没有积累，白白浪费。

误区③ 资源孤岛：优秀讲义、题库、讲评话术
        只在某个学员/某次课用一次，
        之后被遗忘。
```

本 SKILL 要解决的是：
- **让教学资源有"家"**：统一分类入库
- **让资源可检索**：标签化 + 关键词 + 学员匹配
- **让经验可复用**：讲义、题库、讲评话术、错因案例
- **让教学资产持续增值**：每次教学都是资源的更新机会

---

## 二、触发时机

| 触发场景 | 示例语句 |
|---------|---------|
| 资源检索 | "帮我找一下 [X 讲义]" / "有没有 [X 题型]" |
| 讲评话术 | "这类错题怎么讲评" / "讲评怎么说" |
| 学员匹配 | "[化名] 适合什么资源" |
| 案例查找 | "教过的案例" / "类似情况怎么处理" |
| 资源入库 | "这个讲义/题库/案例存一下" |
| 资源管理 | "资源怎么分类" / "教学资源库" |
| 错因案例 | "学员犯过这种错吗" / "类似错因" |
| 教案复用 | "这个教案可以给另一个学员用吗" |

---

## 三、核心流程

```text
                ┌──────────────────────────┐
                │ ① 入库                    │
                │  分类 + 版权状态          │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ② AI 生成的先验算         │
                │  aiGenerated=true         │
                │  老师验算 → verifiedByTeacher│
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ③ 打标签                  │
                │  学科/知识点/难度/学段    │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ④ 检索                    │
                │  关键词/知识点/难度       │
                └────────────┬─────────────┘
                             ↓
                ┌──────────────────────────┐
                │ ⑤ 改编适配后复用          │
                │  记来源 + 记效果          │
                └──────────────────────────┘
```

### 3.1 AI 生成题的入库门槛

```text
生成时（在别的环节）：
  按 shared/ai-item-check.md 自检——自解一遍、有解且唯一、
  条件充分不多余、数值友好、学段内、与原题同维度

到本 SKILL 入库时：
  aiGenerated = true
  verifiedByTeacher = false（默认）
  标题或 usageNotes 带【AI 生成，入库前请人工验算】

老师逐题验算后说"验过了"：
  verifiedByTeacher = true，标注可去掉

在 verifiedByTeacher 为 false 期间：
  · 检索时这条资源标灰，附一句「待验算，先别直接给学员」
  · 不进入"推荐给学员"的候选
```

**为什么卡这一道**：AI 生成的题看起来总是对的——格式规整、说法专业。真正的问题（条件矛盾、答案不唯一、超纲、数值算出无理数）要动笔算一遍才看得出来。这一道验算挡在库门口，比挡在学员面前便宜得多。

---

## 四、资源五大类

> 📎 五大类（讲义库/题库/讲评话术库/错因案例库/教案库）的用途、入库要求与入库示例，完整模板见 `references/resource-entry-examples.md`

---

## 五、标签化体系

### 5.1 多维度标签

对应 `workspace.resourceLibraryIndex[]` 的字段：

```text
┌──────────────────┬──────────────────────────────┬──────────────┐
│ 字段              │ 取值                          │ 用途          │
├──────────────────┼──────────────────────────────┼──────────────┤
│ subject          │ 数学/语文/英语/物理/…         │ 主分类        │
│ knowledgePoint   │ 一次函数图象/定语从句/…       │ 精确定位      │
│ gradeLevel       │ 年级或学段                    │ 适用筛选      │
│ difficulty       │ 基础/中等/提升/挑战（四档枚举）│ 难度匹配      │
│ resourceType     │ 题目/讲义/课件/板书/讲评话术/ │ 类型筛选      │
│                  │ 错因案例/家长话术（七档枚举） │              │
│ copyrightStatus  │ 自有/改编/公开可引用/仅存索引 │ 版权（必填）  │
│ aiGenerated      │ true / false                  │ 是否 AI 生成  │
│ verifiedByTeacher│ true / false                  │ 老师是否验算过│
│ usageNotes       │ 自由文本（≤500 字）           │ 用过几次、效果│
└──────────────────┴──────────────────────────────┴──────────────┘
```

**没有"学员类型"这个字段**。按"基础学员/拔尖学员"给资源贴适用人群，等于把学员分了层再把资源分了层，用起来看着方便，实际会让老师照着标签发题而不是照着这个孩子当前卡在哪里发题。要匹配就按 `knowledgePoint` + `difficulty` 匹配。

### 5.2 标签使用规则

```text
■ 必填
  · resourceId / title / resourceType / copyrightStatus（schema required）
  · knowledgePoint + difficulty（不填就检索不到，等于没存）

■ 推荐
  · subject / gradeLevel
  · aiGenerated（AI 生成的必须为 true）

■ usageNotes 里写什么
  · 用过几次、给什么情况的学员用过、效果如何
  · 改编来源（"改自 R-001，把出租车换成快递"）
  · AI 生成未验算时的【AI 生成，入库前请人工验算】标注
```

---

## 六、检索与匹配

### 6.1 关键词检索

```text
输入：关键词（如"一次函数复习"）
匹配：所有包含"一次函数"+"复习"的资源
排序：按相关度 / 使用频率 / 学员匹配度
```

### 6.2 按学员当前情况匹配

```text
输入：学员化名 + 当前卡住的知识点
读：workspace.studentCards[].gradeBand / .primaryWeaknesses
    workspace.homeworkFollowups[].mainErrors[].knowledgePoint / .dimension
匹配：knowledgePoint 相同 + difficulty 与当前掌握度相称 +
      gradeLevel 在该学员学段内
输出（每条标明为什么推荐它）：
  · [资源标题]（[类型]，[难度]）
    推荐理由：针对 [知识点] 的 [dimension]，上次给 [场景] 用过
    ⚠️ 待验算：aiGenerated=true 且 verifiedByTeacher=false 的标出来

不做的事：
  ❌ 按"这是基础学员"整批推荐一组资源
  ❌ 推荐超出该学员 gradeBand 的内容（要用就标 ⚠高中 并说明是拓展）
```

### 6.3 错因案例检索

```text
输入：通用四维之一（概念模糊 / 计算失误 / 读题失误 / 方法用错，
      见 shared/vocab.md §1）
匹配：resourceType=错因案例 且 knowledgePoint 或维度相符的条目
输出：
  · 案例描述（已脱敏，不含任何可识别到具体学员的细节）
  · 当时的应对动作
  · 效果记录（写事实，不写"效果很好"）
```

---

## 七、复用与改编

### 7.1 复用流程

```text
第 1 步：检索资源
  · 基于当前需求（学员画像/学情）检索
  · 找到 1-3 个候选资源

第 2 步：评估匹配度
  · 难度匹配？
  · 知识点匹配？
  · 学员类型匹配？

第 3 步：调整适配
  · 修改参数（数字/情境）
  · 调整难度
  · 添加学员特定元素

第 4 步：使用并记录
  · 标记"复用自 [资源 ID]"
  · 记录使用效果
  · 反馈到资源库
```

### 7.2 改编原则

```text
■ 改数（参数）
  原题 y=2x+1 → 改编 y=3x-2
  适合：同一知识点不同参数
  ⚠️ 改完必须重算一遍：换个系数就可能算出无理数或负人数

■ 改问（设问角度）
  原题"求 X" → 改编"判断 X 是否正确"
  适合：换角度测同一概念

■ 改情境（背景）
  原题"出租车" → 改编"网约车"
  适合：让题目更贴近学生生活
  ⚠️ 换情境要检查量纲还合不合理（速度、单价、人数）

■ 改综合度
  单知识点 → 多知识点综合
  适合：检验综合应用
  ⚠️ 改成综合题后不再与原题同型，不能再当"同类题"用于弱项验证

改编后一律按 shared/ai-item-check.md 复核：自解一遍、有解且唯一、
条件充分不多余、数值友好、学段内。改编件的 copyrightStatus 记 `改编`，
usageNotes 里写清原出处与改动点。
```

### 7.3 复用记录

复用记录**不单独建表**，直接写进 `workspace.resourceLibraryIndex[].usageNotes`（≤500 字符）。一行一次，累积成这条资源的使用史：

```text
usageNotes 写法（**只记资源本身的使用情况，不记学员**）：
  用过 2 次 | 效果：1 次需提示、1 次直接做对 | 下次配纯净版再试
  → 不写学员化名、日期、分数、个体弱项。个体层面的记录在 lessonLogs / homeworkFollowups 里已经有，
    靠 resourceId 关联即可；把它们再抄一遍进 usageNotes，会在一条自由文本里累积成准可识别的学员画像
  改自 R-001（把出租车情境换成快递），已重算
  【AI 生成，入库前请人工验算】← 验算后删掉这一行

写事实，不写"效果很好""这题很经典"——
后者三个月后回头看，等于什么都没说。
超过 500 字符时保留最近几条，旧的合并成一句"此前用过 N 次"。
```

---

## 八、版权管理

### 8.1 资源版权分类

四档取值来自 `shared/vocab.md §11`，本 SKILL 不另设分类。

```text
✅ 自有
  老师自己写的
  完整存储

✅ 改编
  基于某资源改编
  必须在 usageNotes 标注"原出处 + 改了什么"

✅ 公开可引用
  教材例题、明确开放授权（如 CC 协议）的资源
  完整存储，标注来源

⚠️ 仅存索引
  **教辅原题与历年真题一律归这一档**，没有例外
  只记书名/卷名、页码、题号，不录入题干、不存扫描件
  检索时给出"在哪本书第几页"，老师自己去翻

❌ 禁止入库
  未授权的教辅原题题干
  盗版扫描件、拍照件
  未授权转载的网络资源
```

**为什么真题也只存索引**：历年真题的汇编本同样有版权，"大家都在用"不构成授权。存索引不影响使用——老师手上有那本书，需要时按页码翻到即可；存题干则是在自己的库里做了一份未授权复制件。

### 8.2 版权标注模板

> 📎 完整模板见 `references/copyright-annotation-template.md`（四档 copyrightStatus 的版权信息填写模板）

---

## 九、案例脱敏规则

### 9.1 必脱敏字段

```text
■ 必脱敏
  · 真实姓名 → 化名
  · 学校名称 → "某公立/民办学校"
  · 年级 → 模糊（"初中学员"）
  · 家长身份 → 移除
  · 家庭住址 → 移除
  · 联系方式 → 移除

■ 可保留（用于案例分析）
  · 学科
  · 知识点
  · 错因
  · 应对动作
  · 效果数据
```

### 9.2 脱敏检查清单

```text
□ 学员姓名已替换为化名
□ 学校名称已模糊化
□ 年级已模糊化（"初中学员"等）
□ 家长身份信息已移除
□ 家庭住址已移除
□ 联系方式已移除
□ 案例描述不含可识别细节
□ 案例分析基于错因/方法/效果而非具体人
```

---

## 十、持续更新机制

### 10.1 入库时机

```text
■ 必入库时机
  · 学员试讲课讲义通过后
  · 优秀作业讲评案例
  · 重要错因突破案例
  · 阶段性测评优秀试卷
  · 复习规划方案

■ 选入库时机
  · 课堂过渡话术
  · 家长沟通案例
  · 学员进步转折点
```

### 10.2 资源使用反馈

```text
每次使用资源后：
  · 标记使用次数
  · 记录使用效果
  · 标记"使用频率高"或"待改进"

→ 资源库排序基于实际使用效果
→ 高频高质量资源进入"我的最爱"
→ 低频低质资源进入"待优化"或"归档"
```

### 10.3 资源生命周期

```text
新入库 → 试用 → 优化 → 成熟 → 经典
  ↓
  归档（如过时/淘汰）
```

---

## 十一、接口

### 11.1 数据流

```text
  老师说"这个存一下" ──→ ┌────────────────────┐ ──→ 检索结果（带推荐理由）
  老师说"帮我找…"   ──→ │ resource-library    │ ──→ 改编后的资源
                        │ （本 SKILL）         │
                        └─────────┬──────────┘
                                  │ 只写这一处
                          resourceLibraryIndex[]
```

本 SKILL 不需要任何 SKILL 先跑，也不向任何 SKILL 推送。老师需要资源时来找，找到了自己拿走用。

### 11.2 读写字段

```text
读：
  workspace.studentCards[].alias / .gradeLevel / .gradeBand /
      .subjects / .goals / .primaryWeaknesses
                          → 匹配资源用（按知识点与难度，不按"学员类型"）
  workspace.homeworkFollowups[].mainErrors[].knowledgePoint / .dimension
                          → 按当前错因找对应的题与讲评话术
  workspace.lessonLogs[].completedContent / .nextLessonFocus
                          → 找下节课要用的材料

写（唯一写入处）：
  workspace.resourceLibraryIndex[].resourceId
  workspace.resourceLibraryIndex[].title
  workspace.resourceLibraryIndex[].resourceType   （七档枚举）
  workspace.resourceLibraryIndex[].subject
  workspace.resourceLibraryIndex[].gradeLevel
  workspace.resourceLibraryIndex[].knowledgePoint
  workspace.resourceLibraryIndex[].difficulty     （四档枚举）
  workspace.resourceLibraryIndex[].copyrightStatus（四档枚举，必填）
  workspace.resourceLibraryIndex[].aiGenerated    （AI 生成的必须 true）
  workspace.resourceLibraryIndex[].verifiedByTeacher（老师验算后才 true）
  workspace.resourceLibraryIndex[].usageNotes     （用过几次、效果、改编来源）

派生视图（不落库）：
  · 匹配结果   ← resourceLibraryIndex[] 与 studentCards[] / mainErrors[] 实时比对
  · 使用统计   ← 运行时聚合；要留痕就写进 usageNotes，不新增字段

不写：
  · 题干原文（copyrightStatus=仅存索引 的资源只记出处）
  · 任何学员可识别信息（案例一律脱敏）
```

### 11.3 谁来读

`xiaozhi-teach-solo-dashboard` 只读 `resourceLibraryIndex[]` 做展示。若装有教师通用包，备课、作业设计、命题类 SKILL 可以来检索本库；未安装时本库对独立教师日常照常可用。任何一方取走 `verifiedByTeacher=false` 的资源，都要带上【AI 生成，入库前请人工验算】的标注。

---

## 十二、字段级高敏信息防护

```text
✅ 可存储：化名案例、自有内容、改编件、公开可引用资源
❌ 禁止：未授权教辅原题的题干、盗版扫描件、未授权转载
✅ 案例可保留：学科/知识点/错因维度/应对方法/效果事实
❌ 不保留：真实姓名/学校/家长信息/家庭住址/联系方式
✅ 检索基于：知识点、难度、类型、关键词
❌ 检索不支持：反查具体学员（"这条案例是谁"）
```

---

## 十三、行为准则

| ✅ 应该做 | ❌ 不能做 |
|---------|---------|
| 入库即填 knowledgePoint + difficulty | 存了不打标签，等于没存 |
| 案例入库前逐条脱敏 | 真实学员案例直接入库 |
| 教辅/真题一律仅存索引 | 把题干抄进库里 |
| AI 生成的标 aiGenerated | 混进库里看不出是 AI 写的 |
| 老师验算后才 verifiedByTeacher | 未验算就发给学员 |
| 改编后重新验算一遍 | 改完数字直接用 |
| 用过之后写进 usageNotes | 用了不留痕，下次重新判断 |
| 按知识点 + 难度匹配 | 按"基础学员/拔尖学员"整批推 |

---

## 十四、与其他 SKILL 的协同清单

```text
教学资源复用库（自成闭环，不需要前置 SKILL）
    读 workspace.studentCards[]        ← student-intake 写
    读 workspace.homeworkFollowups[]   ← homework-tracker 写
    读 workspace.lessonLogs[]          ← lesson-log 写
    写 workspace.resourceLibraryIndex[] ← 本 SKILL 唯一写入方

  其他 SKILL 需要资源时直接读 resourceLibraryIndex[]，本 SKILL 不推送。
  若装有教师通用包，备课/作业/命题类 SKILL 可来检索；未安装不影响使用。
```

**禁止行为**：
- 禁止存储未授权教辅原题的题干或扫描件
- 禁止学员案例不脱敏入库
- 禁止入库不填 `copyrightStatus`
- 禁止 `verifiedByTeacher=false` 的 AI 生成题用于学员
- 禁止通过资源库反查具体学员
- 禁止向学员推送资源

---

### 隐私与数据控制入口
- 查看：「查看我的[资源库记录]」
- 更正：「更正我的[资源库记录]」
- 删除：「删除我的[资源库记录]」（删除后不可恢复，会先确认一次）
- 暂停：「这次不要记忆」/「暂停提醒」
- 共享控制：「不要共享给其他SKILL」/「不要给家长看」
- 导出：「导出我的[资源库记录]」（以文本形式给出，便于转存）

学员/家长要求删除该学员相关数据时，一并检查资源库里的错因案例，把涉及该学员的条目删除或进一步脱敏。

**校验要求**：案例类资源入库前须完成脱敏检查（§9.2）；跨 SKILL 共享前须确认 `consent.crossSkillSharing` 为 true。真实姓名、联系方式、学校信息一律不写入（详见 `SECURITY_BASELINE.md`）。

---

## 十五、参考资源

- `references/resource-categorization.md` — 资源分类、标签与检索
- `references/resource-entry-examples.md` — 五大类资源的用途、入库要求与示例
- `references/copyright-annotation-template.md` — 版权标注模板
- `shared/vocab.md` — 版权四档、错因四维（唯一来源）
- `shared/ai-item-check.md` — AI 出题自检协议

---

> 💡 **小智说：**
> "独立教师的核心壁垒不是'我能教'，
>  是'我教过 1000 个学员，每个都不一样，但我都记得'。
>  当你把这些经验和素材沉淀到资源库，
>  你的第 1001 个学员不用再走弯路。
>  教学资源库是独立教师的'第二大脑'——
>  你不会累，不会忘，不会因为今天状态不好就教错。"

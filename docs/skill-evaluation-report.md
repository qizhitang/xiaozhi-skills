# 小智伴学 K12 SKILL 库 · 体系化评估与优化报告

> 评估日期：2026-07-07 ｜ 范围：全库 58 个 SKILL（学生端 32 + 老师端 26）+ 4 份文档 + 4 份 JSON Schema
> 评估视角：教育学 · 教育心理学 · K12 学科教学 · Agent Skills 设计最佳实践 · 实操性与可落地性
> 方法：逐一通读全部 58 份 SKILL.md、抽查全部 references 与 schema，交叉核对文档一致性；关键缺陷均已人工复核（附 `文件:行号` 证据）

---

## 0. 一句话结论

**这套 SKILL 的教育学设计与协作架构显著高于市面"提示词合集"水准**——授权与隐私主权、置信度标签、成长型思维、苏格拉底不给答案、错因维度契约、状态机工程化都是真亮点。**但工程收尾与"可落地性"是全局短板**：核心数据契约（学习DNA schema）曾是坏 JSON、约 30 个 references 悬空或成孤儿、schema 与 SKILL 的枚举四处互不兼容、多处学科硬伤会直接讲给学生、"主动提醒/定时/跨会话记忆"等立身卖点缺降级路径、且部分 SKILL 违反自家安全基线。**问题绝大多数是"收尾"而非"设计"，可在数天内系统性清零。**

---

## 1. 已实施的修复（本次已改并验证）

### 1.1 机械修复（零判断风险）
| 修复 | 影响 | 验证 |
|------|------|------|
| 品牌回退 `🦞 小龙虾说` → `💡 小智说` | 11 个 SKILL.md | 全库 `小龙虾` 出现次数 11 → 0 |
| 修复损坏的核心 schema：`dna-profile.schema.json` 第 5 行补逗号 | 1 文件 | `json.load` 由报错 → 通过（3 个 schema 全部通过校验） |

### 1.2 引用图谱修复（P1-7，已清零）
| 动作 | 数量 | 说明 |
|------|------|------|
| 删除真正悬空的"待补"引用行 | 27 行 | 引用了不存在文件的行（内容多已内联） |
| 移除误标的"（待补）"（文件实际存在） | 8 处 | 如 `questioning-strategies.md`、`homework-status-template.md` 等，渐进披露恢复 |
| 监听 stub 反转修复 | 3 文件 | 删除两个 10 行占位 stub，将 499 行真内容 `listening-topic-templates.md` 接线到两处引用 |
| 删除 stale 重复文件 | 5 文件 | `speaking-resources.md` + 4 个独立教师 stub 模板（均被完整版兄弟文件取代） |
| 孤儿文件接线 | 5 文件 | grammar-error-library / vocabulary-radar-topics / cross-subject-connections / detective-project-template / interest-exploration-template |
| 跨技能引用自包含化 | 2 文件 | 复制 chinese-error-dimension-table.md、physics-diagram-guide.md 到请求方 references；修正 correction-notebook 的 `../` 相对路径 |

**结果**：本地悬空引用 30 → 0；孤儿文件 11 → 0（仅剩 2 处跨技能共享 schema 引用，均为合法 `../` 相对路径）。

### 1.3 学科硬伤勘误（P0-2 / P0-3，已订正）
| 位置 | 修复 |
|------|------|
| 文言诵读节奏（classical-guide SKILL + recitation-rhythm-guide） | 四言 2+2 / 五言 2+3 / 七言 2+2+3（原"2+2+2+3"等音节数不成立） |
| 文言史实（classical-author-profiles） | 密州"自请外任"非"被贬"；"怀民亦未寝"（非"都睡了"）；刘备卒于 223、上表 227 为"四年"（非六年）；《将进酒》约 752；"六出祁山"标注演义说法 |
| 词类活用（classical-guide 5.4） | "吾师道也"归"名词作动词"；补正确的动词作名词/名词作动词例；虚词"乎"例句、断句重复"矣"订正 |
| 物理五大观念（physics-lesson-planner SKILL + concepts-map） | 改为课标口径：四大核心素养 + 物理观念三维度（物质/运动与相互作用/能量）；"演化观"降为拓展并标注 |
| 物理学段越界（modeling / lab-coach / socrates-guide / error-dna） | 匀变速三方程、v-t 图面积、全反射/临界角、加速度/位移子类型均加"⚠高中拓展"标注；modeling 不再宣称"覆盖初中 80%" |
| 英语关系词判断法（grammar-patterns） | 改为"看从句缺主语位还是宾语位"；删除误列的 `talk to/with` 错误搭配 |
| 病句分类（grammar-tracker） | 补齐考纲"结构混乱（句式杂糅）"；修正"增加/降低+水平"自相矛盾；"虽然…但是"关联词误用改因果 |
| 数学（word-problem / concept-explainer） | 浓度题核心关系改为"溶质守恒"（不再窄化为"加水不加溶质"）；负负得正补"边界+规律法"说明 |
| 物理实验（experiment-coach / lab-coach） | "探究欧姆定律"改为不预告结论的控制变量探究；"伏安法测电阻"从等效替代法改归间接测量法 |

> 说明：物理概念图谱（physics-concepts-map）的深层五维→三维**结构性重构**、以及英语 CEFR→CSE 对标、作文 12 分制→中高考映射等涉及内容再创作或产品判断，仅做了定性订正与标注，完整改造保留在下方路线图。

### 1.4 学习DNA 数据契约深修（原路线图阶段一①，已完成）
| 动作 | 说明 | 验证 |
|------|------|------|
| 新增 `conceptGraph` 结构 | nodes(nodeId/conceptName/subject/masteryLevel) + edges(sourceNodeId/targetNodeId/relationType) | 与 handover-protocol 的 `profileData.graphUpdates` 对齐，SKILL §5.4 概念图谱终于有落地存储 |
| 弃用旧 `knowledgeAccumulationTree` | description 标注"已由 conceptGraph 取代，仅向后兼容" | 不破坏既有数据 |
| 掌握度词表统一 | conceptGraph 用"会复述/会解释/真正掌握"三档；SKILL §5.4 示例"基本理解"→"会解释" | 与 feynman/handover 一致 |
| 打通 CI 校验 | `npm i ajv ajv-formats` + `node validate.js` | ✅ schema 编译通过、示例通过、非法数据正确拒绝 |

### 1.5 危机转介 + 安全基线落实（原路线图阶段一/二 5，已完成主体）
| 动作 | 说明 |
|------|------|
| 新建危机识别与转介协议 | `learning-dna/references/crisis-referral-protocol.md`：自伤/霸凌/轻生等信号的识别→停止低敏转化→提示监护人→专业求助渠道（110/120、心理热线）→档案只留处置事实 |
| 危机例外接线 | learning-dna §6.5、weekly-review 家庭版均加"⚠️危机例外（最高优先级，先于低敏转化）"条款并引用协议 |
| 移除违规措辞 | 全库 47 处"必须激活此SKILL"→"建议激活此SKILL"（SECURITY_BASELINE §2 禁止项，已清零） |
| 补隐私控制入口 | 8 个独立教师 SKILL 各加"隐私与数据控制入口"节（查看/更正/删除/暂停/取消共享 + consent 校验要求） |
| 修正 intake 最小化矛盾 | student-intake 必收字段：出生年月/紧急联系人降为可选并加监护人同意说明，与"最小化"声明一致 |

### 1.6 枚举统一 + 机械清理（原路线图阶段二 5 / 阶段四，已完成主体）
| 动作 | 说明 |
|------|------|
| 四组枚举以 schema 为准统一 | `masteryStatus`（lesson-log 三档→schema 五档）、作业状态（schema 英文→中文七档，SKILL 对齐）、`copyrightStatus`（schema 补"改编"，resource-library 英文→中文）、`scenario`（parent-communication 4 粗类→6 枚举加映射说明） |
| 补 schema 字段级防护 | 为 `nextLessonFocus/task/nextAction/actionSuggestion/description/usageNotes` 补 `maxLength:500`（SECURITY_BASELINE §5 要求） |
| VAK 学习风格移除 | student-intake 及其 reference 的"听讲型/视觉型/动手型"改为基于证据的"讲解/节奏偏好"，并注明 VAK 无科学依据、不作分型标签 |
| 文档一致性订正 | README"35 步"→"40 步"；installation-guide 老师端三包 v0.1.0→v1.0.0；changelog 修正 dashboard 5 类风险（缺课/作业拖延/测评退步/家长沉默/课时耗尽）与 renewal 三段式（事实/进步/计划）以对齐源码 |
| 引用防回归 CI 脚本 | 新增 `scripts/check-references.mjs`：校验 SKILL↔references/schemas 引用完整性（悬空+孤儿），当前 84 个 SKILL 文件全部通过；可接入 CI 门禁 |
| 伪科学措辞订正 | review-planner"基于艾宾浩斯遗忘曲线"→"基于间隔复习与提取练习"；ebbinghaus-schedule 保留率标注为示意经验值并修正 1 周/1 月同为 21% 的矛盾 |

---

## 2. 系统性问题（按严重度排序）—— 这是最该先看的部分

### 🔴 P0-1 长期记忆数据契约整体不可用
学习DNA 是 12 个通用 SKILL 及全部学科 SKILL 声称"写回/共享最小字段"的地基，但：
- `dna-profile.schema.json` 曾是**非法 JSON**（已修）；`validate.js` 还缺 `ajv` 依赖，CI 从未真正跑通。
- 更深的问题：正文 §5.4"跨学科概念图谱"用 `conceptGraph/nodeId/relationType(requires/isParentOf/appliesTo/correlatesWith)`，而 schema 里只有 `knowledgeAccumulationTree(linkType:概念相同/逻辑相似/…)`——**写入的数据在 schema 里无处落地**（`learning-dna/SKILL.md:205-239` vs `schemas/dna-profile.schema.json:585-627`）。
- `handover-protocol.schema.json` 的 `profile_writeback.graphUpdates` 同样无对应存储结构（`:99-121`）。
- 掌握度词表三套并存：正文"真正掌握/基本理解" vs 费曼"会复述/会解释/真正掌握" vs handover。
- **后果**：所有"跨 SKILL 数据流"目前是纸面契约，无可执行、可校验的落地结构。

### 🔴 P0-2 学科内容硬伤（会被直接讲给学生/老师）
| 位置 | 错误 | 应为 |
|------|------|------|
| `teacher/.../chinese-classical-guide/SKILL.md:157-161` | 诵读节奏"四言=2+2+2+3、五言=2+2+3、七言=2+2+2+2+3"（音节数与句长根本不符，四言竟拆出 9 拍） | 四言 2+2、五言 2+3、七言 2+2+3 |
| `student/.../classical-revival/.../classical-author-profiles.md:17,133` | 《水调歌头》"被贬密州第五年"（密州是**自请外任**非贬谪；且到任不足两年） | "离京外任第五个年头"，删"被贬" |
| 同上 `:28` | 《记承天寺夜游》角色扮演"去找老友，但他们都睡了" | 原文"**怀民亦未寝**"，二人皆未眠 |
| 同上 `:111` | 《出师表》"刘备已死六年" | 刘备卒 223、上表 227，为**四年** |
| `teacher/.../physics-lesson-planner/SKILL.md:126-140` | "五大物理观念：物质观/运动观/能量观/相互作用观/**演化观**"——混淆课标层级、杜撰"演化观"、且略去另 3 项素养 | 2017/2020 课标核心素养为四方面（物理观念/科学思维/科学探究/科学态度与责任）；"物理观念"下位仅 3 项 |
| `student/.../english-grammar-coach/.../grammar-patterns.md:184-198` | 关系词成分判断法逻辑错误（正常宾语从句也会判为"不完整"） | 见路线图订正写法 |
| `student/.../chinese-grammar-tracker` | 病句六类**丢掉"结构混乱（句式杂糅）"**，杂糅句被误归"赘余" | 补齐考纲六类 |
| `teacher/.../physics-experiment-coach` | "探究欧姆定律"归探究性却直接给出 I=V/R 结论 | 实为验证性 |
| `teacher/.../chinese-classical-guide:241-257` | 词类活用 4 例错 2 例（"吾师道也"误标动词作名词） | "师"为名词作动词 |

### 🔴 P0-3 物理学生端系统性混入高中内容
modeling-coach 宣称"覆盖初中物理 80%"，却把**匀变速三方程（v=v₀+at 等）、加速度、位移、动量守恒**列为核心模型（`SKILL.md:114-186`）；lab-coach 的 v-t 图面积求位移（`:137`）、error-DNA 的加速度/位移子类型、socrates-guide 的全反射/临界角（`:329`）反复出现——均为高中必修内容，与全库"仅八/九年级"学段适配表**自相矛盾**，直接损害可执行性与信度。

### 🟠 P1-4 Schema 与 SKILL 未同源维护 → 跨 SKILL 数据流断裂
- 独立教师 8 SKILL 的"接口"章节用**虚构 camelCase 点路径**（`soloDashboard.lessonHours`、`lessonLog.masteryDelta`、`renewalReport.factSection`…），schema 里全不存在。
- 四组枚举 SKILL 与 schema **取值互不兼容**：`masteryStatus`（lesson-log 三档 vs schema 五档）、作业状态（五个中文 vs schema 六个英文 `assigned/submitted/…`）、`copyrightStatus`（含"改编/adapted" vs schema 无此档）、`scenario`（4 类 vs schema 6 类）。
- **后果**：按 SKILL 生成的值写入会被 `additionalProperties:false + enum` 拒绝；dashboard 风险③（`需要重讲`）因词表不符**永不触发**。

### 🟠 P1-5 "双版本 SKILL.lite.md"机制在官方规范下不成立
26 个老师端 SKILL 各带一份 `SKILL.lite.md`（`type:lite`、`size_limit:4KB`），但：**全部缺 `description` 字段**、`name` 与全版**完全相同**。Anthropic Agent Skills 靠 `name+description` 进上下文并被发现——重名冲突、缺 description 则不可发现，lite 要么触发不可达、要么与全版争抢触发。更糟的是 lite 与全版**已实质漂移**（exam 目的"展示性" vs 正文"选拔性"、student 诊断卡字段错配、assignment 难度百分比错抄、review 新知识节奏冲突），属"错抄"而非"精简"。

### 🟠 P1-6 平台能力假设无降级路径
"主动定时推送"（im-reminder）、"精确计时/被动统计会话时长"（time-focus 番茄钟）、"确定性多 Agent 编排"（skill-coordinator）、"音素级发音评估"（english-speaking）、"TTS+语速控制"（english-listening）、"拍照 OCR"（数理解题）——这些是多个 SKILL 的**立身卖点**，纯 LLM+IM 环境无法自主成立，多数只做能力声明、**未给平台不具备时的降级方案**，会静默失效。（正面样板：`vocabulary-dna` 对 OCR、`learning-dna` 对记忆机制均有边界声明。）

### 🟠 P1-7 引用完整性系统性崩坏
- **约 30 处悬空引用**（SKILL.md 引用的 references 文件不存在，多标注"待补"）：assignment/classroom/exam/lesson-planner/review-planner/student-analyzer 各 2 个；独立教师 8 SKILL 合计约 17 个；physics-error-dna→physics-diagram-guide.md（文件其实在 problem-coach 目录，相对路径落空）等。
- **11 个孤儿 references**（存在但 SKILL.md 从不引用）：listening-topic-templates.md（499 行真内容，反被两个 10 行 stub 顶替）、vocabulary-radar-topics.md（325 行）、grammar-error-library.md、speaking-resources.md、cross-subject-connections.md、interest-exploration-template.md、detective-project-template.md、及 4 个独立教师模板。
- **后果**：渐进披露的前提是"SKILL.md 是可靠目录"，目前约 1/3 的 reference 资产对 agent 不可见或指向空壳。

### 🟠 P1-8 未成年人保护与自家安全基线未落实
- **违反自家 `SECURITY_BASELINE.md`**：§2 明列"必须激活此SKILL"为禁止写法，但独立教师 8 SKILL **全部**使用；§3 要求的查看/更正/删除/暂停/取消共享控制入口，这 8 个涉档案 SKILL **无一提供**。
- `student-intake` 边界声称"仅收化名"，§4.1 却**必收**"真实姓名首字+出生年月+紧急联系人"——对未成年人属可识别/敏感信息，与 PIPL"未成年人敏感信息需监护人单独同意"抵触（`SKILL.md:34` vs `135-143`）。
- `consent.crossSkillSharing`（默认 false）无任何 SKILL 在跨 SKILL 共享前校验。
- **全库缺统一危机转介机制**：learning-dna 情绪维度与 weekly-review 家庭版都把重度焦虑/低落做"低敏温情转化"给家长，却无自伤/霸凌/抑郁的识别→升级→转介监护人/专业通道，低敏化在极端情形下**可能掩盖真实求救信号**。（唯一正例：time-focus 对疑似 ADHD 建议转专业评估。）

### 🟡 P2-9 教育学细节：伪科学与伪精确
- **VAK 学习风格**（"听讲型/视觉型/动手型"，`student-intake:245`）——已被学界广泛证伪，却写入 `schema.learningPreferences` 长期固化。
- **注意力曲线**（classroom-coach"0-10 高度集中/10-25 分散"分钟级递减）——严谨研究证据薄弱。
- **伪精确数据以事实口吻呈现**：艾宾浩斯保留率精确到个位百分比（且 1 周与 1 月都标 21% 自相矛盾）、发音发生率"几乎100%/约70%"、"记得深十倍"、"低估分心 40%/自评偏差 30%"——均无出处。
- **"苏格拉底提问链"实为 Bloom 阶梯**（预写六层问题，非追问学生自身推理链），概念错标。
- **"基于艾宾浩斯遗忘曲线"仅作营销标签**（review-planner 正文实为间隔+提取练习，未落地为间隔算法）。

### 🟡 P2-10 课标话语体系过时
lesson-planner 及全库教师端以 **2001 实验版"三维目标"**（知识与技能/过程与方法/情感态度价值观）为核心目标模型；2022 版义务教育课标已转向**核心素养**导向。作为教案入口向一线教师输出过时框架。英语端未对标《中国英语能力等级量表(CSE)》且 CEFR-学段对标偏高（"B2=高中毕业"实际约 B1/CSE4-5）。

### 🟡 P2-11 职责重叠与依赖成环
- `exam-designer ↔ student-analyzer` **循环 depends_on**（互指，无拓扑加载顺序）。
- 学科专项 vs 通用版关系不统一：`math-lesson-planner` 是良性细化，但 `math-exam-designer` **删掉了通用版的 P 值/区分度/选拔性**（数学老师用专项版反而更弱）、`english-assessment` 误 `depends_on: math-exam-designer`（copy-paste 错）。
- 错因分类全域碎片化：学生端 math 4 类、teacher math 7 类、physics-lesson 4 类、physics-problem 8 类，互相声称写数据却无映射表。
- 家长消息三处生成（lesson-log/parent-communication/renewal-report）；风险学员两套阈值（solo-dashboard vs homework-tracker）。
- 跨学科子类型编码冲突：`C` 在数学=计算、在物理=概念；`R` 在数学=读题、在物理=过程。

### 🟡 P2-12 Token 经济与非标 frontmatter
- 学生端 SKILL.md 普遍 300-640 行，教师端 474-735 行，大量样板段（边界声明/字段防护/行为准则/协同清单/学员档案模板）近乎逐字重复内联，未下沉 references。
- frontmatter 塞入 `display_name/version/author/category/tags/compatibility/depends_on/id/min_platform_version/max_round_limit/type/size_limit` 等非官方字段；官方仅 `name+description` 入上下文，`depends_on` 承载了数据契约却不会被官方运行时强制。
- `description` 普遍冗长并塞满"必须激活/务必调用"，抬高常驻上下文成本、易致多技能过度触发。

### 🟡 P2-13 文档一致性
- **版本号三处打架**：SKILL frontmatter=1.0.0，README/changelog 称 v1.1 全量交付，installation-guide 上架处老师端三包仍标 v0.1.0。
- **步数不一致**：README 称"35 步"，installation-guide 称"40 步"。
- **changelog 与源码不符**：dashboard 5 类风险、schedule 冲突三类、renewal 三段式等能力概述被改写（如 renewal 写成"进步/不足/建议"，源码为"事实/进步/计划"）。

---

## 3. 分维度评估

### 3.1 教育学
**强**：苏格拉底"不给答案"在两套数理四步法状态机所有分支一致贯彻（未发现泄题漏洞）；费曼 ZPD 支架渐退+情绪熔断；过程写作法（不代写红线）；成长型思维（薄弱点写成"待解锁成就"）；project-based 跨学科侦探周；差异化教学 A/B/C。
**弱**：三维目标话语过时（应升核心素养）；A/B/C 按达成率固定切分有标签化隐患；"苏格拉底提问链"名不副实；学段适配在物理端形同虚设（混入高中内容）。

### 3.2 教育心理学
**强**：置信度标签体系（🟢/⚠️/🔴）对抗小样本盲信；SDT 内在动机（interest-explorer 明确规避 overjustification、点名 The Dip）；间隔重复+提取练习（词汇 DNA 五轮、检索练习）；建设性错误处理（IM 提醒对未完成不批评只回退，只温柔补发一次）；焦虑处理用"数据替代情绪"。
**弱**：VAK 学习风格伪科学；注意力曲线伪科学；伪精确统计以事实口吻呈现；**缺危机转介机制**（最需补的一环）。

### 3.3 K12 学科教学
**强**：语文阅读（文本三解+6 策略显性教学+群文）、英语口语（TBLT/i+1/recast/流利优先）、数学教案（概念建构四步/变式三型，真正的继承细化）、物理解题（五步法样板计算全部正确，含"先判断是否停下"陷阱）。
**弱**：见 P0-2 学科硬伤清单、P0-3 学段越界、P2-11 错因碎片化；作文自建 12 分制与中高考评分标准无映射；CEFR 对标偏高、缺 CSE。

### 3.4 Agent Skills 设计最佳实践
**强**：错因维度表（五维×子类型 ID+交叉判定+防重复）是罕见的真正可执行的多 SKILL 数据契约；状态机文件（mermaid+进入/退出/断点恢复+JSON 持久化字段）把教学流程落成工程规格；description 普遍做到"做什么+何时触发+触发语"。
**弱**：双版本 lite 机制不成立（P1-5）；非标 frontmatter 堆叠（P2-12）；引用图谱崩坏（P1-7）；SKILL.md 超长、渐进披露打折。

### 3.5 实操性与可落地性（全局最弱维度）
**强**：teacher workspace schema 的字段级纵深防御（parentSummary/factSummary 的 maxLength+禁止项 description）；lesson-log 诚实标注"事后回忆准确度有限"；solo-dashboard 风险标记基于客观字段可追溯。
**弱**：数据契约不可执行（P0-1、P1-4）；平台能力无降级（P1-6）；持久化"由谁创建/存哪"从未定义；手工数据录入负担（学情个体诊断卡需逐生逐周填缺课/作业率/专注度）；学生每日提醒总量无预算/合并策略；财务/收款维度缺失（独立教师运营闭环不完整）。

---

## 4. 值得保留并推广的亮点

1. **隐私与用户主权**：learning-dna 的明确同意 + 最小化 + 查看/更正/删除/暂停/停共享五类可执行控制；情绪维度默认关闭需单独授权（`emotionTrackingConsent`）——远超同类产品。
2. **置信度标签体系**贯穿 DNA/预警/黄金时段/兴趣判断。
3. **错因维度表 + 通用层↔学科层纵向去重协议**（交接/映射/回写/去重/报告边界五段式）——可作为一切"职责重叠"场景的模板。
4. **状态机工程化**（writing-5step、morning-warmup、photo-4step）。
5. **transparent 边界意识**：每个教师端开头"技术实现边界声明"（AI 不代批/不预测分数/无学情降级为基础版）。
6. **物理"图景优先"铁律 + physics-analogy-bank 明确教授类比失效边界（水≠电）**——类比教学最佳实践，应被 math-concept-explainer 照搬。
7. **续费/家长沟通伦理**：事实+进步+计划三段式、禁承诺提分、体面处理流失、禁攀比、情绪问题转介专业心理。

---

## 5. 优化路线图（按投入产出比排序）

### 阶段一：红线清零（已完成 ✅）
1. **修复学习DNA 数据契约**：✅ 已完成（见 §1.4）——schema JSON 已修、conceptGraph 已加并与 handover 对齐、旧 tree 弃用、掌握度统一、validate.js 已跑通。
2. **学科硬伤勘误专项**：✅ 已完成（见 §1.3）。
3. **物理端初中课标审计**：✅ 已完成——全部高中越界点已加"⚠高中拓展"标注：modeling 模型一（匀变速）/模型三（动量）/机械能守恒方程、lab v-t 图、socrates 与 analogy-bank 的全反射/折射率(n=sini/sinr)/透镜成像公式(1/f=1/u+1/v)、confusion-map 加速度、math-tools v-t 图、diagram-guide 折射率/全反射（两份副本）。
4. **引用图谱修复**：✅ 已完成（见 §1.2，悬空/孤儿清零）；防回归 CI 脚本已就位——`scripts/check-references.mjs`（校验 58 个 SKILL 的悬空引用与孤儿文件，当前全绿，见 §1.6）。

### 阶段二：可落地性补强（文件层全部完成 ✅；仅 consent 运行时校验属平台层）
5. **以 schema 为唯一契约重写接口**：✅ 已完成——四组枚举统一、schema maxLength 补齐、consent 校验要求（见 §1.6）；8 个独立教师 SKILL"接口"章节的虚构 camelCase 点路径已全部重写为真实 `workspace.<实体>[].<字段>` 读写清单：能落库的对应真实字段（如 lessonLog.lessonHours→`coursePackageLedger[].usedUnits/remainingUnits`）、实时计算值标注"派生视图（非存储字段，注明来源）"（completionRate/riskFlag/errorTendency/masteryDelta/conflictReport 等）、报告文本标注"生成的报告段落"（renewal 三段式等）；solo-dashboard 经核实本就使用真实字段无需改动。
6. **补平台能力降级路径**：✅ 已完成——为 8 个依赖平台能力的 SKILL 补"无平台能力时的降级路径"：im-reminder（定时→进入会话补发队列）、time-focus（计时→用户自报）、听力（TTS→分段文本+朗读的"读力"版）、口语（音素评估→文字复盘/静默检测→回合制）、cornell-notes/correction-notebook/physics-problem-coach（OCR→手动输入）、vocabulary-dna（OCR+定时→手动+补发）。含 3 个此前无"技术边界声明"章节的 SKILL（听力/康奈尔/物理解题）已补建该章节。
7. **建立统一危机转介协议**：✅ 已完成（见 §1.5）。
8. **落实安全基线**：✅ 文件层全部完成（见 §1.5/1.6：必须激活清零、控制入口补齐、intake 最小化修正、VAK 移除、跨 SKILL 共享/建档前的 consent 校验要求已写入接口与控制入口章节）。唯一剩余项是"运行时真正强制校验 consent 布尔位"——这属 OpenClaw 平台运行时职责，非 markdown SKILL 层可实现，文件层已把校验要求声明到位。

### 阶段三：设计升级（✅ 全部完成：9/10/11/12/13）
9. **废除 lite 机制**：✅ 已完成——删除全部 26 个 SKILL.lite.md，回归官方"单一 SKILL.md + 渐进披露"模型；architecture.md 文件结构说明同步更新。CI 校验 58 个 SKILL 文件通过。
10. **课标话语升级（三维目标 → 核心素养）**：✅ 已完成——lesson-planner 的目标模型由 2001 版"三维目标"升级为 2022 新课标"核心素养导向"（先对准学科核心素养，再用"知识与技能/思维与方法/态度与价值"三个落地维度写成可观测目标）；SKILL、教案模板、README/architecture/changelog 的相关表述同步更新。**英语 CSE/CEFR 亦已完成**：english-assessment 改为"CSE 九级为主、CEFR 为参照"，两张对照表订正为中考≈A2(CSE3-4)、高考≈B1(CSE5)、TEM-8≈C1(CSE8)（对齐官方 CSE-CEFR 对接研究），消除 CEFR 定标过高；docs 同步。
11. **去重瘦身**：✅ 已完成主体——25 个超长教师 SKILL.md 分 3 批做 extract→audit 双代理迁移（长模板/话术库/样板下沉 references、正文留 📎 指针，内容零删除）：教师端正文合计 **16147→13069 行（−19%）**，新建 78 个 references 文件；>500 行文件由 25 个降至 9 个（余者为规则密集型，骨架不可再压，最长已从 749 降到 604）。每批经 CI 引用校验、保护项核验（核心素养章节/7→4 映射/P、D 测量学/Bloom 命名/焦虑转介/接口契约均在正文未动）与内容守恒抽样（192 行零缺失）。description 硬触发语已在早前轮次清理（"必须激活"→"建议激活"）。
12. **理顺依赖与重叠**：✅ 已完成——打破 exam↔student-analyzer 循环依赖（移除 exam-designer 的 depends_on，保留 student-analyzer→exam-designer 单向边）；teacher-math 7 类错因、physics 8 类错因各补"→标准 4 类 / 物理 5 维"映射表（写回学生端时用标准码，修复接口断裂）；两份错因维度表加"编码学科命名空间"说明（数-C01/物-C01，消除 C/R 跨科歧义）；修正 english-assessment 误依赖 math-exam-designer 为通用 exam-designer；math-exam-designer 补 depends_on 通用版并声明"学科细化非替代"——P 值/区分度/选拔性测量学沿用通用版定义（测评类型表补回选拔性），english-assessment 同样声明沿用通用版测量学，消除"专项版反而更弱"的倒退。
13. **补运营闭环与文档一致性**：✅ 已完成——文档版本号/步数/changelog 已订正（见 §1.6）；财务范围已决策：schedule-manager 增加"财务边界声明"，明确课时台账只记数量不记金额/收款/欠费，财务与收款**有意不纳入本库范围**（与工作空间隐私最小化、"禁记课时单价"一致），教学与资金数据分离降低合规风险。

### 阶段四：伪科学与细节清理（✅ 已完成）
14. ✅ VAK 学习风格已改为基于证据的偏好描述；review-planner"艾宾浩斯"标签已改"间隔复习+提取练习"；ebbinghaus 保留率已标示意值并修正矛盾（见 §1.6）；classroom-coach 的分钟级"注意力曲线"已改为"每 10-15 分钟切换活动"的经验法则并标注证据薄弱；"苏格拉底提问链"已更名"Bloom 分层提问链"（真苏格拉底追问归入 §5.2 候场追问），SKILL/reference/README/architecture/changelog 同步。

---

## 附录：证据索引（部分关键项）
- 坏 schema：`student/general/xiaozhi-learning-dna/schemas/dna-profile.schema.json:5`（已修）
- 概念图谱契约不符：`learning-dna/SKILL.md:205-239` vs `schemas/dna-profile.schema.json:585-627`
- 文言诵读节奏：`teacher/chinese/xiaozhi-teach-chinese-classical-guide/SKILL.md:157-161`
- 史实错误：`student/chinese/xiaozhi-chinese-classical-revival/references/classical-author-profiles.md:17,28,111`
- 物理五大观念：`teacher/physics/xiaozhi-teach-physics-lesson-planner/SKILL.md:126-140`
- 物理学段越界：`student/physics/xiaozhi-physics-modeling-coach/SKILL.md:114-186`
- 枚举不兼容：`teacher/independent/xiaozhi-teach-lesson-log/SKILL.md:174` vs `schemas/solo-teacher-workspace.schema.json:112-115`
- 违反安全基线：`SECURITY_BASELINE.md:34` vs `teacher/independent/*/SKILL.md`（8/8 含"必须激活此SKILL"）
- 监听 stub 反转：`student/english/xiaozhi-english-listening-trainer/references/`（topics.md/listening-topics.md 为 10 行 stub，listening-topic-templates.md 499 行真内容成孤儿）
- 循环依赖：`exam-designer/SKILL.md:18` ↔ `student-analyzer/SKILL.md:18`

# 技能索引

> 由 `scripts/gen-docs.mjs --write` 从各 SKILL.md 的 frontmatter 生成，**请勿手改**；CI 用 `--check` 核对。

全库 66 个 SKILL（学生端 37 + 老师端 29）+ 1 个开发者工具，190 份 references。

## 学生端 · 通用（12）

| SKILL | 目录名 | 分类 | 适用学段 | 依赖 | 版本 |
|---|---|---|---|---|---|
| 🌉 初高衔接规划师 | `xiaozhi-bridge-planner` | 通用核心 | 初中、高中 | `xiaozhi-learning-dna` | 2.2.0 |
| 📝 康奈尔笔记 | `xiaozhi-cornell-notes` | 通用核心 | 小学高段、初中、高中 | `xiaozhi-learning-dna` | 2.2.0 |
| ❌ 智能错题本 | `xiaozhi-correction-notebook` | 通用核心 | 小学中段、小学高段、初中、高中 | `xiaozhi-learning-dna` | 2.2.0 |
| 🔭 跨学科侦探周 | `xiaozhi-cross-subject-detective` | 通用核心 | 小学高段、初中、高中 | `xiaozhi-learning-dna`、`xiaozhi-cornell-notes` | 2.2.0 |
| 🎓 费曼学习法 | `xiaozhi-feynman-learning` | 通用核心 | 小学中段、小学高段、初中、高中 | `xiaozhi-learning-dna` | 2.2.0 |
| ⏰ IM智能提醒 | `xiaozhi-im-reminder` | 通用核心 | 小学中段、小学高段、初中、高中 | `xiaozhi-learning-dna` | 2.2.0 |
| ☕ 兴趣成长探索计划 | `xiaozhi-interest-explorer` | 通用核心 | 小学中段、小学高段、初中、高中 | `xiaozhi-learning-dna` | 2.2.0 |
| 🧬 学习DNA | `xiaozhi-learning-dna` | 通用核心 | 小学中段、小学高段、初中、高中 | — | 2.2.0 |
| 🗓️ 30天学习计划制定师 | `xiaozhi-learning-plan` | 通用核心 | 小学高段、初中、高中 | `xiaozhi-learning-dna` | 2.2.0 |
| 🔗 学习系统协调器 | `xiaozhi-skill-coordinator` | 通用核心 | 小学中段、小学高段、初中、高中 | `xiaozhi-learning-dna`、`xiaozhi-correction-notebook`、`xiaozhi-feynman-learning`、`xiaozhi-cornell-notes` | 2.2.0 |
| ⏱️ 时间与专注力教练 | `xiaozhi-time-focus-coach` | 通用核心 | 小学中段、小学高段、初中、高中 | `xiaozhi-learning-dna`、`xiaozhi-learning-plan` | 2.2.0 |
| 📊 每周学习复盘 | `xiaozhi-weekly-review` | 通用核心 | 小学中段、小学高段、初中、高中 | `xiaozhi-learning-dna` | 2.2.0 |

## 学生端 · 语文（5）

| SKILL | 目录名 | 分类 | 适用学段 | 依赖 | 版本 |
|---|---|---|---|---|---|
| 跨时空古文对话 | `xiaozhi-chinese-classical-revival` | 语文专项 | 初中 | `xiaozhi-learning-dna` | 2.2.0 |
| 🔍 语病追踪档案 | `xiaozhi-chinese-grammar-tracker` | 语文专项 | 小学高段、初中 | `xiaozhi-learning-dna` | 2.2.0 |
| 📚 语文素材库 | `xiaozhi-chinese-material-library` | 语文专项 | 小学高段、初中 | `xiaozhi-learning-dna` | 2.2.0 |
| 📖 阅读理解拆解师 | `xiaozhi-chinese-reading-decoder` | 语文专项 | 小学高段、初中 | `xiaozhi-learning-dna` | 2.2.0 |
| 🖊️ 语文写作教练 | `xiaozhi-chinese-writing-coach` | 语文专项 | 小学高段、初中 | `xiaozhi-learning-dna` | 2.2.0 |

## 学生端 · 数学（5）

| SKILL | 目录名 | 分类 | 适用学段 | 依赖 | 版本 |
|---|---|---|---|---|---|
| 💡 数学概念解释器 | `xiaozhi-math-concept-explainer` | 数学专项 | 初中 | `xiaozhi-learning-dna` | 2.2.0 |
| 🧬 数学错误DNA | `xiaozhi-math-error-dna` | 数学专项 | 初中 | `xiaozhi-learning-dna` | 2.2.0 |
| 🎯 思维梯度训练师 | `xiaozhi-math-gradient-trainer` | 数学专项 | 初中 | `xiaozhi-learning-dna`、`xiaozhi-math-error-dna` | 2.2.0 |
| 📐 数学解题教练 | `xiaozhi-math-problem-solving-coach` | 数学专项 | 初中 | `xiaozhi-learning-dna`、`xiaozhi-math-error-dna` | 2.2.0 |
| 📝 应用题数学建模教练 | `xiaozhi-math-word-problem-coach` | 数学专项 | 初中 | `xiaozhi-learning-dna`、`xiaozhi-math-error-dna` | 2.2.0 |

## 学生端 · 英语（5）

| SKILL | 目录名 | 分类 | 适用学段 | 依赖 | 版本 |
|---|---|---|---|---|---|
| 📝 英语语法突破教练 | `xiaozhi-english-grammar-coach` | 英语专项 | 小学高段、初中 | `xiaozhi-learning-dna` | 2.2.0 |
| 🎧 个性化英语听力训练师 | `xiaozhi-english-listening-trainer` | 英语专项 | 小学高段、初中 | `xiaozhi-learning-dna`、`xiaozhi-english-vocabulary-dna` | 2.2.0 |
| 🎙️ 英语口语陪练 | `xiaozhi-english-speaking-coach` | 英语专项 | 小学高段、初中 | `xiaozhi-learning-dna` | 2.2.0 |
| 📖 智能词汇DNA系统 | `xiaozhi-english-vocabulary-dna` | 英语专项 | 小学高段、初中 | `xiaozhi-learning-dna` | 2.2.0 |
| ✍️ 英语写作进化教练 | `xiaozhi-english-writing-coach` | 英语专项 | 小学高段、初中 | `xiaozhi-learning-dna`、`xiaozhi-english-grammar-coach` | 2.2.0 |

## 学生端 · 物理（5）

| SKILL | 目录名 | 分类 | 适用学段 | 依赖 | 版本 |
|---|---|---|---|---|---|
| 💡 物理概念直觉器 | `xiaozhi-physics-concept-intuition` | 物理专项 | 初中、高中 | `xiaozhi-learning-dna` | 2.2.0 |
| 🧬 物理错误DNA | `xiaozhi-physics-error-dna` | 物理专项 | 初中、高中 | `xiaozhi-learning-dna` | 2.2.0 |
| 🔬 物理实验思维教练 | `xiaozhi-physics-lab-coach` | 物理专项 | 初中、高中 | `xiaozhi-learning-dna` | 2.2.0 |
| 📐 物理建模教练 | `xiaozhi-physics-modeling-coach` | 物理专项 | 初中、高中 | `xiaozhi-learning-dna`、`xiaozhi-physics-error-dna` | 2.2.0 |
| 🧲 物理解题教练 | `xiaozhi-physics-problem-coach` | 物理专项 | 初中、高中 | `xiaozhi-learning-dna`、`xiaozhi-physics-error-dna` | 2.2.0 |

## 学生端 · 化学（5）

| SKILL | 目录名 | 分类 | 适用学段 | 依赖 | 版本 |
|---|---|---|---|---|---|
| 🧬 化学错误DNA | `xiaozhi-chemistry-error-dna` | 化学专项 | 初中、高中 | `xiaozhi-learning-dna` | 2.2.0 |
| 🧪 化学实验探究教练 | `xiaozhi-chemistry-lab-coach` | 化学专项 | 初中、高中 | `xiaozhi-learning-dna` | 2.2.0 |
| 💎 微观世界想象器 | `xiaozhi-chemistry-micro-visualizer` | 化学专项 | 初中、高中 | `xiaozhi-learning-dna` | 2.2.0 |
| 🔤 化学用语与方程式教练 | `xiaozhi-chemistry-notation-coach` | 化学专项 | 初中、高中 | `xiaozhi-learning-dna` | 2.2.0 |
| ⚗️ 化学解题教练 | `xiaozhi-chemistry-problem-coach` | 化学专项 | 初中、高中 | `xiaozhi-learning-dna`、`xiaozhi-chemistry-error-dna` | 2.2.0 |

## 老师端 · 通用教学（6）

| SKILL | 目录名 | 分类 | 适用学段 | 依赖 | 版本 |
|---|---|---|---|---|---|
| 作业设计师 | `xiaozhi-teach-assignment-designer` | 老师通用 | 小学中段、小学高段、初中 | `xiaozhi-teach-lesson-planner`、`xiaozhi-teach-student-analyzer` | 2.2.0 |
| 课堂互动教练 | `xiaozhi-teach-classroom-coach` | 老师通用 | 小学中段、小学高段、初中 | `xiaozhi-teach-lesson-planner`、`xiaozhi-teach-student-analyzer` | 2.2.0 |
| 测评设计师 | `xiaozhi-teach-exam-designer` | 老师通用 | 小学中段、小学高段、初中 | — | 2.2.0 |
| 教案设计器 | `xiaozhi-teach-lesson-planner` | 老师通用 | 小学中段、小学高段、初中 | `xiaozhi-teach-student-analyzer` | 2.2.0 |
| 复习规划师 | `xiaozhi-teach-review-planner` | 老师通用 | 小学中段、小学高段、初中 | `xiaozhi-teach-lesson-planner`、`xiaozhi-teach-student-analyzer`、`xiaozhi-teach-exam-designer` | 2.2.0 |
| 学情分析师 | `xiaozhi-teach-student-analyzer` | 老师通用 | 小学中段、小学高段、初中 | `xiaozhi-teach-exam-designer` | 2.2.0 |

## 老师端 · 独立教师（8）

| SKILL | 目录名 | 分类 | 适用学段 | 依赖 | 版本 |
|---|---|---|---|---|---|
| 作业跟进管家 | `xiaozhi-teach-homework-tracker` | 独立教师 | 小学中段、小学高段、初中、高中 | `xiaozhi-teach-lesson-log` | 2.2.0 |
| 课后记录助手 | `xiaozhi-teach-lesson-log` | 独立教师 | 小学中段、小学高段、初中、高中 | — | 2.2.0 |
| 家长沟通助手 | `xiaozhi-teach-parent-communication` | 独立教师 | 小学中段、小学高段、初中、高中 | `xiaozhi-teach-lesson-log` | 2.2.0 |
| 阶段报告与续课助手 | `xiaozhi-teach-renewal-report` | 独立教师 | 小学中段、小学高段、初中、高中 | `xiaozhi-teach-lesson-log`、`xiaozhi-teach-parent-communication` | 2.2.0 |
| 教学资源复用库 | `xiaozhi-teach-resource-library` | 独立教师 | 小学中段、小学高段、初中、高中 | `xiaozhi-teach-homework-tracker` | 2.2.0 |
| 排课与课时管理 | `xiaozhi-teach-schedule-manager` | 独立教师 | 小学中段、小学高段、初中、高中 | `xiaozhi-teach-student-intake`、`xiaozhi-teach-lesson-log`、`xiaozhi-teach-parent-communication` | 2.2.0 |
| 独立教师工作台 | `xiaozhi-teach-solo-dashboard` | 独立教师 | 小学中段、小学高段、初中、高中 | `xiaozhi-teach-schedule-manager`、`xiaozhi-teach-lesson-log`、`xiaozhi-teach-homework-tracker` | 2.2.0 |
| 试听与学员建档 | `xiaozhi-teach-student-intake` | 独立教师 | 小学中段、小学高段、初中、高中 | — | 2.2.0 |

## 老师端 · 语文（3）

| SKILL | 目录名 | 分类 | 适用学段 | 依赖 | 版本 |
|---|---|---|---|---|---|
| 文言文教学指导 | `xiaozhi-teach-chinese-classical-guide` | 老师语文 | 小学高段、初中 | `xiaozhi-teach-lesson-planner`、`xiaozhi-teach-student-analyzer`、`xiaozhi-teach-chinese-reading-guide` | 2.2.0 |
| 阅读教学指导 | `xiaozhi-teach-chinese-reading-guide` | 老师语文 | 小学高段、初中 | `xiaozhi-teach-lesson-planner`、`xiaozhi-teach-student-analyzer`、`xiaozhi-teach-classroom-coach` | 2.2.0 |
| 写作教学指导 | `xiaozhi-teach-chinese-writing-guide` | 老师语文 | 小学高段、初中 | `xiaozhi-teach-lesson-planner`、`xiaozhi-teach-student-analyzer`、`xiaozhi-teach-classroom-coach` | 2.2.0 |

## 老师端 · 数学（3）

| SKILL | 目录名 | 分类 | 适用学段 | 依赖 | 版本 |
|---|---|---|---|---|---|
| 班级错因分析 | `xiaozhi-teach-math-error-analyzer` | 老师数学 | 初中 | `xiaozhi-teach-student-analyzer`、`xiaozhi-teach-lesson-planner`、`xiaozhi-teach-homework-tracker` | 2.2.0 |
| 数学测评设计 | `xiaozhi-teach-math-exam-designer` | 老师数学 | 初中 | `xiaozhi-teach-exam-designer`、`xiaozhi-teach-student-analyzer`、`xiaozhi-teach-lesson-planner`、`xiaozhi-teach-math-error-analyzer`、`xiaozhi-teach-math-lesson-planner`、`xiaozhi-teach-parent-communication` | 2.2.0 |
| 数学教案设计 | `xiaozhi-teach-math-lesson-planner` | 老师数学 | 初中 | `xiaozhi-teach-lesson-planner`、`xiaozhi-teach-student-analyzer`、`xiaozhi-teach-classroom-coach` | 2.2.0 |

## 老师端 · 英语（3）

| SKILL | 目录名 | 分类 | 适用学段 | 依赖 | 版本 |
|---|---|---|---|---|---|
| 英语综合测评 | `xiaozhi-teach-english-assessment` | 老师英语 | 小学高段、初中 | `xiaozhi-teach-student-analyzer`、`xiaozhi-teach-lesson-planner`、`xiaozhi-teach-exam-designer` | 2.2.0 |
| 英语听力材料设计 | `xiaozhi-teach-english-listening-designer` | 老师英语 | 小学高段、初中 | `xiaozhi-teach-lesson-planner`、`xiaozhi-teach-student-analyzer`、`xiaozhi-teach-classroom-coach` | 2.2.0 |
| 英语口语活动设计 | `xiaozhi-teach-english-speaking-designer` | 老师英语 | 小学高段、初中 | `xiaozhi-teach-lesson-planner`、`xiaozhi-teach-student-analyzer`、`xiaozhi-teach-classroom-coach` | 2.2.0 |

## 老师端 · 物理（3）

| SKILL | 目录名 | 分类 | 适用学段 | 依赖 | 版本 |
|---|---|---|---|---|---|
| 物理实验教学指导 | `xiaozhi-teach-physics-experiment-coach` | 老师物理 | 初中 | `xiaozhi-teach-physics-lesson-planner`、`xiaozhi-teach-student-analyzer`、`xiaozhi-teach-classroom-coach` | 2.2.0 |
| 物理教案设计 | `xiaozhi-teach-physics-lesson-planner` | 老师物理 | 初中 | `xiaozhi-teach-lesson-planner`、`xiaozhi-teach-student-analyzer`、`xiaozhi-teach-classroom-coach` | 2.2.0 |
| 物理解题教学指导 | `xiaozhi-teach-physics-problem-guide` | 老师物理 | 初中 | `xiaozhi-teach-physics-lesson-planner`、`xiaozhi-teach-student-analyzer` | 2.2.0 |

## 老师端 · 化学（3）

| SKILL | 目录名 | 分类 | 适用学段 | 依赖 | 版本 |
|---|---|---|---|---|---|
| 化学实验教学指导 | `xiaozhi-teach-chemistry-lab-guide` | 老师化学 | 初中、高中 | `xiaozhi-teach-chemistry-lesson-planner`、`xiaozhi-teach-student-analyzer`、`xiaozhi-teach-classroom-coach` | 2.2.0 |
| 化学教案设计 | `xiaozhi-teach-chemistry-lesson-planner` | 老师化学 | 初中、高中 | `xiaozhi-teach-lesson-planner`、`xiaozhi-teach-student-analyzer`、`xiaozhi-teach-classroom-coach` | 2.2.0 |
| 化学用语过关训练设计 | `xiaozhi-teach-chemistry-notation-drill` | 老师化学 | 初中、高中 | `xiaozhi-teach-assignment-designer`、`xiaozhi-teach-review-planner` | 2.2.0 |

## 开发者工具（1）

| SKILL | 目录名 | 分类 | 适用学段 | 依赖 | 版本 |
|---|---|---|---|---|---|
| 🛠️ SKILL 编写工具 | `xiaozhi-skill-creator` | 开发者工具 | 高中 | — | 2.2.0 |


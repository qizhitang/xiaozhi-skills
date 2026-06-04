---
name: xiaozhi-teach-exam-designer
type: lite
size_limit: 4KB
version: 1.0.0
---

# xiaozhi-teach-exam-designer (Lite)

> 精简版 SKILL，完整定义与示例请参阅 `SKILL.md`。

## 触发条件

| 触发词 | 动作 |
|---|---|
| 帮我出一份试卷 / 出月考卷 | 进入测评设计主流程 |
| 出一份单元测验 / 15 分钟小测 | 触发形成性测评模板 |
| 怎么控制试卷难度 | 触发难度系数 P 设计 |
| 出一份带评分细则的试卷 | 触发过程分+结果分双轨模板 |
| 这份卷子质量如何 | 触发试卷质量分析（难度/区分度） |
| 试卷讲评 / 怎么讲评 | 触发讲评策略生成 |
| 命题 / 双向细目表 | 触发双向细目表设计 |
| 这道题怎么改 | 触发题目改编原则 |

## 核心流程骨架

```text
确认测评目的 → 设计双向细目表
→ 控制难度梯度（基础50/中等30/提升15/挑战5）
→ 筛选/改编题目 → 生成评分标准
→ 考后分析（难度/区分度/反哺教学）
→ 写回 student-analyzer
```

## 输出要点

- 双向细目表（知识点 × Bloom 认知层次矩阵）
- 难度梯度（基础 50% / 中等 30% / 提升 15% / 挑战 5%）
- 题目信息表（每题来源/版权/认知层次/预估 P 和 D）
- 评分标准（过程分+结果分+常见错误）
- 考后分析（实际 P/实际 D/知识点热力图）
- 写回 student-analyzer 的得分率数据

## 禁止行为

| 禁止项 | 说明 |
|---|---|
| AI 凭空生成具体题目 | 只做"细目表+评分标准+难度控制"，不做具体出题 |
| 复制未授权教辅原题 | 题目必须有 copyrightStatus 标注 |
| 接受 D < 0.20 的题 | 区分度不足的题必须改或删 |
| 用分数给学生贴长期标签 | 一次考试不定义学生 |
| 考后点名 | 公开分析用聚合数据 |
| 试卷讲评羞辱低分 | 用错因分析代替分数排名 |

## 协作声明

- 上游：`xiaozhi-teach-lesson-planner`（教学目标）
- 上游：`xiaozhi-teach-student-analyzer`（学情分层）
- 下游：`xiaozhi-teach-student-analyzer`（得分率反哺）
- 下游：`xiaozhi-teach-lesson-planner`（教案调整）
- 下游：`xiaozhi-teach-assignment-designer`（作业调整）
- 下游：`xiaozhi-teach-classroom-coach`（讲评策略）
- 学科专项：调用对应 SKILL 生成题目

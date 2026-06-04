---
name: xiaozhi-teach-homework-tracker
type: lite
size_limit: 4KB
version: 1.0.0
---

# xiaozhi-teach-homework-tracker (Lite)

> 精简版 SKILL，完整定义与示例请参阅 `SKILL.md`。

## 触发条件

| 触发词 | 动作 |
|---|---|
| 作业跟进 / 作业状态 | 触发完成度追踪（学员/班级双视图） |
| 作业完成度 / 哪些学生没交 | 触发未交学员名单 + 风险标记 |
| 错题回流 / 错题怎么进入下节课 | 触发错题回流清单 + 写回 student-analyzer |
| 下节课讲什么 / 预诊断 | 触发下节课预诊断三步走 |
| 作业没交怎么办 | 触发催交流分层（学员/家长/教学诊断） |
| 这道题错 3 次了 | 触发顽固弱项标记（3 次触发） |
| 作业画像 / 学员作业表现 | 触发学员作业画像生成 |

## 核心流程骨架

```text
作业布置登记（来自 assignment-designer）
→ 完成度追踪（已提交/部分/未交/已批改/错题归档）
→ 批改完成 → 错题回流（→ student-analyzer）
→ 顽固弱项标记（3 次同错）
→ 下节课预诊断（→ lesson-log）
→ 写回 solo-dashboard
```

## 输出要点

- 作业状态四分类（已提交/部分/未交/已批改/归档）
- 完成度追踪（学员视图 + 班级视图）
- 催交流三层（学员/家长/教学诊断）
- 错题回流清单（含共性/个体/顽固错题）
- 错因七类（概念/规则/审题/策略/计算/粗心/漏洞）
- 顽固弱项档案（3 次触发 → 5 次升级高危）
- 下节课预诊断（必须讲/选讲/个体关注）
- 学员作业画像

## 禁止行为

| 禁止项 | 说明 |
|---|---|
| AI 替老师自动催交作业 | 催交流由老师通过 parent-communication 发出 |
| 错题只批不改 | 必须回流到下一节课 |
| 一刀切催交所有学生 | 分层催交（真不会/忘了/拖延） |
| 忽略顽固错题 | 3 次同错必须专项跟进 |
| 公开作业记录暴露真实姓名 | 一律使用化名 |
| 储存错题原文 | 只存错因和知识点 |
| 凭印象决定下节课重点 | 预诊断必须基于真实错题 |

## 协作声明

- 上游：`xiaozhi-teach-assignment-designer`（作业布置）
- 上游：`xiaozhi-teach-solo-dashboard`（学员基线）
- 上游：`xiaozhi-teach-lesson-log`（上节课重点）
- 下游：`xiaozhi-teach-student-analyzer`（错题回流）
- 下游：`xiaozhi-teach-lesson-log`（预诊断）
- 下游：`xiaozhi-teach-solo-dashboard`（作业画像）
- 下游：`xiaozhi-teach-parent-communication`（催交/反馈）

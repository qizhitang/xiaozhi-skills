---
name: xiaozhi-teach-solo-dashboard
type: lite
size_limit: 4KB
version: 1.0.0
---

# xiaozhi-teach-solo-dashboard (Lite)

> 精简版 SKILL，完整定义与示例请参阅 `SKILL.md`。

## 触发条件

| 触发词 | 动作 |
|---|---|
| 今天有哪些课 / 今日待办 / 工作台 | 生成 7 区块日工作台 |
| 今晚三节课要准备什么 | 输出课前准备清单 |
| 哪些学生需要跟进 | 输出风险学员名单 |
| 课后还有哪些反馈没发 | 输出课后待清理清单 |
| 哪些学生快没课时了 | 输出续课关注名单 |
| X 学生还剩几节课 | 单独查询课时包 |
| 本周独立教师工作台 | 周度运营摘要 |
| 早间启动 / 我今天该怎么安排 | 生成今日三件事 |

## 核心流程骨架

```text
读取工作空间（7 个 schema 字段集）
→ 按 7 区块分类输出
→ 自动标记 5 类风险学员
→ 输出"今日最重要的三件事"
```

## 输出要点（7 区块）

1. 今日课表（时间/学生/学科/状态）
2. 课前准备清单（上次记录/作业/备课要点/教具/提醒）
3. 课后待反馈（待发条数 + 积压清单）
4. 作业与复习跟进（完成率 + 待跟进学员）
5. 家长沟通提醒（沉默家长/待确认/需主动）
6. 课时包与续课节点（remainingUnits ≤ 3 名单）
7. 今日最重要的三件事（按紧急度×影响力排序）

## 5 类风险信号

| 信号 | 触发条件 | 严重度 |
|---|---|---|
| 缺课 | absence/cancelled ≥ 2 次 | ≥3 为高 |
| 作业拖延 | overdue ≥ 3 次 | ≥5 为高 |
| 测评退步 | masteryStatus 需重讲/巩固 ≥ 3 次 | ≥5 为高 |
| 家长沉默 | 近 14 天无 sent 记录 | >21 天为高 |
| 课时耗尽 | remainingUnits ≤ 3 | ≤2 为高 |

## 禁止行为

| 禁止项 | 说明 |
|---|---|
| 自动发家长消息 | 所有对外动作须老师手动确认 |
| 自动写课时台账 | 课时消耗须老师明确确认 |
| 出现真实姓名 | 一律用 alias |
| 编造学员状态 | 没数据时写"暂无记录" |
| 焦虑式续课话术 | 续课建议只能基于学习证据 |
| 默认读取学生 DNA | 须先确认授权 |

## 协作声明

- 数据源：`teacher/independent/schemas/solo-teacher-workspace.schema.json`（只读）
- 备课：转 `xiaozhi-teach-lesson-planner`
- 课后：转 `xiaozhi-teach-lesson-log`
- 作业：转 `xiaozhi-teach-assignment-designer` / `xiaozhi-teach-homework-tracker`
- 学情：转 `xiaozhi-teach-student-analyzer`
- 家长沟通：转 `xiaozhi-teach-parent-communication`
- 续课：转 `xiaozhi-teach-renewal-report`
- 排课：转 `xiaozhi-teach-schedule-manager`

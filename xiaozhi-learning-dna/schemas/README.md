# 学习DNA档案 · JSON Schema

本目录包含学习DNA档案的正式数据结构定义。

## 文件说明

| 文件 | 说明 |
|------|------|
| `dna-profile.schema.json` | 学习DNA档案完整 JSON Schema（draft 2020-12） |
| `examples/full-profile.example.json` | 完整档案示例数据（覆盖所有维度） |
| `validate.js` | ajv 验证脚本（测试 schema 自身有效性 + 示例数据合规性） |

## 结构覆盖

Schema 覆盖以下所有维度，与 `SKILL.md` 中的字段定义一一对应：

**六大基础维度：**
1. `meta` — 档案元数据（版本、授权状态）
2. `basicInfo` — 基础信息（年级、目标、可用时间）
3. `subjectMap` — 学科强弱地图（强项/弱项/薄弱知识点清单）
4. `learningStyle` — 学习风格偏好（解释方式/对话节奏/注意力习惯）
5. `errorPatterns` — 错误模式记录（固定错误类型/根因分析/已攻克）
6. `conversationSummary` — 对话历史摘要（本周重点/未解决疑问/学习节点）
7. `growthTrack` — 成长轨迹（里程碑/持续进步/飞轮状态）

**v1.1 扩展维度：**
8. `growthMap` — 成长图谱（错题地图/口语轨迹/弱项突破/知识积累树）
9. `interestDNA` — 兴趣DNA（探索领域/挑战反应/浅层喜好/真正兴趣）

## 设计原则

- **所有字段均为可选（optional）**：仅 `meta` 为必填，其余按需记录，遵循"最小必要"原则
- **枚举约束**：状态、类别等字段使用 `enum` 约束，确保数据一致性
- **置信度标签**：`confidenceLevel` 贯穿多个维度，统一使用 `$defs/confidenceLevel` 定义
- **隐私边界**：Schema 中不含任何高敏感字段（住址/电话/证件等），与 `SECURITY_BASELINE.md` 一致

## 运行验证

```bash
# 安装依赖
npm install

# 运行验证
node validate.js
```

预期输出：
```
✅ Schema compiled successfully (schema is valid JSON Schema draft 2020-12)
✅ Example data (full-profile.example.json) passes validation
✅ Minimal profile (only meta) passes validation
✅ Invalid profile (missing required meta) correctly rejected
✅ Invalid confidenceLevel enum value correctly rejected
🎉 All validation tests passed!
```

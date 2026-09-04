# 学习DNA · JSON Schema

本目录包含学习DNA的正式数据结构定义。当前 `schemaVersion` 为 **2.1.0**，与仓库版本一致。

## 文件说明

| 文件 | 说明 |
|------|------|
| `dna-profile.schema.json` | 学习DNA完整 JSON Schema（draft 2020-12） |
| `examples/full-profile.example.json` | 完整档案示例数据（覆盖所有维度） |
| `validate.js` | ajv 验证脚本（测试 schema 自身有效性 + 示例数据合规性） |

## 结构覆盖

Schema 覆盖以下所有维度，与 `SKILL.md` 中的字段定义一一对应：

**六大基础维度：**
1. `meta` — 档案元数据（版本、授权状态 `consentStatus`）
2. `basicInfo` — 基础信息（年级、目标、可用时间）
3. `subjectMap` — 学科强弱地图（强项/弱项/薄弱知识点清单）
4. `learningStyle` — 学习风格偏好（解释方式/对话节奏/注意力习惯）
5. `errorPatterns` — 错误模式记录（固定错误类型/根因分析/已攻克）
6. `conversationSummary` — 对话历史摘要（本周重点/未解决疑问/学习节点）
7. `growthTrack` — 成长轨迹（里程碑/持续进步/飞轮状态）

**成长图谱与兴趣维度：**
8. `growthMap` — 成长图谱（错题地图/口语轨迹/弱项突破/`conceptGraph` 概念图谱）
9. `interestDNA` — 兴趣DNA（探索领域/挑战反应/浅层喜好/真正兴趣）

**学习情绪维度：**
10. `learningEmotion` — 学习情绪（情绪基线/学科情绪/焦虑触发/动力状态/情绪里程碑/有效支持策略），需 `emotionTrackingConsent`

**授权、学科扩展与安全维度：**
11. `subjectExtensions` — 学科扩展档案，四个分支 `math` / `physics` / `chinese` / `english`，各学科 SKILL 只读写本学科分支
12. `extensions` — 通用扩展档案：`notes`（康奈尔笔记）/ `focus`（时间与专注力）/ `plans`（30天学习计划）/ `projects`（跨学科侦探周）/ `understanding`（费曼理解深度）
13. `safetyRecord` — 安全处置记录，只记"已转介"的处置事实，不记事件细节（`shared/crisis-exception.md`）

## 授权模型

`meta.consentStatus` 是全库唯一授权状态位，定义见 `shared/vocab.md §8`：

| 字段 | 作用 |
|------|------|
| `profileEnabled` | 是否建立长期档案 |
| `consentGivenBy` | 同意主体：学生本人 / 监护人 / 学生与监护人 |
| `ageBand` | 学段，用于推导 `guardianConsentRequired` |
| `guardianConsentRequired` | 小学各段为 true，此时 `consentGivenBy` 必须含监护人 |
| `crossSkillSharing` | 跨 SKILL 共享最小字段 |
| `parentSharingConsent` | 家长可见输出（家庭看板、周报家庭版、兴趣简报） |
| `emotionSharingWithParent` | 情绪内容对家长可见，必须学生本人同意 |
| `teacherWritebackConsent` | 老师端写回本档案 |
| `reminderConsent` / `emotionTrackingConsent` / `interestTrackingConsent` | 分项授权 |

危机例外（`shared/crisis-exception.md`）优先于以上所有位。

## 兼容性说明

- `growthMap.knowledgeAccumulationTree` 已弃用（`deprecated: true`），由 `growthMap.conceptGraph` 取代；仅为读取旧档案保留，不再写入。
- 弱项状态、错因四维、掌握度三档、置信度四项枚举均以 `shared/vocab.md` 为唯一来源，修改 vocab 后必须同步本 schema 并跑 `node scripts/validate-schemas.mjs`。

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

仓库级校验（覆盖本 schema + handover 协议 + 老师端 schema）：

```bash
node scripts/validate-schemas.mjs
```

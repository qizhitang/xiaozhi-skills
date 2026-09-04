# 测评统计卡模板（学员）

> 适用学段：初中（7-9 年级）。一律用化名（studentAlias），不写真实姓名。
> **不写具体名次**——个体统计卡的作用是给出这次的客观得分情况，不是排位。
>
> ⚠️ **边界**：本模板只填**这次卷子上的得分事实**。
> "为什么错"（错因诊断）转 `xiaozhi-teach-math-error-analyzer`；
> "接下来练什么"（改进计划、个别辅导）转 `xiaozhi-teach-math-lesson-planner`；
> "在班里处于什么水平 / 属于哪一层"转 `xiaozhi-teach-student-analyzer`；
> 给家长看的版本转 `xiaozhi-teach-parent-communication`。
> 本模板对这四项只留交接口，不代填。

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 测评分析报告 · [学员化名] · [测评名]
   测评类型：[诊断性/形成性/终结性]   满分：[N]
━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 分数
  · 总分：[N] / [N]（得分率 [N]%）
  · 位置：[高于/接近/低于] 班级平均（不写具体名次）
  · 与上次比：得分率 [+/-N]%

■ 知识点表现（来自逐题得分）
  · 拿稳的：[知识点]（得分率 [N]%）
  · 要补的：[知识点]（得分率 [N]%）
  · 本次没考到、但档案里仍是弱项的：[知识点]

■ 错因分析 —— 本模板不填
  · 本 SKILL 只能给出"错在哪几题、涉及哪些知识点"
  · 判断"为什么错"要看学生的实际书写与步骤，
    转 xiaozhi-teach-math-error-analyzer；本卡不写主导错因与置信度

■ 改进建议 —— 本模板不填
  · 接下来练什么、怎么练、要不要个别辅导
    → xiaozhi-teach-math-lesson-planner（复习排期转 xiaozhi-teach-review-planner）

■ 可交接的最小字段
  · 学员化名 + examId + 该生逐题得失分 + 涉及知识点
  · 交出前先问老师："要我把这份交给〔班级错因分析〕看错因吗？"

■ 交接与授权提示
  · 本卡是待确认草稿，老师确认后才写入 classWorkspace
  · 写回学生端档案前核对 teacherWritebackConsent，为 false 则丢弃并告知老师
  · 本 SKILL 不生成家长版本；家长侧输出转 xiaozhi-teach-parent-communication，
    由它核对 parentSharingConsent 后决定给什么
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

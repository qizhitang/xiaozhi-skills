# 错题回流清单模板

> 适用学段：小学中段 / 小学高段 / 初中 / 高中
> 配合 `xiaozhi-teach-homework-tracker` §6.2 使用。
> 错因一律按 `shared/vocab.md` §1（通用四维）与 §3（老师端七类 ↔ 四维映射）填写；`dimension` 必填，不写自由文本错因。

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 错题回流清单 · [日期] 作业
━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 多名学员共同错的题（仅小班场景；一对一跳过本节）
  ① 知识点 [X] · dimension [概念模糊/计算失误/读题失误/方法用错]
     · [N] 人错 · teacherCategory（选填）[知识漏洞/规则错误/…]
  ② 知识点 [X] · dimension [   ] · [N] 人错

■ 个体错题（逐学员）
  小A：
    · 知识点 [X] · dimension [   ] · teacherCategory [   ]
    · 知识点 [X] · dimension [   ]
  小B：
    · 知识点 [X] · dimension [   ]

■ 反复出现的知识点（按 shared/vocab.md §5 口径）
  口径：同一 knowledgePoint + 同一 dimension，滚动 28 天累计，
        同一天多次只计 1 次
  · 小A · [知识点] · 概念模糊 · 28 天内第 3 次（[d1] [d2] [d3]）
        → 写 progressEvidence，等老师确认后才进 primaryWeaknesses
  · 小D · [知识点] · 计算失误 · 28 天内第 5 次
        → 高危：建议与学员本人谈策略；告知家长依 shared/vocab.md §8 授权

■ 这些数据去哪
  · 落库：workspace.homeworkFollowups[].mainErrors[]（本 SKILL 写）
  · 阈值证据：workspace.progressEvidence[]（本 SKILL 写）
  · 学员卡弱项：workspace.studentCards[].primaryWeaknesses（老师确认后才写）
  · 下节课重点：老师带进备课；要留档时由 lesson-log 写 nextLessonFocus
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 填写注意

- 一道错题只记一个 `dimension`。判定顺序：复述条件（读题失误）→ 纯净版（概念模糊）→ 换题型（方法用错）→ 剩下归计算失误。
- 不写"不认真""马虎""态度问题"——按 `shared/vocab.md §3`，抄错题归读题失误，算错归计算失误。
- 只存 `knowledgePoint` 和 `dimension`，**不存错题原文、不存学员答题原文**。
- 一对一场景下没有"共性错题"，直接用个体错题一节。

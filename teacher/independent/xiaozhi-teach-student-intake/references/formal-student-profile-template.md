# 正式学员档案模板

> 适用学段：小学中段 / 小学高段 / 初中 / 高中
> 配合 `xiaozhi-teach-student-intake` §十使用。字段对应 `solo-teacher-workspace.schema.json` 的 `studentCard` 与 `coursePackage`。
> 试听转为正式学员后填写；不收集的字段见 `student-basic-info-form.md`。

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 正式学员档案 · [化名]
建档日期：[YYYY-MM-DD]
━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 基本信息
  alias：[小A]        ← 不写真实姓名，也不写姓氏首字
  gradeLevel：[   ]   gradeBand：[   ]
  subjects[]：[   ]
  status：□在读 □暂停记录 □已结课 □待删除
  guardianCommunicationPreference：
    □微信文字 □微信语音 □电话 □线下面谈 □邮件 □不主动联系

■ 可上课时间（availability[]）
  ① [周   ] [  :  ]-[  :  ]
  ② [周   ] [  :  ]-[  :  ]
  单次课时长：[N] 分钟（参考 shared/grade-bands.md 三：
    校外一对一/小班常见 60 或 90 分钟；线上单次建议 ≤ 30-45 分钟）

■ 来源与试听
  试听日期：[YYYY-MM-DD]
  试听观察结论（2-3 句，只写事实）：[   ]
  置信度：🔴 样本不足（单次试听一律标这一档，见 shared/vocab.md §7）

■ 需求画像（goals[]）
  近期目标：[   ]
  中期目标：[   ]
  learningPreferences[]（学习方式偏好，不放时间）：[   ]

■ 学情基线（写入 progressEvidence[]）
  起点诊断：[   ]
  已掌握：[   ]
  待补强：[   ]
  primaryWeaknesses[]：先留空。弱项由作业跟进按 shared/vocab.md §5
    累计到阈值、并经老师确认后才写入，上限 5 条。

■ 课时包（coursePackageLedger[]）
  totalUnits：[N]     expiryDate：[YYYY-MM-DD]
  续费节点：已用 50% / 70%（与 renewal-report 统一，不另设节点）

■ 授权（consent）
  profileEnabled：□是 □否
  crossSkillSharing：□是 □否
  parentCommunicationAllowed：□是 □否
  emotionSharingWithParent：□是 □否
  grantedBy：□学生本人 □监护人 □学生与监护人
    （未满 14 周岁必须含监护人，见 shared/vocab.md §8）
  grantedAt：[YYYY-MM-DD]
  retentionUntil：[YYYY-MM-DD]（默认结课后 6 个月）
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 这张卡里没有的东西

- **风险标记**：不是字段。工作台按 `homeworkFollowups[].overdueDays`、`lessonLogs[].masteryStatus`、`coursePackageLedger[].remainingUnits` 实时算出来，算完就用，不落库。建档时不预先给学员贴风险标签。
- **联系方式与紧急联系人**：老师自己保管。
- **真实姓名、出生年月、住址、学校班级**：不收集。

## 结课与删除

```text
结课时     → status 改为"已结课"，不再写入新记录
到 retentionUntil → 提示老师："小A 的档案今天到保留期，要删除吗？"
老师确认   → status 改为"待删除"，再次确认后整卡删除
学员/家长要求提前删除 → 随时执行，不需要理由
```

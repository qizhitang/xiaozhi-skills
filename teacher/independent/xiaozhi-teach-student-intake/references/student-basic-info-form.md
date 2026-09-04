# 学员基本信息表（必收字段模板）

> 适用学段：小学中段 / 小学高段 / 初中 / 高中
> 配合 `xiaozhi-teach-student-intake` §四使用。字段名对应 `solo-teacher-workspace.schema.json` 的 `studentCard`。
> 只收教学用得上的项。**联系方式与紧急联系人不进这张表**——请老师留在自己的手机通讯录或纸质记录里。

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 学员基本信息
━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 学员
  alias（化名）：[小A / 小B / …]（必填，不含真实姓氏）
  gradeLevel（年级）：[   ]（必填）
  gradeBand（学段）：□小学低段 □小学中段 □小学高段 □初中 □高中 □未知
  subjects[]（学科）：[   ]（必填）
  goals[]（学习目标）：[   ]（用学员/家长自己的话，一到两条）
  status：□在读（默认）□暂停记录 □已结课 □待删除

■ 可上课时间（availability[]，排课的唯一依据）
  ① dayOfWeek [周   ]  startTime [  :  ]  endTime [  :  ]
  ② dayOfWeek [周   ]  startTime [  :  ]  endTime [  :  ]
  ③ dayOfWeek [周   ]  startTime [  :  ]  endTime [  :  ]
  只记时间，不记原因（不写"周三要上钢琴课"）

■ 沟通方式偏好（guardianCommunicationPreference，单选）
  □微信文字 □微信语音 □电话 □线下面谈 □邮件 □不主动联系
  这里记的是"家长偏好哪种方式"，不是"往哪儿发"。
  具体的号码/微信号请老师自己保管。

■ 授权（consent）
  profileEnabled（建档）：□是 □否   ← 为否则不建卡
  crossSkillSharing（跨 SKILL 共享）：□是 □否（默认否）
  parentCommunicationAllowed（家长沟通）：□是 □否（默认否）
  emotionSharingWithParent（课堂状态可否转述家长）：□是 □否（默认否）
  grantedBy（谁授权的）：□学生本人 □监护人 □学生与监护人 □未记录
      未满 14 周岁（小学各段或初一）必须含监护人
  grantedAt（授权时间）：[YYYY-MM-DD]
  retentionUntil（保留至）：[YYYY-MM-DD]（默认结课后 6 个月）

■ 课时包（coursePackageLedger[]）
  totalUnits（总课时）：[N]
  expiryDate（到期日）：[YYYY-MM-DD]
  续费节点：已用 50% / 70%（全库统一，见 renewal-report）
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 不收的字段（问到时如实拒绝）

```text
❌ 家长手机号 / 微信号 / 邮箱  → 请老师自己存
❌ 紧急联系人及其电话          → 请老师自己存
❌ 真实姓名，含"姓氏首字""名字第一个字"
❌ 出生年月日                  → 有 gradeLevel 就够了
❌ 身份证号 / 户口信息
❌ 家庭住址（含小区名、路名）
❌ 家庭收入 / 家长职业
❌ 就读学校与班级
❌ 成绩单原件 / 家庭成员关系
```

**为什么姓氏首字和出生年月也不收**：单看无害，但和年级、学科、上课时间放在一起，就足以指认到具体的孩子。这张表是教学记录，不是身份档案。

**老师说"把家长电话记一下"时**：

```text
「联系方式我不记，请你存在自己手机里。
  我这边可以记家长偏好哪种沟通方式——
  微信文字 / 微信语音 / 电话 / 线下面谈 / 邮件 / 不主动联系，
  你说一个我写进学员卡。」
```

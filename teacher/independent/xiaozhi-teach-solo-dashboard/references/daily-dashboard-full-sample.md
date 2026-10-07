# 完整日工作台输出示例

> 适用学段：小学中段 / 小学高段 / 初中 / 高中
> 配合 `xiaozhi-teach-solo-dashboard` 使用，对应 SKILL.md「五、完整日工作台输出示例」。
> 本示例中的每一行都注明了字段来源。工作台只读聚合，不写任何字段。

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 独立教师今日工作台
2026-06-04 · 周四
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 今日课表                      ← lessonSchedule[]
  17:30-18:30  小A  数学  60 分钟（线下）
  18:45-19:15  小B  物理  30 分钟（线上）
  19:30-20:30  小C  英语  60 分钟（线下）
  合计 3 节，150 分钟

📋 课前准备                      ← lessonLogs[]（按 date 倒序最近 1 条）
  17:30 小A 数学
    · 上次（06-01）：复习了一元二次方程求根公式
      perTopicMastery：求根公式=基本理解，判别式=仍需巩固
    · 课上练习：3 道变式，上次课上做了 2 道（status=部分提交），
      剩 1 道今天课上补，overdueDays=0
    · 提醒：parentCommunicationLogs 最近一条为 05-31
  18:45 小B 物理（线上）
    · 上次（06-02）：受力分析基础复习，masteryStatus=仍需巩固
    · 学校作业（上次带来）：status=已批改，mainErrors 1 条
      （受力分析 · 概念模糊）
    · 受力图提前画好，线上课共享屏幕时用
  19:30 小C 英语
    · 上次（06-01）：阅读理解限时训练，masteryStatus=已掌握
    · 课上练习：status=已提交，待批改

📤 课后待反馈                    ← parentCommunicationLogs[].sentStatus
  今日待发：3 条
  积压：0 条 ✓
  注：三位学员的 consent.parentCommunicationAllowed 均为 true

📚 作业与复习跟进                ← homeworkFollowups[]
  近 7 日课上练习：按约定做完 11 / 13 条
  待跟进（逾期看 overdueDays）：
    · 小D（数学）：status=未交，overdueDays=3
    · 小E（物理）：status=已批改，订正 2 道未完成
    · 小A：「判别式」28 天内第 3 次记到概念模糊
      → homework-tracker 已生成待确认的弱项条目，等你确认
  今日可顺带：
    · 17:30 小A → 上次错题 1 道，课前 5 分钟复盘

💬 家长沟通提醒                  ← parentCommunicationLogs[] + studentCards[].consent
  久未联系：1 位
    · 小D：上次沟通 05-14（21 天前，channel=私聊文字）
      → 本周可以说一声
  值得主动说一句：1 位
    · 小E：订正 2 道还没做完，下节课课上补 → 说一下课上的安排即可，不催交
  待确认：1 条
    · 小F：周三调到周五 → 待家长确认
  说明：小G 的 parentCommunicationAllowed=false，
        本区块不出现，也不提示发消息

💰 课时包与续课节点              ← coursePackageLedger[]
  待你确认的课时：1 条
    · 小A：06-01 那节 1 课时 → 确认后剩余从 3 变 2
      → 去 lesson-log 确认（本工作台不代确认）
  续课关注：2 位
    · 小A：剩 3 课时（未含 1 条待确认）·
      课时包 2026-06-30 到期
    · 小C：剩 3 课时 · 课时包 2026-06-30 到期
  续课节点：已用 50% / 70%（与 renewal-report 同一口径）

⭐ 今日最重要的三件事
  1. 确认小A 的课时并看一眼「判别式」
     依据：pendingConfirmations 1 条；
           homework-tracker 报了 28 天内第 3 次（概念模糊）
     动作：18:30 下课后到 lesson-log 确认课时；
           顺手在 homework-tracker 里决定这条弱项要不要进学员卡
  2. 看小D 的课上练习
     依据：overdueDays=3（约定的那节课也没补上）
     动作：课上先问一句卡在哪个知识点；
           下节课的课上练习先减到 5 题
  3. 跟小D 家长说一声
     依据：parentCommunicationLogs 最近一条 05-14，已 21 天
     依据：consent.parentCommunicationAllowed=true
     动作：只说课上练习的调整，不催交，不提"拖延"两个字
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 这份示例演示的几条规则

- **每条风险都带依据和日期**：不写"小D 作业不行"，写"overdueDays=3"。
- **逾期看 `overdueDays`，不看 `status`**：`status` 枚举里没有 `overdue`。
- **"上次"按 `lessonLogs[].date` 倒序取**，不按写入顺序。
- **剩余课时注明"未含 N 条待确认"**：否则老师会按虚高的数字判断续课。
- **课时确认转 lesson-log**：工作台不动课时台账。
- **未授权的学员不出现在家长区块**：`parentCommunicationAllowed=false` 就整条不提。
- **三件事的"动作"是可执行的**，不是"多关注一下"。

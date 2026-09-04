# 资源五大类：用途、入库要求与示例

> 适用学段：小学中段 / 小学高段 / 初中 / 高中
> 示例题验算：2026-09-03
> 配合 `xiaozhi-teach-resource-library` §四使用。标签与检索规则见 `resource-categorization.md`，版权格式见 `copyright-annotation-template.md`。
> 字段名以 `solo-teacher-workspace.schema.json` 的 `resourceIndexItem` 为准；`resourceType` 只能取七档枚举之一：题目 / 讲义 / 课件 / 板书 / 讲评话术 / 错因案例 / 家长话术。

---

## 一、讲义

```text
■ 用途
  · 课前预习材料、课中讲义、课后复习材料

■ 入库要求
  · resourceType = 讲义
  · subject + knowledgePoint + difficulty
  · copyrightStatus（必填）
  · gradeLevel

■ 示例
  resourceId：R-H001
  title：一次函数图象的三个基本变换
  resourceType：讲义
  subject：数学
  knowledgePoint：一次函数图象
  difficulty：中等
  gradeLevel：八年级
  copyrightStatus：自有
  aiGenerated：false
  usageNotes：2026-09-04 小A 用过，图象平移部分讲得偏快，下次拆成两步
```

⚠️ 不记"适用学员类型"，也不记"关联学员化名"——前者会导致照标签发讲义，后者让资源库和学员卡对得上号，脱敏就白做了。

---

## 二、题目

```text
■ 入库要求
  · resourceType = 题目
  · subject + knowledgePoint + difficulty（四档枚举）
  · copyrightStatus（必填；教辅原题与真题一律"仅存索引"）
  · aiGenerated / verifiedByTeacher（AI 生成的必填）

■ 示例①（自有，已验算）
  resourceId：R-Q001
  title：一次函数与坐标轴围成三角形面积
  resourceType：题目
  subject：数学
  knowledgePoint：一次函数图象
  difficulty：中等
  gradeLevel：八年级
  copyrightStatus：自有
  aiGenerated：false
  usageNotes：题干"直线 y=2x+4 与两坐标轴围成的三角形面积是多少"
              答案 4（与 x 轴交于 (-2,0)，与 y 轴交于 (0,4)，
              面积 = 2×4÷2 = 4）。整数解，条件充分，八年级范围内。

■ 示例②（AI 生成，待验算）
  resourceId：R-Q002
  title：【AI 生成，入库前请人工验算】移项变号纯净版 8 题
  resourceType：题目
  knowledgePoint：一元一次方程移项
  difficulty：基础
  copyrightStatus：自有
  aiGenerated：true
  verifiedByTeacher：false
  usageNotes：【AI 生成，入库前请人工验算】老师逐题算过后把
              verifiedByTeacher 改为 true，并删掉标题里的标注

■ 示例③（教辅原题）
  resourceId：R-Q003
  title：某教辅八年级一次函数专题（仅记出处）
  resourceType：题目
  knowledgePoint：一次函数应用
  difficulty：提升
  copyrightStatus：仅存索引
  usageNotes：某教辅 八年级上 第 46 页 第 7 题。不录入题干，
              用时请翻书。
```

⚠️ 不记"预估 P（难度系数）"。一对一场景下没有可靠的群体作答数据，凭感觉填一个 0.65 只是给数字披了层专业外衣；`difficulty` 四档已经够用。

---

## 三、讲评话术

```text
■ 用途
  · 错题讲评、行为反馈、课堂过渡

■ 入库要求
  · resourceType = 讲评话术
  · knowledgePoint 或对应的错因维度（shared/vocab.md §1 四维）
  · usageNotes 记效果事实

■ 示例
  resourceId：R-P001
  title：概念模糊类错题的开场提问
  resourceType：讲评话术
  knowledgePoint：通用（概念模糊）
  copyrightStatus：自有
  usageNotes：话术——"这道题的关键是 [概念]，你能用一句话
              给我讲一遍这个概念吗？"
              2026-09-04 小A 用过：能复述定义但说不清适用条件，
              据此判断为概念模糊而非计算失误。
```

⚠️ 效果只写发生了什么，不写"80% 学员能复述"这类没有出处的比例。

---

## 四、错因案例

```text
■ 入库要求
  · resourceType = 错因案例
  · 错因维度取 shared/vocab.md §1 四维（老师端七类先映射回四维）
  · 完全脱敏：代称与学员卡的 alias 不同，学段模糊，无学校/日期细节

■ 示例
  resourceId：R-E001
  title：用算术法硬解方程问题（方法用错）
  resourceType：错因案例
  knowledgePoint：一元一次方程应用
  copyrightStatus：自有
  usageNotes：背景——某初中学员，列方程题一律改用算术法倒推，
              绕三四步后出错。
              维度——方法用错（teacherCategory：策略错误）。
              应对——先画线段图找等量关系，再要求必须设未知数。
              效果——两周内三道同类题，前两道仍倒推，第三道自己设了
              未知数并做对；按 shared/vocab.md §5 还需再一次独立验证
              才算攻克。
              脱敏检查：✅ 无姓名/学校/日期/家长信息，代称与学员卡不同
```

---

## 五、教案 / 课件 / 板书

```text
■ 入库要求
  · resourceType = 课件 或 板书（"教案"不在枚举内，
    完整教案按 讲义 存，或拆成课件 + 板书）
  · subject + knowledgePoint
  · copyrightStatus

■ 示例
  resourceId：R-L001
  title：一次函数复习课板书设计
  resourceType：板书
  subject：数学
  knowledgePoint：一次函数图象
  gradeLevel：八年级
  copyrightStatus：自有
  usageNotes：关联 R-H001（讲义）、R-Q001（题）。
              2026-09-04 小A 用过：图象与解析式对照的那一栏最有用，
              左侧的定义罗列可以删掉。
```

⚠️ 效果只写这次实际发生的事，不写"得分率 78%""分层目标全部达成"——一对一没有可比的群体数据，这类数字无处可考。

---

## 六、入库前统一检查

- [ ] `resourceType` 是否取自七档枚举
- [ ] `copyrightStatus` 是否填了；教辅原题/真题是否为"仅存索引"且未录题干
- [ ] `knowledgePoint` 与 `difficulty` 是否填了
- [ ] AI 生成的是否 `aiGenerated=true` 并带【AI 生成，入库前请人工验算】
- [ ] 自有题是否自己算过一遍（有解、唯一、条件充分、数值友好、学段内）
- [ ] 错因案例是否过了脱敏清单，代称是否与学员卡的 alias 不同
- [ ] `usageNotes` 里写的是事实，不是"效果很好"

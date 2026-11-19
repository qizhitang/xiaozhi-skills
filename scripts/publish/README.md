# 发布脚本（scripts/publish/）

把仓库里的技能包打包并发布到两个市场，再核对线上版本。**只发内容有变的技能**：每个技能的版本号是它最后一次改动所在的发布版本，没变的技能停在旧版本，发布时跳过（见下方“版本号”）。

**原则：脚本进仓库，凭据留在仓库外。** 这里的任何文件都不含 token；两个市场的 CLI 各自维护自己的凭据文件，脚本只通过环境变量指路。`_common.py` 会拒绝运行在仓库内的凭据文件。

## 文件

| 文件 | 做什么 |
|---|---|
| `stage.py` | 把仓库形态打包成市场形态：`metadata.*` 投影回顶层（两个市场的解析器只认顶层 `key: value`），折叠 description 展平，补 slug / displayName / summary；version 用这个技能自己的版本号（SKILL.md 的 `metadata.version`）。只复制 git 跟踪的与没被忽略的新文件，与发布清单算内容哈希的是同一批 |
| `publish_skillhub.py` | 发布到 SkillHub，**只发线上还不是自己版本的技能**：本机发布记录里已发过的、线上已提交到这个版本的都跳过（换了电脑、记录丢了也不会重发）；有还没升版本号的改动（内容与发布清单对不上）时拒绝发布。配额紧时多轮：尽力发一轮→休 30 分钟→再来，最多 40 轮。安全整改改动最大的 16 个老师端技能排最前。发完自动跑核对。`--only a,b` 只发这几个：要先拿平台审核结论时用；之后不带参数重跑，已发的不重发。`--dry-run` 列出要发哪几个 |
| （SkillHub 限流） | **2026-11-06 补充：更像滚动 24 小时计数，下面的“固定窗口”说法不准。** 前一天 14:16–14:50 UTC 发了 85 个，次日 14:26 起只放行 4 个就 429，此后随前一天的发布逐条过期陆续放行，14:33–14:58 连发 64 个没再限流。多轮循环照样能等过去，只是别按固定时刻排计划。旧观察：**100 次 / 24 小时窗口，窗口从上一窗口过期后的第一次发布算起**（不是滑动窗口）。三个窗口都严丝合缝：09-05 08:00 起 58+42=100 后卡住，09-06 08:20 起 16+58+26=100 后卡住，09-07 08:34 窗口一开剩下 32 个一轮放行。所以当时（全库 58 个包）一个窗口只够一次全量发布加 42 个零头；全库 84 个包时，全量重发一次就几乎占满一天的额度。**改为按技能版本发布后**（见下方“版本号”），一次发布只占改动了的那几个的额度；只有共享约定（`shared/`）或契约版本变了，才会牵动大多数技能。多轮循环会自己等（每 30 分钟一轮、最多 40 轮 ≈ 20 小时），卡住不用干预；40 轮用尽就重跑，已发的不重发 |
| `publish_clawhub.py` | 发布到 ClawHub，只发还没以自己版本发过的技能（记录丢了时重发会报 already exists，核实线上与打包一致后记为已发）；有还没升版本号的改动时拒绝发布。一轮发完，断点续跑。`xiaozhi-chinese-classical-revival` 的 slug 在 ClawHub 上重定向到一个审核隐藏的旧条目，只能就地发到 `chinese-classical-revival`，版本号映射为 `1000000.<patch>.0` |
| `verify_publish.py` | 查 SkillHub 线上实际版本，逐个技能与它自己的版本号比对（不是 `package.json` 的发布版本），写 `verify-report.md`。看板列表按更新时间倒序、每页 20 条，发布刚结束时平台异步审核会让条目在翻页途中换位，出现重复或漏项就整遍重翻。报告区分“已提交”与“已审核通过”：审核中的版本用户暂时装不到，但不算发布失败；平台判了不通过（`reviewStatus` 为 rejected）的单列，附平台说明与具体的拒绝标签（如“内容含涉政内容”，取自逐个技能版本列表的 `contentAuditRejectLabel`，看板列表里没有），退出码 1——这种不会自己好转，要改内容发新版本或去平台申诉 |
| `withdraw_clawhub.py` | 撤回某个版本区间的旧版本（`2.1.4 2.1.11` 含两端），保留 latest 与区间外的版本。默认预演，加 `--yes` 才真撤；进度写 `withdrawn-clawhub.json`，可中断续跑。底层是 `clawhub delete <slug> --version`：制品保留、版本号占位，`clawhub undelete <slug> --version <v>` 可恢复 |
| `fetch_scans.py` | 拉 ClawHub 对各技能当前版本的安全扫描（停在旧版本的技能拉它那个版本的报告，每份汇总都是全库的完整状态）（ClawScan 判定 + SkillSpector 逐条证据），汇总成 `scan_summary_<版本>.json`；`--compare <上一版 summary>` 打印翻转表。ClawHub 发布后 3–5 分钟先落一份只有判定与摘要的快照，10–30 分钟后才补维度与逐条证据；快照记为 `complete: false`，重跑会重拉，直到退出码为 0 才算拉齐。全量报告之后约 1–1.5 小时，平台还会复核一部分技能、改写判定（可能翻转），所以拉齐后隔一两个小时再跑一次 `--refresh`（已有全量报告的也重拉，并列出被改写的），以那一遍为准 |
| `bump_version.py` | 升版 `<旧> <新>`：先同步技能内副本，再给内容与发布清单不一样的技能（含新技能）升到新版本，清单同步；package.json / package-lock 根包、README / docs / changelog 的“当前版本”跟着改，技能索引重生成。没有任何未发布的改动时拒绝升版。档案结构或交接协议（schema）改了时加 `--contract`：契约版本也升到新版本，各处 `protocolVersion` / `schemaVersion`、两个主 schema 的版本枚举、学习DNA 的 schemas/README 与 validate.js 夹具一起改，漏改的会列出来。跑完 `npm run check` |
| `compare_scans.py` | 两个版本的翻转表（转好 / 变差 / 仍 suspicious），把仍 suspicious 的按证据归类：报告不完整（只拉到快照，重拉）/ 仅摘要 / 随包 schema（分发层的事）/ 技能自身；`--evidence` 逐条列 file:line 与判词。SQP-3 与 AE1 不追 |

## 版本号

三个版本号各管一件事（实现与核对见 `scripts/package-versions.mjs`，进 `npm run check`）：

| 版本号 | 在哪 | 什么时候升 |
|---|---|---|
| 发布版本 | `package.json` 的 `version` | 每次升版。README 与 docs 的“当前版本”、changelog 的版本节写它 |
| 技能包版本 | 各 `SKILL.md` 的 `metadata.version` | 这个技能的包内容变了才升，值是它最后一次改动所在的发布版本；市场上的版本号就是它 |
| 契约版本 | `package.json` 的 `contractVersion` | 档案结构或交接协议（schema）变了才升（`bump_version.py --contract`）；`schemaVersion` / `protocolVersion` 与它一致 |

发布清单 `scripts/snapshots/package-versions.json` 记每个技能当前版本对应的内容哈希，也就是市场上那个版本的样子。内容与清单对不上就是“未发布的改动”：开发中正常，`npm run check` 只列出来；升版时这些技能升到新版本；发布脚本见到它们会拒绝发布。不要手改清单或技能的版本号，一律走 `bump_version.py`。

中间产物（打包目录、进度、日志、报告）默认写到 `~/.xiaozhi-publish/work/`，不进仓库——放仓库内会被 `check-references` 当成真技能扫到。可用 `XIAOZHI_PUBLISH_WORK` 改。

## 一次性准备

```bash
# SkillHub：市场方的 Python 工具包，会自升级，不进仓库
#   放到 ~/.xiaozhi-publish/kit/cli/skills_store_cli.py，或设 SKILLHUB_CLI 指向它
python ~/.xiaozhi-publish/kit/cli/skills_store_cli.py login        # 凭据写入 ~/.skillhub/credentials.json

# ClawHub：npm 包。放仓库 node_modules（devDependency）或全局；都没有时脚本会 npx 按固定版本拉
npx -y clawhub@0.23.3 login --token <你的 token>                    # 写到 CLAWHUB_CONFIG_PATH（默认 ~/.xiaozhi-publish/clawhub-config.json）
```

## 日常

改完内容、`npm run check` 通过后：

```bash
npm run versions                                     # 看哪些技能有未发布的改动（下次升版会升这些）
python scripts/publish/bump_version.py 2.12.7 2.12.8 # 升版：只有这些技能升到 2.12.8；schema 改了加 --contract
npm run check
python scripts/publish/publish_clawhub.py            # ClawHub，只发升了版本的
python scripts/publish/publish_skillhub.py           # SkillHub，只发升了版本的；配额紧时多轮等待，可挂成计划任务
python scripts/publish/verify_publish.py             # 随时核对 SkillHub
```

发布前先 `npm run check`——技能包版本与发布清单一致、示例题验算不过期（A2）、文档不落后（D2–D5）都在里面，未发布的改动也会列出来。**同一个版本号不能对应两份不同的内容**：随包内容（`shared/` 六份约定、references、schema 副本）变了的技能，升版时由 `bump_version.py` 升版本号；发布脚本见到没升版本号的改动会拒绝发布。

## 计划任务（Windows）

`publish_skillhub.py` 遇到配额紧时要多轮等待，适合挂成 `schtasks`。它从仓库现打包、按各技能自己的版本号发，任务不需要改参数；发完自动核对并写日志。

```
schtasks /Create /TN xiaozhi-skillhub-publish /SC ONCE /SD <日期> /ST 08:00 ^
  /TR "\"C:\Python314\python.exe\" \"D:\github\xiaozhi-skills\scripts\publish\publish_skillhub.py\""
```

## 为什么 ClawHub 的扫描判定会变

ClawScan 是 LLM 判定。同一版本的报告重下一次可能不同，只改版本号一行的重发也可能从 clean 翻成 suspicious（v2.1.2 有 4 个）。所以对比两版扫描时，要先用 staged 包做逐字节 diff 区分「内容真的改了」与「重扫噪声」，再看 GUIDANCE 里指的是不是真实矛盾。追求全部 clean 靠改内容做不到；能做的是消除真实矛盾，并把每次的 `scan_summary` 存下来。

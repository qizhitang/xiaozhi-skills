# 发布脚本（scripts/publish/）

把仓库里的 58 个技能打包并发布到两个市场，再核对线上版本。

**原则：脚本进仓库，凭据留在仓库外。** 这里的任何文件都不含 token；两个市场的 CLI 各自维护自己的凭据文件，脚本只通过环境变量指路。`_common.py` 会拒绝运行在仓库内的凭据文件。

## 文件

| 文件 | 做什么 |
|---|---|
| `stage.py` | 把仓库形态打包成市场形态：`metadata.*` 投影回顶层（两个市场的解析器只认顶层 `key: value`），折叠 description 展平，补 slug / displayName / summary，version 取 `package.json` |
| `publish_skillhub.py` | 多轮发布到 SkillHub。它的配额一轮发不完（约 40 个/窗口，之后持续 429），所以尽力发一轮→休 30 分钟→再来，最多 40 轮。安全整改改动最大的 16 个老师端技能排最前。发完自动跑核对 |
| `publish_clawhub.py` | 一轮发完 ClawHub，断点续跑。`xiaozhi-chinese-classical-revival` 的 slug 在 ClawHub 上重定向到一个审核隐藏的旧条目，只能就地发到 `chinese-classical-revival`，版本号映射为 `1000000.<patch>.0` |
| `verify_publish.py` | 查 SkillHub 线上实际版本，与 `package.json` 比对，写 `verify-report.md` |
| `fetch_scans.py` | 拉 ClawHub 对当前版本的安全扫描（ClawScan 判定 + SkillSpector 逐条证据），汇总成 `scan_summary_<版本>.json`；`--compare <上一版 summary>` 打印翻转表。报告未生成的条目重跑会再试 |
| `compare_scans.py` | 两个版本的翻转表（转好 / 变差 / 仍 suspicious），把仍 suspicious 的按证据归类：报告不完整（扫描器故障）/ 仅摘要 / 随包 schema（分发层的事）/ 技能自身；`--evidence` 逐条列 file:line 与判词。SQP-3 与 AE1 不追 |

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

```bash
python scripts/publish/publish_clawhub.py            # ClawHub，几分钟
python scripts/publish/publish_skillhub.py           # SkillHub，可能跑几小时；可挂成计划任务
python scripts/publish/verify_publish.py             # 随时核对 SkillHub
```

发布前先 `npm run check`——版本号统一（D1）、示例题验算不过期（A2）、文档不落后（D2–D5）都在里面。**随包分发的内容变了就必须升版本号**：`shared/` 六份约定和 references 都进包，同一版本号下两份不同内容是 D1 存在的理由。

## 计划任务（Windows）

`publish_skillhub.py` 跑得久且要等配额，适合挂成 `schtasks`。它从仓库现打包、读 `package.json` 定版本，所以任务不需要改参数；发完自动核对并写日志。

```
schtasks /Create /TN xiaozhi-skillhub-publish /SC ONCE /SD <日期> /ST 08:00 ^
  /TR "\"C:\Python314\python.exe\" \"D:\github\xiaozhi-skills\scripts\publish\publish_skillhub.py\""
```

## 为什么 ClawHub 的扫描判定会变

ClawScan 是 LLM 判定。同一版本的报告重下一次可能不同，只改版本号一行的重发也可能从 clean 翻成 suspicious（v2.1.2 有 4 个）。所以对比两版扫描时，要先用 staged 包做逐字节 diff 区分「内容真的改了」与「重扫噪声」，再看 GUIDANCE 里指的是不是真实矛盾。追求 58/58 clean 靠改内容做不到；能做的是消除真实矛盾，并把每次的 `scan_summary` 存下来。

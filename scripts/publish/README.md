# 发布链路

把仓库里的 SKILL 目录打包成两个市场认的形态并上架，再核对线上版本。

**脚本进仓库，凭据留在仓库外。** 这里没有任何 token；两个市场的 CLI 各自维护自己的
凭据文件，脚本只通过环境变量指路。`_common.py` 会拒绝运行在仓库内找到的配置文件——
ClawHub 的配置里是明文 token，进了 git 就等于泄露。

## 用法

```bash
python scripts/publish/stage.py <输出目录>       # 只打包，看看会发出去什么
python scripts/publish/publish_clawhub.py        # 发 ClawHub（无配额，一轮发完）
python scripts/publish/publish_skillhub.py       # 发 SkillHub（多轮，见下）
python scripts/publish/verify_publish.py         # 核对 SkillHub 线上版本
```

都支持 `--dry-run`。版本号一律取 `package.json`，不用手填——升版就是改 `package.json`
再跑 `npm run check`，发布脚本自然跟上。

## 打包做了什么

仓库的 frontmatter 顶层只有 Agent Skills 官方字段，本库自有字段在 `metadata:` 块内
（`shared/platform-conventions.md` §六）。两个市场的解析器只认顶层 `key: value`，
SkillHub 的尤其朴素——折叠式 `description: >` 会被它读成 `">"`。所以 `stage.py` 把
`metadata.*` 投影回顶层、展平 description、补 `slug`/`displayName`/`summary`。

正文与 `references/`、`shared/` 原样复制。**打包只改 frontmatter 形态，不改内容。**

## 两个市场的差异

| | ClawHub | SkillHub |
|---|---|---|
| 配额 | 无，58 个一轮发完 | 约 40 多个/窗口，之后持续 429，两小时不恢复 |
| 显示名 | 不传 `--name` 会按 slug 生成机翻英文名 | 读 frontmatter |
| 安全扫描 | 每个版本跑 ClawScan + SkillSpector | 无 |
| 版本号 | 不强制单调，但 `latest` 标签跟最高 semver | 不强制 |

SkillHub 的配额是这里最麻烦的东西。`publish_skillhub.py` 不做长退避空等，而是
「尽力发一轮 → 休 30 分钟 → 再来一轮」，让每轮吃掉窗口里能用的额度；安全整改改动最大的
16 个老师端技能排最前（脚本里的 `PRIORITY`），保证配额有限时先补上真正有风险的那些。

## 需要仓库外准备的东西

| 东西 | 默认位置 | 覆盖用的环境变量 |
|---|---|---|
| SkillHub CLI（市场方发的工具包，会自升级） | `~/.xiaozhi-publish/kit/cli/skills_store_cli.py` | `SKILLHUB_CLI` |
| SkillHub 凭据（CLI 登录后自己写的） | `~/.skillhub/credentials.json` | `SKILLHUB_CREDENTIALS` |
| ClawHub CLI | 仓库 `node_modules/.bin/` → 全局 → `npx clawhub@0.23.3` | `CLAWHUB_BIN` |
| ClawHub 配置（**含明文 token**） | `~/.xiaozhi-publish/clawhub-config.json` | `CLAWHUB_CONFIG_PATH` |

中间产物（暂存目录、发布进度、日志、核对报告）写在 **`~/.xiaozhi-publish/work/`**，在仓库外。
换个位置就设 `XIAOZHI_PUBLISH_WORK`——但**别放进仓库**：`check-references` / `check-skills`
是按目录树走的，暂存出来的 58 个包会被当成真技能扫到（试过一次，116 个 SKILL、1263 个错误）。

## 一个历史包袱

`xiaozhi-chinese-classical-revival` 在 ClawHub 上的 slug 重定向到一个**被审核隐藏**的目标
`chinese-classical-revival`，2.1.x 号段发不上去，线上只有 1000000.x 号段可用。
`publish_clawhub.py` 的 `SPECIAL_SLUG` / `special_version()` 就是为它准备的——
把 `2.1.4` 映射成 `1000000.4.0`。这是权宜之计，正解是向 ClawHub moderator 申诉恢复。

## 定时发布

SkillHub 配额耗尽时可以挂计划任务等窗口恢复。Windows：

```bash
schtasks /Create /TN "xiaozhi-skillhub-publish" \
  /TR "\"C:\Python314\python.exe\" \"D:\github\xiaozhi-skills\scripts\publish\publish_skillhub.py\"" \
  /SC ONCE /SD 09/05/2026 /ST 08:00 /F
```

`publish_skillhub.py` 跑完会自动调一次 `verify_publish.py`，结论进 `.work/publish.log`
和 `.work/verify-report.md`，所以不必另外排核对任务。

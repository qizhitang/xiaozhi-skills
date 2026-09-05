#!/usr/bin/env python3
"""发布脚本的公共部分：仓库定位、版本号、CLI 查找、日志。

设计原则：**脚本进仓库，凭据留在仓库外。**
两个市场的 CLI 各自维护自己的凭据文件，本目录下的脚本只通过环境变量指路，
不读取、不复制、不打印任何 token。
"""
import io, json, os, shutil, sys, time

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
# 中间产物默认放仓库外：放仓库内会被 check-references / check-skills 当成真技能扫到
WORK = os.environ.get("XIAOZHI_PUBLISH_WORK") or os.path.join(
    os.path.expanduser("~/.xiaozhi-publish"), "work")

CLAWHUB_PINNED = "clawhub@0.23.3"
# 凭据默认位置（仓库外）。SkillHub CLI 自己维护 ~/.skillhub/credentials.json。
DEFAULT_TOOLS = os.path.expanduser("~/.xiaozhi-publish")


def version():
    with open(os.path.join(REPO, "package.json"), encoding="utf-8") as f:
        return json.load(f)["version"]


def workdir(*parts):
    p = os.path.join(WORK, *parts)
    os.makedirs(os.path.dirname(p) if os.path.splitext(p)[1] else p, exist_ok=True)
    return p


def log(msg, logfile=None):
    line = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line, flush=True)
    if logfile:
        os.makedirs(os.path.dirname(logfile), exist_ok=True)
        with open(logfile, "a", encoding="utf-8") as f:
            f.write(line + "\n")


def skill_dirs():
    """仓库里所有 SKILL 目录：{目录名: 绝对路径}。"""
    out = {}
    for side in ("student", "teacher", "tools"):
        for r, ds, fs in os.walk(os.path.join(REPO, side)):
            if "SKILL.md" in fs and "shared" not in r.replace("\\", "/").split("/"):
                out[os.path.basename(r)] = r
    return out


def skillhub_cli():
    """SkillHub CLI（Python）。它不在仓库里——是市场方发的工具包，会自升级。"""
    p = os.environ.get("SKILLHUB_CLI") or os.path.join(DEFAULT_TOOLS, "kit", "cli", "skills_store_cli.py")
    if not os.path.exists(p):
        sys.exit(f"找不到 SkillHub CLI：{p}\n"
                 f"设 SKILLHUB_CLI 指向 skills_store_cli.py，或把工具包放到 {DEFAULT_TOOLS}/kit/")
    return p


def clawhub_cli():
    """ClawHub CLI（npm）。优先仓库 node_modules，其次全局，最后 npx 按固定版本拉。"""
    env = os.environ.get("CLAWHUB_BIN")
    if env and os.path.exists(env):
        return [env]
    for base in (REPO, DEFAULT_TOOLS):
        for name in ("clawhub.cmd", "clawhub"):
            p = os.path.join(base, "node_modules", ".bin", name)
            if os.path.exists(p):
                return [p]
    if shutil.which("clawhub"):
        return ["clawhub"]
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if npx:
        return [npx, "-y", CLAWHUB_PINNED]
    sys.exit("找不到 ClawHub CLI：装 npm 后重试，或设 CLAWHUB_BIN 指向可执行文件")


def clawhub_env():
    """ClawHub CLI 的配置文件（含 token）必须在仓库外。"""
    cfg = os.environ.get("CLAWHUB_CONFIG_PATH") or os.path.join(DEFAULT_TOOLS, "clawhub-config.json")
    if not os.path.exists(cfg):
        sys.exit(f"找不到 ClawHub 配置：{cfg}\n设 CLAWHUB_CONFIG_PATH，或先 clawhub login --token <token>")
    if os.path.abspath(cfg).startswith(os.path.abspath(REPO) + os.sep):
        sys.exit(f"拒绝运行：ClawHub 配置在仓库内（{cfg}），里面是明文 token。请移到仓库外。")
    return dict(os.environ, CLAWHUB_CONFIG_PATH=cfg, CLAWHUB_DISABLE_TELEMETRY="1")


def skillhub_env():
    cfg = os.environ.get("SKILLHUB_CONFIG_PATH") or os.path.join(DEFAULT_TOOLS, "skillhub-config.json")
    e = dict(os.environ)
    if os.path.exists(cfg):
        if os.path.abspath(cfg).startswith(os.path.abspath(REPO) + os.sep):
            sys.exit(f"拒绝运行：SkillHub 配置在仓库内（{cfg}）。请移到仓库外。")
        e["SKILLHUB_CONFIG_PATH"] = cfg
    return e

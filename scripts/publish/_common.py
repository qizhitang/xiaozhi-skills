#!/usr/bin/env python3
"""发布脚本的公共部分：仓库定位、版本号、CLI 查找、日志。

设计原则：**脚本进仓库，凭据留在仓库外。**
两个市场的 CLI 各自维护自己的凭据文件，本目录下的脚本只通过环境变量指路，
不读取、不复制、不打印任何 token。
"""
import io, json, os, re, shutil, subprocess, sys, time

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
    """发布版本（package.json 的 version）：每次升版都升，README 与 docs 的“当前版本”写它。"""
    with open(os.path.join(REPO, "package.json"), encoding="utf-8") as f:
        return json.load(f)["version"]


def contract_version():
    """契约版本（package.json 的 contractVersion）：档案结构与交接协议的版本，只在 schema 变化时升。"""
    with open(os.path.join(REPO, "package.json"), encoding="utf-8") as f:
        return json.load(f)["contractVersion"]


_VERSION_LINE = re.compile(r"^[ \t]+version:[ \t]*(\S+)[ \t]*$", re.M)


def skill_version(path):
    """一个技能自己的版本号：SKILL.md frontmatter 的 metadata.version（它最后一次改动所在的发布版本）。"""
    text = open(os.path.join(path, "SKILL.md"), encoding="utf-8").read().replace("\r\n", "\n")
    m = re.match(r"^---\n(.*?)\n---(\n|$)", text, re.S)
    v = _VERSION_LINE.search(m.group(1)) if m else None
    if not v:
        sys.exit(f"{path}/SKILL.md 的 frontmatter 里没有 version")
    return v.group(1)


def skill_versions():
    """{技能目录名: 它自己的版本号}。两个市场上每个技能的版本号以这里为准，不是 package.json。"""
    return {name: skill_version(path) for name, path in skill_dirs().items()}


def package_status():
    """发布清单的状态（scripts/package-versions.mjs --json）：各技能版本、内容哈希，以及未发布的改动。"""
    node = shutil.which("node") or shutil.which("node.exe")
    if not node:
        sys.exit("找不到 node：发布前要用 scripts/package-versions.mjs 核对技能包版本")
    r = subprocess.run([node, os.path.join(REPO, "scripts", "package-versions.mjs"), "--json"],
                       capture_output=True, text=True, encoding="utf-8", cwd=REPO, timeout=300)
    if r.returncode != 0:
        sys.exit("读发布清单失败：" + ((r.stdout or "") + (r.stderr or "")).strip()[:400])
    return json.loads(r.stdout)


def require_released():
    """发布前的闸：有未发布的改动（内容与发布清单不一致、新技能、已删技能）就不许发——
    否则同一个版本号在市场上会对应两份不同的内容。返回 {技能: 版本}。"""
    st = package_status()
    p = st["pending"]
    if p["changed"] or p["added"] or p["removed"]:
        parts = [f"{k} {len(v)} 个：{'、'.join(v)}" for k, v in
                 (("内容有改动", p["changed"]), ("新技能", p["added"]), ("已删掉", p["removed"])) if v]
        sys.exit("有还没升版本号的改动，先升版再发布（python scripts/publish/bump_version.py "
                 f"{st['release']} <新版本>）：\n  " + "\n  ".join(parts))
    return {name: s["version"] for name, s in st["skills"].items()}


def package_files(path):
    """技能目录里会被打包的文件（相对技能目录）：git 跟踪的与没被忽略的新文件，和发布清单算哈希用的是同一批。
    git 不可用时退回遍历目录（跳过点开头的、__pycache__、node_modules）。"""
    rel = os.path.relpath(path, REPO).replace(os.sep, "/")
    try:
        out = subprocess.run(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", rel],
                             capture_output=True, cwd=REPO, timeout=120, check=True).stdout.decode("utf-8")
        files = [f for f in out.split("\0") if f and os.path.exists(os.path.join(REPO, f))]
        return sorted({f[len(rel) + 1:] for f in files})
    except Exception:
        out = []
        for r, ds, fs in os.walk(path):
            ds[:] = [d for d in ds if not d.startswith(".") and d not in ("__pycache__", "node_modules")]
            out += [os.path.relpath(os.path.join(r, f), path).replace(os.sep, "/") for f in fs if not f.startswith(".")]
        return sorted(out)


def clawhub_remote_version(ver):
    """古文对话（ClawHub slug chinese-classical-revival）的线上版本号。

    它只能发到一个历史版本号为 1000000.0.0 的旧条目上，所以本库版本要映射到更大的号才能成为 latest：
    2.1.N → 1000000.N.0（已发布的都是这个编号），2.M.N → (1000000 + M − 1).N.0。
    例：2.1.13 → 1000000.13.0，2.2.0 → 1000001.0.0，保证跨小版本也单调递增。
    """
    major, minor, patch = (int(x) for x in ver.split("."))
    assert major == 2, f"古文对话的线上编号只为 2.x 设计：{ver}"
    return f"{1000000 + minor - 1}.{patch}.0"


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

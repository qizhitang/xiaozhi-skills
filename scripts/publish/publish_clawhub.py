#!/usr/bin/env python3
"""发布全库到 ClawHub。

与 SkillHub 的差别：
  - 没有发布配额，一轮能发完
  - 会从 slug 自动生成英文显示名，所以必须显式传 --name，否则线上会变成
    "Xiaozhi Chinese Grammar Tracker" 这类机翻名
  - 少数 slug 有历史包袱：某个技能的 slug 重定向到一个被审核隐藏的目标，
    2.1.x 号段不可用，只能在既有的高版本号上递增（见 SPECIAL）

凭据由 ClawHub CLI 的配置文件提供，必须在仓库外（_common.clawhub_env 会拒绝
仓库内的配置，因为那是明文 token）。

用法：
    python publish_clawhub.py            # 发全部
    python publish_clawhub.py --dry-run  # 预览，不发布
    python publish_clawhub.py <技能名>   # 只发一个
"""
import json, os, re, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import HERE, REPO, clawhub_cli, clawhub_env, log, version, workdir  # noqa: E402

STAGE = workdir("staged")
DONE_FILE = os.path.join(workdir(), "published-clawhub.json")
LOG = os.path.join(workdir(), "publish.log")

# 目录名 -> (上架 slug, 版本号)。slug 被重定向/占用时在此固定。
# chinese-classical-revival 的 xiaozhi- 前缀 slug 重定向到一个审核隐藏的目标，
# 2.1.x 发不上去；线上已有 1000000.x 号段，只能在其上递增。
SPECIAL_SLUG = {"xiaozhi-chinese-classical-revival": "chinese-classical-revival"}
SPECIAL_VER = {"xiaozhi-chinese-classical-revival": None}  # None = 运行时按 --version 算


def special_version(ver):
    """把 2.1.4 映射成 1000000.4.0：主号固定，次号取 patch。"""
    m = re.match(r"^\d+\.\d+\.(\d+)$", ver)
    return f"1000000.{m.group(1)}.0" if m else "1000000.0.0"


def display_name(path):
    fm = open(os.path.join(path, "SKILL.md"), encoding="utf-8").read().split("---")[1]
    m = re.search(r"^display_name:\s*(.+)$", fm, re.M)
    return m.group(1).strip() if m else ""


def restage(ver):
    import shutil
    shutil.rmtree(STAGE, ignore_errors=True)
    r = subprocess.run([sys.executable, os.path.join(HERE, "stage.py"), STAGE],
                       capture_output=True, text=True, encoding="utf-8", cwd=REPO, timeout=600)
    if not os.path.isdir(STAGE) or not os.listdir(STAGE):
        log("打包失败：" + ((r.stdout or "") + (r.stderr or ""))[:400], LOG)
        sys.exit(1)
    log(f"按仓库版本 {ver} 打包 {len(os.listdir(STAGE))} 个技能", LOG)


def main():
    ver = version()
    only = next((a for a in sys.argv[1:] if not a.startswith("-")), None)
    dry = "--dry-run" in sys.argv
    restage(ver)
    changelog = f"v{ver}：详见仓库 docs/changelog.md"
    cli, env = clawhub_cli(), clawhub_env()

    names = sorted(os.listdir(STAGE))
    if only:
        names = [n for n in names if n == only] or sys.exit(f"没有这个技能：{only}")
    done = json.load(open(DONE_FILE, encoding="utf-8")) if os.path.exists(DONE_FILE) else {}
    done = {k: v for k, v in done.items() if v.get("repoVersion") == ver}
    todo = [n for n in names if done.get(n, {}).get("ok") is not True]
    log(f"ClawHub：共 {len(names)} 个，待发 {len(todo)}" + ("（dry-run）" if dry else ""), LOG)

    for i, name in enumerate(todo, 1):
        path = os.path.join(STAGE, name)
        slug = SPECIAL_SLUG.get(name, name)
        v = special_version(ver) if name in SPECIAL_VER else ver
        base = cli + ["skill", "publish", path, "--version", v, "--slug", slug,
                      "--name", display_name(path), "--changelog", changelog, "--json"]
        if dry:
            base.append("--dry-run")
        for attempt, args in enumerate([base, base + ["--force"]], 1):
            try:
                r = subprocess.run(args, capture_output=True, text=True,
                                   encoding="utf-8", env=env, timeout=240)
            except subprocess.TimeoutExpired:
                done[name] = {"ok": False, "repoVersion": ver, "error": "timeout"}
                log(f"  [{i}/{len(todo)}] x {name}：超时", LOG)
                break
            out = (r.stdout or "") + (r.stderr or "")
            body = {}
            for m in re.finditer(r"\{[\s\S]*?\n\}", out):
                try:
                    body = json.loads(m.group(0))
                except Exception:
                    pass
            if body.get("ok") or '"status": "published"' in out or (r.returncode == 0 and body):
                done[name] = {"ok": True, "repoVersion": ver, "version": body.get("version"),
                              "slug": body.get("slug"), "files": body.get("fileCount")}
                log(f"  [{i}/{len(todo)}] OK {name} @{body.get('version')} "
                    f"files={body.get('fileCount')} name={body.get('displayName')}", LOG)
                break
            if attempt == 1 and re.search(r"force|conflict|fingerprint", out, re.I):
                log(f"  [{i}/{len(todo)}] .. {name} 需 --force，重试", LOG)
                continue
            done[name] = {"ok": False, "repoVersion": ver, "error": out.strip()[:220]}
            log(f"  [{i}/{len(todo)}] x {name}：{out.strip()[:140]}", LOG)
            break
        if not dry:
            json.dump(done, open(DONE_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        time.sleep(1.2)

    ok = [k for k, v in done.items() if v.get("ok")]
    bad = [(k, v.get("error")) for k, v in done.items() if not v.get("ok")]
    log(f"ClawHub 收工：成功 {len(ok)}/{len(names)}，失败 {len(bad)}", LOG)
    for k, e in bad:
        log(f"  x {k}: {str(e)[:160]}", LOG)
    return 0 if not bad else 1


if __name__ == "__main__":
    sys.exit(main())

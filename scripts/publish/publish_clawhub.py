#!/usr/bin/env python3
"""发布全库到 ClawHub。没有配额问题，一轮发完；已成功的跳过，可断点续跑。

ClawHub 的 token 由其 CLI 的配置文件持有（CLAWHUB_CONFIG_PATH，默认在仓库外的
~/.xiaozhi-publish/clawhub-config.json）。本脚本只把路径交给 CLI，不读它的内容。

用法：
    python publish_clawhub.py                 # 发全部
    python publish_clawhub.py --dry-run       # 只打包并列出
    python publish_clawhub.py --tag-latest    # 发完后把 latest 标到本版（版本号被更高的历史版本压住时用）
"""
import json, os, re, shutil, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import HERE, REPO, clawhub_cli, clawhub_env, log, version, workdir  # noqa: E402

STAGE = workdir("staged-clawhub")
DONE_FILE = os.path.join(workdir(), "published-clawhub.json")
LOG = os.path.join(workdir(), "publish-clawhub.log")

# 目录名 -> 线上 slug。xiaozhi-chinese-classical-revival 在 ClawHub 上的 slug 被重定向到
# 一个审核隐藏的旧条目 chinese-classical-revival，只能就地发到那个 slug；且它的历史版本号
# 是 1000000.0.0，所以本库的 2.1.N 在它那里映射为 1000000.N.0，否则 latest 会被压住。
SLUG_MAP = {"xiaozhi-chinese-classical-revival": "chinese-classical-revival"}


def remote_version(name, ver):
    if name in SLUG_MAP:
        patch = ver.split(".")[-1]
        return f"1000000.{patch}.0"
    return ver


def restage(ver):
    shutil.rmtree(STAGE, ignore_errors=True)
    r = subprocess.run([sys.executable, os.path.join(HERE, "stage.py"), STAGE],
                       capture_output=True, text=True, encoding="utf-8", cwd=REPO, timeout=600)
    if not os.path.isdir(STAGE) or not os.listdir(STAGE):
        log("打包失败：" + ((r.stdout or "") + (r.stderr or ""))[:400], LOG)
        sys.exit(1)
    log(f"按仓库版本 {ver} 打包 {len(os.listdir(STAGE))} 个技能 -> {STAGE}", LOG)


def display_name(path):
    fm = open(os.path.join(path, "SKILL.md"), encoding="utf-8").read().split("---")[1]
    m = re.search(r"^display_name:\s*(.+)$", fm, re.M)
    return m.group(1).strip() if m else os.path.basename(path)


def run_cli(args, env, timeout=300):
    cmd = clawhub_cli() + args
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", env=env, timeout=timeout)
    return r.returncode, (r.stdout or ""), (r.stderr or "")


def main():
    ver = version()
    restage(ver)
    env = clawhub_env()
    changelog = f"v{ver}：详见仓库 docs/changelog.md"
    names = sorted(os.listdir(STAGE))

    if "--dry-run" in sys.argv:
        log(f"dry-run：{len(names)} 个待发", LOG)
        for n in names[:8]:
            print(f"  {n} -> slug={SLUG_MAP.get(n, n)} version={remote_version(n, ver)}")
        return 0

    done = json.load(open(DONE_FILE, encoding="utf-8")) if os.path.exists(DONE_FILE) else {}
    done = {k: v for k, v in done.items() if v.get("repoVersion") == ver}

    for i, name in enumerate(names, 1):
        if done.get(name, {}).get("ok"):
            continue
        path = os.path.join(STAGE, name)
        slug, rver, disp = SLUG_MAP.get(name, name), remote_version(name, ver), display_name(path)
        code, out, err = run_cli(["skill", "publish", path, "--version", rver, "--slug", slug,
                                  "--name", disp, "--changelog", changelog, "--json"], env)
        body = {}
        for line in reversed(out.strip().splitlines()):
            if line.startswith("{"):
                try:
                    body = json.loads(line)
                    break
                except Exception:
                    pass
        ok = code == 0 and not body.get("error")
        done[name] = {"ok": ok, "repoVersion": ver, "version": rver, "slug": slug,
                      "name": disp, "error": None if ok else (body.get("error") or err or out)[:200]}
        log(f"[{i}/{len(names)}] {'OK' if ok else 'x '} {name} @{rver}" + ("" if ok else f": {done[name]['error'][:80]}"), LOG)
        json.dump(done, open(DONE_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        time.sleep(1.5)

    ok_n = sum(1 for v in done.values() if v.get("ok"))
    log(f"收工：成功 {ok_n}/{len(names)} @ {ver}", LOG)

    if "--tag-latest" in sys.argv:
        for name, v in done.items():
            if not v.get("ok"):
                continue
            code, out, err = run_cli(["skill", "tag", v["slug"], v["version"], "--tag", "latest", "--yes"], env)
            log(f"  tag latest {v['slug']} {v['version']}: {'OK' if code == 0 else (err or out)[:80]}", LOG)
    return 0 if ok_n == len(names) else 1


if __name__ == "__main__":
    sys.exit(main())

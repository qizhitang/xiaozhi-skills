#!/usr/bin/env python3
"""发布到 ClawHub：只发还没以自己版本发过的技能。没有配额问题，一轮发完；已成功的跳过，可断点续跑。

每个技能的版本号是它最后一次改动所在的发布版本（SKILL.md 的 metadata.version，见 scripts/package-versions.mjs）；
内容没变的技能不升版本号，本机发布记录里已经是这个版本，这里跳过。记录丢了时重发会报 already exists，
由 already_live 核实线上内容与打包一致后记为已发。有还没升版本号的改动时拒绝发布。

ClawHub 的 token 由其 CLI 的配置文件持有（CLAWHUB_CONFIG_PATH，默认在仓库外的
~/.xiaozhi-publish/clawhub-config.json）。本脚本只把路径交给 CLI，不读它的内容。

用法：
    python publish_clawhub.py                 # 发还没以自己版本发过的技能
    python publish_clawhub.py --dry-run       # 只打包，列出要发哪几个（不需要 ClawHub 凭据）
    python publish_clawhub.py --tag-latest    # 发完后把 latest 标到本版（版本号被更高的历史版本压住时用）
"""
import json, os, re, shutil, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import HERE, REPO, clawhub_cli, clawhub_env, clawhub_remote_version, log, require_released, review_risk_gate, version, workdir  # noqa: E402

STAGE = workdir("staged-clawhub")
DONE_FILE = os.path.join(workdir(), "published-clawhub.json")
LOG = os.path.join(workdir(), "publish-clawhub.log")

# 目录名 -> 线上 slug。xiaozhi-chinese-classical-revival 在 ClawHub 上的 slug 被重定向到
# 一个审核隐藏的旧条目 chinese-classical-revival，只能就地发到那个 slug；且它的历史版本号
# 是 1000000.0.0，所以本库版本在它那里要映射成更大的号，否则 latest 会被压住
# （2.1.N → 1000000.N.0，2.2.0 → 1000001.0.0，见 _common.clawhub_remote_version）。
SLUG_MAP = {"xiaozhi-chinese-classical-revival": "chinese-classical-revival"}


def remote_version(name, ver):
    return clawhub_remote_version(ver) if name in SLUG_MAP else ver


def restage(release):
    shutil.rmtree(STAGE, ignore_errors=True)
    r = subprocess.run([sys.executable, os.path.join(HERE, "stage.py"), STAGE],
                       capture_output=True, text=True, encoding="utf-8", cwd=REPO, timeout=600)
    if not os.path.isdir(STAGE) or not os.listdir(STAGE):
        log("打包失败：" + ((r.stdout or "") + (r.stderr or ""))[:400], LOG)
        sys.exit(1)
    log(f"发布版本 {release}：按各技能自己的版本号打包 {len(os.listdir(STAGE))} 个 -> {STAGE}", LOG)


def display_name(path):
    fm = open(os.path.join(path, "SKILL.md"), encoding="utf-8").read().split("---")[1]
    m = re.search(r"^display_name:\s*(.+)$", fm, re.M)
    return m.group(1).strip() if m else os.path.basename(path)


def run_cli(args, env, timeout=300):
    """CLI 卡死超过 timeout 秒时记为这一个调用失败，不抛异常（2026-09-29 v2.8.0：上传卡死 300 秒，整轮在 56/84 中断）。
    卡死的那次上传可能其实成功了：续跑时会报 already exists，由 already_live 核实。"""
    cmd = clawhub_cli() + args
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", env=env, timeout=timeout)
    except subprocess.TimeoutExpired:
        return 124, "", f"Error: CLI 超过 {timeout} 秒没有返回，已终止"
    return r.returncode, (r.stdout or ""), (r.stderr or "")


def already_live(slug, rver, path, env):
    """报 “Version X already exists” 时核实：线上 latest 就是 rver，且线上 SKILL.md 与打包内容一致 → 视为已发布。

    2026-09-25 实测（2.4.0 的语文素材库）：首次上传约 93 秒超时，CLI 内部重试时报 already exists，
    其实第一次已经成功。inspect --file 的输出前面有一段 “┌─ inspect” 信息头，以 “SKILL.md:” 一行结束。
    """
    try:
        _, out, _ = run_cli(["inspect", slug, "--json"], env, timeout=120)
        if ((json.loads(out[out.index("{"):]).get("latestVersion") or {}).get("version")) != rver:
            return False
        _, out, _ = run_cli(["inspect", slug, "--version", rver, "--file", "SKILL.md"], env, timeout=120)
    except Exception:
        return False
    online = out.split("SKILL.md:", 1)[1] if "SKILL.md:" in out else out
    staged = open(os.path.join(path, "SKILL.md"), encoding="utf-8").read()
    norm = lambda s: s.replace("\r\n", "\n").strip()
    return norm(online) == norm(staged)


def recorded_version(entry):
    """发布记录里这个技能发的是哪个版本：新记录写 skillVersion，旧记录（全库一个版本号时）写 repoVersion。"""
    return entry.get("skillVersion") or entry.get("repoVersion")


def main():
    release = version()
    want = require_released()   # {技能: 它自己的版本}；有还没升版本号的改动就在这里退出
    review_risk_gate()          # 已查实的触发句、新出现的观察词：先拦下，别浪费审核与额度
    restage(release)
    names = sorted(os.listdir(STAGE))

    done = json.load(open(DONE_FILE, encoding="utf-8")) if os.path.exists(DONE_FILE) else {}
    done = {k: v for k, v in done.items() if k in want and v.get("ok") and recorded_version(v) == want[k]}
    todo = [n for n in names if n not in done]
    log(f"要发 {len(todo)} 个，其余 {len(names) - len(todo)} 个已按自己的版本发过", LOG)

    if "--dry-run" in sys.argv:
        for n in todo[:40]:
            print(f"  {n} -> slug={SLUG_MAP.get(n, n)} version={remote_version(n, want[n])}")
        return 0

    env = clawhub_env()
    for i, name in enumerate(todo, 1):
        path = os.path.join(STAGE, name)
        changelog = f"v{want[name]}：详见仓库 docs/changelog.md"
        slug, rver, disp = SLUG_MAP.get(name, name), remote_version(name, want[name]), display_name(path)
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
        note = None
        if not ok and "already exists" in (body.get("error") or err or out) and already_live(slug, rver, path, env):
            ok, note = True, "线上已有同版本且 SKILL.md 与打包一致（多为首次上传成功、客户端重试时报 already exists）"
        done[name] = {"ok": ok, "skillVersion": want[name], "release": release, "version": rver, "slug": slug,
                      "name": disp, "error": None if ok else (body.get("error") or err or out)[:200]}
        if note:
            done[name]["note"] = note
        log(f"[{i}/{len(todo)}] {'OK' if ok else 'x '} {name} @{rver}" + ("" if ok else f": {done[name]['error'][:80]}")
            + (f"（{note[:24]}…）" if note else ""), LOG)
        json.dump(done, open(DONE_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        time.sleep(1.5)

    ok_n = sum(1 for n in names if done.get(n, {}).get("ok"))
    log(f"收工：本次要发 {len(todo)} 个，现在 {ok_n}/{len(names)} 个已按自己的版本发过（发布版本 {release}）", LOG)

    if "--tag-latest" in sys.argv:
        for name, v in done.items():
            if name not in todo:
                continue   # 只给本次发的打 latest
            if not v.get("ok"):
                continue
            code, out, err = run_cli(["skill", "tag", v["slug"], v["version"], "--tag", "latest", "--yes"], env)
            log(f"  tag latest {v['slug']} {v['version']}: {'OK' if code == 0 else (err or out)[:80]}", LOG)
    return 0 if ok_n == len(names) else 1


if __name__ == "__main__":
    sys.exit(main())

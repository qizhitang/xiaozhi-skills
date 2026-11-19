#!/usr/bin/env python3
"""发布到 SkillHub：只发线上还不是自己版本的技能。多轮制，配额紧时一轮发不完。

每个技能的版本号是它最后一次改动所在的发布版本（SKILL.md 的 metadata.version，见 scripts/package-versions.mjs）。
升版时内容没变的技能不升版本号，线上已经是这个版本，这里跳过；所以一次发布只占改动了的那几个的额度。
有还没升版本号的改动（内容与发布清单对不上）时拒绝发布：同一个版本号不能在市场上对应两份不同的内容。
跳过的依据：本机的发布记录，加上发布前先查一遍线上版本（换了电脑、记录丢了也不会重发）；查不到线上版本时只按本机记录。

配额观测（2026-09）：约 40 多个/窗口，之后持续 429，两小时内不恢复。
所以不空等退避，而是「尽力发一轮 → 休 30 分钟 → 再来一轮」，
让每轮吃掉窗口里能用的额度。安全整改改动最大的老师端技能排最前。

凭据由 SkillHub CLI 自己维护（~/.skillhub/credentials.json），本脚本不碰 token。

用法：
    python publish_skillhub.py             # 发线上还不是自己版本的技能（多轮，直到全成功或轮次用尽）
    python publish_skillhub.py --dry-run   # 只打包，列出要发哪几个、按什么顺序
    python publish_skillhub.py --once      # 只跑一轮（探配额用）
    python publish_skillhub.py --first a,b,c   # 这几个排最前（窗口额度不够一次发完时，先发有实质改动的）
    python publish_skillhub.py --only a,b,c    # 只发这几个（先拿审核结论探路；之后不带参数重跑，已发的不重发）
"""
import json, os, shutil, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import HERE, REPO, log, require_released, skillhub_cli, skillhub_env, version, workdir  # noqa: E402

STAGE = workdir("staged")
DONE_FILE = os.path.join(workdir(), "published-skillhub.json")
LOG = os.path.join(workdir(), "publish.log")
WAVE_GAP, OK_GAP, MAX_WAVES = 1800, 20, 40

# 这些技能的安全整改改动最大：没上线意味着线上仍是整改前的行为
PRIORITY = [
    "xiaozhi-teach-student-intake", "xiaozhi-teach-renewal-report",
    "xiaozhi-teach-review-planner", "xiaozhi-teach-math-exam-designer",
    "xiaozhi-teach-physics-lesson-planner", "xiaozhi-teach-parent-communication",
    "xiaozhi-teach-solo-dashboard", "xiaozhi-time-focus-coach",
    "xiaozhi-teach-schedule-manager", "xiaozhi-teach-physics-experiment-coach",
    "xiaozhi-teach-resource-library", "xiaozhi-teach-student-analyzer",
    "xiaozhi-teach-math-lesson-planner", "xiaozhi-weekly-review",
    "xiaozhi-teach-assignment-designer", "xiaozhi-teach-physics-problem-guide",
]


def restage(release):
    shutil.rmtree(STAGE, ignore_errors=True)
    r = subprocess.run([sys.executable, os.path.join(HERE, "stage.py"), STAGE],
                       capture_output=True, text=True, encoding="utf-8", cwd=REPO, timeout=600)
    if not os.path.isdir(STAGE) or not os.listdir(STAGE):
        log("打包失败：" + ((r.stdout or "") + (r.stderr or ""))[:400], LOG)
        sys.exit(1)
    log(f"发布版本 {release}：按各技能自己的版本号打包 {len(os.listdir(STAGE))} 个 -> {STAGE}", LOG)


def publish(path, changelog):
    try:
        r = subprocess.run([sys.executable, skillhub_cli(), "publish", path,
                            "--changelog", changelog, "--json"],
                           capture_output=True, text=True, encoding="utf-8",
                           env=skillhub_env(), timeout=300)
    except subprocess.TimeoutExpired:
        return "neterr", "timeout"
    body = {}
    for line in reversed((r.stdout or "").strip().splitlines()):
        if line.startswith("{"):
            try:
                body = json.loads(line)
                break
            except Exception:
                pass
    if body.get("ok") or body.get("success"):
        return "ok", body
    err = str(body.get("error") or (r.stdout or r.stderr or "")[:200])
    if "频率过高" in err or body.get("status") == 429 or "RATE_LIMITED" in err:
        return "rate", err
    if "网络错误" in err or "10060" in err or "timed out" in err.lower():
        return "neterr", err
    return "fail", err


def live_versions_or_none():
    """线上各技能已提交的版本 {slug: 版本}；查不到（没凭据、网络不通）时返回 None，只按本机发布记录跳过。"""
    try:
        from verify_publish import live_versions
        return {k: v["version"] for k, v in live_versions().items()}
    except Exception as e:
        log(f"查线上版本失败（{str(e)[:80]}），只按本机发布记录判断哪些已发", LOG)
        return None


def main():
    release = version()
    want = require_released()   # {技能: 它自己的版本}；有还没升版本号的改动就在这里退出
    restage(release)
    allnames = sorted(os.listdir(STAGE))
    first = []
    if "--first" in sys.argv:
        first = [n for n in sys.argv[sys.argv.index("--first") + 1].split(",") if n in allnames]
    order = first + [n for n in PRIORITY if n in allnames and n not in first] \
        + [n for n in allnames if n not in PRIORITY and n not in first]
    if "--only" in sys.argv:
        # 2026-10-15：四个历史技能被内容合规审查判不通过，改完先单发这几个拿结论，不先占掉整个窗口的额度
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
        order = [n for n in order if n in only]
        if len(order) != len(only):
            log(f"--only 里有不认识的技能名：{sorted(only - set(order))}", LOG)
            return 1
        allnames = order

    done = json.load(open(DONE_FILE, encoding="utf-8")) if os.path.exists(DONE_FILE) else {}
    done = {k: v for k, v in done.items() if k in want and v.get("version") == want[k]}  # 技能版本变了就要发
    live = live_versions_or_none()
    if live:
        for n in allnames:
            if live.get(n) == want[n] and not done.get(n, {}).get("ok"):
                done[n] = {"ok": True, "version": want[n], "slug": n, "note": "线上已有这个版本"}
    todo0 = [n for n in order if done.get(n, {}).get("ok") is not True]
    log(f"要发 {len(todo0)} 个，其余 {len(allnames) - len(todo0)} 个线上已是自己的版本", LOG)

    if "--dry-run" in sys.argv:
        for n in todo0[:40]:
            print(("  * " if n in PRIORITY else "    ") + f"{n} @{want[n]}")
        return 0

    waves = 1 if "--once" in sys.argv else MAX_WAVES
    for wave in range(1, waves + 1):
        todo = [n for n in order if done.get(n, {}).get("ok") is not True]
        if not todo:
            log(f"全部完成：{len(allnames)} 个技能线上都是自己的版本（发布版本 {release}）", LOG)
            break
        log(f"第 {wave} 轮开始：待发 {len(todo)}（优先 {len([n for n in todo if n in PRIORITY])}）", LOG)
        streak = 0
        for i, name in enumerate(todo, 1):
            changelog = f"v{want[name]}：详见仓库 docs/changelog.md"
            st, info = publish(os.path.join(STAGE, name), changelog)
            if st == "neterr":
                time.sleep(20)
                st, info = publish(os.path.join(STAGE, name), changelog)
            mark = "*" if name in PRIORITY else " "
            if st == "ok":
                done[name] = {"ok": True, "version": info.get("version") or want[name],
                              "slug": info.get("slug"), "files": info.get("fileCount")}
                log(f"  [{wave}.{i}] {mark} OK {name} @{info.get('version')}", LOG)
                streak = 0
            else:
                done[name] = {"ok": False, "version": want[name], "error": str(info)[:200]}
                streak = streak + 1 if st == "rate" else 0
                log(f"  [{wave}.{i}] {mark} {st} {name}: {str(info)[:70]}", LOG)
            json.dump(done, open(DONE_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            if streak >= 3:
                log("  连续 3 次限流，本轮收尾", LOG)
                break
            time.sleep(OK_GAP if st == "ok" else 3)
        left = [n for n in order if done.get(n, {}).get("ok") is not True]
        log(f"第 {wave} 轮结束：成功 {len(allnames) - len(left)}/{len(allnames)}，剩 {len(left)}", LOG)
        if left and wave < waves:
            time.sleep(WAVE_GAP)

    ok = [k for k in allnames if done.get(k, {}).get("ok")]
    log(f"收工：本次要发 {len(todo0)} 个，现在 {len(ok)}/{len(allnames)} 个线上是自己的版本（发布版本 {release}）", LOG)
    bad = [n for n in PRIORITY if n in allnames and not done.get(n, {}).get("ok")]
    if bad:
        log(f"优先项仍未发出（{len(bad)}）：{bad}", LOG)
    # 发完立刻核对线上实际版本，结论写进同一份日志
    try:
        r = subprocess.run([sys.executable, os.path.join(HERE, "verify_publish.py"), "--quiet"],
                           capture_output=True, text=True, encoding="utf-8", timeout=300)
        log((r.stdout or r.stderr or "").strip() or "核对无输出", LOG)
    except Exception as e:
        log(f"核对失败：{e}", LOG)
    return 0 if len(ok) == len(allnames) else 1


if __name__ == "__main__":
    sys.exit(main())

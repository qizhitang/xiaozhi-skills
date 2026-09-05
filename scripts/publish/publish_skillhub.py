#!/usr/bin/env python3
"""发布全库到 SkillHub。多轮制，因为它的配额一轮发不完 58 个。

配额观测（2026-09）：约 40 多个/窗口，之后持续 429，两小时内不恢复。
所以不空等退避，而是「尽力发一轮 → 休 30 分钟 → 再来一轮」，
让每轮吃掉窗口里能用的额度。安全整改改动最大的老师端技能排最前。

凭据由 SkillHub CLI 自己维护（~/.skillhub/credentials.json），本脚本不碰 token。

用法：
    python publish_skillhub.py             # 发全部（多轮，直到全成功或轮次用尽）
    python publish_skillhub.py --dry-run   # 只打包并列出顺序
    python publish_skillhub.py --once      # 只跑一轮（探配额用）
"""
import json, os, shutil, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import HERE, REPO, log, skillhub_cli, skillhub_env, version, workdir  # noqa: E402

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


def restage(ver):
    shutil.rmtree(STAGE, ignore_errors=True)
    r = subprocess.run([sys.executable, os.path.join(HERE, "stage.py"), STAGE],
                       capture_output=True, text=True, encoding="utf-8", cwd=REPO, timeout=600)
    if not os.path.isdir(STAGE) or not os.listdir(STAGE):
        log("打包失败：" + ((r.stdout or "") + (r.stderr or ""))[:400], LOG)
        sys.exit(1)
    log(f"按仓库版本 {ver} 打包 {len(os.listdir(STAGE))} 个技能 -> {STAGE}", LOG)


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


def main():
    ver = version()
    restage(ver)
    changelog = f"v{ver}：详见仓库 docs/changelog.md"
    allnames = sorted(os.listdir(STAGE))
    order = [n for n in PRIORITY if n in allnames] + [n for n in allnames if n not in PRIORITY]

    if "--dry-run" in sys.argv:
        log(f"dry-run：{len(allnames)} 个待发，优先 {len([n for n in PRIORITY if n in allnames])} 个", LOG)
        for n in order[:20]:
            print(("  * " if n in PRIORITY else "    ") + n)
        return 0

    done = json.load(open(DONE_FILE, encoding="utf-8")) if os.path.exists(DONE_FILE) else {}
    done = {k: v for k, v in done.items() if v.get("version") == ver}  # 版本变了就重发

    waves = 1 if "--once" in sys.argv else MAX_WAVES
    for wave in range(1, waves + 1):
        todo = [n for n in order if done.get(n, {}).get("ok") is not True]
        if not todo:
            log(f"全部完成：{len(allnames)}/{len(allnames)} @ {ver}", LOG)
            break
        log(f"第 {wave} 轮开始：待发 {len(todo)}（优先 {len([n for n in todo if n in PRIORITY])}）", LOG)
        streak = 0
        for i, name in enumerate(todo, 1):
            st, info = publish(os.path.join(STAGE, name), changelog)
            if st == "neterr":
                time.sleep(20)
                st, info = publish(os.path.join(STAGE, name), changelog)
            mark = "*" if name in PRIORITY else " "
            if st == "ok":
                done[name] = {"ok": True, "version": info.get("version"),
                              "slug": info.get("slug"), "files": info.get("fileCount")}
                log(f"  [{wave}.{i}] {mark} OK {name} @{info.get('version')}", LOG)
                streak = 0
            else:
                done[name] = {"ok": False, "version": ver, "error": str(info)[:200]}
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

    ok = [k for k, v in done.items() if v.get("ok")]
    log(f"收工：成功 {len(ok)}/{len(allnames)} @ {ver}", LOG)
    bad = [n for n in PRIORITY if not done.get(n, {}).get("ok")]
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

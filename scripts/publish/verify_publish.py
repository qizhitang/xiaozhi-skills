#!/usr/bin/env python3
"""核对 SkillHub 线上版本与仓库是否一致。

凭据运行时从 SkillHub CLI 自己维护的 ~/.skillhub/credentials.json 读取，
本文件不存任何密钥，也不打印 token。

用法：
    python verify_publish.py          # 打印报告并写 .work/verify-report.md
    python verify_publish.py --quiet  # 只写文件，打印一行结论
退出码：0 全部一致；1 有落后/缺失；2 查询失败
"""
import json, os, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import skill_dirs, version, workdir  # noqa: E402

CRED = os.environ.get("SKILLHUB_CREDENTIALS") or os.path.expanduser("~/.skillhub/credentials.json")
REPORT = os.path.join(workdir(), "verify-report.md")

PRIORITY = {
    "xiaozhi-teach-student-intake", "xiaozhi-teach-renewal-report",
    "xiaozhi-teach-review-planner", "xiaozhi-teach-math-exam-designer",
    "xiaozhi-teach-physics-lesson-planner", "xiaozhi-teach-parent-communication",
    "xiaozhi-teach-solo-dashboard", "xiaozhi-time-focus-coach",
    "xiaozhi-teach-schedule-manager", "xiaozhi-teach-physics-experiment-coach",
    "xiaozhi-teach-resource-library", "xiaozhi-teach-student-analyzer",
    "xiaozhi-teach-math-lesson-planner", "xiaozhi-weekly-review",
    "xiaozhi-teach-assignment-designer", "xiaozhi-teach-physics-problem-guide",
}


def live_versions():
    if not os.path.exists(CRED):
        raise SystemExit(f"找不到 SkillHub 凭据：{CRED}（先用 CLI 登录，或设 SKILLHUB_CREDENTIALS）")
    cred = json.load(open(CRED, encoding="utf-8"))["user"]
    tok = cred["token"]
    host = cred.get("host", "https://api.skillhub.cn").rstrip("/")
    seen = {}
    for page in range(1, 12):
        req = urllib.request.Request(f"{host}/api/v1/dashboard/skills?limit=100&page={page}",
                                     headers={"Authorization": f"Bearer {tok}"})
        for attempt in range(3):
            try:
                d = json.loads(urllib.request.urlopen(req, timeout=60).read().decode())
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(5)
        items = d.get("data", {}).get("skills") if isinstance(d.get("data"), dict) else None
        items = items or d.get("skills") or (d.get("data") if isinstance(d.get("data"), list) else []) or []
        if not items:
            break
        for s in items:
            seen[s.get("slug")] = str(s.get("latestVersion") or s.get("version") or s.get("currentVersion"))
        if len(items) < 20:
            break
    return seen


def main():
    quiet = "--quiet" in sys.argv
    ver, want = version(), set(skill_dirs())
    try:
        live = live_versions()
    except Exception as e:
        line = f"查询失败：{e}"
        open(REPORT, "w", encoding="utf-8").write(
            f"# SkillHub 核对（{time.strftime('%Y-%m-%d %H:%M')}）\n\n{line}\n")
        print(line)
        return 2

    ok = sorted(k for k, v in live.items() if v == ver)
    stale = sorted((k, v) for k, v in live.items() if k in want and v != ver)
    missing = sorted(want - set(live))
    pri_bad = sorted(({k for k, _ in stale} | set(missing)) & PRIORITY)

    L = [f"# SkillHub 核对（{time.strftime('%Y-%m-%d %H:%M')}）", "",
         f"仓库版本 **{ver}**，应上架 {len(want)} 个技能。",
         f"线上 {len(live)} 个，其中 **{len(ok)} 个已是 {ver}**，落后 {len(stale)} 个，缺失 {len(missing)} 个。", ""]
    if not stale and not missing:
        L += [f"✅ **全部一致**：{len(want)} 个技能都在 {ver}。", ""]
    else:
        if stale:
            L += [f"## 落后的 {len(stale)} 个", "", "| 技能 | 线上版本 | 优先 |", "|---|---|---|"]
            L += [f"| `{k}` | {v} | {'★' if k in PRIORITY else ''} |" for k, v in stale]
            L.append("")
        if missing:
            L += [f"## 线上没有的 {len(missing)} 个", ""]
            L += [f"- `{k}`{'　★' if k in PRIORITY else ''}" for k in missing] + [""]
        if pri_bad:
            L += ["> ★ 是安全整改改动最大的老师端技能。这些没上线，意味着线上仍是整改前的行为。", ""]
    here = os.path.dirname(os.path.abspath(__file__))
    L += ["---", "", f"重跑发布：`python {os.path.join(here, 'publish_skillhub.py')}`",
          f"日志：`{os.path.join(workdir(), 'publish.log')}`"]
    open(REPORT, "w", encoding="utf-8").write("\n".join(L) + "\n")

    if quiet:
        print(f"SkillHub 核对：{len(ok)}/{len(want)} 已是 {ver}，落后 {len(stale)}，缺失 {len(missing)} → {REPORT}")
    else:
        print("\n".join(L))
    return 0 if (not stale and not missing) else 1


if __name__ == "__main__":
    sys.exit(main())

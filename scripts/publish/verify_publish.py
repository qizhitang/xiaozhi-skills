#!/usr/bin/env python3
"""核对 SkillHub 线上版本与仓库是否一致。

凭据运行时从 SkillHub CLI 自己的 ~/.skillhub/credentials.json 读取——本文件不存任何密钥，
也不把 token 打印或写入任何地方。

用法：
    python verify_publish.py          # 打印报告并写 <work>/verify-report.md
    python verify_publish.py --quiet  # 只写文件，打印一行结论
退出码：0 全一致；1 有落后/缺失；2 查询失败
"""
import json, os, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import HERE, skill_dirs, version, workdir  # noqa: E402

CRED = os.path.expanduser("~/.skillhub/credentials.json")
REPORT = os.path.join(workdir(), "verify-report.md")

# 安全整改改动最大的老师端技能：这些没上线才是真风险（与 publish_skillhub.py 同一份）
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


def _page(host, tok, page):
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
    return items or d.get("skills") or (d.get("data") if isinstance(d.get("data"), list) else []) or []


def live_versions(passes=5):
    """返回 {slug: {"version": 已提交版本, "approved": 已审核通过版本, "review": 审核状态}}。

    看板列表按 updatedAt 倒序、每页实际只给 20 条。发布刚结束时平台还在异步审核，条目的 updatedAt
    在翻页途中变化，同一条会在两页里重复出现、另一条被挤掉（2026-09-23 实测：连翻三遍，前两遍各重复 3 条、
    漏 3 条，且漏的是不同的技能）。所以一遍里只要出现重复就整遍重翻；几遍都不干净时取各遍并集。
    """
    with open(CRED, encoding="utf-8") as f:
        cred = json.load(f)["user"]
    tok, host = cred["token"], cred.get("host", "https://api.skillhub.cn").rstrip("/")
    union = {}
    for n in range(passes):
        seen, dup = {}, 0
        for page in range(1, 12):
            items = _page(host, tok, page)
            if not items:
                break
            for s in items:
                dup += s.get("slug") in seen
                seen[s.get("slug")] = {
                    "version": str(s.get("version") or s.get("latestVersion") or s.get("currentVersion")),
                    "approved": str(s.get("latestApprovedVersion") or ""),
                    "review": str(s.get("reviewStatus") or ""),
                }
            if len(items) < 20:
                break
        union.update(seen)
        if not dup:
            return seen
        time.sleep(5)
    return union


def main():
    quiet = "--quiet" in sys.argv
    ver, want = version(), set(skill_dirs())
    try:
        live = live_versions()
    except Exception as e:
        line = f"查询失败：{e}"
        open(REPORT, "w", encoding="utf-8").write(f"# SkillHub 核对（{time.strftime('%Y-%m-%d %H:%M')}）\n\n{line}\n")
        print(line)
        return 2

    ok = sorted(k for k, v in live.items() if v["version"] == ver)
    stale = sorted((k, v["version"]) for k, v in live.items() if k in want and v["version"] != ver)
    pending = sorted((k, v["approved"]) for k, v in live.items() if k in want and v["version"] == ver and v["approved"] != ver)
    missing = sorted(want - set(live))
    pri_bad = sorted(({k for k, _ in stale} | set(missing)) & PRIORITY)

    L = [f"# SkillHub 核对（{time.strftime('%Y-%m-%d %H:%M')}）", "",
         f"仓库版本 **{ver}**，应上架 {len(want)} 个技能。",
         f"线上 {len(live)} 个，其中 **{len(ok)} 个已是 {ver}**，落后 {len(stale)} 个，缺失 {len(missing)} 个。", ""]
    if not stale and not missing:
        L += [f"✅ **全部一致**：{len(want)} 个技能都已提交到 {ver}。", ""]
    else:
        if stale:
            L += [f"## 落后的 {len(stale)} 个", "", "| 技能 | 线上版本 | 优先 |", "|---|---|---|"]
            L += [f"| `{k}` | {v} | {'★' if k in PRIORITY else ''} |" for k, v in stale] + [""]
        if missing:
            L += [f"## 线上没有的 {len(missing)} 个", ""] + [f"- `{k}`{'　★' if k in PRIORITY else ''}" for k in missing] + [""]
        if pri_bad:
            L += ["> ★ 是安全整改改动最大的老师端技能。这些没上线，意味着线上仍是整改前的行为。", ""]
    if pending:
        L += [f"## 已提交、平台审核中的 {len(pending)} 个", "", "SkillHub 对新版本做异步审核；审核通过前，用户安装到的仍是下表的已通过版本。这不是发布失败，稍后重跑核对即可。", "",
              "| 技能 | 已通过版本 |", "|---|---|"] + [f"| `{k}` | {a or '—'} |" for k, a in pending] + [""]
    L += ["---", "", f"重跑发布：`python {os.path.join(HERE, 'publish_skillhub.py')}`"]
    open(REPORT, "w", encoding="utf-8").write("\n".join(L) + "\n")

    if quiet:
        print(f"SkillHub 核对：{len(ok)}/{len(want)} 已提交 {ver}（审核中 {len(pending)}），落后 {len(stale)}，缺失 {len(missing)} → {REPORT}")
    else:
        print("\n".join(L))
    return 0 if (not stale and not missing) else 1


if __name__ == "__main__":
    sys.exit(main())

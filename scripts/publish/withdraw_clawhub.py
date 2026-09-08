#!/usr/bin/env python3
"""撤回 ClawHub 上某个版本区间的旧版本（保留 latest 与区间外的版本）。

`clawhub delete <slug> --version <v>` 撤的是单个**非最新**版本：制品保留、版本号仍占位，
可用 `clawhub undelete <slug> --version <v>` 恢复。本脚本只是把它按技能批量跑一遍，并记录进度。

用法：
    python scripts/publish/withdraw_clawhub.py 2.1.4 2.1.11             # 预演：只列出会撤哪些
    python scripts/publish/withdraw_clawhub.py 2.1.4 2.1.11 --yes       # 真撤（可中断，重跑续跑）
    python scripts/publish/withdraw_clawhub.py 2.1.4 2.1.11 --yes --only xiaozhi-cornell-notes ...

区间按仓库版本写（含两端）。`chinese-classical-revival` 在线上用 1000000.N.0 编号，脚本按
published-clawhub.json 里记的线上版本号自动换算。latest 指向的版本一律跳过，不会误撤。
进度写 <work>/withdrawn-clawhub.json，重跑只处理还没撤的。
"""
import json, os, re, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import clawhub_cli, clawhub_env, log, workdir  # noqa: E402

MANIFEST = os.path.join(workdir(), "published-clawhub.json")
PROGRESS = os.path.join(workdir(), "withdrawn-clawhub.json")
VER_RE = re.compile(r"^\d+\.\d+\.\d+$")


def repo_to_remote(entry, ver):
    """本库 2.1.N 在这个技能的线上编号里叫什么（按清单里记的线上版本号推断）。"""
    online = entry.get("version") or ""
    if online.startswith("1000000."):
        return f"1000000.{ver.split('.')[-1]}.0"
    return ver


def versions_online(cli, env, slug):
    r = subprocess.run(cli + ["inspect", slug, "--versions", "--limit", "200", "--json"],
                       capture_output=True, text=True, encoding="utf-8", env=env, timeout=120)
    try:
        d = json.loads((r.stdout or "").strip())
    except Exception:
        return None, None, ((r.stdout or "") + (r.stderr or "")).strip()[:200]
    latest = ((d.get("skill") or {}).get("tags") or {}).get("latest")
    return [v.get("version") for v in (d.get("versions") or [])], latest, None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--only" in sys.argv:
        i = sys.argv.index("--only")
        only = set(a for a in sys.argv[i + 1:] if not a.startswith("--"))
        args = [a for a in args if a not in only]
    else:
        only = None
    if len(args) != 2 or not all(VER_RE.match(a) for a in args):
        sys.exit(__doc__)
    lo, hi = args
    apply = "--yes" in sys.argv
    if not os.path.exists(MANIFEST):
        sys.exit(f"没有发布清单：{MANIFEST}")
    pub = {k: v for k, v in json.load(open(MANIFEST, encoding="utf-8")).items() if v.get("slug")}
    if only:
        pub = {k: v for k, v in pub.items() if k in only or v.get("slug") in only}

    def key(v):
        return tuple(int(x) for x in v.split("."))

    want = [f"{'.'.join(lo.split('.')[:-1])}.{n}" for n in range(int(lo.split(".")[-1]), int(hi.split(".")[-1]) + 1)]
    assert key(lo) <= key(hi), "区间反了"
    done = json.load(open(PROGRESS, encoding="utf-8")) if os.path.exists(PROGRESS) else {}
    env, cli = clawhub_env(), clawhub_cli()
    log(f"{'撤回' if apply else '预演'} {lo}–{hi}（{len(want)} 个版本）× {len(pub)} 个技能"
        + ("" if apply else "  ← 没带 --yes，只列不撤"))

    plan, skipped = [], []
    for name in sorted(pub):
        slug = pub[name]["slug"]
        online, latest, err = versions_online(cli, env, slug)
        if online is None:
            skipped.append(f"{slug}: 取版本列表失败 {err}")
            continue
        targets = [repo_to_remote(pub[name], v) for v in want]
        hit = [v for v in targets if v in online and v != latest]
        miss = [v for v in targets if v not in online]
        for v in hit:
            if not done.get(f"{slug}@{v}"):
                plan.append((slug, v))
        if miss:
            skipped.append(f"{slug}: 线上没有 {', '.join(miss)}")
        keep = [v for v in online if v not in hit]
        log(f"  {slug:42} 撤 {len(hit):2d}，留 {len(keep):2d}（latest={latest}）")

    log(f"待撤 {len(plan)} 条" + (f"，另有 {len(done)} 条此前已撤" if done else ""))
    for s in skipped:
        log("  · " + s)
    if not apply:
        log("预演结束。确认无误后加 --yes 再跑一次。")
        return 0

    ok = fail = 0
    for i, (slug, v) in enumerate(plan, 1):
        r = subprocess.run(cli + ["delete", slug, "--version", v, "--yes"],
                           capture_output=True, text=True, encoding="utf-8", env=env, timeout=120)
        out = ((r.stdout or "") + (r.stderr or "")).strip()
        if r.returncode == 0:
            ok += 1
            done[f"{slug}@{v}"] = {"at": time.strftime("%Y-%m-%d %H:%M:%S")}
        else:
            fail += 1
            log(f"  [{i}/{len(plan)}] 失败 {slug}@{v}: {out[:140]}")
        if i % 25 == 0 or i == len(plan):
            json.dump(done, open(PROGRESS, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            log(f"  [{i}/{len(plan)}] 成功 {ok}，失败 {fail}")
        time.sleep(0.3)
    json.dump(done, open(PROGRESS, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    log(f"收工：撤回成功 {ok}，失败 {fail} → {PROGRESS}")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())

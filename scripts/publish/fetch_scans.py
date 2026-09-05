#!/usr/bin/env python3
"""拉取 ClawHub 对当前版本的安全扫描报告，汇总成 scan_summary_<版本>.json；可与上一版对比。

读 publish_clawhub.py 写的 published-clawhub.json（含每个技能的线上 slug 与远端版本号），
逐个 `clawhub scan download`，解析 clawscan.json（判定）与 skillspector.json（逐条证据）。
报告未生成的条目下次重跑会再试，不会被跳过。

注意 ClawHub 的报告是分两步落地的：发布后约 3–5 分钟先写一份**只有判定与摘要的快照**（没有维度、
skillspector.json 为 null），10–30 分钟后全量分析才补上维度与逐条证据。快照会被记下来但标为
complete=false，重跑时会重新拉；不要拿快照当最终报告去对比。

用法：
    python fetch_scans.py                              # 拉当前版本
    python fetch_scans.py --compare <上一版 summary.json>  # 拉完顺便打印翻转表
    python fetch_scans.py --only <slug> [<slug>...]    # 只拉几个
退出码：0 全部拿到且都是全量报告；1 仍有未生成或只有快照的报告（等几分钟再跑一次）
"""
import json, os, subprocess, sys, time, zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import clawhub_cli, clawhub_env, log, version, workdir  # noqa: E402

MANIFEST = os.path.join(workdir(), "published-clawhub.json")


def summarize(zp):
    z = zipfile.ZipFile(zp)
    names = z.namelist()
    cs = (json.loads(z.read("clawscan.json")) if "clawscan.json" in names else None) or {}
    sp_raw = json.loads(z.read("skillspector.json")) if "skillspector.json" in names else None
    sp = sp_raw or {}
    if not cs.get("status"):
        return None
    issues = []
    for it in sp.get("issues") or []:
        issues.append({k: it.get(k) for k in ("issueId", "severity", "category", "file", "startLine", "explanation", "remediation")})
    return {
        "clawscan": cs.get("status"),
        "dims": {d["name"]: d["rating"] for d in cs.get("dimensions", [])},
        "summary": cs.get("summary"),
        "guidance": cs.get("guidance"),
        "spector_status": sp.get("status"),
        "spector_issues": issues,
        # 快照阶段没有维度、skillspector 为 null；全量报告两者都有
        "complete": bool(cs.get("dimensions")) and sp_raw is not None,
    }


def final(e):
    """这条记录是不是全量报告（旧汇总没有 complete 字段，按有无维度与 SkillSpector 判断）。"""
    if not e or not e.get("clawscan"):
        return False
    if "complete" in e:
        return bool(e["complete"])
    return bool(e.get("dims")) and bool(e.get("spector_status"))


def main():
    ver = version()
    if not os.path.exists(MANIFEST):
        sys.exit(f"没有发布清单：{MANIFEST}，先跑 publish_clawhub.py")
    pub = json.load(open(MANIFEST, encoding="utf-8"))
    pub = {k: v for k, v in pub.items() if v.get("ok") and v.get("repoVersion") == ver}
    only = None
    if "--only" in sys.argv:
        i = sys.argv.index("--only")
        only = set(a for a in sys.argv[i + 1:] if not a.startswith("--"))
    out_json = os.path.join(workdir(), f"scan_summary_{ver}.json")
    zdir = workdir("scans", ver)
    res = json.load(open(out_json, encoding="utf-8")) if os.path.exists(out_json) else {}
    env = clawhub_env()
    cli = clawhub_cli()

    todo = [k for k in sorted(pub) if (not only or k in only) and not final(res.get(k))]
    log(f"v{ver}：清单 {len(pub)} 个，待拉 {len(todo)}（已有全量报告 {len(pub) - len(todo)}）")
    for i, name in enumerate(todo, 1):
        slug, rver = pub[name]["slug"], pub[name]["version"]
        zp = os.path.join(zdir, f"{slug}.zip")
        if os.path.exists(zp):
            os.remove(zp)
        r = subprocess.run(cli + ["scan", "download", slug, "--version", rver, "-o", zp],
                           capture_output=True, text=True, encoding="utf-8", env=env, timeout=180)
        s = summarize(zp) if os.path.exists(zp) else None
        if s:
            res[name] = s
            log(f"  [{i}/{len(todo)}] {name}: {s['clawscan']}  spector={len(s['spector_issues'])}"
                + ("" if s["complete"] else "  ← 只有快照，全量还没跑完，下次重跑再拉"))
        else:
            res[name] = {"clawscan": None, "error": ((r.stdout or "") + (r.stderr or "")).strip()[:160] or "报告未生成"}
            log(f"  [{i}/{len(todo)}] {name}: 未生成（下次重跑再试）")
        json.dump(res, open(out_json, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        time.sleep(1.0)

    from collections import Counter
    dist = Counter((v.get("clawscan") or "PENDING") for v in res.values())
    log(f"v{ver} 分布：{dict(dist)}  → {out_json}")
    sus = sorted(k for k, v in res.items() if v.get("clawscan") == "suspicious")
    if sus:
        log("suspicious：" + ", ".join(sus))
    snap = sorted(k for k, v in res.items() if v.get("clawscan") and not final(v))
    if snap:
        log(f"只有快照、还没全量 {len(snap)}：" + ", ".join(snap) + "  （等几分钟再跑一次）")

    if "--compare" in sys.argv:
        prev_path = sys.argv[sys.argv.index("--compare") + 1]
        prev = json.load(open(prev_path, encoding="utf-8"))
        st = lambda d, k: (d.get(k) or {}).get("clawscan") or "PENDING"
        worse = [k for k in res if st(prev, k) == "clean" and st(res, k) == "suspicious"]
        better = [k for k in res if st(prev, k) == "suspicious" and st(res, k) == "clean"]
        both = [k for k in res if st(prev, k) == st(res, k) == "suspicious"]
        pend = [k for k in res if st(res, k) == "PENDING"]
        print(f"\n对比 {os.path.basename(prev_path)} → v{ver}")
        print(f"  转好（suspicious→clean）{len(better)}：{sorted(better)}")
        print(f"  变差（clean→suspicious）{len(worse)}：{sorted(worse)}")
        print(f"  仍 suspicious {len(both)}：{sorted(both)}")
        if pend:
            print(f"  未出报告 {len(pend)}：{sorted(pend)}")
        if snap:
            print(f"  只有快照 {len(snap)}：{sorted(snap)}")
    return 1 if dist.get("PENDING") or snap else 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""对比两个版本的 ClawHub 扫描汇总，并把仍 suspicious 的按证据归类；可选打印逐条证据。

用法：
    python compare_scans.py 2.1.6 2.1.7                 # 翻转表 + 归类
    python compare_scans.py 2.1.6 2.1.7 --evidence      # 再逐条列出可操作判定（file:line + 判词）
    python compare_scans.py 2.1.6 2.1.7 --only xiaozhi-cornell-notes ...

读 fetch_scans.py 写的 <work>/scan_summary_<版本>.json。
归类规则：
  报告不完整   只拉到了摘要快照（发布后 3–5 分钟先出，10–30 分钟后才补维度与 SkillSpector）——
              重跑 fetch_scans.py 补齐再看，别据快照下结论
  仅摘要      有判定与摘要，但没有逐条可操作判定——按摘要看方向
  随包 schema  可操作判定全指向 shared/*.schema.json——是分发层（sync-shared 的裁剪）的事
  技能自身    可操作判定指向 SKILL.md / references——真实矛盾或触发过宽
  混合        两者都有
不追的判定：SQP-3（反对全库只有中文）、AE1（扫描器自己没读完引用文件）。
"""
import io, json, os, sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import workdir  # noqa: E402

# stdout 已由 _common 包装为 UTF-8，这里不再包装（重复包装会关掉底层 buffer）
SKIP = {"SQP-3", "AE1"}


def load(v):
    p = os.path.join(workdir(), f"scan_summary_{v}.json")
    if not os.path.exists(p):
        sys.exit(f"没有 {p}，先跑 fetch_scans.py")
    return json.load(open(p, encoding="utf-8"))


def st(d, k):
    return (d.get(k) or {}).get("clawscan") or "PENDING"


def degraded(v):
    if v.get("clawscan") != "suspicious":
        return False
    if "complete" in v:
        return not v["complete"]
    return not (v.get("dims") or {}) and not v.get("spector_status")


def actionable(v):
    return [i for i in v.get("spector_issues") or [] if i.get("issueId") not in SKIP]


def classify(v):
    act = actionable(v)
    if degraded(v):
        return "报告不完整", act
    if not act:
        return "仅摘要", act
    files = [(i.get("file") or "") for i in act]
    shared = [f for f in files if f.startswith("shared/")]
    if len(shared) == len(files):
        return "随包 schema", act
    if not shared:
        return "技能自身", act
    return "混合", act


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) < 2:
        sys.exit(__doc__)
    va, vb = args[0], args[1]
    only = set(args[2:]) if "--only" in sys.argv else set()
    a, b = load(va), load(vb)
    keys = sorted(k for k in b if not only or k in only)

    print(f"{va}：{dict(Counter(st(a, k) for k in a))}  报告不完整 {sum(1 for v in a.values() if degraded(v))}")
    print(f"{vb}：{dict(Counter(st(b, k) for k in b))}  报告不完整 {sum(1 for v in b.values() if degraded(v))}")
    pend = [k for k in keys if st(b, k) == "PENDING"]
    if pend:
        print(f"{vb} 未出报告：{pend}")

    better = [k for k in keys if st(a, k) == "suspicious" and st(b, k) == "clean"]
    worse = [k for k in keys if st(a, k) == "clean" and st(b, k) == "suspicious"]
    both = [k for k in keys if st(a, k) == st(b, k) == "suspicious"]
    fake_better = [k for k in better if degraded(a[k])]
    print(f"\n转好 suspicious→clean（{len(better)}，其中 {len(fake_better)} 个基线本就不完整）")
    for k in better:
        print(f"  ✅ {k}" + ("  （基线不完整）" if k in fake_better else ""))
    print(f"\n变差 clean→suspicious（{len(worse)}）")
    for k in worse:
        kind, act = classify(b[k])
        print(f"  ❌ {k:40} {kind:6} 可操作 {len(act)}")
    print(f"\n仍 suspicious（{len(both)}）")
    for k in both:
        kind, act = classify(b[k])
        print(f"  ⚠️ {k:40} {kind:6} 可操作 {len(act)}")

    print(f"\n=== {vb} 全部 suspicious 归类 ===")
    cnt = Counter()
    for k in keys:
        if st(b, k) != "suspicious":
            continue
        kind, act = classify(b[k])
        cnt[kind] += 1
        files = Counter((i.get("file") or "") for i in act)
        tail = dict(files.most_common(3)) if act else (b[k].get("summary") or "")[:100]
        print(f"  {k:40} {kind:6} {tail}")
    print("  合计：", dict(cnt))

    if "--evidence" in sys.argv:
        print(f"\n=== {vb} 逐条可操作判定 ===")
        for k in keys:
            if st(b, k) != "suspicious":
                continue
            v = b[k]
            kind, act = classify(v)
            if not act:
                continue
            print("=" * 96)
            print(f"### {k}   [{kind}]   dims={ {d: r for d, r in (v.get('dims') or {}).items() if r != 'ok'} }")
            print(f"  GUIDANCE: {(v.get('guidance') or '')[:260]}")
            for i in act:
                print(f"  - [{i.get('severity')}] {i.get('issueId')}  {i.get('file')}:{i.get('startLine')}")
                print(f"      判词：{(i.get('explanation') or '')[:300]}")
                print(f"      建议：{(i.get('remediation') or '')[:180]}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""把仓库版本号从 OLD 改成 NEW（D1：任何已发布内容的改动都要升版本）。

用法：
    python scripts/publish/bump_version.py <旧版本> <新版本>     # 例：1.2.3 1.2.4

改哪些：package.json / package-lock.json、各 SKILL.md 的 metadata.version 与示例里的 protocolVersion、
schemas/examples 与 references 里的 protocolVersion / schemaVersion、两个主 schema 的版本枚举与说明、
学习DNA 自带 validate.js 的夹具、README 与 docs 的“当前版本”。
不改：docs/changelog.md（历史）、shared/ 副本与 docs/skills-index.md（分别由 sync-shared / gen-docs 重生成）。
跑完记得：node scripts/sync-shared.mjs && npm run docs:gen && npm run check
"""
import os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import REPO  # noqa: E402


def main():
    if len(sys.argv) != 3 or not all(re.fullmatch(r"\d+\.\d+\.\d+", a) for a in sys.argv[1:]):
        sys.exit(__doc__)
    old, new = sys.argv[1], sys.argv[2]
    os.chdir(REPO)
    changed = []

    def sub(p, pairs):
        try:
            t = open(p, encoding="utf-8", newline="").read()
        except FileNotFoundError:
            return
        o = t
        for a, b in pairs:
            t = t.replace(a, b)
        if t != o:
            open(p, "w", encoding="utf-8", newline="").write(t)
            changed.append(p)

    sub("package.json", [(f'"version": "{old}"', f'"version": "{new}"')])
    sub("package-lock.json", [(f'"version": "{old}"', f'"version": "{new}"')])
    for root, ds, fs in os.walk("."):
        # 点开头的目录一律跳过：.claude/worktrees 下是其他会话的独立工作区，不能一起改
        ds[:] = [d for d in ds if d not in ("node_modules", "__pycache__", "docs", "shared") and not d.startswith(".")]
        if "/shared" in root.replace(os.sep, "/"):
            continue
        for f in fs:
            p = os.path.join(root, f).replace(os.sep, "/")
            if f == "SKILL.md":
                sub(p, [(f"  version: {old}", f"  version: {new}"), (f'"protocolVersion": "{old}"', f'"protocolVersion": "{new}"')])
            elif f.endswith(".example.json") or (f.endswith(".md") and "/references/" in p):
                sub(p, [(f'"protocolVersion": "{old}"', f'"protocolVersion": "{new}"'), (f'"schemaVersion": "{old}"', f'"schemaVersion": "{new}"')])
            elif f == "validate.js":
                sub(p, [(f'schemaVersion: "{old}"', f'schemaVersion: "{new}"')])
    for p in ["student/general/xiaozhi-skill-coordinator/schemas/handover-protocol.schema.json",
              "student/general/xiaozhi-learning-dna/schemas/dna-profile.schema.json"]:
        sub(p, [(f"（当前 {old}）", f"（当前 {new}）"), (f'"{old}"', f'"{new}"')])
    # README 与 docs 只改“当前版本”这几个固定写法；“第一批随 v2.2.0 发布”这类历史记录不能跟着升
    cur = re.escape(f"v{old}")
    for p in ["README.md", "docs/architecture.md", "docs/installation-guide.md", "docs/changelog.md"]:
        try:
            t = open(p, encoding="utf-8", newline="").read()
        except FileNotFoundError:
            continue
        o = t
        t = re.sub(rf"(当前版本[：:]?\s*\**){cur}(?![\d.])", rf"\g<1>v{new}", t)   # 当前版本：**vX** / 当前版本 vX。
        t = t.replace(f"（v{old} 现状）", f"（v{new} 现状）").replace(f"| 版本 | v{old} |", f"| 版本 | v{new} |")
        if t != o:
            open(p, "w", encoding="utf-8", newline="").write(t)
            changed.append(p)

    print(f"{old} → {new}：改动 {len(changed)} 个文件")
    left = []
    for root, ds, fs in os.walk("."):
        ds[:] = [d for d in ds if d not in ("node_modules", "__pycache__") and not d.startswith(".")]
        for f in fs:
            p = os.path.join(root, f).replace(os.sep, "/")
            if not f.endswith((".md", ".json", ".mjs", ".js", ".py")) or "/shared/" in p or p.endswith(("docs/changelog.md", "docs/skills-index.md")):
                continue
            try:
                n = open(p, encoding="utf-8").read().count(old)
            except Exception:
                continue
            if n:
                left.append(f"  {n} {p}")
    if left:
        print(f"仍含 {old} 的文件（请人工确认是不是历史记录）：")
        print("\n".join(left))
    else:
        print(f"仓库里已没有 {old}（changelog / 副本 / skills-index 除外）")


if __name__ == "__main__":
    main()

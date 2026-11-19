#!/usr/bin/env python3
"""升版：发布版本 OLD → NEW，只给内容有变的技能升版本号（D1：同一个版本号不能对应两份不同的内容）。

用法：
    python scripts/publish/bump_version.py <旧版本> <新版本>              # 例：2.12.7 2.12.8
    python scripts/publish/bump_version.py <旧版本> <新版本> --contract   # 档案结构或交接协议（schema）改了：契约版本也升到新版本

三个版本号（详见 scripts/package-versions.mjs 文件头）：
  发布版本   package.json 的 version——每次升版都升，README 与 docs 的“当前版本”写它；
  技能包版本 各 SKILL.md 的 metadata.version——只有内容有变的技能升到新版本，其余停在各自最后改动的版本，发布时跳过；
  契约版本   package.json 的 contractVersion——只在 --contract 时升，schemaVersion / protocolVersion 跟着它。

按顺序做：
  1. node scripts/sync-shared.mjs：技能内的共享约定与 schema 副本先跟上源文件，再看哪些技能的内容有变；
     没有任何未发布的改动、也没带 --contract 时不升版（升了也没有包可发）；
  2. --contract 时：SKILL.md 与 references 示例里的 protocolVersion / schemaVersion、schemas/examples、两个主 schema 的
     版本枚举与说明“（当前 x）”、学习DNA 的 schemas/README 与 validate.js 夹具，从旧契约版本改成新版本，再同步一次副本；
  3. package.json（version；--contract 时还有 contractVersion）、package-lock.json 根包、README 与 docs 的“当前版本”；
  4. node scripts/package-versions.mjs --write <新版本>：内容与发布清单不一样的技能（含新技能）升到新版本，清单同步；
  5. node scripts/gen-docs.mjs --write：技能索引的版本列跟着变。
不改 docs/changelog.md 的历史记录。跑完 npm run check，再按 scripts/publish/README.md 发布——只发升了版本的技能。
"""
import json, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import REPO, contract_version, package_status, version  # noqa: E402

SEMVER = re.compile(r"\d+\.\d+\.\d+")


def ver_tuple(v):
    return tuple(int(x) for x in v.split("."))


def run(*cmd):
    r = subprocess.run(list(cmd), cwd=REPO, capture_output=True, text=True, encoding="utf-8")
    out = ((r.stdout or "") + (r.stderr or "")).strip()
    if r.returncode != 0:
        sys.exit(f"{' '.join(cmd)} 失败：\n{out}")
    return out


def sub(p, pairs, changed):
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


def bump_contract(old, new, changed):
    """契约版本 old → new：schemaVersion / protocolVersion 出现的各处（技能内的 shared/ 副本由 sync-shared 重生成）。"""
    for root, ds, fs in os.walk("."):
        # 点开头的目录一律跳过：.claude/worktrees 下是其他会话的独立工作区，不能一起改
        ds[:] = [d for d in ds if d not in ("node_modules", "__pycache__", "docs", "shared") and not d.startswith(".")]
        if "/shared" in root.replace(os.sep, "/"):
            continue
        for f in fs:
            p = os.path.join(root, f).replace(os.sep, "/")
            if f == "SKILL.md" or f.endswith(".example.json") or (f.endswith(".md") and "/references/" in p):
                sub(p, [(f'"protocolVersion": "{old}"', f'"protocolVersion": "{new}"'),
                        (f'"schemaVersion": "{old}"', f'"schemaVersion": "{new}"')], changed)
            elif f == "validate.js":
                sub(p, [(f'schemaVersion: "{old}"', f'schemaVersion: "{new}"')], changed)
    # 两份主 schema 的说明在拆出契约版本之前写的是“与仓库版本一致”：第一次契约升级时换成契约版本的说法
    # （那时 schema 副本反正都要重发；换过之后这两条不再命中）
    sub("student/general/xiaozhi-skill-coordinator/schemas/handover-protocol.schema.json",
        [(f"协议版本，与仓库版本一致（当前 {old}）",
          f"协议版本：与档案结构的 schemaVersion 同用一个契约版本，只在交接协议或档案结构变化时升（当前 {new}），与技能包各自的版本号无关")], changed)
    sub("student/general/xiaozhi-learning-dna/schemas/dna-profile.schema.json",
        [(f"档案结构版本号，与仓库版本一致（当前 {old}）",
          f"档案结构版本号：与交接协议的 protocolVersion 同用一个契约版本，只在档案结构或交接协议变化时升（当前 {new}），与技能包各自的版本号无关")], changed)
    for p in ["student/general/xiaozhi-skill-coordinator/schemas/handover-protocol.schema.json",
              "student/general/xiaozhi-learning-dna/schemas/dna-profile.schema.json"]:
        sub(p, [(f"（当前 {old}）", f"（当前 {new}）"), (f'"{old}"', f'"{new}"')], changed)
    sub("student/general/xiaozhi-learning-dna/schemas/README.md", [(f"（当前 {old}）", f"（当前 {new}）")], changed)
    # 保险：旧契约版本的写法还留在哪里（新加的示例文件类型没被上面覆盖时会落在这里）
    pat = re.compile(rf'("(?:protocolVersion|schemaVersion)":\s*"|schemaVersion:\s*"){re.escape(old)}"')
    left = []
    for root, ds, fs in os.walk("."):
        ds[:] = [d for d in ds if d not in ("node_modules", "__pycache__", "docs", "shared") and not d.startswith(".")]
        for f in fs:
            if f.endswith((".md", ".json", ".js", ".mjs")):
                p = os.path.join(root, f)
                try:
                    if pat.search(open(p, encoding="utf-8").read()):
                        left.append(p)
                except (OSError, UnicodeDecodeError):
                    pass
    if left:
        print(f"⚠️ 这些文件里还有旧契约版本 {old} 的 protocolVersion / schemaVersion，请手工确认：")
        print("\n".join(f"  {p}" for p in sorted(left)))


def bump_release(old, new, contract_new, changed):
    """发布版本 old → new：package.json、锁文件根包、README 与 docs 的“当前版本”。"""
    p = "package.json"
    t = open(p, encoding="utf-8", newline="").read()
    o = t
    t = t.replace(f'"version": "{old}"', f'"version": "{new}"', 1)
    if contract_new:
        t = re.sub(r'("contractVersion":\s*")[^"]+(")', rf"\g<1>{contract_new}\g<2>", t, count=1)
    if t != o:
        open(p, "w", encoding="utf-8", newline="").write(t)
        changed.append(p)
    # 锁文件里每个依赖也有 "version"：只改根包的两处（顶层与 packages[""]，都在第一个 node_modules/ 条目之前），
    # 依赖恰好与仓库同版本号时不能跟着改
    try:
        t = open("package-lock.json", encoding="utf-8", newline="").read()
    except FileNotFoundError:
        t = None
    if t is not None:
        i = t.find('"node_modules/')
        head, tail = (t, "") if i < 0 else (t[:i], t[i:])
        nhead = head.replace(f'"version": "{old}"', f'"version": "{new}"')
        if nhead != head:
            open("package-lock.json", "w", encoding="utf-8", newline="").write(nhead + tail)
            changed.append("package-lock.json")
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


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    contract = "--contract" in sys.argv
    if len(args) != 2 or not all(SEMVER.fullmatch(a) for a in args):
        sys.exit(__doc__)
    old, new = args
    os.chdir(REPO)
    if version() != old:
        sys.exit(f"package.json 的发布版本是 {version()}，不是 {old}")
    if ver_tuple(new) <= ver_tuple(old):
        sys.exit(f"新版本 {new} 要高于 {old}")

    run("node", "scripts/sync-shared.mjs")
    pend = package_status()["pending"]
    if not (pend["changed"] or pend["added"] or pend["removed"] or contract):
        sys.exit("没有内容有变的技能：升版也没有包可发。只改了脚本或文档（不随包）的，不用升版。")

    changed = []
    old_contract = contract_version()
    if contract:
        bump_contract(old_contract, new, changed)
        run("node", "scripts/sync-shared.mjs")
    bump_release(old, new, new if contract else None, changed)
    bumped = run("node", "scripts/package-versions.mjs", "--write", new)
    run("node", "scripts/gen-docs.mjs", "--write")

    print(f"发布版本 {old} → {new}" + (f"；契约版本 {old_contract} → {new}" if contract else f"（契约版本仍为 {old_contract}）"))
    print(f"改了 {len(changed)} 个文件（不含 SKILL.md 的版本号、技能内副本与技能索引）")
    print(bumped)
    print("下一步：npm run check；发布只发上面这些技能（python scripts/publish/publish_clawhub.py、publish_skillhub.py）")


if __name__ == "__main__":
    main()

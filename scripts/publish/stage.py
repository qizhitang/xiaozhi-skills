#!/usr/bin/env python3
"""把仓库里的 SKILL 目录暂存为可发布形态。

仓库的 frontmatter 顶层只有 Agent Skills 官方字段（name / description / license /
compatibility / metadata）+ 平台加载字段，本库自有字段都在 `metadata:` 块内
（见 shared/platform-conventions.md §六）。两个市场的解析器只认顶层 `key: value`
（SkillHub 尤其朴素，折叠块也不认），所以这里做投影：

  - metadata.* 提升为顶层（display_name / version / author / category /
    grade_bands / tags / depends_on）
  - 补 slug（= name）、displayName、summary
  - 折叠式 description: > 展平成单行（单引号标量，内部单引号双写）
  - version 以仓库 package.json 为准

正文与 references/ shared/ 原样复制。

用法：python stage.py <输出目录> [只处理某个技能]
"""
import os, re, shutil, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import REPO, skill_dirs, version  # noqa: E402

# 目录名与上架 slug/显示名不一致的少数条目
OVERRIDE = {
    "xiaozhi-chinese-classical-revival": ("xiaozhi-chinese-classical-revival", "跨时空古文对话"),
}
OURS = ["display_name", "version", "author", "category", "grade_bands", "tags", "depends_on"]


def parse_fm(text):
    """返回 (顶层字段, metadata, 正文行)。值形如 ("scalar", s) / ("list", [..]) / ("folded", s)。"""
    lines = text.split("\n")
    end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    fm, body = lines[1:end], lines[end + 1:]
    top, meta, i = {}, {}, 0
    while i < len(fm):
        m = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", fm[i])
        if not m:
            i += 1
            continue
        k, v = m.group(1), m.group(2).strip()
        if v in (">", ">-", "|", "|-"):
            buf = []
            i += 1
            while i < len(fm) and (fm[i].startswith("  ") or not fm[i].strip()):
                buf.append(fm[i].strip())
                i += 1
            top[k] = ("folded", "".join(buf).strip())
            continue
        if v == "" and k == "metadata":
            i += 1
            while i < len(fm) and re.match(r"^  \S", fm[i]):
                mm = re.match(r"^  ([A-Za-z_][\w-]*):\s*(.*)$", fm[i])
                if not mm:
                    i += 1
                    continue
                k2, v2 = mm.group(1), mm.group(2).strip()
                if v2 == "":
                    lst = []
                    i += 1
                    while i < len(fm) and re.match(r"^    -\s+", fm[i]):
                        lst.append(re.sub(r"^\s+-\s+", "", fm[i]).strip())
                        i += 1
                    meta[k2] = ("list", lst)
                    continue
                meta[k2] = ("scalar", v2)
                i += 1
            continue
        if v == "":
            lst = []
            i += 1
            while i < len(fm) and re.match(r"^\s+-\s+", fm[i]):
                lst.append(re.sub(r"^\s+-\s+", "", fm[i]).strip())
                i += 1
            top[k] = ("list", lst)
            continue
        top[k] = ("scalar", v)
        i += 1
    return top, meta, body


def yq(s):
    """YAML 单引号标量：内部单引号双写。正文含半角双引号，故不能用双引号风格。"""
    return "'" + s.replace("'", "''") + "'"


def emit(out, k, val):
    kind, v = val
    if kind == "list":
        out.append(f"{k}:")
        out.extend(f"  - {x}" for x in v)
    else:
        out.append(f"{k}: {v}")


def stage(name, src, dst, ver):
    if os.path.exists(dst):
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    p = os.path.join(dst, "SKILL.md")
    top, meta, body = parse_fm(open(p, encoding="utf-8").read())

    pick = lambda k: meta.get(k) or top.get(k)  # 兼容旧的扁平 frontmatter
    display = (pick("display_name") or ("scalar", name))[1]
    slug, display = OVERRIDE.get(name, (name, display))
    desc = (top.get("description") or ("scalar", ""))[1]
    summary = re.split(r"(?<=[。；！？])", desc)[0][:120] if desc else display

    out = [f"name: {name}", "description: " + yq(desc)]
    if "compatibility" in top:
        emit(out, "compatibility", top["compatibility"])
    out.append("license: " + (top.get("license") or ("scalar", "MIT"))[1])
    for k in OURS:
        val = pick(k)
        if k == "version":
            val = ("scalar", ver)
        elif k == "display_name":
            val = ("scalar", display)
        if val is not None:
            emit(out, k, val)
    for k, val in top.items():  # 平台加载字段（id / min_platform_version / max_round_limit）
        if k not in ("name", "description", "compatibility", "license", "metadata") and k not in OURS:
            emit(out, k, val)
    out += [f"slug: {slug}", f"displayName: {display}", "summary: " + yq(summary)]
    open(p, "w", encoding="utf-8", newline="\n").write("\n".join(["---"] + out + ["---"] + body))
    return slug, display


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__.strip().split("\n")[-1])
    stage_root, only = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None)
    ver = version()
    os.makedirs(stage_root, exist_ok=True)
    done = []
    for name, src in sorted(skill_dirs().items()):
        if only and name != only:
            continue
        done.append((name,) + stage(name, src, os.path.join(stage_root, name), ver))
    print(f"按仓库版本 {ver} 暂存 {len(done)} 个 -> {stage_root}")
    for n, s, d in done[:5]:
        print(f"  {n} -> slug={s} displayName={d}")
    if len(done) > 5:
        print(f"  …共 {len(done)} 个")


if __name__ == "__main__":
    main()

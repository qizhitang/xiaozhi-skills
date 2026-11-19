#!/usr/bin/env python3
"""技能被 SkillHub 审核拒绝、平台只给笼统标签（如“内容含涉政内容”）时，用一个测试包二分定位是哪一句触发的。

做法与 v2.12.7 手工查那一次一样（当时发了 20 个测试版本）：
  1. 整包复刻到测试 slug 上：能复现被拒才往下查；
  2. 分组：SKILL.md 单独（原 frontmatter），其余文件按顶层目录分组、各配一个中性 SKILL.md，找出被拒的那一组；
  3. SKILL.md 组：先换中性 frontmatter、只留正文（排除描述），再按正文行号逐半二分；
     其他组：先按文件对半，剩一个文件后按行对半；
  4. 缩到一行时单独发这一行确认。
每一步往测试 slug 发一个新版本（占 1 次 SkillHub 额度），等平台审核出结果再走下一步；审核慢时可以中断，
重跑同一命令就从上次停下的地方继续（进度在 <work>/bisect/state.json）。二分假定只有一个触发点：
前半段通过就推断在后半段，最后单独发那一行确认；单句不复现时报出最后缩到的那一段，可能是几句合起来触发。

测试 slug 由你在命令行给出、不入库；过审的测试版本在平台上公开可见，查完可以去平台下架。
查的是开始时仓库里这个技能的内容（开始时打包一份，全程用它）：被拒之后已经改过这个技能的，先切到被拒那一版的提交再开始。
查实后：把那一句加进 scripts/review-risk.json 的 triggers，改内容、升版、发布。

用法：
    python bisect_review.py <技能> --slug <测试slug>             # 开始或继续；每次运行最多等 --wait 分钟的审核结果（默认 20）
    python bisect_review.py <技能> --slug <测试slug> --dry-run   # 只生成下一步要发的测试包、打印路径，不发
    python bisect_review.py --status                            # 看当前进度
    python bisect_review.py --reset                             # 放弃当前这次二分
    python bisect_review.py --self-test                         # 不联网：用模拟的审核把二分逻辑跑一遍
"""
import json, os, re, shutil, sys, tempfile, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import log, skill_dirs, skill_version, workdir  # noqa: E402

BISECT = workdir("bisect")
STATE = os.path.join(BISECT, "state.json")
LOG = os.path.join(BISECT, "bisect.log")
NEUTRAL_BODY = "# 二分测试包\n\n本包只用于定位一次审核问题，内容是另一个技能的片段。\n"


# ---------- 测试包 ----------

def split_fm(text):
    """(frontmatter 各行, 正文各行)；打包后的 SKILL.md 以 --- 开头。"""
    lines = text.replace("\r\n", "\n").split("\n")
    end = lines.index("---", 1)
    return lines[1:end], lines[end + 1:]


def frontmatter(orig_fm, slug, version, neutral):
    """测试包的 frontmatter：身份字段换成测试 slug；neutral 时描述、显示名、标签等内容字段一律换成中性的。"""
    out, skip_list = [], False
    for line in orig_fm:
        key = re.match(r"^([A-Za-z_][\w-]*):", line)
        if skip_list and (line.startswith("  ") or line.startswith("- ")):
            continue
        skip_list = False
        if not key:
            out.append(line)
            continue
        k = key.group(1)
        if k in ("name", "slug"):
            out.append(f"{k}: {slug}")
        elif k == "version":
            out.append(f"version: {version}")
        elif k == "id":
            out.append(f"id: openclaw:{slug}")
        elif k == "displayName" or (neutral and k == "display_name"):
            out.append(f"{k}: 二分测试包")
        elif neutral and k in ("description", "summary"):
            out.append(f"{k}: '二分测试包，只用于定位一次审核问题。'")
        elif neutral and k in ("tags", "depends_on"):
            skip_list = not line.rstrip().endswith("]")   # 块列表跟着几行“  - x”，一并去掉
        else:
            out.append(line)
    return out


def build(spec, src, out, slug, version):
    """按 spec 在 out 下生成测试包目录。spec：
       {"kind": "whole"}                                  整包
       {"kind": "files", "files": [...]}                  只带这些文件；不含 SKILL.md 时配中性 SKILL.md
       {"kind": "lines", "file": f, "lo": a, "hi": b}     只带一个文件的第 a..b-1 行（SKILL.md 时指正文行）"""
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    orig_fm, body = split_fm(open(os.path.join(src, "SKILL.md"), encoding="utf-8").read())
    kind = spec["kind"]
    if kind == "whole":
        files = [f for f in all_files(src) if f != "SKILL.md"]
        fm, text = frontmatter(orig_fm, slug, version, False), body
    elif kind == "files":
        files = [f for f in spec["files"] if f != "SKILL.md"]
        if "SKILL.md" in spec["files"]:
            fm, text = frontmatter(orig_fm, slug, version, spec.get("neutral", False)), body
        else:
            fm, text = frontmatter(orig_fm, slug, version, True), NEUTRAL_BODY.split("\n")
    else:
        files = []
        if spec["file"] == "SKILL.md":
            fm, text = frontmatter(orig_fm, slug, version, True), body[spec["lo"]:spec["hi"]]
        else:
            fm, text = frontmatter(orig_fm, slug, version, True), NEUTRAL_BODY.split("\n")
            lines = open(os.path.join(src, spec["file"]), encoding="utf-8").read().replace("\r\n", "\n").split("\n")
            dst = os.path.join(out, spec["file"])
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            open(dst, "w", encoding="utf-8", newline="\n").write("\n".join(lines[spec["lo"]:spec["hi"]]) + "\n")
    for f in files:
        os.makedirs(os.path.dirname(os.path.join(out, f)), exist_ok=True)
        shutil.copy2(os.path.join(src, f), os.path.join(out, f))
    open(os.path.join(out, "SKILL.md"), "w", encoding="utf-8", newline="\n").write("\n".join(["---"] + fm + ["---"] + text))


def all_files(src):
    out = []
    for r, ds, fs in os.walk(src):
        out += [os.path.relpath(os.path.join(r, f), src).replace(os.sep, "/") for f in fs]
    return sorted(out)


def line_count(src, f):
    if f == "SKILL.md":
        return len(split_fm(open(os.path.join(src, "SKILL.md"), encoding="utf-8").read())[1])
    return len(open(os.path.join(src, f), encoding="utf-8").read().replace("\r\n", "\n").split("\n"))


def line_text(src, f, i):
    if f == "SKILL.md":
        fm, body = split_fm(open(os.path.join(src, "SKILL.md"), encoding="utf-8").read())
        return len(fm) + 2 + i + 1, body[i]          # 换算回打包后 SKILL.md 的行号
    return i + 1, open(os.path.join(src, f), encoding="utf-8").read().replace("\r\n", "\n").split("\n")[i]


# ---------- 二分的状态机（不联网，便于自测） ----------

def start(src):
    files = all_files(src)
    groups, rest = [["SKILL.md"]], {}
    for f in files:
        if f != "SKILL.md":
            rest.setdefault(f.split("/")[0] if "/" in f else f, []).append(f)
    groups += [rest[k] for k in sorted(rest)]
    return {"phase": "whole", "groups": groups, "gi": 0, "steps": [], "found": None, "message": None}


def next_spec(st):
    ph = st["phase"]
    if ph == "whole":
        return {"kind": "whole"}, "整包复刻（能复现被拒才往下查）"
    if ph == "groups":
        g = st["groups"][st["gi"]]
        what = "SKILL.md 单独（原 frontmatter）" if g == ["SKILL.md"] else f"{g[0].split('/')[0]}（{len(g)} 个文件）配中性 SKILL.md"
        return {"kind": "files", "files": g, "neutral": False}, what
    if ph == "fm":
        return {"kind": "lines", "file": "SKILL.md", "lo": 0, "hi": st["n"]}, "中性 frontmatter + 原正文（排除描述）"
    if ph == "files":
        half = st["files"][:len(st["files"]) // 2]
        return {"kind": "files", "files": half}, f"前一半文件（{len(half)}/{len(st['files'])} 个）"
    where = lambda: "SKILL.md 正文" if st.get("file") == "SKILL.md" else st.get("file")
    if ph == "lines":
        mid = (st["lo"] + st["hi"]) // 2
        return {"kind": "lines", "file": st["file"], "lo": st["lo"], "hi": mid}, f"{where()}第 {st['lo'] + 1}–{mid} 行（候选 {st['lo'] + 1}–{st['hi']}）"
    if ph == "confirm":
        return {"kind": "lines", "file": st["file"], "lo": st["lo"], "hi": st["lo"] + 1}, f"{where()}第 {st['lo'] + 1} 行单独确认"
    return None, None


def to_lines(st, src, f):
    st.update(phase="lines", file=f, lo=0, hi=line_count(src, f), last=None)
    if st["hi"] <= 1:
        st["phase"] = "confirm"


def advance(st, src, rejected):
    ph = st["phase"]
    if ph == "whole":
        if rejected:
            st["phase"] = "groups"
        else:
            st.update(phase="done", message="整包在测试 slug 上通过，复现不了：平台判定可能不稳定，或与正式技能的历史有关。可以过一阵再试，或直接在平台申诉。")
    elif ph == "groups":
        g = st["groups"][st["gi"]]
        if rejected and g == ["SKILL.md"]:
            st.update(phase="fm", n=line_count(src, "SKILL.md"))
        elif rejected and len(g) > 1:
            st.update(phase="files", files=g)
        elif rejected:
            to_lines(st, src, g[0])
        else:
            st["gi"] += 1
            if st["gi"] >= len(st["groups"]):
                st.update(phase="done", message="整包被拒，但各组单独都通过：可能是跨文件的几处合起来触发，只能人工看了。")
    elif ph == "fm":
        if rejected:
            to_lines(st, src, "SKILL.md")
        else:
            st.update(phase="done", message="SKILL.md 换成中性 frontmatter 后通过：触发点在 frontmatter（描述、显示名、标签等字段）里。")
    elif ph == "files":
        half = len(st["files"]) // 2
        st["files"] = st["files"][:half] if rejected else st["files"][half:]
        if len(st["files"]) == 1:
            to_lines(st, src, st["files"][0])
    elif ph == "lines":
        mid = (st["lo"] + st["hi"]) // 2
        st["last"] = [st["lo"], st["hi"]]
        if rejected:
            st["hi"] = mid
        else:
            st["lo"] = mid
        if st["hi"] - st["lo"] <= 1:
            st["phase"] = "confirm"
    elif ph == "confirm":
        if rejected:
            no, text = line_text(src, st["file"], st["lo"])
            at = f"SKILL.md 正文第 {st['lo'] + 1} 行（打包后第 {no} 行）" if st["file"] == "SKILL.md" else f"{st['file']} 第 {no} 行"
            st.update(phase="done", found={"file": st["file"], "line": no, "text": text},
                      message=f"查实：{at}单独一句就被拒。")
        else:
            lo, hi = st.get("last") or [st["lo"], st["lo"] + 1]
            st.update(phase="done", message=f"第 {st['lo'] + 1} 行单独发通过：可能是 {st['file']} 第 {lo + 1}–{hi} 行几句合起来触发，请人工看这一段。")


def run(src, submit, wait_result, st=None, max_steps=60):
    """跑到出结论或要等审核为止。submit(spec, desc) → 版本号；wait_result(版本号) → True 被拒 / False 通过 / None 还在审核。"""
    st = st or start(src)
    while st["phase"] != "done" and len(st["steps"]) < max_steps:
        if st.get("pending"):
            res = wait_result(st["pending"]["version"])
            if res is None:
                return st
            st["steps"].append({**st["pending"], "result": "被拒" if res else "通过"})
            st["pending"] = None
            advance(st, src, res)
            continue
        spec, desc = next_spec(st)
        st["pending"] = {"version": submit(spec, desc), "desc": desc}
    return st


# ---------- 联网：SkillHub ----------

def online(skill, slug, wait_min, dry):
    from publish_skillhub import publish
    from verify_publish import _cred, live_versions, reject_label

    st = json.load(open(STATE, encoding="utf-8")) if os.path.exists(STATE) else None
    if st and (st["skill"] != skill or st["slug"] != slug):
        sys.exit(f"进行中的是 {st['skill']} → {st['slug']}；先 --reset 再开始新的")
    if not st:
        if skill not in skill_dirs():
            sys.exit(f"没有这个技能：{skill}")
        src = os.path.join(BISECT, "source", skill)
        from stage import stage
        stage(skill, skill_dirs()[skill], src, skill_version(skill_dirs()[skill]))   # 开始时打包一份，二分全程用它，不受仓库后续改动影响
        st = {**start(src), "skill": skill, "slug": slug, "src": src, "started": time.strftime("%Y-%m-%d %H:%M")}
    src = st["src"]
    if dry and st.get("pending"):
        show(st)
        sys.exit("有一步还在审核：等出结果后再预演下一步")

    def save():
        json.dump(st, open(STATE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    def next_version():
        """测试 slug 的下一个版本号：接着上一步（或线上现有的最新版本）把补丁号加 1；全新的 slug 从 0.0.1 起。"""
        last = st.get("last_version")
        if not last:
            try:
                last = (live_versions(passes=1).get(slug) or {}).get("version")
            except Exception:
                last = None
        if last and re.fullmatch(r"\d+\.\d+\.\d+", last):
            a, b, c = map(int, last.split("."))
            return f"{a}.{b}.{c + 1}"
        return "0.0.1"

    def submit(spec, desc):
        ver = next_version()
        st["last_version"] = ver
        out = os.path.join(BISECT, "pkg", slug)
        build(spec, src, out, slug, ver)
        if dry:
            print(f"下一步：{desc}\n  测试包：{out}（版本 {ver}，未发布）")
            sys.exit(0)
        status, info = publish(out, f"二分测试 {ver}：{desc}")
        if status != "ok":
            save()
            sys.exit(f"发布失败（{status}）：{str(info)[:200]}\n限流时过一阵重跑同一命令即可，进度已保存")
        log(f"已发 {slug}@{ver}：{desc}", LOG)
        st["pending"] = {"version": ver, "desc": desc}
        save()
        return ver

    def wait_result(ver):
        tok, host = _cred()
        deadline = time.time() + wait_min * 60
        while True:
            e = live_versions(passes=2).get(slug) or {}
            if e.get("version") == ver and e.get("approved") == ver:
                log(f"  {ver} 通过", LOG)
                return False
            if e.get("version") == ver and e.get("review", "").lower() == "rejected":
                log(f"  {ver} 被拒：{reject_label(host, tok, slug, ver) or e.get('note') or '无说明'}", LOG)
                return True
            if time.time() > deadline:
                save()
                log(f"  {ver} 还在审核：稍后重跑同一命令继续", LOG)
                return None
            time.sleep(60)

    st = run(src, submit, wait_result, st)
    save()
    show(st)


def show(st):
    print(f"二分：{st.get('skill')} → 测试 slug {st.get('slug')}（{st.get('started')} 开始），已发 {len(st['steps'])} 步")
    for i, s in enumerate(st["steps"], 1):
        print(f"  {i:>2}. {s['desc']} @{s['version']}：{s['result']}")
    if st.get("pending"):
        print(f"  审核中：{st['pending']['desc']} @{st['pending']['version']}")
    if st.get("message"):
        print(st["message"])
    if st.get("found"):
        text = st["found"]["text"].strip()
        print(f"  那一句：{text}")
        src = skill_dirs().get(st.get("skill") or "")
        path = os.path.join(src, st["found"]["file"]) if src else None
        if path and os.path.exists(path) and text:
            hits = [i for i, l in enumerate(open(path, encoding="utf-8").read().split("\n"), 1) if l.strip() == text]
            if hits:
                print(f"  在仓库里：{os.path.relpath(path)} 第 {'、'.join(map(str, hits))} 行")
        print("  下一步：把它加进 scripts/review-risk.json 的 triggers，改内容、升版、发布；测试 slug 上过审的版本可以去平台下架。")


# ---------- 自测 ----------

def self_test():
    """模拟审核：包里任何文件含 TRIGGER 就“被拒”。三种情形：触发在 SKILL.md 正文、在参考资料、在描述里。"""
    TRIGGER = "与作业总量协调"
    body = [f"第 {i} 行正文" for i in range(1, 58)]

    def case(where):
        root = tempfile.mkdtemp(prefix="bisect-self-")
        src = os.path.join(root, "skill")
        os.makedirs(os.path.join(src, "references"))
        os.makedirs(os.path.join(src, "shared"))
        desc = "示例描述" + (TRIGGER if where == "desc" else "")
        b = list(body)
        if where == "body":
            b[40] = "每天课外复习总量按学段" + TRIGGER + "，不因为考前就无限加时"
        fm = ["name: demo", f"description: '{desc}'", "license: MIT", "display_name: 示例", "version: 1.0.0",
              "tags: [a, b]", "depends_on:", "  - other", "id: openclaw:demo", "slug: demo", "displayName: 示例", f"summary: '{desc}'"]
        open(os.path.join(src, "SKILL.md"), "w", encoding="utf-8").write("\n".join(["---"] + fm + ["---"] + b))
        for n in range(5):
            lines = [f"参考 {n} 第 {i} 行" for i in range(1, 30)]
            if where == "ref" and n == 3:
                lines[17] = "参考里的一句：" + TRIGGER
            open(os.path.join(src, "references", f"r{n}.md"), "w", encoding="utf-8").write("\n".join(lines))
        open(os.path.join(src, "shared", "vocab.md"), "w", encoding="utf-8").write("共享约定\n")
        pkg, results, n = os.path.join(root, "pkg"), {}, [0]

        def submit(spec, desc):
            n[0] += 1
            ver = f"0.0.{n[0]}"
            build(spec, src, pkg, "probe", ver)
            hit = any(TRIGGER in open(os.path.join(r, f), encoding="utf-8").read() for r, _, fs in os.walk(pkg) for f in fs)
            fm_name = open(os.path.join(pkg, "SKILL.md"), encoding="utf-8").read().split("\n")[1]
            assert fm_name == "name: probe", fm_name
            results[ver] = hit
            return ver

        st = run(src, submit, lambda v: results[v])
        shutil.rmtree(root)
        return st

    st = case("body")
    assert st["found"] and st["found"]["file"] == "SKILL.md" and TRIGGER in st["found"]["text"], st
    print(f"正文里的触发句：{len(st['steps'])} 步查实（{st['message']}）")
    st = case("ref")
    assert st["found"] and st["found"]["file"] == "references/r3.md" and st["found"]["line"] == 18, st
    print(f"参考资料里的触发句：{len(st['steps'])} 步查实（{st['message']}）")
    st = case("desc")
    assert not st["found"] and "frontmatter" in st["message"], st
    print(f"描述里的触发句：{len(st['steps'])} 步定位到 frontmatter")
    print("✅ 自测通过")


def main():
    args, skip = [], False
    for a in sys.argv[1:]:          # 位置参数：去掉 --xxx 与 --slug、--wait 后面跟的值
        if skip:
            skip = False
        elif a in ("--slug", "--wait"):
            skip = True
        elif not a.startswith("--"):
            args.append(a)
    if "--self-test" in sys.argv:
        return self_test()
    if "--reset" in sys.argv:
        if os.path.exists(STATE):
            os.remove(STATE)
        print("已放弃当前二分")
        return
    if "--status" in sys.argv:
        if not os.path.exists(STATE):
            print("没有进行中的二分")
            return
        return show(json.load(open(STATE, encoding="utf-8")))
    if len(args) != 1 or "--slug" not in sys.argv:
        sys.exit(__doc__)
    slug = sys.argv[sys.argv.index("--slug") + 1]
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{2,63}", slug) or slug in skill_dirs():
        sys.exit(f"测试 slug 要是小写字母、数字与连字符，且不能是正式技能的名字：{slug}")
    wait = int(sys.argv[sys.argv.index("--wait") + 1]) if "--wait" in sys.argv else 20
    online(args[0], slug, wait, "--dry-run" in sys.argv)


if __name__ == "__main__":
    main()

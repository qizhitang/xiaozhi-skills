#!/usr/bin/env python3
"""列出自某个提交以来，随包内容真的变了的技能。

全库锁步版本号，升一次版每个 SKILL.md 的 metadata.version、示例里的 protocolVersion、
随包 schema 的版本枚举都会跟着变——按文件 diff 看，84 个包个个“变了”。这里先把两边的
版本号各自换成同一个占位符再比：只有版本号不同的文件不算变化，剩下的才是内容改动。

用法：
  python changed.py --since <提交>            # 一般填上一次发布对应的升版提交
  python changed.py --since <提交> --names    # 只打印逗号分隔的技能名，可直接接 --only
  python changed.py --since <提交> --files    # 连同每个技能改了哪些文件

例：
  python scripts/publish/publish_skillhub.py --only "$(python scripts/publish/changed.py --since <提交> --names)"

比的是工作区（含没提交的改动）与 <提交> 的技能目录。仓库根 shared/ 改了以后要先
npm run sync:shared，改动才会落进各技能目录的副本，这里才看得见。

注意：只发改了的包，线上就会同时存在两个版本号的包；而交接协议 schema 的 protocolVersion
目前是只含当前版本号的单值枚举（见 scripts/publish/README.md“只发改了的包”一节）。
"""
import os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import REPO, skill_dirs, version  # noqa: E402

PLACEHOLDER = "{{VERSION}}"
SIDES = ("student", "teacher", "tools")


def git(*args, check=True):
    r = subprocess.run(["git", "-C", REPO, *args], capture_output=True)
    if check and r.returncode != 0:
        sys.exit(f"git {' '.join(args)} 失败：{r.stderr.decode('utf-8', 'replace').strip()}")
    return r


def normalized(data, ver):
    """版本号换成占位符；CRLF 统一成 LF（Windows 检出与提交内容的换行不同，不算内容变化）。"""
    return data.replace(b"\r\n", b"\n").replace(ver.encode(), PLACEHOLDER.encode())


def old_version(ref):
    import json
    return json.loads(git("show", f"{ref}:package.json").stdout.decode("utf-8"))["version"]


def at_ref(ref, path):
    r = git("show", f"{ref}:{path}", check=False)
    return r.stdout if r.returncode == 0 else None


def in_worktree(path):
    p = os.path.join(REPO, path)
    if not os.path.isfile(p):
        return None
    with open(p, "rb") as f:
        return f.read()


def touched_paths(ref):
    """<提交> 到工作区之间动过的技能目录文件：已跟踪的改动 + 还没跟踪的新文件。"""
    diff = git("diff", "--name-only", "-z", ref, "--", *SIDES).stdout
    new = git("ls-files", "--others", "--exclude-standard", "-z", "--", *SIDES).stdout
    return sorted({p for p in (diff + new).decode("utf-8").split("\0") if p})


def changed_skills(ref):
    """返回 ({技能名: [(路径, 状态)]}, 已不在仓库的路径)。状态：新增 / 删除 / 修改。"""
    cur, old = version(), old_version(ref)
    owners = sorted(((os.path.relpath(d, REPO).replace(os.sep, "/") + "/", n) for n, d in skill_dirs().items()),
                    key=lambda x: -len(x[0]))
    changed, orphans = {}, []
    for path in touched_paths(ref):
        before, after = at_ref(ref, path), in_worktree(path)
        if before is not None and after is not None and normalized(before, old) == normalized(after, cur):
            continue  # 只有版本号（或换行）不同
        name = next((n for prefix, n in owners if path.startswith(prefix)), None)
        if name is None:
            if before is not None and after is None:
                orphans.append(path)  # 整个技能被删或改名
            continue  # 技能目录以外的文件（如 teacher/general/schemas/）不单独成包
        status = "新增" if before is None else "删除" if after is None else "修改"
        changed.setdefault(name, []).append((path, status))
    return changed, orphans


def main():
    if "--since" not in sys.argv or sys.argv.index("--since") + 1 >= len(sys.argv):
        sys.exit(__doc__.strip())
    ref = sys.argv[sys.argv.index("--since") + 1]
    git("rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}")
    changed, orphans = changed_skills(ref)
    names = sorted(changed)
    if "--names" in sys.argv:
        print(",".join(names))
        return
    total = len(skill_dirs())
    print(f"自 {ref}（v{old_version(ref)}）以来，随包内容变了的技能：{len(names)} / {total}（当前 v{version()}）")
    for n in names:
        files = changed[n]
        own = [f for f in files if "/shared/" not in f[0]]
        print(f"  {n}：{len(files)} 个文件（自己的 {len(own)}，shared/ 副本 {len(files) - len(own)}）")
        if "--files" in sys.argv:
            for path, status in files:
                print(f"      {status}  {path}")
    if orphans:
        print(f"\n已不在仓库的技能文件 {len(orphans)} 个（技能被删或改名，线上的旧条目要另外处理）：")
        for p in orphans[:10]:
            print(f"  {p}")
    if not names:
        print("  （没有；只有版本号不同的包不用重发）")


if __name__ == "__main__":
    main()

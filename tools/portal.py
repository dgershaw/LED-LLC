#!/usr/bin/env python3
"""The administration portal: admin/index.html, built by the deploy workflow from the repository's history.

    python3 tools/portal.py --main <checkout of main> --live <checkout of live, or the same> --out <site folder>

Everyone on the marketing team can see what changed, who changed it and when, what is still waiting on the sandbox,
and who approved each version that went live (David, 2026-10-13). Nothing here is typed by hand: every entry comes
from a commit on `main` (the sandbox); every approval or roll-back is a commit on `live` made by the approve and
roll-back workflows, carrying a "Snapshot:" line that names the sandbox commit it published. Changes made through
Claude are committed in the name of the person who asked for them, with Claude as the committer, and the portal
says so ("through Claude").
"""
import argparse, json, re, subprocess
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from jinja2 import Environment, FileSystemLoader, select_autoescape

HERE = Path(__file__).resolve().parent
TZ = ZoneInfo("America/Chicago")          # Cary, Illinois
CMS = "https://app.pagescms.org/dgershaw/led-llc/main"
LIVE_URL = "https://dgershaw.github.io/LED-LLC/"
SANDBOX_URL = LIVE_URL + "sandbox/"
PEOPLE = {"dgershaw": "David", "github-actions[bot]": "The site builder"}
KINDS = {"spec-sheets": "spec sheet", "instructions": "installation instructions", "sell-sheets": "sell sheet",
         "case-studies": "case study", "catalog": "catalog"}
APPROVED = "Approved for the live site"
ROLLED_BACK = "Rolled back the live site"
FORMAT = "%x1e%H%x1f%P%x1f%an%x1f%ae%x1f%cn%x1f%aI%x1f%s%x1f%b%x1d"   # the body spans lines, so a marker ends it

def git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, check=True).stdout

def parse_log(out):
    result = []
    for chunk in out.split("\x1e")[1:]:
        head, _, files = chunk.partition("\x1d")
        sha, parents, author, email, committer, when, subject, body = (head.split("\x1f") + [""] * 8)[:8]
        changed = []
        for line in files.strip().splitlines():
            parts = line.split("\t")
            if len(parts) > 1:
                changed.append((parts[0][0], parts[-1]))
        result.append(dict(sha=sha, parents=parents.split(), author=author, email=email, committer=committer,
                           when=datetime.fromisoformat(when), subject=subject.strip(), body=body.strip(), files=changed))
    return result

def commits(repo, *revs):
    """Commits in a range, newest first, with their changed files; the builder's own commits are left out."""
    out = git(repo, "log", "--no-merges", f"--format={FORMAT}", "--name-status", *revs)
    return [c for c in parse_log(out) if c["author"] != "github-actions[bot]"]

def commit(repo, sha):
    found = parse_log(git(repo, "log", "-1", f"--format={FORMAT}", "--name-status", sha))
    return found[0] if found else None

def trailer(c, name):
    m = re.search(rf"^{name}: (.+)$", c["body"], re.M)
    return m.group(1).strip() if m else ""

def page_title(main, path):
    try:
        return json.loads((main / path).read_text()).get("title") or Path(path).stem.replace("-", " ").title()
    except (OSError, ValueError):
        return Path(path).stem.replace("-", " ").title()

def describe(c, main):
    """One plain line per changed file for admin-page edits, or the change's own subject otherwise."""
    if c["subject"].startswith("Undid: "):
        original = commit(main, trailer(c, "Undoes")) if trailer(c, "Undoes") else None
        return ["Undid: " + "; ".join(describe(original, main))] if original else [c["subject"]]
    if "(via Pages CMS)" not in c["subject"]:
        return [c["subject"] or "Site update"]
    lines = []
    for status, path in c["files"]:
        p = Path(path)
        verb = {"A": "Uploaded", "M": "Replaced", "D": "Removed", "R": "Renamed"}.get(status, "Changed")
        if path.startswith("content/pages/"):
            lines.append(f"Edited the {page_title(main, path)} page")
        elif path.startswith("assets/docs/"):
            kind = KINDS.get(p.parts[2], "document") if len(p.parts) > 2 else "document"
            product = p.parts[4] if len(p.parts) > 5 else ""
            lines.append(f"{verb} {kind} {p.name}" + (f" for {product}" if product else ""))
        elif path.startswith("assets/ies/"):
            pn = p.parts[-2] if len(p.parts) > 3 else ""
            lines.append(f"{verb} IES file {p.name}" + (f" for {pn}" if pn else ""))
        elif path.startswith("assets/img/"):
            lines.append(f"{verb} image {p.name}")
        else:
            lines.append(f"{verb} {path}")
    return lines or [c["subject"] or "Site update"]

def person(name):
    """A display name: the known people by name, otherwise a GitHub login such as amy-george read as Amy George."""
    if name in PEOPLE:
        return PEOPLE[name]
    return " ".join(w.capitalize() for w in re.split(r"[-_.]+", name)) if re.fullmatch(r"[a-z0-9]+(?:[-_.][a-z0-9]+)*", name) else name

def fmt(dt):
    d = dt.astimezone(TZ)
    return d.strftime("%b %-d, %Y at %-I:%M %p").replace("AM", "am").replace("PM", "pm")

def entry(c, main):
    via = "Claude" if c["committer"] == "Claude" and c["author"] != c["committer"] else ""
    return dict(sha=c["sha"][:7], who=person(c["author"]), via=via, when=fmt(c["when"]),
                iso=c["when"].astimezone(timezone.utc).isoformat(), what=describe(c, main), files=len(c["files"]))

def live_history(repo, ref):
    """Approvals and roll-backs on the live branch, newest first, each with the sandbox commit it published."""
    out = git(repo, "log", "--first-parent", f"--format={FORMAT}", ref)
    found = []
    for c in parse_log(out):
        if c["subject"].startswith(APPROVED):
            kind = "approval"
        elif c["subject"].startswith(ROLLED_BACK):
            kind = "rollback"
        else:
            continue
        snapshot = trailer(c, "Snapshot") or (c["parents"][1] if len(c["parents"]) > 1 else "")
        found.append(dict(sha=c["sha"], kind=kind, who=person(c["author"]), when=c["when"], note=trailer(c, "Note"),
                          snapshot=snapshot, restores=trailer(c, "Restores")))
    return found

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--main", required=True); ap.add_argument("--live", required=True); ap.add_argument("--out", required=True)
    a = ap.parse_args()
    main_repo, out = Path(a.main), Path(a.out)
    # the main checkout knows both branches once the workflow fetched them (the --live checkout is the built copy)
    live_ref = next((r for r in ("live", "origin/live")
                     if subprocess.run(["git", "-C", str(main_repo), "rev-parse", "--verify", "-q", r], capture_output=True).returncode == 0), None)

    history = live_history(main_repo, live_ref) if live_ref else []
    current = history[0]["snapshot"] if history else ""
    pending = [entry(c, main_repo) for c in commits(main_repo, "main", *([f"^{current}"] if current else []))]
    by_sha = {h["sha"]: h for h in history}
    releases = []
    for i, h in enumerate(history):
        prev = history[i + 1]["snapshot"] if i + 1 < len(history) else ""
        rel = dict(sha=h["sha"][:7], kind=h["kind"], who=h["who"], when=fmt(h["when"]), note=h["note"], changes=[], removed=[])
        if h["kind"] == "approval":
            rel["changes"] = [entry(c, main_repo) for c in commits(main_repo, h["snapshot"], *( [f"^{prev}"] if prev else []))]
        else:
            r = by_sha.get(h["restores"])
            rel["back_to"] = f"the version approved by {r['who']} on {fmt(r['when'])}" if r else "the previous version"
            if prev:
                rel["removed"] = [entry(c, main_repo) for c in commits(main_repo, prev, f"^{h['snapshot']}")]
        releases.append(rel)
    people = sorted({e["who"] for e in pending} | {c["who"] for r in releases for c in r["changes"] + r["removed"]} | {r["who"] for r in releases})
    built = fmt(datetime.now(timezone.utc))
    env = Environment(loader=FileSystemLoader(str(HERE / "templates")), autoescape=select_autoescape(["html"]))
    page = env.get_template("admin.html").render(pending=pending, releases=releases, people=people, built=built, cms=CMS,
                                                 live_url=LIVE_URL, sandbox_url=SANDBOX_URL, has_live=bool(live_ref),
                                                 can_roll_back=len({h["snapshot"] for h in history}) > 1)
    (out / "admin").mkdir(parents=True, exist_ok=True)
    (out / "admin" / "index.html").write_text(page)
    (out / "admin" / "changes.json").write_text(json.dumps(dict(built=built, pending=pending, releases=releases), indent=1))
    print(f"portal: {len(pending)} changes awaiting approval, {len(releases)} versions published")

if __name__ == "__main__":
    main()

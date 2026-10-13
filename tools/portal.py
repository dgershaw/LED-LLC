#!/usr/bin/env python3
"""The administration portal: admin/index.html, built by the deploy workflow from the repository's history.

    python3 tools/portal.py --main <checkout of main> --live <checkout of live, or the same> --out <site folder>

Everyone on the marketing team can see what changed, who changed it and when, what is still waiting on the sandbox,
and who approved each version that went live (David, 2026-10-13). Nothing here is typed by hand: every entry comes
from a commit on `main` (the sandbox) and every approval from a merge commit on `live`, made by the approve workflow.
"""
import argparse, html, json, re, subprocess, sys
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

def git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, check=True).stdout

def commits(repo, rev_range):
    """Commits in a range, newest first, with their changed files: [{sha, author, email, when, subject, body, files:[(status, path)]}]."""
    out = git(repo, "log", "--no-merges", "--format=%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%s%x1f%b", "--name-status", *rev_range.split())
    result = []
    for chunk in out.split("\x1e")[1:]:
        head, _, files = chunk.partition("\n")
        sha, author, email, when, subject, body = (head.split("\x1f") + [""] * 6)[:6]
        if author == "github-actions[bot]":   # the builder's own commits (before pages were published without committing them)
            continue
        changed = []
        for line in files.strip().splitlines():
            if not line.strip():
                continue
            parts = line.split("\t")
            status, path = parts[0][0], parts[-1]
            changed.append((status, path))
        result.append(dict(sha=sha, author=author, email=email, when=datetime.fromisoformat(when), subject=subject.strip(),
                           body=body.strip(), files=changed))
    return result

def page_title(main, path):
    try:
        return json.loads((main / path).read_text()).get("title") or Path(path).stem.replace("-", " ").title()
    except (OSError, ValueError):
        return Path(path).stem.replace("-", " ").title()

def describe(c, main):
    """One plain line per changed file, or the commit's own subject when it came from the generator."""
    if "via Pages CMS" not in c["subject"] and not c["email"].endswith("users.noreply.github.com"):
        return [c["subject"]] if c["subject"] else ["Site update"]
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

def person(c):
    return PEOPLE.get(c["author"], c["author"])

def fmt(dt):
    d = dt.astimezone(TZ)
    return d.strftime("%b %-d, %Y at %-I:%M %p").replace("AM", "am").replace("PM", "pm")

def entry(c, main):
    return dict(sha=c["sha"][:7], who=person(c), when=fmt(c["when"]), iso=c["when"].astimezone(timezone.utc).isoformat(),
                what=describe(c, main), files=len(c["files"]))

def approvals(repo, ref):
    """Merge commits on the live branch made by the approve workflow, newest first: [{sha, who, when, note}]."""
    out = git(repo, "log", "--merges", "--first-parent", "--format=%H%x1f%an%x1f%aI%x1f%s%x1f%b", ref)
    found = []
    for line in out.strip().splitlines():
        sha, author, when, subject, body = (line.split("\x1f") + [""] * 5)[:5]
        if subject.startswith(APPROVED):
            note = body.strip().splitlines()[0][5:].strip() if body.strip().startswith("Note:") else ""
            found.append(dict(sha=sha, who=PEOPLE.get(author, author), when=datetime.fromisoformat(when), note=note))
    return found

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--main", required=True); ap.add_argument("--live", required=True); ap.add_argument("--out", required=True)
    a = ap.parse_args()
    main_repo, out = Path(a.main), Path(a.out)
    # the main checkout knows both branches once the workflow fetched them (the --live checkout is the built copy)
    for ref in ("live", "origin/live"):
        if subprocess.run(["git", "-C", str(main_repo), "rev-parse", "--verify", "-q", ref], capture_output=True).returncode == 0:
            live_ref = ref
            break
    else:
        live_ref = None

    pending = [entry(c, main_repo) for c in commits(main_repo, f"main ^{live_ref}" if live_ref else "main")]
    releases = []
    if live_ref:
        aps = approvals(main_repo, live_ref)
        for i, ap_ in enumerate(aps):
            prev = aps[i + 1]["sha"] if i + 1 < len(aps) else None
            rng = f"{ap_['sha']} ^{prev}" if prev else ap_["sha"]
            changes = [entry(c, main_repo) for c in commits(main_repo, rng)]
            releases.append(dict(sha=ap_["sha"][:7], who=ap_["who"], when=fmt(ap_["when"]), note=ap_["note"], changes=changes))
    people = sorted({e["who"] for e in pending} | {c["who"] for r in releases for c in r["changes"]} | {r["who"] for r in releases})
    built = fmt(datetime.now(timezone.utc))
    env = Environment(loader=FileSystemLoader(str(HERE / "templates")), autoescape=select_autoescape(["html"]))
    page = env.get_template("admin.html").render(pending=pending, releases=releases, people=people, built=built, cms=CMS,
                                                 live_url=LIVE_URL, sandbox_url=SANDBOX_URL, has_live=bool(live_ref))
    (out / "admin").mkdir(parents=True, exist_ok=True)
    (out / "admin" / "index.html").write_text(page)
    (out / "admin" / "changes.json").write_text(json.dumps(dict(built=built, pending=pending, releases=releases), indent=1))
    print(f"portal: {len(pending)} changes awaiting approval, {len(releases)} versions published")

if __name__ == "__main__":
    main()

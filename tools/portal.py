#!/usr/bin/env python3
"""The administration portal: admin/index.html, built by the deploy workflow from the repository's history.

    python3 tools/portal.py --main <checkout of main> --live <checkout of live, or the same> --out <site folder>

Everyone on the marketing team can see what changed, who changed it and when, what is still waiting on the sandbox,
and who approved each version that went live (David, 2026-10-13). Nothing here is typed by hand: every entry comes
from a commit on `main` (the sandbox); every approval or roll-back is a commit on `live` made by the approve and
roll-back workflows, carrying a "Snapshot:" line that names the sandbox commit it published. Changes made through
Claude are committed in the name of the person who asked for them, with Claude as the committer, and the portal
says so ("through Claude").

The page also shows, for each edit, the old and new wording side by side; which pages and files differ between the
sandbox and the live site (compared from the two builds in --out); an inventory of every document by product with
what is missing; and the permanent address and a QR code for every document (David, 2026-10-13).
"""
import argparse, difflib, hashlib, html as H, json, re, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from jinja2 import Environment, FileSystemLoader, select_autoescape

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build as B   # the generator's menu, product names and version rules; importing it has no side effects

TZ = ZoneInfo("America/Chicago")          # Cary, Illinois
CMS = "https://app.pagescms.org/dgershaw/led-llc/main"
LIVE_URL = "https://dgershaw.github.io/LED-LLC/"
SANDBOX_URL = LIVE_URL + "sandbox/"
FINAL_URL = B.SITE_URL                    # where the permanent addresses point once the site goes live on its own domain
PEOPLE = {"dgershaw": "David", "github-actions[bot]": "The site builder"}
KINDS = {"spec-sheets": "spec sheet", "instructions": "installation instructions", "sell-sheets": "sell sheet",
         "case-studies": "case study", "catalog": "catalog"}
KIND_ORDER = ["spec-sheets", "instructions", "sell-sheets", "case-studies", "catalog"]
APPROVED = "Approved for the live site"
ROLLED_BACK = "Rolled back the live site"
FORMAT = "%x1e%H%x1f%P%x1f%an%x1f%ae%x1f%cn%x1f%aI%x1f%s%x1f%b%x1d"   # the body spans lines, so a marker ends it
MAX_DIFF_ROWS = 60
MAX_CELL = 700

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

def file_at(repo, rev, path):
    try:
        return git(repo, "show", f"{rev}:{path}")
    except subprocess.CalledProcessError:
        return ""

def page_title(main, path):
    """The page's name as the menu shows it (LBI 65), falling back to the file's own title."""
    slug = Path(path).stem
    if slug in B.NAV_TITLES:
        return B.NAV_TITLES[slug]
    try:
        return json.loads((main / path).read_text()).get("title") or slug.replace("-", " ").title()
    except (OSError, ValueError):
        return slug.replace("-", " ").title()

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

# ---- what changed, in words ------------------------------------------------------------------------------------

def text(v):
    if isinstance(v, str):
        return v
    if isinstance(v, dict):
        return " — ".join(str(x) for x in v.values() if x not in ("", None, [], {}))
    if isinstance(v, list):
        return " | ".join(text(x) for x in v)
    return "" if v is None else str(v)

def flatten(d):
    """A page file as (label, value) pairs: scalars, then each list as a list of strings, so edits read as fields."""
    scalars, lists = [], []
    def short(name):
        return name if len(name) <= 36 else name[:34].rstrip() + "…"
    for k, label in (("title", "Title"), ("subtitle", "Subtitle"), ("headline", "Headline"), ("intro", "Introduction")):
        if k in d:
            scalars.append((label, text(d[k])))
    lists.append(("Key points", [text(x) for x in d.get("callouts", [])]))
    lists.append(("At a glance", [text(x) for x in d.get("features", [])]))
    for t in d.get("tables", []):
        name = short(text(t.get("title")) or "Table")
        scalars.append((f"{name}: lead-in", text(t.get("leadIn"))))
        scalars.append((f"{name}: columns", " | ".join(text(x) for x in t.get("columns", []))))
        lists.append((f"{name}: rows", [text(r) for r in t.get("rows", [])]))
        lists.append((f"{name}: notes", [text(x) for x in t.get("notes", [])]))
    lists.append(("Footnotes", [text(x) for x in d.get("footnotes", [])]))
    return scalars, lists

def wdiff(a, b):
    """The old and the new text as HTML, with what went away struck through and what came in underlined."""
    ta, tb = re.findall(r"\s+|\S+", a), re.findall(r"\s+|\S+", b)
    old, new = [], []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, ta, tb, autojunk=False).get_opcodes():
        sa, sb = H.escape("".join(ta[i1:i2])), H.escape("".join(tb[j1:j2]))
        if op == "equal":
            old.append(sa); new.append(sb)
        else:
            if sa: old.append(f"<del>{sa}</del>")
            if sb: new.append(f"<ins>{sb}</ins>")
    return "".join(old), "".join(new)

def clip(s):
    return s if len(s) <= MAX_CELL else s[:MAX_CELL] + " …"

def page_diff(old, new):
    """Rows of (field, before HTML, after HTML) between two versions of a page file."""
    rows = []
    try:
        do, dn = (json.loads(old) if old else {}), (json.loads(new) if new else {})
    except ValueError:
        return rows
    so, ln = flatten(do)[0], flatten(dn)[1]
    sn, lo = flatten(dn)[0], flatten(do)[1]
    for (label, a), (_, b) in zip(so, sn) if len(so) == len(sn) else []:
        if a != b:
            rows.append((label, *wdiff(clip(a), clip(b))))
    if len(so) != len(sn):   # a table was added or removed: say so by name
        names_o, names_n = {l for l, _ in so}, {l for l, _ in sn}
        for l in sorted(names_n - names_o): rows.append((l, "", "<ins>(new)</ins>"))
        for l in sorted(names_o - names_n): rows.append((l, "<del>(removed)</del>", ""))
    lo_d, ln_d = dict(lo), dict(ln)
    for label in list(dict.fromkeys([l for l, _ in lo] + [l for l, _ in ln])):
        a, b = lo_d.get(label, []), ln_d.get(label, [])
        if a == b:
            continue
        unit = "row" if label.endswith(": rows") else "item"
        for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
            if op == "equal":
                continue
            if op == "replace" and i2 - i1 == j2 - j1:
                for k in range(i2 - i1):
                    rows.append((f"{label}, {unit} {i1 + k + 1}", *wdiff(clip(a[i1 + k]), clip(b[j1 + k]))))
            else:
                for k in range(i1, i2):
                    rows.append((f"{label}, {unit} {k + 1}", f"<del>{H.escape(clip(a[k]))}</del>", ""))
                for k in range(j1, j2):
                    rows.append((f"{label}, {unit} {k + 1}", "", f"<ins>{H.escape(clip(b[k]))}</ins>"))
    return rows

def slug_of(path):
    p = Path(path)
    if path.startswith("content/pages/") or path.startswith("data/"):
        return p.stem
    return ""

def details(c, main):
    """Where to see the change on the sandbox, and the old and new wording for page edits."""
    links, diff, seen = [], [], set()
    pages = sum(1 for _, p in c["files"] if p.startswith("content/pages/"))
    for status, path in c["files"]:
        slug = slug_of(path)
        if slug and slug not in seen:
            seen.add(slug)
            links.append((f"Open the {B.NAV_TITLES.get(slug, slug.replace('-', ' ').title())} page", f"{SANDBOX_URL}{slug}.html"))
        elif (path.startswith("assets/docs/") or path.startswith("assets/ies/")) and status != "D" and Path(path).suffix.lower() in B.DOWNLOAD_EXTS:
            links.append((f"Open {Path(path).name}", SANDBOX_URL + B.url_path(B.public_path(path))))
        if path.startswith("content/pages/") and path.endswith(".json") and len(diff) < MAX_DIFF_ROWS:
            before = file_at(main, f"{c['sha']}^", path) if c["parents"] else ""
            after = file_at(main, c["sha"], path) if status != "D" else ""
            slug = Path(path).stem
            prefix = (B.NAV_TITLES.get(slug, slug.replace("-", " ").title()) + ": ") if pages > 1 else ""
            diff += [(prefix + f, a, b) for f, a, b in page_diff(before, after)]
    return links[:6], diff[:MAX_DIFF_ROWS]

# ---- people, dates, entries -------------------------------------------------------------------------------------

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
    links, diff = details(c, main)
    return dict(sha=c["sha"][:7], who=person(c["author"]), via=via, when=fmt(c["when"]),
                iso=c["when"].astimezone(timezone.utc).isoformat(), what=describe(c, main), files=len(c["files"]),
                links=links, diff=diff)

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

# ---- sandbox vs live, from the two builds -------------------------------------------------------------------------

def normalize_html(t):
    return re.sub(r"\?v=[0-9a-f]+", "", t)

def html_title(t):
    m = re.search(r"<title>(.*?)</title>", t, re.S)
    return H.unescape(m.group(1)).split(" | ")[0].strip() if m else ""

def compare_builds(out):
    """Pages, documents and design files that differ between the live build (out/) and the sandbox build (out/sandbox/)."""
    sb = out / "sandbox"
    pages, files = [], []
    if not sb.is_dir():
        return dict(pages=pages, files=files, same=True)
    names = sorted({f.name for f in out.glob("*.html")} | {f.name for f in sb.glob("*.html")})
    for n in names:
        a, b = out / n, sb / n
        if not b.is_file():
            kind = "only on the live site"
        elif not a.is_file():
            kind = "new on the sandbox"
        elif normalize_html(a.read_text(errors="replace")) == normalize_html(b.read_text(errors="replace")):
            continue
        else:
            kind = "changed"
        title = html_title((b if b.is_file() else a).read_text(errors="replace")) or n
        pages.append(dict(name=n, title=title, kind=kind, live=LIVE_URL + n if a.is_file() else "", sandbox=SANDBOX_URL + n if b.is_file() else ""))
    for top in ("docs", "ies", "assets/css", "assets/js", "assets/img"):
        rels = set()
        for root in (out / top, sb / top):
            if root.is_dir():
                rels |= {f.relative_to(root).as_posix() for f in root.rglob("*") if f.is_file()}
        for r in sorted(rels):
            a, b = out / top / r, sb / top / r
            if a.is_file() and b.is_file() and a.stat().st_size == b.stat().st_size and a.read_bytes() == b.read_bytes():
                continue
            if top == "assets/js" and r in ("docmap.js", "search-index.json"):
                continue
            kind = "changed" if a.is_file() and b.is_file() else ("new on the sandbox" if b.is_file() else "only on the live site")
            group = {"docs": "Documents", "ies": "IES files", "assets/css": "Design", "assets/js": "Design", "assets/img": "Images"}[top]
            files.append(dict(group=group, name=r if top in ("docs", "ies") else f"{top}/{r}", kind=kind,
                              live=LIVE_URL + B.url_path(f"{top}/{r}") if a.is_file() else "",
                              sandbox=SANDBOX_URL + B.url_path(f"{top}/{r}") if b.is_file() else ""))
    return dict(pages=pages, files=files, same=not pages and not files)

# ---- the document inventory and the QR sheet ----------------------------------------------------------------------

def product_rows():
    """(category folder, product folder, slug, title) in the Products menu's order, each product once."""
    rows, seen = [], set()
    for m in B.PRODUCT_MENU:
        cat = m["name"].replace(" + ", " and ")
        for _, slugs in m["groups"]:
            for slug in slugs:
                slug = "lbi-family" if slug == "lbi.html" else slug
                if slug in seen:
                    continue
                seen.add(slug)
                title = B.NAV_TITLES.get(slug, slug.replace("-", " ").title())
                rows.append((cat, title.replace(" + ", " and "), slug, title))
    return rows

def newest_first(files):
    """Each file with whether it is the newest version of its name."""
    groups = {}
    for f in files:
        groups.setdefault(B.split_version(f.stem)[0].lower() + f.suffix.lower(), []).append(f)
    out = []
    for key in sorted(groups):
        fs = groups[key]
        top = max(fs, key=lambda f: (B.doc_key(f.stem)[1], f.name))
        for f in sorted(fs, key=lambda f: (B.doc_key(f.stem)[1], f.name), reverse=True):
            out.append((f, f is top))
    return out

def inventory(main, live):
    """Every document and IES file by product, with what is missing and what is newer on the sandbox than on the live site."""
    cats, missing_total, new_total = [], 0, 0
    by_public = {}   # public document name -> (kind, product title), for the QR sheet
    for cat, product, slug, title in product_rows():
        row = dict(product=title, slug=slug, page=SANDBOX_URL + ("lbi.html" if slug == "lbi-family" else f"{slug}.html"), kinds={}, ies=[], missing=[])
        for kind in KIND_ORDER[:4]:
            folder = main / "assets" / "docs" / kind / cat / product
            files = [f for f in folder.iterdir() if f.is_file() and f.suffix.lower() in B.DOWNLOAD_EXTS] if folder.is_dir() else []
            items = []
            for f, newest in newest_first(files):
                rel = f.relative_to(main).as_posix()
                on_live = (live / rel).is_file()
                pub = B.public_path(rel)
                items.append(dict(name=f.name, newest=newest, on_live=on_live, url=SANDBOX_URL + B.url_path(pub), public=pub))
                if newest:
                    by_public[Path(pub).name] = (KINDS[kind], title)
                    new_total += 0 if on_live else 1
            row["kinds"][kind] = items
        ifolder = main / "assets" / "ies" / cat / product
        if ifolder.is_dir():
            for pn in sorted(p for p in ifolder.iterdir() if p.is_dir()):
                files = [f for f in pn.iterdir() if f.is_file() and f.suffix.lower() in B.DOWNLOAD_EXTS]
                if files:
                    row["ies"].append(dict(pn=pn.name, count=len(files), new=sum(1 for f in files if not (live / f.relative_to(main)).is_file())))
        if not row["kinds"]["spec-sheets"] and slug not in ("lbi-family", "i-series"):
            row["missing"].append("spec sheet")
        if not row["ies"] and cat in ("LED Lamps", "Indoor Fixtures", "Retrofit Kits") and slug not in ("lbi-family",):
            row["missing"].append("IES files")
        missing_total += len(row["missing"])
        for c in cats:
            if c["name"] == cat:
                c["rows"].append(row); break
        else:
            cats.append(dict(name=cat, rows=[row]))
    extra = []   # documents outside the product folders: the catalog
    cfolder = main / "assets" / "docs" / "catalog"
    for f, newest in newest_first([f for f in cfolder.iterdir() if f.is_file()] if cfolder.is_dir() else []):
        rel = f.relative_to(main).as_posix(); pub = B.public_path(rel)
        extra.append(dict(name=f.name, newest=newest, on_live=(live / rel).is_file(), url=SANDBOX_URL + B.url_path(pub)))
        if newest:
            by_public[Path(pub).name] = ("catalog", "Light Efficient Design")
    return dict(categories=cats, extra=extra, missing=missing_total, newer=new_total), by_public

def qr_sheet(out, by_public):
    """One entry per published document: its permanent address and a QR code (SVG) for print."""
    import qrcode, qrcode.image.svg
    qdir = out / "admin" / "qr"
    qdir.mkdir(parents=True, exist_ok=True)
    rows = []
    for f in sorted((out / "docs").glob("*.pdf")) if (out / "docs").is_dir() else []:
        final = FINAL_URL + "docs/" + B.url_path(f.name)
        img = qrcode.make(final, image_factory=qrcode.image.svg.SvgPathImage, box_size=12, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
        (qdir / (f.stem + ".svg")).write_bytes(img.to_string())
        kind, product = by_public.get(f.name, ("document", ""))
        rows.append(dict(name=f.name, kind=kind, product=product, final=final, today=LIVE_URL + "docs/" + B.url_path(f.name), qr="qr/" + B.url_path(f.stem + ".svg")))
    rows.sort(key=lambda r: (KIND_ORDER.index(next((k for k, v in KINDS.items() if v == r["kind"]), "catalog")) if r["kind"] in KINDS.values() else 9, r["product"], r["name"]))
    return rows

# ---- main --------------------------------------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--main", required=True); ap.add_argument("--live", required=True); ap.add_argument("--out", required=True)
    a = ap.parse_args()
    main_repo, live_repo, out = Path(a.main), Path(a.live), Path(a.out)
    # the main checkout knows both branches once the workflow fetched them (the --live checkout is the built copy)
    live_ref = next((r for r in ("live", "origin/live")
                     if subprocess.run(["git", "-C", str(main_repo), "rev-parse", "--verify", "-q", r], capture_output=True).returncode == 0), None)

    schedule = None   # a go-live planned with schedule.yml: go-live.json on the schedule branch
    for ref in ("schedule", "origin/schedule"):
        try:
            schedule = json.loads(git(main_repo, "show", f"{ref}:go-live.json"))
            schedule["when"] = fmt(datetime.fromtimestamp(schedule["at"], timezone.utc))
            schedule["by"] = person(schedule.get("by", ""))
            break
        except (subprocess.CalledProcessError, ValueError, KeyError, OSError):
            schedule = None
    history = live_history(main_repo, live_ref) if live_ref else []
    current = history[0]["snapshot"] if history else ""
    pending = [entry(c, main_repo) for c in commits(main_repo, "main", *([f"^{current}"] if current else []))]
    by_sha = {h["sha"]: h for h in history}
    releases = []
    for i, h in enumerate(history):
        prev = history[i + 1]["snapshot"] if i + 1 < len(history) else ""
        rel = dict(sha=h["sha"][:7], kind=h["kind"], who=h["who"], when=fmt(h["when"]), note=h["note"], changes=[], removed=[])
        if h["kind"] == "approval":
            rel["changes"] = [entry(c, main_repo) for c in commits(main_repo, h["snapshot"], *([f"^{prev}"] if prev else []))]
        else:
            r = by_sha.get(h["restores"])
            rel["back_to"] = f"the version approved by {r['who']} on {fmt(r['when'])}" if r else "the previous version"
            if prev:
                rel["removed"] = [entry(c, main_repo) for c in commits(main_repo, prev, f"^{h['snapshot']}")]
        releases.append(rel)
    people = sorted({e["who"] for e in pending} | {c["who"] for r in releases for c in r["changes"] + r["removed"]} | {r["who"] for r in releases})
    compare = compare_builds(out)
    inv, by_public = inventory(main_repo, live_repo)
    qr = qr_sheet(out, by_public)
    built = fmt(datetime.now(timezone.utc))
    env = Environment(loader=FileSystemLoader(str(HERE / "templates")), autoescape=select_autoescape(["html"]))
    page = env.get_template("admin.html").render(pending=pending, releases=releases, people=people, built=built, cms=CMS,
                                                 live_url=LIVE_URL, sandbox_url=SANDBOX_URL, final_url=FINAL_URL, has_live=bool(live_ref),
                                                 can_roll_back=len({h["snapshot"] for h in history}) > 1,
                                                 compare=compare, inv=inv, qr=qr, kinds=KINDS, kind_order=KIND_ORDER[:4], schedule=schedule)
    (out / "admin").mkdir(parents=True, exist_ok=True)
    (out / "admin" / "index.html").write_text(page)
    (out / "admin" / "changes.json").write_text(json.dumps(dict(built=built, pending=pending, releases=releases, compare=compare, schedule=schedule), indent=1))
    print(f"portal: {len(pending)} changes awaiting approval, {len(releases)} versions published, "
          f"{len(compare['pages'])} pages and {len(compare['files'])} files differ, {inv['missing']} missing items, {len(qr)} QR codes")

if __name__ == "__main__":
    main()

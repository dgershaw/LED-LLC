# Working on this site with Claude

This file is read by every Claude session that opens this repository (Claude Code on the web, in a terminal or in an editor). It carries the rules the team has agreed on, so a fresh session works the way the last one did. Keep it short and keep it current.

The repository is the source of the Light Efficient Design website: the Light Efficient Design, RemPhos (the LBI family, RP- part numbers) and Solera (solar) brands, for lighting designers and specifiers, distributors, contractors and facilities managers. Company slogan: "Leading Thru Innovation", in business since 2008.

## The one rule: sandbox first, a person approves

- `main` is the **sandbox** (https://dgershaw.github.io/LED-LLC/sandbox/). `live` is the **live site** and moves only when a person clicks "Approve and publish to live" on the admin portal (https://dgershaw.github.io/LED-LLC/admin/), which runs `.github/workflows/approve.yml`.
- Push only to `main`. Never push to `live`, never merge `main` into `live`, never run or dispatch the approve, roll-back, undo or schedule workflows. They are for people.
- When a change is done, say it is on the sandbox and waits for approval on the portal, and give the sandbox link to the page. Never call a change live.
- Pull `main` before every change. Other people and other Claude sessions push to it too.

## Commit in the name of the person who asked

- The portal lists every change with who made it. Commit with that person as the author and Claude as the committer, so the portal shows "Amy, through Claude":

  ```
  git -c user.name=Claude -c user.email=noreply@anthropic.com commit \
      --author="First name <githublogin@users.noreply.github.com>" -m "..."
  ```

  If you do not know who is asking, ask for their name before committing. Use their GitHub login in the address when you know it; otherwise their first name and `noreply@led-llc.com`.
- The commit subject is one plain sentence saying what changed, written for the marketing team ("Changed the LBI 65 headline to ..."). No prefixes, ticket ids or file lists. The portal shows the subject as the description of the change.
- One change per commit, so a single change can be undone from the portal.

## How the site is built

- `tools/build.py` generates every page from `data/`, `content/` and `tools/templates/`. Built pages, `docs/`, `ies/`, `admin/` and `out/` are ignored by git and built by `.github/workflows/deploy.yml` after each push. Never hand-edit a built HTML file; change the data, content or template and rebuild.
- Local check: `pip install jinja2 markupsafe pillow qrcode`, then `python3 tools/build.py`. Workflows call scripts as `bash tools/x.sh` because the files have no execute bit.
- Page text the team edits in Pages CMS lives in `content/pages/<menu category>/<slug>.json` and overlays `data/<slug>.json`. Spec-sheet-led pages are described in `content/cutsheets.json`. `.pages.yml` configures the editor; a new download folder must be added there.
- Documents live in `assets/docs/<kind>/<category>/<product>/` and IES files in `assets/ies/<category>/<product>/<part number>/`. Pages link them only through their permanent addresses, `docs/<file name>` and `ies/<part number>/<file name>`, which the build fills with the newest version. Never link an `assets/docs` path. A newer version is the same file name plus a version or date (`... V2.pdf`, `...-rev3.pdf`, `...-2026-10-12.pdf`).
- The admin portal is `tools/portal.py` with `tools/templates/admin.html`, built from the git history. When a page field is added to the content JSON, extend `flatten()` in `portal.py` so the word-by-word diff shows it.
- `notes/` is private working material and is ignored by git. Never commit it and never put secrets, webhook addresses or email addresses of real people in the repository.

## Names and facts

- Always write the brand and product names in full: Light Efficient Design, RemPhos, Solera; LBI G1, LBI G2, LBI 65, LBI MAX, LBI Color Palette, LBI Color Palette+, LBI Color PaletteX, LBI 65 Color Palette+. "Palette+" and "PaletteX" have no space before the + or X. Never shorten a name to "Palette+" or "the Color Palette" in visible text.
- The eight LBI variants are listed in that order everywhere: LBI G1 (the economical LBI, still sold) first, LBI G2 second; the LBI Family Overview opens on LBI G2. 3 ft bars exist only for LBI G1, LBI G2 and LBI 65.
- Never state a count of SKUs, models or part numbers anywhere on the site.
- LBI Color Palette+ ships in white mode with the same switches as LBI G2 and is DLC listed that way; color needs the optional remote, sold separately. No LBI 65 product has physical switches; they come with a remote.
- The spec sheets are the source of truth. A product page is rebuilt from its spec sheet only when the team sends that sheet, and the page needs far less than the sheet: a visitor who wants everything downloads the sheet.
- Open questions about catalog data go to David rather than being guessed.

## Look and feel

- "Less is more": a clean, Apple-like, fully responsive site. Nothing busy. A cluttered page loses sections; it is not compressed.
- High contrast everywhere, no text smaller than 12 px, the catalog fonts. Product heroes show the whole product, never cropped; no blurry or oversized images; boxes in a row are equal size; pages fill a laptop screen (content up to 1760 px wide with fluid gutters) and work on an iPhone. Check every change at about 1440 px and 390 px wide before pushing.
- Product page order: compact auto-sliding imagery (product-only shots first, then in use); "At a glance" as a short list of the cut sheet's five points with its logos and symbols; video, install photos and case studies near the top; specifications and the part-number table with one IES download per row; "Next steps, with a little help from Eddy" at the very bottom; "More from" as a small auto-scrolling strip.
- Every page has its own share image under `assets/img/share/`, generated by the build. Titles, descriptions and structured data come from `build.py`; a new page needs its SEO title and lead there.
- Solera pages carry the black Solera logo on a Solera-yellow band at the top. `i-series.html` is the i-Series configurator and stays short; on phones a configurator never pins the big photo, only a slim summary bar.

## Eddy, the mascot

- Eddy (Edison) is a 5 mm LED named after Thomas Edison, created by Senior Creative Director Amy George. The LED in the header logo is Eddy; the welcome tour is `assets/js/tour.js` with its styles at the end of `assets/css/site.css`.
- Any Eddy drawn by Claude must look like Amy's stickers (see `assets/img/eddy/`): the same head-to-body proportions, eye, pins and gloves. Before calling it done, show the person a large side-by-side with a sticker. When Amy supplies a plain Eddy, use her art directly instead of drawing.
- Eddy's recorded voice lines are MP3 files under `assets/audio/tour/`; to change a line, replace the file with the same name.

## Before you finish

1. Rebuild locally and look at the changed pages at laptop and phone widths.
2. Search the new copy for short Palette names and for digit + "SKUs", "models" or "part numbers".
3. Commit as the requester with a plain-sentence subject, push to `main`, and tell the person the sandbox link and that the change waits for approval on the portal.

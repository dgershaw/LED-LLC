#!/usr/bin/env python3
"""Build the Light Efficient Design company site from the catalog data in data/*.json.

    python3 tools/build.py          # build from data/ and content/ as they stand (GitHub Actions runs this after every push)
    python3 tools/build.py --sync   # first re-import the catalog transcriptions and crops from the extraction scratchpad

Page text and part-number tables live in content/pages/<slug>.json, which the admin page (Pages CMS) edits;
data/<slug>.json keeps everything else about a category. A document saved under a newer name (V2, rev3, a date)
takes over every link to the older name.

Output is a flat set of HTML pages in the site root plus assets/js/search-index.json. Nothing here is
served by a framework: every page is plain HTML that links assets/css/site.css and assets/js/site.js.
The build also writes robots.txt, sitemap.xml, llms.txt and llms-full.txt, and every page carries its own
title, description, canonical URL, Open Graph / Twitter tags and JSON-LD, all derived from the same data.
"""
import io
import hashlib, html as H, json, math, os, re, shutil, subprocess, sys
from datetime import date
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup, escape
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DATA, TPL = ROOT / "data", ROOT / "tools" / "templates"
SCRATCH = Path("/tmp/claude-0/-home-claude/3d4c1592-7bf1-5c97-ad4a-9fdeb9c7cdea/scratchpad/cat")
LBI_SITE = Path("/mnt/project-files/lbi-website/index.html")
LBI_COPY = ROOT / "tools" / "lbi-page.html"     # the repo's copy of LBI_SITE, so GitHub Actions can build without the project files
PAGES = ROOT / "content" / "pages"              # the admin page's editable copy of each product page's text and tables (see apply_page_file)
CATALOG_PDF = "assets/docs/LED-2026-Full-Product-Catalog.pdf"

# ---------------------------------------------------------------- site identity (SEO)
# The one place to change the public domain: canonical URLs, Open Graph, the sitemap and llms.txt all use it.
SITE_URL = "https://www.led-llc.com/"
SITE_NAME = "Light Efficient Design"
LASTMOD = os.environ.get("SITE_LASTMOD") or date.today().isoformat()  # sitemap <lastmod>; override to pin a date
THEME_COLORS = {"led": "#799b3e", "remphos": "#004e99", "solera": "#f9c606"}  # the brand tokens in site.css
EDDY_DIR = Path(__file__).resolve().parents[1] / "assets" / "img" / "eddy"
HQ = dict(name="Corporate HQ & Training Center", street="188 S. Northwest Highway", city="Cary", region="IL", zip="60013")
MFG = dict(name="Innovation & Manufacturing Center", street="30 Log Bridge Road, Building 200", city="Middleton", region="MA", zip="01949")
PHONE, PHONE_E164, EMAIL = "847.380.3540", "+1-847-380-3540", "sales@led-llc.com"
# Social profiles, as linked from the current led-llc.com home page (checked 2026-10-08).
SOCIAL = [("youtube", "YouTube", "https://www.youtube.com/channel/UCE4zctEpDWHRLZG1dAUQ9iw"),
          ("linkedin", "LinkedIn", "https://www.linkedin.com/company/1283580"),
          ("instagram", "Instagram", "https://www.instagram.com/light_efficient_design/"),
          ("facebook", "Facebook", "https://www.facebook.com/L1ghtEfficientDesign/")]
# Image used for social cards when a page has no hero of its own (path, alt).
HOME_IMAGE = ("assets/img/cover/p01-b1.jpg", "Solera i-Series solar area light on a straight pole")
BRAND_IMAGES = {"remphos": ("assets/img/product/g2-hero.jpg", "RemPhos LBI G2 linkable light bar"), "solera": HOME_IMAGE}
MAX_LD_PRODUCTS = 60  # Product entities listed per page; numberOfItems stays the true count
# Link-preview cards (og:image, 1200 x 630) for pages that should not just use their hero: (kind, sources, alt).
# mosaic = the first four home mosaic photos; pair / docs = images side by side; brand = logo beside a product.
SHARE = {
    "index.html": ("mosaic", [], "Light Efficient Design, RemPhos and Solera lighting products"),
    "products.html": ("mosaic", [], "Light Efficient Design, RemPhos and Solera lighting products"),
    "contact.html": ("mosaic", [], "Light Efficient Design, RemPhos and Solera lighting products"),
    "resources.html": ("docs", ["assets/img/docs/RP-LBI-Spec_Sheet-p1.jpg", "assets/img/docs/RP-TV-TF-G1-TAA-Spec_Sheet-p1.jpg",
                                "assets/img/docs/LED-8091_Spec_Sheet-p1.jpg"], "RemPhos and Light Efficient Design spec sheets"),
    "lbi.html": ("pair", ["assets/img/product/g2-hero.jpg", "assets/img/product/palette-hero-rainbow.jpg"], "RemPhos LBI white and color linkable light bars"),
    "light-efficient-design.html": ("brand", ["assets/img/brand/led-logo-h.png", "assets/img/cat/bollard-post-top/hero.jpg"], "Light Efficient Design LED retrofit lamps"),
    "remphos.html": ("brand", ["assets/img/brand/remphos-logo-white.png#004e99", "assets/img/product/g2-hero.jpg"], "RemPhos LBI linkable light bar"),
    "solera.html": ("brand", ["assets/img/brand/solera-logo.png", "assets/img/cover/p01-b1.jpg"], "Solera i-Series solar area light"),
}

# Search-engine titles: page name + brand, kept under about 60 characters. Falls back to the nav title.
SEO_TITLES = {
    "bollard-post-top": "Bollard + Post Top LED Retrofit Lamps", "shoe-box-wall-pack": "Shoe Box + Wall Pack LED Retrofit Lamps",
    "high-bay-low-bay": "High Bay + Low Bay LED Retrofit Lamps", "hazardous-location": "Hazardous Location LED Retrofit Lamps",
    "pl-pll": "PL + PLL LED Retrofit Lamps", "linear-t5-t8": "Linear T5 + T8 LED Retrofit Lamps", "work-lights": "Temporary LED Work Site Lights",
    "lighting-controls": "Simple + Networked Lighting Controls", "lbi-family": "LBI Family Overview + Accessories",
    "lbi-g2": "LBI G2 Linkable LED Light Bars", "lbi-g1": "LBI G1 Economical Linkable LED Light Bar", "lbi-65": "LBI 65 IP65 Linkable LED Light Bar", "lbi-max": "LBI MAX Linkable LED Strip Fixture",
    "color-palette": "LBI Color Palette LED Light Bars", "livc": "LIVC Stairwell, Vanity + Wrap Fixtures", "wall-ceiling-fixtures": "Wall + Ceiling LED Fixtures",
    "wall-ceiling-retrofit-kits": "Wall + Ceiling LED Retrofit Kits", "type-c-kits-lbe": "Type C Kits + Linear Barkits (LBE)",
    "taa-type-c-kits-lbe": "TAA Type C Kits + Linear Barkits", "troffer-retrofit-kits-fixtures": "Troffer LED Retrofit Kits + Fixtures",
    "taa-troffers": "TAA Troffer LED Retrofit Kits + Fixtures", "i-series": "Solera i-Series Overview: Modular Solar Lighting", "solar-area-lights": "Solar Area Lights",
    "solar-bollard-post-tops": "Solar Bollard + Post Top Lights", "solar-flood-multifunctional": "Solar Flood + Multifunctional Lights",
    "solar-display-wall-pack": "Solar Display + Wall Pack Lights", "poles": "Poles for Solera Solar Lights", "gondolas-shippers-displays": "Gondolas, Shippers + Displays",
}
BRAND_TITLES = {"led": "LED Retrofit Lamps + Work Lights", "remphos": "RemPhos LED Fixtures + Light Bars", "solera": "Solera Solar Lighting + Poles"}
# Lead sentence for pages whose catalog section prints no prose; everything else is composed from headline, intro and callouts.
SEO_LEADS = {
    "poles": "Round and square straight poles for Solera solar lights, anchor base or direct burial, with mounting height, max EPA and bolt circle for each part number.",
    "gondolas-shippers-displays": "Gondolas, shippers and counter displays that put the Light Efficient Design lamp line on the distributor's floor, with part number and size for each.",
}
# Table columns worth repeating in a Product description, matched case-insensitively with trailing * removed.
LD_KEY_COLS = ["replaces", "replaces up to", "compares to", "wattage", "flexwatt", "max wattage", "lumens", "emg lumens", "cct", "flexcolor", "color", "base",
               "voltage", "dimensions", "size", "item", "description", "accessory", "option", "type", "rating", "control", "mounting ht", "total ht",
               "features", "listings", "epa", "enclosure", "dimming", "notes"]
AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-Web", "anthropic-ai", "PerplexityBot", "Google-Extended",
               "Applebot-Extended", "CCBot", "Bytespider", "Amazonbot", "meta-externalagent"]

# ---------------------------------------------------------------- catalog structure
# Catalog order, which is also the order of the navigation and the prev/next pager.
ORDER = ["bollard-post-top", "shoe-box-wall-pack", "high-bay-low-bay", "hazardous-location", "pl-pll", "linear-t5-t8",
         "work-lights", "lighting-controls", "lbi-g1", "lbi-g2", "lbi-65", "lbi-max", "color-palette", "livc",
         "wall-ceiling-fixtures", "wall-ceiling-retrofit-kits", "type-c-kits-lbe", "taa-type-c-kits-lbe",
         "troffer-retrofit-kits-fixtures", "taa-troffers", "i-series", "solar-area-lights", "solar-bollard-post-tops",
         "solar-flood-multifunctional", "solar-display-wall-pack", "poles", "gondolas-shippers-displays"]

# Short names for menus and cards; the catalog's long titles stay on the page itself.
NAV_TITLES = {
    "bollard-post-top": "Bollard + Post Top", "shoe-box-wall-pack": "Shoe Box + Wall Pack", "high-bay-low-bay": "High Bay + Low Bay",
    "hazardous-location": "Hazardous Location", "pl-pll": "PL + PLL", "linear-t5-t8": "Linear T5 + T8", "work-lights": "Work Lights",
    "lighting-controls": "Lighting Controls", "lbi-family": "LBI Family Overview", "lbi-g2": "LBI G2", "lbi-g1": "LBI G1", "lbi-65": "LBI 65",
    "lbi-max": "LBI MAX", "color-palette": "LBI Color Palette", "livc": "LIVC Stairwell, Vanity + Wrap", "wall-ceiling-fixtures": "Wall + Ceiling Fixtures",
    "wall-ceiling-retrofit-kits": "Wall + Ceiling Retrofit Kits", "type-c-kits-lbe": "Type C Kits + Linear Barkits",
    "taa-type-c-kits-lbe": "TAA Type C Kits + Barkits", "troffer-retrofit-kits-fixtures": "Troffer Kits + Fixtures",
    "taa-troffers": "TAA Troffer Kits + Fixtures", "i-series": "Solera i-Series Overview", "solar-area-lights": "Area Lights",
    "solar-bollard-post-tops": "Bollard + Post Tops", "solar-flood-multifunctional": "Flood + Multifunctional",
    "solar-display-wall-pack": "Display + Wall Pack", "poles": "Poles", "gondolas-shippers-displays": "Gondolas, Shippers + Displays",
}

# Header Products menu, sorted the industry way (David approved 2026-10-08): by product type, each link tagged with its
# brand, and a Shop by brand column. Kit + fixture products sit under both Fixtures and Retrofit Kits (one page, one URL).
PRODUCT_MENU = [
    dict(key="lamps", name="LED Lamps", blurb="Screw-in and pin-base LED lamps for the fixtures already on the job.", groups=[
        ("HID replacement", ["shoe-box-wall-pack", "bollard-post-top", "high-bay-low-bay", "hazardous-location"]),
        ("Fluorescent replacement", ["pl-pll", "linear-t5-t8"])]),
    dict(key="indoor", name="Indoor Fixtures", blurb="Linkable light bars, color, stairwell and wraparound fixtures, troffers and work lights.", groups=[
        ("Linkable light bars", ["lbi.html", "lbi-g1", "lbi-g2", "lbi-65", "lbi-max", "color-palette"]),
        ("Fixtures", ["livc", "wall-ceiling-fixtures", "troffer-retrofit-kits-fixtures", "taa-troffers", "work-lights"])]),
    dict(key="kits", name="Retrofit Kits", blurb="Keep the housing, upgrade everything inside it.", groups=[
        ("", ["troffer-retrofit-kits-fixtures", "taa-troffers", "type-c-kits-lbe", "taa-type-c-kits-lbe", "wall-ceiling-retrofit-kits", "lbi-max"])]),
    dict(key="outdoor", name="Outdoor + Solar", blurb="Off-grid Solera solar lighting and the poles to mount it.", groups=[
        ("", ["i-series", "solar-area-lights", "solar-bollard-post-tops", "solar-display-wall-pack", "solar-flood-multifunctional", "poles"])]),
    dict(key="controls", name="Controls + Displays", blurb="Sensors and networked control, plus store displays.", groups=[
        ("", ["lighting-controls", "gondolas-shippers-displays"])]),
]

BRANDS = {
    "led": dict(
        key="led", slug="light-efficient-design", name="Light Efficient Design", tagline="Leading thru innovation",
        h1="Retrofit lamps that turn any HID or fluorescent fixture into LED.",
        blurb="Screw-in and pin-base LED retrofits for the fixtures already on the job, plus temporary work lights. Keep the fixture, swap the lamp, cut the energy.",
        logo="led-logo.png", logo_white="led-logo-stacked-white.png", color="var(--led)",
        points=[("Keep the fixture", "Ballast-bypass and ballast-compatible lamps fit the sockets you already have."),
                ("FlexWatt + FlexColor", "Pick wattage and color temperature on the lamp, so one SKU covers many jobs."),
                ("5-year warranty", "Long rated life and surge protection built for parking lots, high bays and hazardous areas.")],
        groups=["Screw-In Retrofits", "Pin-Base Retrofits", "Work Lights", "Merchandising"]),
    "remphos": dict(
        key="remphos", slug="remphos", name="RemPhos", tagline="rem•phos /rem•fäs/ noun",
        h1="Fixtures, retrofit kits and linkable light bars engineered to install fast.",
        blurb="Innovatively engineered LED fixtures and retrofits that make installation as fast and easy as possible, with controls and color that maximize the lighting experience for end users.",
        logo="remphos-logo.png", logo_white="remphos-logo-white.png", color="var(--remphos)",
        points=[("1. Innovatively engineered", "LED fixtures and retrofits making installation as fast and easy as possible."),
                ("2. Controllable and customizable", "Fixtures and retrofits that maximize the lighting experience for end users."),
                ("3. The name", "Derived from the remote layer of phosphor that converts blue LED light to white.")],
        groups=["Linkable Light Bars", "LBI Color Palette", "Lighting Controls", "Fixtures", "Retrofit Kits"]),
    "solera": dict(
        key="solera", slug="solera", name="Solera", tagline="Solar lighting for any application",
        h1="Off-grid lighting with no trenching, no wiring and no energy bill.",
        blurb="Solar area, bollard, flood and display lights with poles to match. Set it and go: seasonal output optimization, professional-grade construction and remote monitoring with i-Series.",
        logo="solera-logo.png", logo_white="solera-logo-white.png", logo_dark="solera-logo-dark.png", color="var(--solera)",
        points=[("Municipal and government", "Off-grid, on-budget. Safer streets, smaller budgets, cleaner communities. Quick install for urgent needs and underserved areas."),
                ("Facilities and operations", "Set it and go. Seasonal output optimization, lower maintenance, remote monitoring with i-Series for fewer site visits."),
                ("Commercial real estate", "On your schedule. Zero energy costs, maximum visibility, no utility connections and no disruptive construction.")],
        groups=["Solar Lighting"]),
}
BRAND_ORDER = ["led", "remphos", "solera"]
BRAND_OF = {"merch": "led"}  # merchandising displays sell the LED lamp line, so they live on that brand's page

GROUP_BLURBS = {
    "Screw-In Retrofits": "LED lamps that replace HID in bollards, post tops, shoe boxes, wall packs, high bays and hazardous locations. Bypass the ballast and keep the fixture.",
    "Pin-Base Retrofits": "Plug-and-play and ballast-bypass replacements for PL, PLL, T8 and T5 fluorescent lamps, with emergency back-up options.",
    "Work Lights": "Temporary work-site lights and string lights with long cords and daisy-chaining for construction sites.",
    "Merchandising": "Gondolas, shippers and counter displays that put the lamp line on the distributor's floor.",
    "Linkable Light Bars": "The LBI family: 2, 3 and 4 ft linkable bars with the driver inside. Link up to 40 from one feed, then set wattage and color on site.",
    "LBI Color Palette": "Precision wavelength bars and RGBWW full-color bars (red, green, blue, warm white and cool white) for grocery, hospitality and venues, with white light built in.",
    "Lighting Controls": "On-board switches, in-line sensors and the IR23 remote, or go wireless with Silvair Bluetooth mesh.",
    "Fixtures": "Stairwell, vanity and wraparound fixtures, drums and sconces that install in minutes.",
    "Retrofit Kits": "Wall, ceiling, troffer and linear kits that convert existing housings to LED, including TAA-compliant options.",
    "Solar Lighting": "Area, bollard, flood, display and wall-pack lights powered by the sun, plus the poles to mount them.",
}

# The home page asks "what are you replacing?" and sends people straight to the right category.
FINDER = [
    ("HID in bollards or post tops", "Corn-style and filament lamps", "bollard-post-top"),
    ("HID in shoe boxes or wall packs", "Rotatable-base retrofits", "shoe-box-wall-pack"),
    ("HID in high bays", "Up to 1000W replaced", "high-bay-low-bay"),
    ("Hazardous locations", "Class 1 Div 2 certified lamps", "hazardous-location"),
    ("PL or PLL fluorescent", "Type A, Type B and A+B lamps", "pl-pll"),
    ("T8 or T5 fluorescent", "Tubes, 8 ft 2-piece, EMG options", "linear-t5-t8"),
    ("Strip or wrap fixtures", "LBI linkable bars and LBI MAX", "lbi.html"),
    ("Troffers", "Retrofit kits and new fixtures", "troffer-retrofit-kits-fixtures"),
    ("Dark parking lots and paths", "Solar area lights, no trenching", "solar-area-lights"),
    ("Grocery, venues, facades", "LBI Color Palette light bars", "color-palette"),
    ("Stairwells, vanities, corridors", "LIVC fixtures that install in minutes", "livc"),
    ("Something else", "Search every part number and product name", "search"),
]

# Home-page mosaic (David, 2026-10-08): the key products of the moment. Each tile links to its product, and each glow is
# "x,y,w,h" as fractions of the image (w and h of its width), placed by site.js however the tile crops, plus an optional
# " soft" for a wide, faint spill of light. Swap tiles here when new products launch. Captions stay short enough for a phone.
MOSAIC = [  # key products of the moment; change freely. Each light is "x,y,w,h[,deg[,top]] [kind]", as fractions of the image
    # (w and h of its width). kind: none = the lit surface (it glows and spills a halo), "soft" = a faint wide bloom,
    # "beam" = a cone of light from x,y (h long, w wide at its far end, top = its width at the source as a share of w;
    # deg 0 points down, positive turns it clockwise), "spark" = a small twinkle on a point source.
    # A beam, bloom or spark breathes with the light listed before it.
    dict(cls="m-a", file="cover/p01-b1.jpg", cap="Solera i-Series", alt="Solera i-Series solar area light", href="i-series.html",
         glows=["0.16,0.4,0.22,0.05,22", "0.16,0.41,0.4,0.2,22 soft", "0.165,0.425,0.5,0.46,22,0.42 beam", "0.09,0.345,0.05,0.05 spark"]),
    dict(cls="m-b", file="cover/p01-b8.jpg", cap="Retrofit lamps", alt="Light Efficient Design LED retrofit lamps", href="light-efficient-design.html",
         glows=["0.215,0.44,0.12,0.3", "0.205,0.48,0.3,0.56 soft", "0.215,0.37,0.07,0.07 spark",
                "0.515,0.38,0.3,0.26", "0.515,0.4,0.42,0.42 soft",
                "0.35,0.51,0.07,0.33", "0.67,0.6,0.15,0.13", "0.67,0.6,0.24,0.24 soft", "0.773,0.56,0.05,0.5"]),
    dict(cls="m-c", file="office.jpg", cap="LBI G2", alt="RemPhos LBI G2 light bars in an office", href="lbi.html#g2", pos="50% 20%",
         glows=["0.27,0.114,0.26,0.045,39", "0.56,0.226,0.42,0.045", "0.837,0.114,0.24,0.045,-43", "0.556,0.306,0.24,0.034",
                "0.556,0.34,0.22,0.03", "0.54,0.22,0.7,0.2 soft"]),
    dict(cls="m-d", file="cover/p01-b4.jpg", cap="Retrofit kits", alt="RemPhos LED retrofit kits", href="wall-ceiling-retrofit-kits.html",
         glows=["0.28,0.45,0.4,0.15", "0.27,0.38,0.56,0.36 soft", "0.79,0.485,0.38,0.06,14", "0.79,0.49,0.48,0.16,14 soft",
                "0.1,0.87,0.18,0.12", "0.255,0.88,0.035,0.1"]),
    dict(cls="m-e", file="cat/solar-bollard-post-tops/p33-b3.jpg", cap="Solar bollards", alt="Solera solar bollards and post tops along a path at night", href="solar-bollard-post-tops.html",
         glows=["0.72,0.148,0.2,0.03", "0.72,0.152,0.52,0.372,0,0.38 beam", "0.72,0.2,0.34,0.14 soft",
                "0.197,0.12,0.06,0.05", "0.197,0.14,0.2,0.16 soft", "0.197,0.15,0.17,0.3,0,0.2 beam", "0.197,0.115,0.05,0.05 spark",
                "0.545,0.52,0.03,0.03", "0.6,0.57,0.025,0.025", "0.651,0.63,0.016,0.016", "0.668,0.65,0.012,0.012"]),
]


def mosaic_lights(glows):
    """Template data for the mosaic lights: kind, coordinates and an animation offset shared with the light it belongs to."""
    out, k = [], -1
    for g in glows:
        coords, _, kind = g.partition(" ")
        if not kind:
            k += 1
        out.append(dict(kind=kind or "glow", g=coords, n=max(k, 0)))
    for o in out:
        o["delay"] = "%.1f" % ((o["n"] * 2.3 + (k + 1) * 0.7) % 6.2)
    return out

# Pages the catalog prints without photography borrow a cover photo so the hero is never empty.
HERO_FALLBACK = {}
# Every hero shows the whole product (David, 2026-10-08). Pages whose catalog hero is a room photo, crops the product or has
# no product at all get a product shot instead; the catalog image they replace moves into the page gallery.
# (path, alt text, fit): "cover" fills the tile, "" shows the whole image on studio white.
HERO_OVERRIDE = {
    "lbi-family": ("assets/img/product/g2-hero.jpg", "RemPhos LBI G2 linkable light bar", "cover"),
    "lbi-g2": ("assets/img/product/g2-hero.jpg", "RemPhos LBI G2 linkable light bar with its end cap", "cover"),
    "lbi-g1": ("assets/img/product/g1-hero.jpg", "RemPhos LBI G1 linkable light bar with its end cap", "cover"),
    "lbi-65": ("assets/img/product/lbi65-hero.jpg", "RemPhos LBI 65 IP65 linkable light bar with its sealed end cap", "cover"),
    "lbi-max": ("assets/img/product/max-hero.jpg", "RemPhos LBI MAX high-lumen linkable strip", "cover"),
    "color-palette": ("assets/img/product/palette-hero-blue.jpg", "RemPhos LBI Color Palette light bar glowing blue", "cover"),
    "livc": ("assets/img/cat/livc/hero-product.jpg", "LIVC stairwell, vanity and wraparound fixture, with the rounded (LIVC-RD, 3.5 in) and square (LIVC-SQ, 3.0 in) endcap profiles", "cover"),
    "lighting-controls": ("assets/img/cat/lighting-controls/hero-products.jpg", "RemPhos in-line occupancy sensors for the LBI G2 and LBI 65, and the IR23 sensor remote", "cover"),
    "solar-bollard-post-tops": ("assets/img/cat/solar-bollard-post-tops/hero-spt.jpg", "SL-SPT solar post top lantern over a lit waterfront promenade", ""),
    "poles": ("assets/img/cat/poles/hero.png", "Line drawing of the Solera pole types: round and square straight poles with an anchor base or for direct burial, 8 to 30 ft mounting heights", "cover"),
}

# Catalog photos of the waterproof LBI 65 with water drops on the bar: rain.js animates drops falling onto the bar.
# Value: the bar's box in the image as fractions "x0,y0,x1,y1".
RAIN = {"assets/img/cat/lbi-65/hero.jpg": "0.211,0.81,0.888,0.874",
        "assets/img/cat/lbi-family/lbi-65-bar.jpg": "0.027,0.409,0.967,0.554",
        "assets/img/cat/lbi-family/card-lbi-65.jpg": "0.183,0.809,0.881,0.85",
        # the slanted product shot: top edge of the bar from the end cap to the top-right corner, bar height 31% of the photo
        "assets/img/product/lbi65-hero.jpg": "light;line:0.42,0.512,1,0,0.31"}

# Videos, installation photos, case studies and Eddy cameos per page, hand-edited in content/media.json.
MEDIA_FILE = ROOT / "content" / "media.json"
# Pages laid out from their spec sheet (key points, icon strip, top slider, downloads, IES per part number), hand-edited in
# content/cutsheets.json. A page joins only once David has sent its spec sheet (David, 2026-10-08).
CUTSHEET_FILE = ROOT / "content" / "cutsheets.json"
# IES photometry, unique to each part number: assets/ies/<PN>/<PN>_<watts>_<CCT>.ies, one file per FlexWatt and FlexColor
# setting, plus <PN>_IES.zip holding all of them. Drop a part number's folder in and rebuild; its table row gets the files.
IES_DIR = ROOT / "assets" / "ies"
# A product sold both as a retrofit kit and as a fixture is listed under both groups (one page, one URL), so
# visitors find it whichever way they browse. Titles that say "Kit ... + Fixture" are cross-listed automatically.
ALSO_IN = {"lbi-max": ["Fixtures", "Retrofit Kits"]}
# The three Eddy stickers: samples, rebates and the rep finder, on every product page and the LBI page.
# Display names for the LBI documents on the Resources page (file names lose the "+" and the "Color")
DOC_TITLES = {"spec-sheets/RP-LBI-Spec_Sheet.pdf": "LBI G1 Spec Sheet", "LBI-65-Palette-Red-Orange-Spec-Sheet.pdf": "LBI 65 Color Palette+ Red/Orange Spec Sheet",
              "LBI-Palette-Sell-Sheet.pdf": "LBI Color Palette Sell Sheet"}
# The documents listed on the Resources page (by file name; the build finds each one's folder and newest version)
RESOURCE_DOCS = ["LBI-65-Palette-Red-Orange-Spec-Sheet.pdf", "LBI-65-Spec-Sheet.pdf", "LBI-Family-Flyer.pdf", "LBI-G2-Spec-Sheet.pdf",
                 "LBI-MAX-Spec-Sheet.pdf", "LBI-Palette-Sell-Sheet.pdf", "LED-2026-Full-Product-Catalog.pdf"]
# Hosted LBI documents shown on the product pages that do not have a cut-sheet layout yet
PAGE_DOCS = {"lbi-g2": ["LBI-G2-Spec-Sheet.pdf"], "lbi-65": ["LBI-65-Spec-Sheet.pdf"], "lbi-max": ["LBI-MAX-Spec-Sheet.pdf"],
             "color-palette": ["LBI-Palette-Sell-Sheet.pdf", "LBI-65-Palette-Red-Orange-Spec-Sheet.pdf"]}
# Pages where utility rebates do not apply, so Eddy's rebate card is left out
NO_REBATES = {"poles", "gondolas-shippers-displays"}
NEXT_STEPS = [
    dict(key="sample", img="assets/img/eddy/eddy-sample.png", title="Get a sample", text="Try it on your own job before you buy. We ship samples fast.", href="contact.html#sample", cta="Request a sample"),
    dict(key="rebates", img="assets/img/eddy/eddy-rebates.png", title="Find rebates", text="Most DLC-listed products qualify for utility rebates. We will find the ones in your area.", href="contact.html#rebates", cta="Check rebates"),
    dict(key="rep", img="assets/img/eddy/eddy-rep-finder.png", title="Rep finder", text="Your local rep has stock, pricing, samples and answers.", href="contact.html#rep", cta="Find your rep")]
# Meet Eddy page: the gallery of Amy George's Eddys (file, title, caption) and the history placeholders.
EDDY_GALLERY = [
    dict(img="eddy-connector.png", title="Eddy, linked in", text="Linking is his love language. Bar to bar, end to end, no tools, no drama.", href="lbi.html", where="LBI Family Overview"),
    dict(img="eddy-water.png", title="Eddy, splash tester", text="Quality control, Eddy style: one water cannon, one IP65 light bar, zero regrets.", href="lbi-65.html", where="LBI 65"),
    dict(img="eddy-silvair.png", title="Eddy, Silvair certified", text="He earned the sash. Bluetooth mesh, no extra wiring, and he still won't share the app password.", href="lighting-controls.html", where="Lighting controls"),
    dict(img="eddy-rebates.png", title="Eddy, rebate hunter", text="Has never met a utility rebate he didn't like. Will happily count it twice.", href="contact.html#rebates", where="Find rebates"),
    dict(img="eddy-rep-finder.png", title="Eddy, private eye", text="Give him a zip code and a magnifying glass. Your local rep will be found.", href="contact.html#rep", where="Rep finder"),
    dict(img="eddy-sample.png", title="Eddy, sample scooper", text="One scoop of LED, please. Samples taste better when they save energy.", href="contact.html#sample", where="Get a sample"),
]
# Eddy through the years: placeholders until Amy's older artwork and dates arrive (David, 2026-10-08).
EDDY_HISTORY = [
    dict(title="The very first Eddy", text="Where it all started. Artwork and year coming soon.", img=None),
    dict(title="Eddy, version 2", text="A few years and a few looks later. Artwork and year coming soon.", img=None),
    dict(title="Eddy, version 3", text="Ready for his close-up. Artwork and year coming soon.", img=None),
    dict(title="Eddy today", text="The Eddy you meet across this site and in the 2026 catalog.", img="assets/img/eddy/eddy-sample.png"),
]

WIDE_COLS = {"features", "fixture", "mounting", "listings", "description", "notes", "item", "control", "products", "product", "accessory", "accessories",
             "replaces", "application", "applications", "configuration", "models", "model", "lamp", "lamps", "note", "option group", "options",
             "mounting height", "includes", "whats included", "benefit", "function", "comments", "remarks", "finish", "finish options", "kit", "kits", "choice"}
UNIT_RE = re.compile(r"(?<![A-Z0-9\-])(\d+(?:\.\d+)?)\s+(FT|IN|LBS?|HRS?|YRS?)\b(?![\w-])")

# Transcription notes the extractors left for the review pass. None of it is customer copy, so anything that matches stays out of the page.
EDITORIAL_RE = re.compile(r"^(CHECK|UNREADABLE|LAYOUT NOTE|AS PRINTED|CATALOG AS PRINTED|Merged\b|Block also includes|Pages? \d|Page footer|Page note|Interpretation|Only the left|Only the two|Printed page|PDF page|This spread|Feature glyph|Product symbol key|Source note|Composite|Catalog section|Catalog page numbers?|Catalog table title|Catalog heading|Headline dash|Divider|No part numbers|No bold|No factory[- ]default|No -HV suffix|Listings? icons?|Listings? cell|Colou?r (dots?|key)|Footer key|Key labels|Size comparison height|Words in parentheses|The catalog)", re.I)
EDITORIAL_SUB = re.compile(r"transcribed|as printed|inferred|not stated|stray space|presumably|possible typo|\bglyphs?\b|\bicons?\b|footer key|divider statement|\(observed\)|merged cells?|catalog says|catalog heads|catalog prints|catalog's|catalog does not|catalog lists no|catalog has no|catalog text|in the catalog\b|\bprints\b|\bprinted\b|page key|two-page spread|appear transposed|separator was added|catalog typo|printed page number|PDF page|spread shows|this spread|on both pages|\brows?\b|on the page|on this page|on the product pages|on the luminaire pages|beside the table|\bpictured\b|\bdots? beside\b|colou?r-coded|translated from|\binterpretations?\b|source note|\bpages? \d|page[- ]footer|feature strip|table title|\bbold\b|has no \w+ column|no \w+ column in|cells? reads?\b|check marks?|bracket line|dashed line|dotted (leader|bracket)|leader line|\blabel(s|led|ed)?\b|\billustration\b|cross-checked|\bsiblings?\b|\bbuilders\b|sit on one line|read as a single callout|\bcallout\b|\bcaption\b|\bcomposite\b|\bcrops?\b|extractor|transcription|\bthe key defines\b|\bsymbols?\b|\btables?\b|\bthe page\b|colou?r[- ]dots?|colou?r key|\basterisk|\bphotos?\b|\bblue panel\b|\bdrawings?\b|\bread as\b|\bshown on\b|\bcolumns?\b|^See footnotes?$|^Accessory table\b|\bspans?\b(?! the)|\brecur on\b|\bpart numbers mix\b|\bdimension shown\b", re.I)
# "See page 25" in the catalog is "see the Lighting Controls page" here; refs() turns that into a link.
PAGE_NAMES = {"25": "Lighting Controls", "45": "Troffer Retrofit Kits", "68": "Poles", "69": "Poles"}
PAGE_HREF = {"Lighting Controls": "lighting-controls.html", "Troffer Retrofit Kits": "troffer-retrofit-kits-fixtures.html", "Poles": "poles.html"}
PAGEREF_RE = re.compile(r"\b(see|See|on)\s+(?:catalog\s+)?pages?\s+(\d+)(?:\s*(?:\+|and|&|–|-|to|/)\s*\d+)?\b")
NOTE_UNIT_RE = re.compile(r"(?<![A-Za-z0-9\-.])(\d+(?:\.\d+)?)\s*(FT|IN|LBS?|HRS?|YRS?)\b(?![\w-])")

def pageref(s):
    """'See pages 68 + 69' -> 'See the Poles page'; a page the site has no home for is left alone (and later read as editorial)."""
    def one(m):
        name = PAGE_NAMES.get(m.group(2))
        return f"{m.group(1)} the {name} page" if name else m.group(0)
    return PAGEREF_RE.sub(one, s)

PAREN_RE = re.compile(r"\s*\([^()]*\)")
DROP_EXTRA_TITLES = {"page note", "catalog section", "divider headline", "product symbol key", "source note", "layout note"}
EXTRA_TITLES = {"Part number pattern (observed)": "How to read a pole part number", "Gondola contents as rendered": "What the gondola holds", "Page 4 lead-in (frosted-lens and filament lamps)": "Frosted-lens and filament lamps"}
# "See page 25" in the catalog is a link on the site.
PAGE_OF = {"25": ("lighting-controls.html", "Lighting Controls"), "45": ("troffer-retrofit-kits-fixtures.html", "Troffer Retrofit Kits"),
           "68": ("poles.html", "Poles"), "69": ("poles.html", "Poles")}

def is_editorial(s):
    s = strip_bold("" if s is None else str(s)).strip()
    return bool(s) and (bool(EDITORIAL_RE.search(s)) or bool(EDITORIAL_SUB.search(s)))

def scrub(s):
    """Customer copy from a catalog note. Page references become page names, parentheticals about the printed page go,
    anything after a 'Source note' is dropped, and each clause (split on ';' and at sentence ends) is kept only when it
    is about the product rather than the transcription. Returns '' when nothing is left."""
    s = re.sub(r"\s+", " ", "" if s is None else str(s)).strip()
    s = re.split(r"\s*(?:Source note|Note to reviewer|Reviewer note)\b[:.]?", s, flags=re.I)[0].strip()
    s = pageref(s)
    s = PAREN_RE.sub(lambda m: "" if EDITORIAL_SUB.search(m.group(0)) or EDITORIAL_RE.search(m.group(0).strip(" (")) else m.group(0), s)
    s = re.sub(r"\s*\bon page \d+\b", "", s, flags=re.I)
    s = re.sub(r"\s+([.,;:])", r"\1", s)
    clauses = split_clauses(s)
    if clauses and is_editorial(clauses[0][0]):
        return ""
    kept = [(c, sep) for c, sep in clauses if c and not is_editorial(c)]
    s = ""
    for i, (c, sep) in enumerate(kept):
        s += (kept[i - 1][1] if i else "") + c
    s = NOTE_UNIT_RE.sub(lambda m: f"{m.group(1)} {m.group(2).lower()}", s)
    s = re.sub(r"^(\*+\s*)?([a-z][a-z]+)\b(?![A-Z-])", lambda m: (m.group(1) or "") + m.group(2)[0].upper() + m.group(2)[1:], s)
    return s.strip(" ;,")

def split_clauses(s):
    """[(clause, separator-before-the-next-clause)]: a note split on ';' and at sentence ends, never inside parentheses."""
    out, buf, depth = [], "", 0
    i = 0
    while i < len(s):
        ch = s[i]
        depth += (ch == "(") - (ch == ")")
        if depth <= 0 and ch == ";" and s[i + 1:i + 2] == " ":
            out.append((buf.strip(" ;,"), "; "))
            buf, i = "", i + 2
            continue
        if depth <= 0 and ch == "." and i + 2 < len(s) and s[i + 1] == " " and s[i + 2].isupper() and buf and (buf[-1].islower() or buf[-1] == ")"):
            out.append((buf.strip(" ;,"), ". "))
            buf, i = "", i + 2
            continue
        buf += ch
        i += 1
    if buf.strip(" ;,"):
        out.append((buf.strip(" ;,"), ""))
    return out

def dedupe(seq):
    out, seen = [], set()
    for x in seq:
        k = re.sub(r"\W+", " ", strip_bold(str(x)).lower()).strip()
        if k and k not in seen:
            seen.add(k)
            out.append(x)
    return out

def clean_headline(s):
    """Catalog display copy as a sentence: no trailing ellipsis or footnote asterisks, '|' read as 'and', page references dropped."""
    s = strip_bold("" if s is None else str(s)).strip()
    s = re.sub(r"(?:\.{3,}|\u2026)\s*(?=[a-z])", ", ", s)
    s = re.sub(r"\.{3,}|\u2026", ".", s).replace("*", "")
    s = re.sub(r"\s*\|\s*", " and ", s)
    s = re.sub(r"\s*[\u2014\u2013-]+\s*see pages?\b.*$", "", s, flags=re.I)
    s = pageref(s)
    s = re.sub(r"\s+", " ", s).strip(" .,;")
    s = s.replace("i-Series", "i\u2011Series")
    return s + "." if s and s[-1] not in ".!?" and len(s) > 24 else s

def feature_cols(n):
    """Columns for the at-a-glance tiles: 1-3 tiles sit in their own columns, 4-12 pick the width (5, 4 or 3) that leaves the
    fewest gaps in the last row, more than 12 always run five across."""
    if n <= 3:
        return max(n, 1)
    if n > 12:
        return 5
    return min((5, 4, 3), key=lambda c: ((-n) % c, -c))

# Product names that must not break across lines: "i-" alone at a line end, "LBI" without its model, a lone "+".
NOWRAP = [(re.compile(r"\bi-Series\b"), "i-&#8288;Series"),  # word joiner: no break after the hyphen
          (re.compile(r"\bLBI (G2|65|MAX)\b"), r"LBI&nbsp;\1"),
          (re.compile(r"\bPalette ([+X])(?![\w-])"), r"Palette\1"),   # Palette+ and PaletteX have no space (David, 2026-10-09)
          (re.compile(r"\b(built|TAA|all-in|plug-and|one|ballast)-(in|compliant|one|play|piece|bypass)\b"), r"\1-&#8288;\2"),
          (re.compile(r"(?<=\d) in(?=$| x |[,;)])"), "&nbsp;in"),  # dimensions: never leave "in" alone on a line
          (re.compile(r"\bp\. (\d+)(?:–(\d+))?"), lambda m: "p.&nbsp;" + m.group(1) + ("–&#8288;" + m.group(2) if m.group(2) else ""))]

# Catalog copy fixed on the way out (2026-10-08 review): no model counts, no "go to LED-LLC.com" on LED-LLC.com,
# no shorthand, consistent names. Applied to the whole page, so meta descriptions and structured data match.
COPY_FIXES = [
    ("Over a dozen models for the perfect solution.", "Plug-and-play and ballast-bypass LED replacements for PL and PLL lamps."),
    ("Three unique models, perfect for pathways, piers and more.", "Solar bollards and post tops, perfect for pathways, piers and more."),
    ("Dusk to Dawn and Timer and Motion Sensing", "Dusk to Dawn, Timer and Motion Sensing"),
    ("For listing status go to LED-LLC.com (DLC)", "DLC listing status: see the spec sheet"),
    ("DLC: for listing status go to LED-LLC.com", "DLC: see the spec sheet for listing status"),
    ("For listing status go to LED-LLC.com", "See the spec sheet for DLC listing status"),
    ("(see spec sheet on LED-LLC.com for DLC listing status)", "(see the spec sheet for DLC listing status)"),
    ("ordering codes are on the product spec sheet at LED-LLC.com.", "ordering codes are on the product spec sheet."),
    ("See our website for a list of approved fixtures", "Ask us for the list of approved fixtures"),
    ("Light Efficient Design and Remphos", "Light Efficient Design and RemPhos"),
    ("One piece design", "One-piece design"),
    ("Energy saving replacements", "Energy-saving replacements"),
    ("substantial sku reduction", "substantial SKU reduction"),
    ("Anchor-base and direct-burial poles from 10 to 30 ft", "Anchor-base and direct-burial poles from 8 to 30 ft"),
    ('<h1 id="h1">Pole Offering</h1>', '<h1 id="h1">Poles</h1>'),
    ("Gondolas + Shippers + Displays", "Gondolas, Shippers + Displays"),
    # LBI naming rule: full product names, and RGBWW for the color-tunable bars
    ("LBI&nbsp;65 Palette Red Orange Spec Sheet", "LBI&nbsp;65 Color Palette+ Red/Orange Spec Sheet"),
    ("LBI 65 Palette Red Orange Spec Sheet", "LBI 65 Color Palette+ Red/Orange Spec Sheet"),
    ("LBI&nbsp;65 Palette is also offered", "LBI&nbsp;65 Color Palette+ is also offered"),
    ("LBI Palette Sell Sheet", "LBI Color Palette Sell Sheet"),
    ("LBI&nbsp;G2 · LBI&nbsp;65 · Palette</td>", "LBI&nbsp;G2 · LBI&nbsp;65 · LBI Color Palette</td>"),
    ("limitless RGB color mixing", "limitless RGBWW color mixing"), ("Limitless RGB Color Mixing", "Limitless RGBWW Color Mixing"),
    (">RGB color mixing and ", ">RGBWW color mixing and "), ("FlexColor: RGB color mixing", "FlexColor: RGBWW color mixing"),
    ("white presets, full RGB color,", "white presets, full RGBWW color,"),
    ("Internal Driver IP65 (LBI65)</span>", "Internal Driver IP65 (LBI&nbsp;65)</span>"),
    ("Catalog product family (name used on that family&#39;s own pages)", "Product family"),
    ('class="ctl-n" href="lighting-controls.html">Network Lighting Controls</a>', 'class="ctl-n" href="lighting-controls.html">Networked Lighting Controls</a>'),
]
COPY_RX = [(re.compile(r"(?<=[\s(])w/o (?=\w)"), "without "), (re.compile(r"(?<=[\s(])w/ (?=\w)"), "with "),
           (re.compile(r"(\d)hrs\b"), r"\1 hrs")]

# Image alt text comes from the catalog notes, which mix the description with retouching notes. Keep the description only.
ALT_NOTE = re.compile(r"painted|whited|cropped|cut from|kept whole|stays whole|shown whole|lamp whole|no captions?\b|no text|caption|callout|page icon|overhang|onto white|recommended|candidate|\d+ x \d+|\bpx\b|rendered on white|dotted|white margin|slivers|labels and|not a white|without captions|no product shown", re.I)
ALT_FIX = {  # composites whose description is all retouching notes
    "The composite with both lamps complete": "Two LED corn lamps over a lit outdoor scene",
    "Catalog composite for the Type C kits": "Hospital corridor and the Type C U-bend kits panel, with two Type C T5/T8 tubes",
    "Catalog composite for the TAA Type C kits": "TAA panel and laboratory photo, with two Type C T5/T8 tubes",
    "The bollard-light composite": "Solera solar bollard light",
}
def split0(t, sep):
    out, depth, cur, i = [], 0, "", 0
    while i < len(t):
        c = t[i]
        depth += (c == "(") - (c == ")")
        if depth == 0 and t.startswith(sep, i):
            out.append(cur); cur = ""; i += len(sep); continue
        cur += c; i += 1
    return out + [cur]
def clean_alt(raw):
    t = H.unescape(raw)
    for k, v in ALT_FIX.items():
        if t.startswith(k):
            return H.escape(v, quote=True)
    t = split0(t, "; ")[0]
    t = re.sub(r"^(?:Catalog composite(?: for [^:]+)?:\s*|[^:]{0,40}\bcomposite\b[^:]{0,40}:\s*|The composite with (?:the )?(?:complete |full )?)", "", t)
    t = re.sub(r"\s+(?:with|and) the (?:callout|caption|headline|table)\b.*$", "", t)
    t = re.sub(r"\s*\((?:[^()]|\([^()]*\))*\)", lambda m: "" if ALT_NOTE.search(m.group(0)) else m.group(0), t)
    parts = split0(t, ", ")
    t = ", ".join([parts[0]] + [p for p in parts[1:] if not ALT_NOTE.search(p)])
    t = re.sub(r"\s+composite(?:d)?\b", "", t).strip(" ,.")
    t = t[:1].upper() + t[1:]
    return H.escape(t, quote=True)

def fix_copy(html):
    for a, b in COPY_FIXES:
        html = html.replace(a, b)
    for rx, rep in COPY_RX:
        html = rx.sub(rep, html)
    # catalog headings are set in capitals, but the i in i-Series stays small
    html = re.sub(r'alt="([^"]+)"', lambda m: 'alt="%s"' % clean_alt(m.group(1)), html)
    html = re.sub(r"(<h1[^>]*>)i-&#8288;Series", r'\1<span class="nocap">i</span>-&#8288;Series', html)
    return html

def keep_together(html):
    """Apply NOWRAP to the visible text of the page body only (never inside tags, scripts or styles)."""
    i = html.find("<body")
    if i < 0:
        return html
    i = html.index(">", i) + 1
    parts = re.split(r"(<script\b.*?</script>|<style\b.*?</style>|<[^>]+>)", html[i:], flags=re.S)
    for k in range(0, len(parts), 2):
        for rx, rep in NOWRAP:
            parts[k] = rx.sub(rep, parts[k])
    return html[:i] + "".join(parts)

def spans(n, tracks=12, per_row=4):
    """Grid spans for n items on `tracks` tracks with at most per_row per row, so every row is full (5 → 4,4,4,6,6)."""
    if n <= 0:
        return []
    rows = -(-n // per_row)
    base, extra = divmod(n, rows)
    out = []
    for r in range(rows):
        k = base + (1 if r < extra else 0)
        out += [tracks // k] * k
    return out

def refs(s):
    """Markup for catalog copy: bold defaults kept, 'see page N' turned into a link to the page that content lives on now."""
    t = str(bold(s))
    def one(m):
        p = PAGE_OF.get(m.group(2))
        return f'{m.group(1)} the <a href="{p[0]}">{p[1]}</a> page' if p else m.group(0)
    t = re.sub(r"\b(see|See)\s+pages?\s+(\d+)(?:\s*(?:\+|and|\u2013|-|to)\s*\d+)?", one, t)
    t = re.sub(r"\bthe (Lighting Controls|Troffer Retrofit Kits|Poles) page\b", lambda m: f'the <a href="{PAGE_HREF[m.group(1)]}">{m.group(1)}</a> page', t)
    t = re.sub(r"\s*for more information(?: on [^.;<]*?)? or check out the product spec sheet on our website LED-LLC\.com", " or the product spec sheet", t)
    t = re.sub(r"\s+\|\s+", " and ", t)
    t = t.replace("i-Series", "i\u2011Series")
    return Markup(t)

def cellhtml(s):
    """A table cell: bold defaults as <b>, and a break opportunity after each slash in long option lists (7W/10W/13W/16W)."""
    plain = strip_bold("" if s is None else str(s))
    html = str(bold(s))
    if len(plain) > 18 and "/" in plain:
        html = re.sub(r"/(?![^<]*>)", "/<wbr>", html)
    return Markup(html)

NUM_RE = re.compile(r"^[\d.,]+(\s*[\u2013-]\s*[\d.,]+)?$")

def table_prep(t):
    """Normalise a catalog table: drop empty columns, mark the part-number, wrapping and numeric columns, clean the notes."""
    cols = [str(c or "").strip() for c in t.get("columns", [])]
    rows = [[(c if isinstance(c, Markup) else "" if c is None else str(c)) for c in r] + [""] * (len(cols) - len(r)) for r in t.get("rows", [])]
    rows = [r[:len(cols)] if len(cols) else r for r in rows]
    keep = [i for i in range(len(cols)) if any(r[i].strip() for r in rows)] if rows else list(range(len(cols)))
    cols = [cols[i] for i in keep]
    rows = [[r[i] for i in keep] for r in rows]
    t["pn_col"] = next((i for i, c in enumerate(cols) if "part" in c.lower()), 0 if cols and rows and is_pn(rows[0][0]) else None)
    # units the catalog sets in capitals (8 FT, 3.0 IN) read as text here; part numbers are never touched
    for r in rows:
        for i, c in enumerate(r):
            if i != t["pn_col"] and not isinstance(c, Markup):
                r[i] = UNIT_RE.sub(lambda m: f"{m.group(1)} {m.group(2).lower()}", c)
    t["columns"], t["rows"] = cols, rows
    norm = lambda c: re.sub(r"[^a-z ]", "", c.lower().replace("(s)", "s")).strip()
    t["wide"] = [norm(c) in WIDE_COLS or norm(c).rstrip("s") in WIDE_COLS for c in cols]
    t["num"] = []
    for i in range(len(cols)):
        vals = [strip_bold(r[i]).strip() for r in rows if strip_bold(r[i]).strip()]
        t["num"].append(bool(vals) and i != t["pn_col"] and sum(bool(NUM_RE.match(v)) for v in vals) >= 0.8 * len(vals))
    t["has_bold"] = any("**" in c for r in rows for c in r)
    t["dense"] = len(cols) > 8
    t["title_parts"] = split_title(t.get("title") or "")
    t["notes"] = dedupe([x for x in (scrub(n) for n in t.get("notes", []) or []) if x])
    return t

# ---------------------------------------------------------------- helpers
def bold(s):
    """Catalog bold (factory defaults) is written **like this** in the data; render it as <b>."""
    s = escape(s if isinstance(s, Markup) else "" if s is None else str(s))
    return Markup(re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", str(s)))

def strip_bold(s):
    return re.sub(r"\*\*(.+?)\*\*", r"\1", "" if s is None else str(s))

def short_caption(im):
    if im.get("caption"):
        return im["caption"]
    s = re.sub(r"^(catalog composite|the composite with|photo-bounded crop of|left half of the composite only)[:,]?\s*", "", im.get("shows", ""), flags=re.I)
    s = re.split(r"[;(]| composited | over | in front of | with the | from the | on white", s)[0].strip(" .,")
    if is_editorial(s):
        s = ""
    s = (s[:1].upper() + s[1:]) if s else ", ".join(im.get("products") or [])
    if len(s) > 64:
        # cut back to a whole phrase ("... entrance at dusk"), never mid-phrase ("... at dusk with linear")
        cut = s[:65]
        brk = [m.start() for m in re.finditer(r"\s(?:with|under|over|at|in|into|onto|on|by|and|beside|near|from|for|showing|lit)\s", cut) if m.start() >= 24]
        s = cut[:brk[-1]] if brk else cut.rsplit(" ", 1)[0]
        s = s.rstrip(",;:- ")
        for _ in range(3):
            s = re.sub(r"\s+(by|with|and|or|of|in|into|onto|at|on|the|a|an|under|over|from|to|for|lit|as|its|is|are|between|inside|near|beside|toward)$", "", s, flags=re.I)
    return s

def split_title(t):
    return [p.strip() for p in str(t).split("|")]

def is_pn(s):
    s = strip_bold(s).strip()
    return bool(re.match(r"^[A-Z0-9][A-Z0-9\-\./ ]{3,}$", s)) and any(ch.isdigit() for ch in s)

def group_anchor(g):
    """Same transform as the templates' |lower|replace(' ', '-')|replace('+', 'and') for group ids."""
    return g.lower().replace(" ", "-").replace("+", "and")

_HASHES = {}

def bust_cache(html):
    """Add ?v=<content hash> to our own CSS and JS links so phones and GitHub Pages never pair a new page with an old script."""
    def ver(m):
        rel = m.group(2)
        if rel not in _HASHES:
            f = ROOT / rel
            _HASHES[rel] = hashlib.md5(f.read_bytes()).hexdigest()[:8] if f.is_file() else ""
        return f'{m.group(1)}="{rel}?v={_HASHES[rel]}"' if _HASHES[rel] else m.group(0)
    return re.sub(r'\b(href|src)="(assets/(?:css|js)/[\w.-]+\.(?:css|js))"', ver, html)

def sync_from_scratch():
    """Copy fresh JSON from the extraction scratchpad into data/ (the site's own copy)."""
    if not SCRATCH.exists():
        return
    DATA.mkdir(exist_ok=True)
    for f in sorted((SCRATCH / "data").glob("*.json")):
        try:
            json.load(open(f))
        except Exception as e:  # a half-written file from a running extractor: keep the last good copy
            print("skip (invalid json)", f.name, e)
            continue
        shutil.copy(f, DATA / f.name)

def place_image(src_rel, slug, max_w=1800):
    """Copy a catalog crop into assets/img/cat/<slug>/, resized for the web. Returns the web path or None."""
    src = SCRATCH / "img" / src_rel
    out_dir = ROOT / "assets" / "img" / "cat" / slug
    if not src.exists():   # GitHub Actions has no catalog crops: use the web copy made earlier, if any
        name = Path(src_rel).name
        name = name[len(slug) + 1:] if name.startswith(slug + "-") else name
        return f"assets/img/cat/{slug}/{name}" if (out_dir / name).is_file() else None
    out_dir.mkdir(parents=True, exist_ok=True)
    name = Path(src_rel).name
    if name.startswith(slug + "-"):
        name = name[len(slug) + 1:]
    dst = out_dir / name
    if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
        im = Image.open(src)
        if im.width > max_w:
            im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
        if dst.suffix.lower() == ".png":
            im.save(dst, optimize=True)
        else:
            im.convert("RGB").save(dst, quality=86, optimize=True, progressive=True)
    return f"assets/img/cat/{slug}/{name}"

def cover_images():
    """Catalog cover and divider photo blocks used on the home and brand pages."""
    out = ROOT / "assets" / "img" / "cover"
    out.mkdir(parents=True, exist_ok=True)
    for f in sorted((SCRATCH / "img").glob("p01-b*.jpg")) + sorted((SCRATCH / "img").glob("p13-b*.jpg")) + sorted((SCRATCH / "img").glob("p29-b*.jpg")):
        dst = out / f.name
        if not dst.exists():
            im = Image.open(f)
            if im.width > 1600:
                im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
            im.convert("RGB").save(dst, quality=86, optimize=True, progressive=True)

LOGO_COV_REF, LOGO_Q = 0.201, 0.5  # ink coverage of the Light Efficient Design lockup; bolder marks get less area, lighter ones more

def brand_logos():
    """Derive the lockups the catalog does not ship: the stacked Light Efficient Design mark in white for dark mode,
    and the Solera mark in ink for its yellow brand band. Idempotent; the sources are the catalog PNGs."""
    d = ROOT / "assets" / "img" / "brand"
    def recolor(src, dst, rgb):
        if dst.exists() and (not src.exists() or dst.stat().st_mtime >= src.stat().st_mtime or os.environ.get("GITHUB_ACTIONS")):
            return   # a fresh checkout has arbitrary file times: never redraw the logos there
        im = Image.open(src).convert("RGBA")
        a = im.split()[3]
        out = Image.new("RGBA", im.size, rgb + (0,))
        out.putalpha(a)
        out.save(dst, optimize=True)
    recolor(d / "led-logo.png", d / "led-logo-stacked-white.png", (255, 255, 255))
    recolor(d / "solera-logo-white.png", d / "solera-logo-dark.png", (27, 28, 32))

_logo_box = {}
def logo_style(file):
    """' style="--lw:..;--lh:.."' for a brand logo: unitless width/height factors so `.logo-eq` (site.css) draws every brand
    at the same visual weight for a given --logo-s. Starts from equal area over the mark's opaque bounding box, then scales
    the area by the square root of relative ink coverage: a bold wordmark (RemPhos) gets less, a thin one (Solera) more."""
    if file not in _logo_box:
        f = ROOT / "assets" / "img" / "brand" / file
        try:
            a = Image.open(f).convert("RGBA").split()[3]
            bb = a.point(lambda v: 255 if v > 25 else 0).getbbox() or (0, 0, a.width, a.height)
            sub = a.crop(bb)
            ar = max(0.2, sub.width / max(1, sub.height))
            cov = max(0.02, sum(sub.histogram()[i] * i for i in range(256)) / 255 / (sub.width * sub.height))
        except Exception:
            ar, cov = 3.0, LOGO_COV_REF
        k = (LOGO_COV_REF / cov) ** LOGO_Q
        _logo_box[file] = (round((k * ar) ** 0.5, 3), round((k / ar) ** 0.5, 3))
    w, h = _logo_box[file]
    return Markup(f' style="--lw:{w};--lh:{h}"')

_img_sizes = {}
def img_size(web):
    """Pixel (width, height) of a site image by its web path, or None when it is missing or not a raster."""
    if web not in _img_sizes:
        f = ROOT / web
        try:
            _img_sizes[web] = Image.open(f).size if f.is_file() and f.suffix.lower() != ".svg" else None
        except Exception:
            _img_sizes[web] = None
    return _img_sizes[web]

def dims(web):
    """' width=".." height=".."' for an <img> whose file the build can measure (prevents layout shift); empty otherwise."""
    s = img_size(web or "")
    return Markup(f' width="{s[0]}" height="{s[1]}"') if s else Markup("")

def dims_ratio(web):
    """'w / h' of an image for CSS aspect-ratio (icons drawn as masks have no <img> to size them)."""
    s = img_size(web or "")
    return f"{s[0]} / {s[1]}" if s else "1"

# ---------------------------------------------------------------- SEO text and structured data
def page_url(out):
    return SITE_URL if out == "index.html" else SITE_URL + out

def abs_url(path):
    path = path.lstrip("/")
    if path.startswith(("assets/docs/", "assets/ies/")):   # a download: wherever it sits now, newest version
        rel, hsh, frag = path.partition("#")
        path = public_url(rel) + hsh + frag
    return SITE_URL + path

def clean_text(s):
    """Catalog prose into a plain sentence: no bold marks, footnote stars, ellipses or 'see page' pointers."""
    s = strip_bold(s or "")
    s = re.sub(r"\s*[—–-]+\s*see page \d+ for more information\s*", "", s, flags=re.I)
    s = re.sub(r"\s*(\.{3}|…)\s*(?=\()", " ", s)      # "built-in... (SL-AIO)" keeps its parenthetical
    s = re.sub(r"\s*(\.{3}|…)\s*(?=[a-z])", ", ", s)   # "air return... add -AIR" continues the sentence
    s = re.sub(r"\.{3}|…", ". ", s)
    s = re.sub(r"\.\s+[—–-]\s+", ". ", s)              # "Sleeker. — ADA compliant"
    s = re.sub(r"\s+\|\s+", " and ", s)
    s = s.replace(" w/o ", " without ").replace(" w/ ", " with ")
    s = re.sub(r"\*+", "", s)
    s = re.sub(r"^[.\s]+", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s+([.,;:])", r"\1", s)
    if s and s[-1] not in ".!?":
        s += "."
    return s

def sentences(s):
    return [x.strip() for x in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9(\"'])", s) if x.strip()]

DESCRIPTION_FILLERS = ["Specifications as printed in the 2026 Full Product Catalog.", "Light Efficient Design, Cary, Illinois.",
                       "From Light Efficient Design.", "Part numbers and specifications."]

def compose_description(parts, lo=120, hi=160):
    """A meta description of lo..hi characters built from whole sentences of the given texts, in order.
    Sentences that would overflow are skipped in favour of later ones; only if the text still runs short is a
    skipped sentence kept up to its last clause boundary (never cut mid-word), then a short factual filler."""
    out, skipped = "", []
    def words(s):
        return set(re.findall(r"\w+", s.lower()))
    for p in parts:
        for sent in sentences(clean_text(p)):
            w = words(sent)
            if not w or len(w & words(out)) / len(w) > 0.7:  # already said, in the same or nearly the same words
                continue
            cand = f"{out} {sent}".strip()
            if len(cand) <= hi:
                out = cand
                if len(out) >= lo:
                    return out
            else:
                skipped.append(sent)
    for sent in skipped:
        room = hi - len(out) - (2 if out else 1)
        cut = None
        for m in re.finditer(r"[,;:]| and | with | plus | or ", sent):
            if m.start() <= room:
                cut = sent[:m.start()]
            else:
                break
        if cut and len(cut) >= 40:
            out = f"{out} {cut.rstrip(' ,;:')}.".strip()
            if len(out) >= lo:
                return out
    for filler in DESCRIPTION_FILLERS:  # only when the page's own prose runs short
        if lo <= len(out) + 1 + len(filler) <= hi:
            return f"{out} {filler}".strip()
    return out

def ld_json(obj):
    """JSON-LD for a <script> block: valid JSON with every '<', '>' and '&' escaped, so '</script>' cannot occur."""
    s = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return Markup(s.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026"))

def ld_address(loc):
    return {"@type": "PostalAddress", "streetAddress": loc["street"], "addressLocality": loc["city"], "addressRegion": loc["region"],
            "postalCode": loc["zip"], "addressCountry": "US"}

def natmax(path):
    """Inline cap so an image is never drawn wider than its own pixels (no blurry upscaling)."""
    size = img_size(path)
    return Markup(f' style="max-width:min(100%,{size[0]}px)"') if size else ""

def cattitle(t, tail=""):
    """Catalog-style page title: the name in heavy capitals, the rest set light, as the catalog prints
    'LINKABLE BAR / INTERNAL DRIVER IP65 (LBI65)' and 'STAIRWELL / VANITY / WRAPAROUND (LIVC)'. Capitals come from CSS
    so the HTML keeps the real spelling. tail: the part after the last ' / ' that the catalog sets light."""
    t = str(t)
    head, light = t, ""
    if tail and t.endswith(tail) and t[:-len(tail)].rstrip().endswith("/"):
        head, light = t[:-len(tail)].rstrip()[:-1].rstrip(), "/ " + tail
    out = re.sub(r"\(([^()]*)\)", lambda m: f'<span class="lt">({m.group(1)})</span>', str(escape(head)))
    if light:
        out += f' <span class="lt">{escape(light)}</span>'
    return Markup(out)

def ld_organization():
    logo = "assets/img/brand/led-logo.png"
    size = img_size(logo) or (None, None)
    return {"@context": "https://schema.org", "@type": "Organization", "@id": SITE_URL + "#organization", "name": SITE_NAME, "url": SITE_URL,
            "logo": {"@type": "ImageObject", "url": abs_url(logo), **({"width": size[0], "height": size[1]} if size[0] else {})},
            "slogan": BRANDS["led"]["tagline"],
            "brand": [{"@type": "Brand", "name": BRANDS[k]["name"], "url": page_url(BRANDS[k]["slug"] + ".html"),
                       "logo": abs_url("assets/img/brand/" + BRANDS[k]["logo"])} for k in BRAND_ORDER],
            "address": ld_address(HQ),
            "location": [{"@type": "Place", "name": loc["name"], "address": ld_address(loc)} for loc in (HQ, MFG)],
            "telephone": PHONE_E164, "email": EMAIL,
            "contactPoint": [{"@type": "ContactPoint", "contactType": "sales", "telephone": PHONE_E164, "email": EMAIL}],
            "sameAs": [u for _, _, u in SOCIAL]}

def ld_website():
    return {"@context": "https://schema.org", "@type": "WebSite", "@id": SITE_URL + "#website", "name": SITE_NAME, "url": SITE_URL,
            "publisher": {"@id": SITE_URL + "#organization"}, "inLanguage": "en"}

def ld_webpage(out, name, description, kind="WebPage", image=None, breadcrumb=False, **extra):
    url = page_url(out)
    d = {"@context": "https://schema.org", "@type": kind, "@id": url + "#webpage", "url": url, "name": name, "description": description,
         "isPartOf": {"@id": SITE_URL + "#website"}, "inLanguage": "en"}
    if image:
        d["primaryImageOfPage"] = {"@type": "ImageObject", "url": abs_url(image)}
    if breadcrumb:
        d["breadcrumb"] = {"@id": url + "#breadcrumb"}
    d.update(extra)
    return d

def ld_breadcrumbs(out, trail):
    """trail: [(name, href)] in the order the visible breadcrumb shows them; the last entry is the page itself."""
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "@id": page_url(out) + "#breadcrumb",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": (SITE_URL + h) if h != "index.html" else SITE_URL}
                                for i, (n, h) in enumerate(trail)]}

def ld_products(c):
    """One Product per part number on a category page, described from the table title and its key columns."""
    url, items, seen = page_url(c["href"]), [], set()
    hero = abs_url(c["hero"]["web"]) if c.get("hero") else None
    for t in c.get("tables", []):
        if t["pn_col"] is None:
            continue
        head = " · ".join(t["title_parts"])
        cols = [re.sub(r"\*+$", "", x.strip()).lower() for x in t["columns"]]
        for r in t["rows"]:
            if len(r) <= t["pn_col"]:
                continue
            pn = strip_bold(r[t["pn_col"]]).strip()
            if not is_pn(pn) or pn in seen:
                continue
            seen.add(pn)
            specs = []
            for i, cell in enumerate(r):
                if i == t["pn_col"] or i >= len(cols) or cols[i] not in LD_KEY_COLS:
                    continue
                v = re.sub(r"\s+", " ", strip_bold(cell)).strip()
                if v:
                    specs.append(f"{t['columns'][i].strip().rstrip('*')}: {v}")
            desc = f"{c['brand']['name']} {c['nav_title']}: {head}." + (" " + "; ".join(specs[:8]) + "." if specs else "")
            p = {"@type": "Product", "name": pn, "sku": pn, "mpn": pn, "brand": {"@type": "Brand", "name": c["brand"]["name"]},
                 "manufacturer": {"@id": SITE_URL + "#organization"}, "category": f"{c['brand']['name']} > {c['group']} > {c['nav_title']}",
                 "description": desc, "url": f"{url}#pn={pn}"}
            if hero:
                p["image"] = hero
            items.append(p)
    if not items:
        return None
    return {"@context": "https://schema.org", "@type": "ItemList", "@id": url + "#parts", "name": f"{c['nav_title']} part numbers",
            "numberOfItems": len(items),
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": p} for i, p in enumerate(items[:MAX_LD_PRODUCTS])]}

def ld_lbi_products(variants):
    items = []
    for v in variants:
        cmp = v.get("cmp") or {}
        props = [("Light", cmp.get("light")), ("Lengths", lbi_lengths(v)), ("Wattage", cmp.get("watts")), ("Lumens", cmp.get("lm")),
                 ("Control", cmp.get("control")), ("Location rating", cmp.get("rating")), ("Efficacy", cmp.get("eff")), ("Best for", cmp.get("best"))]
        pns = [p[0] for p in v.get("parts") or []]
        desc = clean_text(f"{v.get('tagline', '')} {v.get('lead', '')}")
        if pns:
            desc += " Part numbers: " + ", ".join(pns) + "."
        p = {"@type": "Product", "name": v["name"], "brand": {"@type": "Brand", "name": "RemPhos"}, "manufacturer": {"@id": SITE_URL + "#organization"},
             "category": "RemPhos > Linkable Light Bars", "description": desc, "url": f"{page_url('lbi.html')}#{v['id']}",
             "additionalProperty": [{"@type": "PropertyValue", "name": n, "value": val} for n, val in props if val]}
        shot = f"assets/img/product/{v['shot']}" if v.get("shot") else None
        if shot and img_size(shot):
            p["image"] = abs_url(shot)
        items.append(p)
    return {"@context": "https://schema.org", "@type": "ItemList", "@id": page_url("lbi.html") + "#variants", "name": "LBI family variants",
            "numberOfItems": len(items), "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": p} for i, p in enumerate(items)]}

def _rgb(path):
    """An image flattened onto white (logos may carry '#rrggbb' to recolor a one-color white logo)."""
    path, _, tint = path.partition("#")
    im = Image.open(ROOT / path).convert("RGBA")
    if tint:
        im = Image.merge("RGBA", (*Image.new("RGB", im.size, "#" + tint).split(), im.getchannel("A")))
    bg = Image.new("RGB", im.size, "white"); bg.paste(im, mask=im.getchannel("A"))
    return bg

def _contain(im, w, h, up=4.0):
    s = min(w / im.width, h / im.height, up)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)

def _cover(im, w, h, pos=(0.5, 0.5)):
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = round((im.width - w) * pos[0]), round((im.height - h) * pos[1])
    return im.crop((x, y, x + w, y + h))

def share_card(out, image):
    """The 1200 x 630 picture a page shows when its link is shared (iMessage, Slack, LinkedIn...). Products are never cropped:
    a single image sits whole on white; composites follow SHARE. Rebuilt only when a source or this script changes."""
    W, H = 1200, 630
    kind, srcs, _ = SHARE.get(out, ("single", [image], ""))
    if kind == "mosaic":
        srcs = [f"assets/img/{m['file']}" for m in MOSAIC[:4]]
    files = [ROOT / x.partition("#")[0] for x in srcs]
    if not srcs or not all(f.is_file() for f in files):
        return None
    rel = f"assets/img/share/{Path(out).stem}.jpg"
    dest = ROOT / rel
    if dest.is_file() and dest.stat().st_mtime >= max(f.stat().st_mtime for f in files + [Path(__file__)]):
        return rel
    card = Image.new("RGB", (W, H), "white")
    ims = [_rgb(x) for x in srcs]
    if kind == "single":
        fg = _contain(ims[0], W - 60, H - 40, up=2.0)
        card.paste(fg, ((W - fg.width) // 2, (H - fg.height) // 2))
    elif kind == "mosaic":
        g, tw, th = 8, (W - 8) // 2, (H - 8) // 2
        for i, im in enumerate(ims):
            pos = MOSAIC[i].get("pos", "50% 50%").replace("%", "").split()
            card.paste(_cover(im, tw, th, (float(pos[0]) / 100, float(pos[1]) / 100)), ((tw + g) * (i % 2), (th + g) * (i // 2)))
    elif kind == "pair":
        for i, im in enumerate(ims):
            fg = _contain(im, 560, 560)
            card.paste(fg, (20 + i * 600 + (560 - fg.width) // 2, (H - fg.height) // 2))
    elif kind == "docs":
        n = len(ims)
        bw, bh = 330, 560
        x0 = (W - n * bw - (n - 1) * 40) // 2
        for i, im in enumerate(ims):
            fg = _contain(im, bw, bh)
            x, y = x0 + i * (bw + 40) + (bw - fg.width) // 2, (H - fg.height) // 2
            shadow = Image.new("RGB", (fg.width + 2, fg.height + 2), "#cfd4dc")
            card.paste(shadow, (x - 1, y - 1)); card.paste(fg, (x, y))
    elif kind == "brand":
        logo, prod = ims
        lg = _contain(logo, 420, 170, up=1.6)
        card.paste(lg, (40 + (440 - lg.width) // 2, (H - lg.height) // 2))
        fg = _contain(prod, 660, 570)
        card.paste(fg, (500 + (680 - fg.width) // 2, (H - fg.height) // 2))
    dest.parent.mkdir(parents=True, exist_ok=True)
    buf = io.BytesIO()
    card.save(buf, "JPEG", quality=84, optimize=True, progressive=True)
    if dest.is_file():
        # the encoder can write the same picture with different bytes; keep the old file so the public repo does not churn
        try:
            same = Image.open(dest).convert("RGB").tobytes() == Image.open(io.BytesIO(buf.getvalue())).convert("RGB").tobytes()
        except OSError:
            same = False
        if same:
            dest.touch()
            return rel
    dest.write_bytes(buf.getvalue())
    return rel

def seo_for(out, title, description, brand_key="remphos", og_type="website", image=None, image_alt="", jsonld=()):
    """Everything base.html needs in <head> for one page."""
    image, image_alt = (image, image_alt) if image else HOME_IMAGE
    card = share_card(out, image)
    # catalog image notes can be long transcription remarks: a share card's alt is the page's own name instead
    alt = SHARE[out][2] if out in SHARE else image_alt if image_alt and len(image_alt) <= 90 else title.split(" | ")[0]
    size = (1200, 630) if card else img_size(image)
    return dict(title=title, description=description, canonical=page_url(out), og_type=og_type, og_image=abs_url(card or image), og_image_alt=alt,
                og_image_w=size[0] if size else None, og_image_h=size[1] if size else None, theme_color=THEME_COLORS.get(brand_key, THEME_COLORS["remphos"]),
                jsonld=[ld_json(b) for b in jsonld if b])

# ---------------------------------------------------------------- data
# ---------- Editable page files (the admin page, Pages CMS) ----------
# content/pages/<slug>.json holds the text and part-number tables of one product page. It starts as a copy of data/<slug>.json
# (the catalog transcription) and from then on is the source for these keys. Table rows are single strings with cells
# separated by " | " because the admin page edits lists of text, not tables. The admin page leaves out empty values when it
# saves, so a missing key means empty, never "use the catalog".
PAGE_KEYS = ["title", "subtitle", "headline", "intro", "callouts", "features", "tables", "footnotes"]
TABLE_KEYS = ["title", "leadIn", "columns", "rows", "notes", "pdfPage", "catalogPage", "source"]

def page_file_from(d):
    out = {k: d.get(k, "" if k in ("title", "subtitle", "headline", "intro") else []) for k in PAGE_KEYS}
    out["tables"] = []
    for t in d.get("tables", []):
        x = {k: t[k] for k in TABLE_KEYS if k in t}
        x["rows"] = [" | ".join("" if c is None else str(c) for c in r) for r in t.get("rows", [])]
        out["tables"].append(x)
    return out

def page_folder(slug):
    """The admin page's folder for a product page: its first category in the Products menu (David, 2026-10-12)."""
    for m in PRODUCT_MENU:
        if any(slug in slugs for _, slugs in m["groups"]):
            return m["name"].replace(" + ", " and ")
    return "Other"

def apply_page_file(slug, d):
    f = next(PAGES.rglob(f"{slug}.json"), None) or PAGES / page_folder(slug) / f"{slug}.json"
    if not f.is_file():
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps(page_file_from(d), indent=2, ensure_ascii=False) + "\n")
    p = json.loads(f.read_text())
    for k in PAGE_KEYS:
        d[k] = p.get(k, "" if k in ("title", "subtitle", "headline", "intro") else [])
    d["title"] = d["title"] or slug.replace("-", " ").title()
    d["features"] = [dict(label=x.get("label", ""), note=x.get("note", "")) for x in d["features"] if isinstance(x, dict) and x.get("label")]
    d["tables"] = [dict(t, columns=t.get("columns") or [], notes=t.get("notes") or [],
                        rows=[re.split(r"\s*\|\s*", r.strip()) if isinstance(r, str) else r for r in t.get("rows") or []]) for t in d["tables"]]

# ---------- Document versions ----------
# Staff may upload a new version under a new name (RP-LBI-Spec_Sheet-V2.pdf next to RP-LBI-Spec_Sheet.pdf). Every link to a
# document or IES file goes to the newest version in the same folder: same name once a trailing version (V2, ver 3, rev 4)
# and/or date (2026-10-12, 10.12.26, 20261012) after a separator is set aside, newest date first, then highest version. No version = oldest.
VER_TAIL = re.compile(r"(?i)[\s_.-]+(?:(?:v|ver|version|rev|revision)[\s_.-]*(\d+(?:[._]\d+)*)|((?:19|20)\d{2}[-_.](?:0[1-9]|1[0-2])[-_.](?:0[1-9]|[12]\d|3[01])|(?:0?[1-9]|1[0-2])[-_.](?:0?[1-9]|[12]\d|3[01])[-_.](?:\d{2}|(?:19|20)\d{2})|(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])))$")
# A version or date only counts after a space, dash, underscore or dot (TRV22 stays a part number), and a part number
# from the catalog that happens to end like a version (a hypothetical XX-V26) is never split.
_PNS = None
def _is_pn(stem):
    global _PNS
    if _PNS is None:
        f = ROOT / "assets" / "js" / "search-index.json"
        _PNS = {r["pn"].lower() for r in json.loads(f.read_text())} if f.is_file() else set()
    return any(stem.lower().endswith(pn) and VER_TAIL.search(pn) for pn in _PNS)

def _date_num(t):
    n = re.split(r"[-_.]", t)
    if len(n) == 1:
        return int(t)
    if len(n[0]) == 4:
        return int(n[0]) * 10000 + int(n[1]) * 100 + int(n[2])
    y = int(n[2]); y += 2000 if y < 100 else 0
    return y * 10000 + int(n[0]) * 100 + int(n[1])

def doc_key(stem):
    """(base name, (date, version)) for a file stem."""
    base, key = split_version(stem)
    return base.lower(), key

def split_version(stem):
    """(the name without its version or date, (date, version)), keeping the name's own spelling."""
    date, ver = 0, ()
    while True:
        m = VER_TAIL.search(stem)
        if not m or m.start() == 0 or _is_pn(stem):
            break
        if m.group(1):
            ver = ver or tuple(int(x) for x in re.split(r"[._]", m.group(1)))
        else:
            date = date or _date_num(m.group(2))
        stem = stem[:m.start()]
    return stem, (date, ver)

# Downloads sit in category and product folders (David, 2026-10-12): assets/docs/<kind>/<category>/<product>/<file> and
# assets/ies/<category>/<product>/<part number>/<file>. The code names a document by its file name alone
# (assets/docs/spec-sheets/X.pdf, assets/ies/<PN>/Y.ies) and the build finds it wherever it sits, so files can be
# moved between folders without breaking a link. IES files are matched within the folder named after their part number.
DOWNLOAD_EXTS = {".pdf", ".ies", ".zip", ".ldt"}
_files = {}
def _all_files(top):
    if top not in _files:
        d = ROOT / "assets" / top
        _files[top] = [f for f in d.rglob("*") if f.is_file() and f.suffix.lower() in DOWNLOAD_EXTS] if d.is_dir() else []
    return _files[top]

def newest_path(rel):
    """The newest existing version of an assets/docs or assets/ies file, found in any folder, as a site path, or None."""
    rel = rel.partition("#")[0]
    p = Path(rel)
    top = p.parts[1] if len(p.parts) > 2 else ""
    base, ext = doc_key(p.stem)[0], p.suffix.lower()
    same = [f for f in _all_files(top) if f.suffix.lower() == ext and doc_key(f.stem)[0] == base
            and (top != "ies" or f.parent.name.lower() == p.parent.name.lower())]
    if not same:
        return None
    return max(same, key=lambda f: (doc_key(f.stem)[1], f.name)).relative_to(ROOT).as_posix()

# Permanent addresses (David, 2026-10-12: printed catalogs carry QR codes, so a document's link must never change).
# Every download is published at one short address that does not depend on its folder or version:
#   docs/<name without version>.pdf        e.g. docs/LED-8086_Instructions.pdf
#   ies/<part number>/<name without version>.<ext>
# Each build copies the newest version there, so uploading "... V2" replaces what that address serves.
PUBLIC_DIRS = ("docs", "ies")
_public = {}
def public_path(rel):
    """The permanent address of a file under assets/docs or assets/ies (as found by newest_path)."""
    f = ROOT / rel
    top = Path(rel).parts[1]
    name = split_version(f.stem)[0] + f.suffix.lower()
    return f"docs/{name}" if top == "docs" else f"ies/{f.parent.name}/{name}"

def publish_downloads():
    """Copy the newest version of every document and IES file to its permanent address; remove addresses whose file is gone."""
    want = {}
    for top in ("docs", "ies"):
        groups = {}
        for f in _all_files(top):
            groups.setdefault(public_path(f.relative_to(ROOT).as_posix()), []).append(f)
        for pub, fs in groups.items():
            want[pub] = max(fs, key=lambda f: (doc_key(f.stem)[1], f.name))
    for pub, src in want.items():
        dst = ROOT / pub
        if not dst.is_file() or dst.read_bytes() != src.read_bytes():
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dst)
    for d in PUBLIC_DIRS:
        for f in sorted((ROOT / d).rglob("*"), reverse=True) if (ROOT / d).is_dir() else []:
            if f.is_file() and f.relative_to(ROOT).as_posix() not in want:
                f.unlink()
            elif f.is_dir() and not any(f.iterdir()):
                f.rmdir()

def public_url(rel):
    """A download link: the permanent address of the newest version, or the path itself if no file matches."""
    new = newest_path(rel)
    return url_path(public_path(new) if new else rel)

def url_path(rel):
    """A site path as it goes in a link: spaces and commas in folder names encoded."""
    from urllib.parse import quote, unquote
    return quote(unquote(rel), safe="/-_.~")

def find_doc(rel):
    return newest_path(rel)

def newest_only(files):
    best = {}
    for f in files:
        b = (doc_key(f.stem)[0], f.suffix.lower())
        if b not in best or doc_key(f.stem)[1] > doc_key(best[b].stem)[1]:
            best[b] = f
    return list(best.values())

def newest_links(html):
    from urllib.parse import unquote
    def sub(m):
        return f'"{m.group(1)}{public_url(unquote(m.group(2)))}{m.group(3) or ""}"'
    # href and src attributes, and the absolute URLs in JSON-LD
    return re.sub(r'"((?:' + re.escape(SITE_URL) + r')?)(assets/(?:docs|ies)/[^"#?]+)(#[^"]*)?"', sub, html)

def write_doc_map():
    """assets/js/docmap.js: the permanent address of each document named in lbi.js, for links built in the browser."""
    m = {}
    # the document names written into lbi.js, wherever the files now sit and whatever their newest version
    names = set(re.findall(r'"([^"]+\.pdf)"', (ROOT / "assets" / "js" / "lbi.js").read_text()))
    for rel in sorted(names):
        if newest_path(f"assets/docs/{rel}"):
            m[rel] = public_url(f"assets/docs/{rel}")
    (ROOT / "assets" / "js" / "docmap.js").write_text("window.DOC_MAP=" + json.dumps(m, separators=(",", ":")) + ";\n")

def make_test_copy():
    """The public test copy on GitHub Pages: no indexing, and link previews pointing at github.io (TEST_COPY marks it).
    Canonicals and JSON-LD keep the future domain."""
    for p in ROOT.glob("*.html"):
        s = p.read_text()
        if 'name="robots"' not in s:
            s = s.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex, nofollow">', 1)
        s = s.replace('content="https://www.led-llc.com/', 'content="https://dgershaw.github.io/LED-LLC/')
        p.write_text(s)
    (ROOT / "robots.txt").write_text("User-agent: *\nDisallow: /\n")
    (ROOT / ".nojekyll").touch()

def load_categories():
    cats = []
    for slug in ORDER:
        f = DATA / f"{slug}.json"
        if not f.exists():
            continue
        d = json.load(open(f))
        apply_page_file(slug, d)
        d["slug"] = slug
        d["brand_key"] = BRAND_OF.get(d["brand"], d["brand"])
        d["brand"] = BRANDS[d["brand_key"]]
        d["href"] = f"{slug}.html"
        d["nav_title"] = NAV_TITLES.get(slug, d["title"])
        sub = (d.get("subtitle") or "").strip()
        if sub and sub.lower() in d["title"].lower():
            d["subtitle"] = ""      # the catalog subtitle repeats the end of the title ("... / Internal Driver IP65 (LBI65)")
        d["h1_html"] = cattitle(d["title"], sub if sub and d["title"].endswith(sub) else "")
        d["pdf_href"] = f"{CATALOG_PDF}#page={d['pdfPages'][0]}" if d.get("pdfPages") else CATALOG_PDF
        pages = d.get("catalogPages") or []
        d["pages_label"] = ("Catalog p. " + (f"{pages[0]}–{pages[-1]}" if len(pages) > 1 else str(pages[0]))) if pages else ""
        d["rowcount"] = sum(1 for t in d.get("tables", []) for r in t["rows"] if r and is_pn(r[0]))
        d["headline"] = clean_headline(d.get("headline"))
        d["intro"] = re.sub(r"\s+", " ", strip_bold(d.get("intro") or "")).strip()
        # extras first: an extra may own an image (a remote, a partner logo) that should not also appear as a cutout
        extras, extra_imgs = [], {}
        for e in d.get("extras", []):
            title = (e.get("title") or "").strip()
            text = scrub(e.get("text"))
            if title.lower() in DROP_EXTRA_TITLES or is_editorial(title) or (not text and e.get("text") and not e.get("columns") and not e.get("items")):
                continue
            m = re.match(r"^Page \d+ lead-in\s*\((.+)\)\s*$", title)
            e["title"] = EXTRA_TITLES.get(title) or (m.group(1) if m else title)
            e["text"] = text
            e["bullets"] = [x for x in (scrub(b) for b in e["items"]) if x] if isinstance(e.get("items"), list) else None  # "items" would shadow dict.items in Jinja
            if e.get("columns"):
                table_prep(e)
            if e.get("image"):
                extra_imgs[e["image"]] = e
            extras.append(e)
        d["extras"] = extras
        # images: hero, gallery, cutouts; drop crops the extractor marked as superseded by a cleaner one
        hero, gallery, cutouts = None, [], []
        for im in d.get("images", []):
            use = (im.get("use") or "").lower()
            kind = im.get("kind")
            if re.search(r"supersed|prefer|^none|^split|^hero-alt", use) or kind == "callout" or re.search(r"split into custom crops|use custom/\S+ instead", im.get("shows") or "", re.I):
                continue
            if im["file"] in extra_imgs:
                web = place_image(im["file"], slug, max_w=600)
                if web and kind != "callout":
                    extra_imgs[im["file"]]["thumb"] = web
                continue
            if kind == "logo":
                continue
            im["caption"] = short_caption(im)
            web = place_image(im["file"], slug)
            if not web:
                continue
            im["web"] = web
            size = img_size(web) or (4, 3)
            im["ar"] = size[0] / max(1, size[1])
            if use.startswith("hero") and hero is None and kind in ("hero", "application"):
                hero = im
            elif kind == "product" or use.startswith("cutout"):
                if size[0] < 300:
                    continue
                im["cls"] = "cut long" if im["ar"] > 2.6 else "cut"
                cutouts.append(im)
            elif kind in ("application", "diagram", "hero") and not use.startswith("callout"):
                im["cls"] = ("diagram tall" if im["ar"] < 0.9 else "diagram") if kind == "diagram" else "strip" if im["ar"] > 3.2 else "wide" if im["ar"] > 1.9 else ""
                gallery.append(im)
        if hero is None and gallery:
            hero = gallery.pop(0)
        fit = "contain"
        if hero is None and cutouts:
            hero = cutouts[0]
        if slug in HERO_OVERRIDE:
            web, shows, fit0 = HERO_OVERRIDE[slug]
            if hero and hero.get("web") != web and hero.get("kind") in ("application", "hero"):
                if hero.get("cls") is None:
                    r = hero.get("ar") or 1.6
                    hero["cls"] = "strip" if r > 3.2 else "wide" if r > 1.9 else ""
                gallery.insert(0, hero)
            size = img_size(web) or (16, 10)
            hero = dict(web=web, shows=shows, caption=shows, kind="application", ar=size[0] / max(1, size[1]), override=fit0 or "plain")
        if hero is None and slug in HERO_FALLBACK:
            hero = dict(web=HERO_FALLBACK[slug][0], shows=HERO_FALLBACK[slug][1], caption=HERO_FALLBACK[slug][1], kind="application", ar=16 / 10)
        if hero:
            gallery = [g for g in gallery if g["web"] != hero["web"]]
            ar = hero.get("ar") or 1.6
            fit = hero.get("override") or ("cover" if hero.get("kind") == "application" and 1.25 <= ar <= 1.95 else "" if hero.get("kind") in ("hero", "application") else "contain")
            fit = "" if fit == "plain" else fit
        d["hero_fit"] = fit
        # Portrait and 4:3 heroes get a 4:3 tile so the whole product shows at a useful size.
        d["hero_tall"] = bool(hero) and (hero.get("ar") or 1.6) < 1.45
        d["hero_contain"] = fit == "contain"
        gallery.sort(key=lambda g: (g["cls"].startswith("diagram"), g["cls"] == "diagram tall", g["cls"] not in ("wide", "strip")))
        for g in gallery:   # slideshow: room photos fill the frame, composites and odd shapes are shown whole
            g["contain"] = g.get("kind") == "hero" or not (1.4 <= (g.get("ar") or 1.6) <= 1.95)
        plain = [g for g in gallery if not g["cls"].startswith("diagram") and g["cls"] != "strip"]
        # slideshow stage takes the typical shape of its photos (between 4:3 and 2.1:1), so wide shots are not
        # letterboxed in a tall frame; a photo far from that shape is shown whole instead of cropped
        ars = sorted(g.get("ar") or 1.6 for g in plain)
        stage = min(2.1, max(4 / 3, ars[len(ars) // 2])) if ars else 1.6
        d["ss_ar"] = round(stage, 3)
        for g in plain:
            g["contain"] = g.get("kind") == "hero" or abs(math.log((g.get("ar") or 1.6) / stage)) > 0.22
        if len(plain) == 1 and plain[0]["cls"] == "" and plain[0].get("kind") == "hero":
            plain[0]["cls"] = "solo"  # a lone product composite is shown whole; a lone application photo still crops to a banner
        units = sum(2 if g["cls"] == "wide" else 1 for g in plain)
        per, i = spans(units, 12, 4), 0
        for g in plain:
            k = 2 if g["cls"] == "wide" else 1
            g["span"] = sum(per[i:i + k])
            i += k
        for g in gallery:
            if g["cls"] in ("diagram", "strip"):
                g["span"] = 12
        tall = [g for g in gallery if g["cls"] == "diagram tall"]
        for g, sp in zip(tall, spans(len(tall), 12, 4) if len(tall) > 1 else [12]):
            g["span"] = sp
        for im in cutouts:
            prods = im.get("products") or []
            im["label"] = ", ".join(prods) if prods and len(prods) <= 2 and len(", ".join(prods)) <= 40 else (im["caption"] or ", ".join(prods))
        d["cutouts_spans"] = bool(cutouts) and all(im["cls"] == "cut long" for im in cutouts)
        if d["cutouts_spans"]:
            for im, sp in zip(cutouts, spans(len(cutouts), 12, 4)):
                im["span"] = sp
        d["hero"], d["gallery"], d["cutouts"] = hero, gallery, cutouts
        # tables: part-number column, wrapping and numeric columns, cleaned notes
        for t in d.get("tables", []):
            table_prep(t)
        d["has_bold"] = any(t["has_bold"] for t in d.get("tables", []))
        d["footnotes"] = dedupe([x for x in (scrub(f) for f in d.get("footnotes", []) or []) if x])
        # a note already printed under its table is not repeated in the page's footnotes
        norm = lambda x: re.sub(r"[^a-z0-9]+", " ", x.lower()).strip()
        shown = {norm(n) for t in d.get("tables", []) for n in t["notes"]} - {""}
        d["footnotes"] = [f for f in d["footnotes"] if not any(norm(f).startswith(s) for s in shown)]
        # callouts: the catalog's big statements, minus duplicates of the headline, laid on 12 tracks so every row is full
        heads = {re.sub(r"\W+", " ", d["headline"].lower()).strip()}
        callouts = []
        for c in d.get("callouts", []):
            c = clean_headline(c)
            if c and not is_editorial(c) and re.sub(r"\W+", " ", c.lower()).strip() not in heads:
                callouts.append(c)
        callouts = dedupe(callouts)
        d["callouts"] = list(zip(callouts, spans(len(callouts), 12, 4 if len(callouts) != 3 else 3)))
        feats = []
        for f in d.get("features", []):
            f["label"] = pageref(re.sub(r"\s*\|\s*", " / ", strip_bold(f.get("label") or "")).strip())
            f["note"] = scrub(strip_bold(f.get("note") or ""))
            if f["label"]:
                feats.append(f)
        d["features"] = feats
        d["feature_cols"] = feature_cols(len(feats))
        # search-engine text: title under ~60 characters, description of 120-160 composed from the page's own prose
        d["seo_title"] = f"{SEO_TITLES.get(slug, d['nav_title'])} | {d['brand']['name']}"
        tails = ["Part numbers and specifications from the 2026 catalog." if d["rowcount"] else "Specifications from the 2026 catalog.",
                 f"From {SITE_NAME}, Cary, Illinois."]
        d["seo_description"] = compose_description([SEO_LEADS.get(slug), d.get("headline"), d.get("intro"), *[c for c, _ in d["callouts"]],
                                                    GROUP_BLURBS.get(d["group"]), *tails])
        cats.append(d)
    return cats

def also_groups(c):
    """Extra groups a category is listed under besides its own (see ALSO_IN)."""
    extra = list(ALSO_IN.get(c["slug"], []))
    title = c.get("title") or ""
    if c["group"] == "Retrofit Kits" and re.search(r"\bfixtures?\b", title, re.I):
        extra.append("Fixtures")
    if c["group"] == "Fixtures" and re.search(r"\bkits?\b", title, re.I):
        extra.append("Retrofit Kits")
    return [g for g in dict.fromkeys(extra) if g != c["group"]]

def load_media(cats):
    """Attach videos, installation photos, case studies and Eddy cameos from content/media.json to each category.
    Case studies go on the pages they name and on every page that lists one of their part numbers.
    Returns the resolved case studies and a flat list of videos for the resources page."""
    m = json.loads(MEDIA_FILE.read_text()) if MEDIA_FILE.is_file() else {}
    norm = lambda x: re.sub(r"[^A-Z0-9]", "", str(x).upper())
    pns = {}
    for c in cats:
        found = set()
        for t in c.get("tables", []):
            if t["pn_col"] is None:
                continue
            for r in t["rows"]:
                if len(r) > t["pn_col"]:
                    found.add(norm(strip_bold(r[t["pn_col"]])))
        pns[c["slug"]] = found
    by_slug = {c["slug"]: c for c in cats}
    videos = []
    for c in cats:
        c["videos"] = []
        for v in (m.get("videos") or {}).get(c["slug"], []):
            v = dict(v, page=c["href"], page_title=c["nav_title"], poster=c["hero"]["web"] if c["hero"] else HOME_IMAGE[0],
                     thumb=f"https://i.ytimg.com/vi/{v['youtube']}/hqdefault.jpg", watch=f"https://www.youtube.com/watch?v={v['youtube']}")
            c["videos"].append(v)
            videos.append(v)
        c["install"] = [dict(p) for p in (m.get("install_photos") or {}).get(c["slug"], []) if (ROOT / p["src"]).is_file()]
        spot = (m.get("eddy_spots") or {}).get(c["slug"])
        c["eddy"] = dict(spot, img=f"assets/img/eddy/{spot['img']}") if spot and (EDDY_DIR / spot["img"]).is_file() else None
        c["case_studies"] = []
    studies = []
    for cs in m.get("case_studies") or []:
        cs = dict(cs)
        products, pages = [], list(cs.get("pages") or [])
        for pn, label in cs.get("products") or []:
            if pn.upper() == "LBI":
                products.append(dict(pn=pn, label=label, href="lbi.html"))
                continue
            hit = next((c for c in cats if any(x.startswith(norm(pn)) for x in pns[c["slug"]])), None)
            products.append(dict(pn=pn, label=label, href=f"{hit['href']}#pn={pn}" if hit else None))
            for c in cats:
                if any(x.startswith(norm(pn)) for x in pns[c["slug"]]) and c["slug"] not in pages:
                    pages.append(c["slug"])
        cs["products"], cs["page_slugs"] = products, [s for s in pages if s in by_slug]
        cs["home_page"] = by_slug[cs["page_slugs"][0]] if cs["page_slugs"] else None
        for slug in cs["page_slugs"]:
            by_slug[slug]["case_studies"].append(cs)
        studies.append(cs)
    return studies, videos

def load_cutsheets(cats):
    """Attach the spec-sheet layout from content/cutsheets.json to each page that has one (c["cs"], else None)."""
    m = json.loads(CUTSHEET_FILE.read_text()) if CUTSHEET_FILE.is_file() else {}
    for c in cats:
        cs = m.get(c["slug"])
        if not isinstance(cs, dict):
            c["cs"] = None
            continue
        cs = dict(cs)
        for k in ("marks", "icons"):
            cs[k] = [dict(x, src=f"assets/img/icons/{x['img']}") for x in cs.get(k) or [] if (ROOT / "assets" / "img" / "icons" / x["img"]).is_file()]
        cs["slides"] = [dict(web=x["src"], shows=x.get("alt") or x.get("caption") or "", caption=x.get("caption"), contain=x.get("fit") == "contain", focus=x.get("focus"))
                        for x in cs.get("slides") or [] if (ROOT / x["src"]).is_file()]
        cs["docs"] = [d for d in cs.get("docs") or [] if find_doc(d["pdf"])]
        for d in cs["docs"]:
            d["size"] = f"{(ROOT / find_doc(d['pdf'])).stat().st_size / 1e6:.1f} MB"
        cs["more"] = [table_prep(dict(t, notes=[t["note"]] if t.get("note") else [])) for t in (cs.get("options"), cs.get("accessories")) if t]
        # the spec sheet sets "Simple" and "Network Lighting Controls" in the two control blues; both open the controls page
        cs["points"] = [Markup(str(escape(b)).replace("Simple &amp; Network Lighting Controls",
                        '<a class="ctl-s" href="lighting-controls.html">Simple</a> &amp; <a class="ctl-n" href="lighting-controls.html">Network Lighting Controls</a>'))
                        for b in cs.get("bullets") or []]
        # Pages with several spec sheets (one per model group) carry a model table: each group of rows shares its spec
        # sheet (one merged cell), each model has its own installation instructions and IES files (David, 2026-10-08).
        sheet = next((d for d in cs["docs"] if d["kind"] == "Spec sheet"), None)
        if cs.get("models"):
            mt = cs["models"]
            rows, row_docs = [], []
            for g in mt["groups"]:
                for i, r in enumerate(g["rows"]):
                    inst = find_doc(f"assets/docs/instructions/{r[0]}_Instructions.pdf")
                    row_docs.append(dict(spec=dict(href=g["sheet"], text="Spec sheet", sub=g["label"], span=len(g["rows"]) if i == 0 else 0),
                                         inst=dict(href=inst, text="Instructions") if inst else None))
                    rows.append(r)
            models = table_prep(dict(title=mt["title"], columns=mt["columns"], rows=rows, notes=mt.get("notes") or []))
            models.update(doc_cols=[dict(key="spec", label="Spec sheet", merge=True), dict(key="inst", label="Instructions")], row_docs=row_docs, phone_compact=True)
            parts = [table_prep(dict(t)) for t in cs.get("part_tables") or []]
            for t in parts:
                t.update(fold=True, no_ies=True)
            c["tables"] = [models] + parts
            c["rowcount"] = sum(1 for t in c["tables"] for r in t["rows"] if r and is_pn(r[0]))
        elif sheet:  # one spec sheet: show it in each table it covers too ("spec_in_tables"), as one merged cell
            for t in [t for t in c.get("tables", []) if t["title_parts"][0] in (cs.get("spec_in_tables") or [])]:
                n = len(t["rows"])
                t.update(doc_cols=[dict(key="spec", label="Spec sheet", merge=True)],
                         row_docs=[dict(spec=dict(href=sheet["pdf"], text="Spec sheet", sub=None, span=n if i == 0 else 0)) for i in range(n)])
        c["cs"] = cs

def natural(t):
    return [int(x) if x.isdigit() else x.lower() for x in re.split(r"(\d+)", t)]

def ies_label(stem):
    """A readable name for a factory IES file: LED-8090M345D-G4_3000K_-277V_IESNA2002 -> LED-8090M345D-G4 3000K 277V."""
    t = re.sub(r"_(?:IESNA2002|IES)$", "", stem)
    t = re.sub(r"_LM79-report$", "", t)
    t = re.sub(r"_(?:0_)?(\d{4}K)_?-?", r" \1 ", t)
    t = re.sub(r"[-_ ]?(\d{3})[vV]$", r" \1V", t)
    return re.sub(r"\s+", " ", t).strip()

def load_ies(cats):
    """IES files per part number (see IES_DIR). Marks each page whose tables list a part number that has files."""
    ies = {}
    site = lambda f: url_path(public_path(f.relative_to(ROOT).as_posix()))
    # every folder holding IES files is named after its part number, at any depth (category/product/part number)
    for d in sorted({f.parent for f in _all_files("ies")}, key=lambda d: d.name):
        files = []
        for f in d.glob("*.ies"):
            m = re.match(r"^(.+)_(\d+W)_(\d+K)$", f.stem)
            if m and m.group(1) == d.name:
                files.append([m.group(2), m.group(3), site(f), f"{d.name} {m.group(2)} {m.group(3)}.IES"])
        files.sort(key=lambda x: (int(x[0][:-1]), int(x[1][:-1])))
        mode = "grid"
        if not files:  # files named the factory's own way (and LM-79 reports): a plain list
            mode = "list"
            for f in sorted(newest_only(list(d.glob("*.ies")) + list(d.glob("*.pdf"))), key=lambda f: (f.suffix.lower() == ".pdf", natural(f.stem))):
                files.append([ies_label(f.stem), "LM-79 report (PDF)" if f.suffix.lower() == ".pdf" else "IES", site(f), f.name])
        z = d / f"{d.name}_IES.zip"
        if files:
            ies[d.name.upper()] = dict(pn=d.name, files=files, n=len(files), mode=mode, zip=site(z) if z.is_file() else None)
    for c in cats:
        pns = {strip_bold(r[t["pn_col"]]).strip().upper() for t in c.get("tables", []) if t["pn_col"] is not None for r in t["rows"] if len(r) > t["pn_col"]}
        c["has_ies"] = bool(pns & set(ies))
    return ies

def ld_media(c):
    """VideoObject and case-study DigitalDocument entities for a category page's WebPage.hasPart."""
    parts = []
    for v in c.get("videos") or []:
        parts.append({"@type": "VideoObject", "name": v["title"], "description": v.get("summary") or v["title"], "thumbnailUrl": [v["thumb"]],
                      "embedUrl": f"https://www.youtube.com/embed/{v['youtube']}", "url": v["watch"], "publisher": {"@id": SITE_URL + "#organization"}})
    for cs in c.get("case_studies") or []:
        parts.append({"@type": "DigitalDocument", "name": f"{cs['client']} case study: {cs['title']}", "url": abs_url(cs["pdf"]), "encodingFormat": "application/pdf",
                      "description": clean_text(f"{cs['segment']} in {cs['location']}. {cs['situation']} {cs['solution']} {cs['result']}"), "image": abs_url(cs["image"])})
    return parts

def build_nav(cats):
    nav = []
    for key in BRAND_ORDER:
        b = BRANDS[key]
        groups = []
        for g in b["groups"]:
            items = [c for c in cats if c["brand_key"] == key and (c["group"] == g or g in also_groups(c))]
            if g == "Linkable Light Bars":
                items = [dict(href="lbi.html", nav_title="LBI Family Overview", headline="All eight bars in one place: compare them, set them up and see them lit", featured=True)] + items
            if g == "LBI Color Palette" and items:
                items = items + [dict(href="lbi.html#palette", nav_title="LBI Color Palette in the LBI Family Overview", headline="Precision color and full RGBWW, live")]
            if items:
                groups.append(dict(name=g, blurb=GROUP_BLURBS.get(g, ""), entries=items))
        nav.append(dict(brand=b, groups=groups))
    return nav

def build_product_menu(cats):
    by_slug = {c["slug"]: c for c in cats}
    menu = []
    for col in PRODUCT_MENU:
        groups = []
        for gname, slugs in col["groups"]:
            entries = []
            for sl in slugs:
                if sl == "lbi.html":
                    entries.append(dict(href="lbi.html", nav_title="LBI Family Overview", featured=True, brand=BRANDS["remphos"], hero=None, headline="Compare and set up all eight bars"))
                elif sl == "i-series":
                    entries.append(dict(by_slug[sl], featured=True))
                elif sl in by_slug:
                    entries.append(by_slug[sl])
            if entries:
                groups.append(dict(name=gname, entries=entries))
        keys = [e["brand"]["key"] for g in groups for e in g["entries"]]
        main = max(dict.fromkeys(keys), key=keys.count) if keys else ""
        mixed = len(set(keys)) > 1
        menu.append(dict(col, groups=groups, main=main, main_name=BRANDS[main]["name"] if main in BRANDS else "", mixed=mixed,
                         count=sum(1 for g in groups for e in g["entries"] if e.get("slug"))))
    listed = {e["slug"] for col in menu for g in col["groups"] for e in g["entries"] if e.get("slug")}
    missing = sorted(set(by_slug) - listed)
    if missing:
        print("note: not in the Products menu:", ", ".join(missing))
    return menu

def search_index(cats):
    items, seen = [], set()
    for c in cats:
        for t in c.get("tables", []):
            if t["pn_col"] is None:
                continue
            for r in t["rows"]:
                if len(r) <= t["pn_col"]:
                    continue
                pn = strip_bold(r[t["pn_col"]]).strip()
                if not is_pn(pn) or (pn, c["slug"]) in seen:
                    continue
                seen.add((pn, c["slug"]))
                items.append(dict(pn=pn, name=c["nav_title"], brand=c["brand"]["name"], href=f"{c['href']}#pn={pn}", table=t["title_parts"][0]))
    # LBI configurator part numbers live in the script; map each to its variant anchor (the ids lbi.js routes on)
    lbi_js = (ROOT / "assets" / "js" / "lbi.js").read_text()
    for pn in sorted(set(re.findall(r"RP-[A-Z0-9][A-Z0-9-]{4,}", lbi_js))):
        if "${" in pn or pn.endswith("-"):
            continue
        anchor = "#plus" if "RGBWW" in pn else "#palette" if "-RGB" in pn or "PALETTE" in pn else "#lbi65" if "LBI65" in pn or "LBI-65" in pn else "#max" if "MAX" in pn else "#g2" if "G2" in pn else ""
        items.append(dict(pn=pn, name="LBI Family Overview", brand="RemPhos", href=f"lbi.html{anchor}", table="Interactive"))
    for head, power, lm, bat, anchor in (("A1", "OG", "100", "06", "a1"), ("A1", "HYB", "100", "06", "a1"), ("A1", "OG", "100", "12", "a1"),
                                        ("A2", "OG", "150", "12", "a2"), ("A2", "HYB", "150", "12", "a2"), ("D1", "OG", "030", "06", "d1")):
        for optic in "2345":
            items.append(dict(pn=f"SL-M{head}-{power}-{lm}{bat}{optic}4DB1", name="Solera i-Series Overview", brand="Solera", href=f"i-series.html#{anchor}", table="Configurator"))
    items.sort(key=lambda i: i["pn"])
    (ROOT / "assets" / "js" / "search-index.json").write_text(json.dumps(items, separators=(",", ":")))
    return len(items)


# ---------- Solera i-Series family page (configurator) ----------
ISERIES_ASSETS = "https://assets.led-llc.com/Solera-Website-Files/"
ISERIES_DOCS = [
    dict(group="spec", href=ISERIES_ASSETS + "Spec-Sheets/I-Series-Area-Light-Spec-Sheet.pdf", text="i-Series Area Light spec sheet", sub="SL-MA1 and SL-MA2"),
    dict(group="spec", href=ISERIES_ASSETS + "Spec-Sheets/I-Series-Decorative-Light-Spec-Sheet.pdf", text="i-Series Decorative Light spec sheet", sub="SL-MD1"),
    dict(group="install", href=ISERIES_ASSETS + "Instructions/SL-MA1-OG%20-%20%20I-Series%20Instructions%20V1.pdf", text="SL-MA1 off-grid installation"),
    dict(group="install", href=ISERIES_ASSETS + "Instructions/SL-MA1-HYB%20-%20%20I-Series%20Instructions%20V1.pdf", text="SL-MA1 hybrid installation"),
    dict(group="install", href=ISERIES_ASSETS + "Instructions/SL-MA2-Installation.pdf", text="SL-MA2 installation"),
    dict(group="install", href=ISERIES_ASSETS + "Instructions/SL-MD1-Installation.pdf", text="SL-MD1 installation"),
    dict(group="photo", href=ISERIES_ASSETS + "IES-files/SAL-MA1-100L-ies.zip", text="IES files: SL-MA1", sub="ZIP"),
    dict(group="photo", href=ISERIES_ASSETS + "IES-files/SL-MA2-IES.zip", text="IES files: SL-MA2", sub="ZIP"),
    dict(group="photo", href=ISERIES_ASSETS + "Additional-Documents/Pole-Offering.pdf", text="Pole Offering", sub="EPA ratings, tenons and finishes"),
    dict(group="connect", href=ISERIES_ASSETS + "i-Series/Solera-Connect-Introduction.pdf", text="Introduction"),
    dict(group="connect", href=ISERIES_ASSETS + "i-Series/Solera-Connect-Quick-Start-Guide.pdf", text="Quick start"),
    dict(group="connect", href=ISERIES_ASSETS + "i-Series/Solera-Connect-Users-Guide.pdf", text="User's guide"),
]
_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true">%s</svg>'
ISERIES_ICONS = {   # the three Solera Connect points under the hero
    "commission": _SVG % '<path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/><path d="M8.6 12.2l2.3 2.3 4.5-4.8"/>',
    "health": _SVG % '<path d="M3 12h4l2.2-5 4 10 2.2-5H21"/>',
    "adjust": _SVG % '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
}

def render_iseries(c, related, render):
    """The i-Series family page: a configurator (assets/js/iseries.js) with the catalog tables folded below it."""
    desc = compose_description(["Solera i-Series: a modular solar lighting platform. Configure the light head (A1, A2 or the D1 decorative), off-grid or hybrid power, a 600 or 1,200 Wh solar-and-battery pack, Type 2 to 5 optics and a 20 to 30 ft pole, with 4G Solera Connect in every fixture.",
                                "Get a recommendation from your project details and a free lighting layout."])
    og_img, og_alt = ("assets/img/iseries/hero-a1.jpg", "Solera i-Series modular solar area light with two solar panels, battery box and area light head over a parking lot at night")
    icons = {k: Markup(v) for k, v in ISERIES_ICONS.items()}
    render("iseries.html", c["href"], 0.9, page=c["slug"], c=c, related=related, docs=ISERIES_DOCS, ICONS=icons,
           seo=seo_for(c["href"], "Solera i-Series Overview: Modular Solar Lighting | Solera", desc, brand_key="solera", og_type="product.group",
                       image=og_img, image_alt=og_alt, jsonld=[
                           ld_webpage(c["href"], "Solera i-Series Overview", desc, kind="CollectionPage", image=og_img, breadcrumb=True,
                                      **({"mainEntity": {"@id": page_url(c["href"]) + "#parts"}} if c.get("tables") else {})),
                           ld_breadcrumbs(c["href"], [("Home", "index.html"), ("Solera", "solera.html"), ("i-Series", c["href"])]),
                           ld_products(c)]))

def lbi_body():
    """The interactive LBI page, with its own header and footer removed so the shared ones wrap it.
    Returns (body up to the closing call-to-action band, that band and the rest, fine print) so the template can
    slot a server-rendered summary between the configurator sections and the final call to action."""
    if LBI_SITE.is_file():
        s = LBI_SITE.read_text()
        if not LBI_COPY.is_file() or LBI_COPY.read_text() != s:
            LBI_COPY.write_text(s)
    else:
        s = LBI_COPY.read_text()
    body = s.split("<!--PAGE-START-->")[1].split("<!--PAGE-END-->")[0]
    body = re.sub(r"<header class=\"site-header\">.*?</header>\s*", "", body, flags=re.S)
    fine = re.search(r"<p class=\"fine\">(.*?)</p>", body, flags=re.S)
    body = re.sub(r"<footer id=\"contact\">.*?</footer>\s*", "", body, flags=re.S)
    body = re.sub(r"<script src=\"(app|rain|motion).js\"></script>\s*", "", body)   # base.html loads rain.js and motion.js; lbi.html loads lbi.js
    body = body.replace('href="#contact"', 'href="contact.html"')
    # base.html already provides the page's single <main>; the stand-alone page's own becomes a plain wrapper (no CSS targets it)
    body = body.replace('<main id="top">', '<div class="lbi-page">', 1).replace("</main>", "</div>", 1)
    cut = body.rfind('<section class="band alt" aria-labelledby="next-h">')
    head, tail = (body[:cut], body[cut:]) if cut > 0 else (body, "")
    # the stand-alone page's own closing band is replaced by the shared Eddy trio in templates/lbi.html
    tail = re.sub(r'<section class="band alt" aria-labelledby="next-h">.*?</section>\s*', "", tail, count=1, flags=re.S)
    return Markup(head), Markup(tail), Markup(fine.group(1) if fine else "")

def lbi_variants():
    """The LBI variants, read from the `V` array in assets/js/lbi.js with Node, so lbi.html can carry a
    server-rendered summary and Product data for crawlers that do not run JavaScript. lbi.js is not modified."""
    js = (ROOT / "assets" / "js" / "lbi.js").read_text()
    try:
        start = js.index("const V = [")
        end = js.index("\n  ];\n", start) + len("\n  ];")
        prefix = js[js.index('"use strict";') + len('"use strict";'):end]  # constants the array refers to, then the array itself
        script = "const src = require('fs').readFileSync(0, 'utf8'); process.stdout.write(JSON.stringify(new Function(src + '\\nreturn V;')()));"
        out = subprocess.run(["node", "-e", script], input=prefix, capture_output=True, text=True, check=True, timeout=30).stdout
        return json.loads(out)
    except Exception as e:  # the page still builds, only without the summary section
        print("warning: could not read the LBI variants from lbi.js:", e)
        return []

def lbi_lengths(v):
    sizes = v.get("sizes") or {}
    return " / ".join(f"{s} ft ({sizes[s]['len']} in)" if sizes[s].get("len") else f"{s} ft" for s in sorted(sizes, key=int))

def lbi_glance(variants):
    """A parts-style table (one row per variant) plus a short note per variant for the no-JavaScript summary."""
    rows, notes = [], []
    for v in variants:
        cmp = v.get("cmp") or {}
        pns = [p[0] for p in v.get("parts") or []][:3]
        rows.append([v["name"], lbi_lengths(v), cmp.get("watts", ""), cmp.get("lm", ""), cmp.get("light", ""), cmp.get("control", ""),
                     cmp.get("rating", ""), Markup(", ".join(f'<span class="mono nw">{escape(p)}</span>' for p in pns)) if pns else "Spec sheet pending"])
        notes.append(dict(id=v["id"], name=v["name"], kind=v.get("kind", ""), text=clean_text(f"{v.get('tagline', '')} {v.get('lead', '')}"),
                          apps=v.get("apps") or [], docs=[d[1] for d in v.get("docs") or []]))
    table = table_prep(dict(title="LBI family at a glance", columns=["Variant", "Lengths", "Wattage (FlexWatt)", "Lumens", "Light", "Control", "Locations", "Example part numbers"], rows=rows))
    table["pn_col"] = None
    table["wide"] = [False, True, True, True, True, True, True, True]
    table["rowhead"] = True
    return table, notes

# ---------------------------------------------------------------- crawler files
def write_robots():
    lines = ["# robots.txt for Light Efficient Design, generated by tools/build.py", "", "User-agent: *", "Allow: /", "",
             "# AI and answer-engine crawlers are welcome to read the catalog"]
    for ua in AI_CRAWLERS:
        lines += [f"User-agent: {ua}", "Allow: /", ""]
    lines += [f"Sitemap: {abs_url('sitemap.xml')}", ""]
    (ROOT / "robots.txt").write_text("\n".join(lines))

def write_sitemap(pages):
    """pages: [(out, priority)] in build order."""
    rows = []
    for out, prio in pages:
        rows.append(f"  <url><loc>{escape(page_url(out))}</loc><lastmod>{LASTMOD}</lastmod><changefreq>monthly</changefreq><priority>{prio:.1f}</priority></url>")
    (ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(rows) + "\n</urlset>\n")

def write_llms(cats, variants, total_pn, studies=()):
    by_brand = {k: [c for c in cats if c["brand_key"] == k] for k in BRAND_ORDER}
    L = [f"# {SITE_NAME}", "",
         f"> {SITE_NAME} (led-llc.com) designs and sells commercial LED lighting under three brands: Light Efficient Design LED retrofit lamps for HID and fluorescent fixtures, RemPhos linkable light bars, fixtures, retrofit kits and lighting controls, and Solera solar lighting and poles. This site is the web edition of the 2026 Full Product Catalog: part numbers with specifications, one page per product category.",
         "",
         "Key facts:", "",
         f"- Brands: Light Efficient Design (screw-in and pin-base LED retrofit lamps, work lights, merchandising displays), RemPhos (LBI linkable light bars with internal drivers, LBI Color Palette color bars, lighting controls, fixtures, retrofit kits), Solera (solar area, bollard, flood, display and wall-pack lights, poles).",
         "- Part numbers: every category page lists its part numbers in tables with wattage, lumens, CCT, base, voltage and dimensions as printed in the catalog; factory defaults for selectable (FlexWatt / FlexColor) lamps are shown in bold. The full digest is in llms-full.txt.",
         f"- Corporate HQ & Training Center: {HQ['street']}, {HQ['city']}, {HQ['region']} {HQ['zip']}. Innovation & Manufacturing Center: {MFG['street']}, {MFG['city']}, {MFG['region']} {MFG['zip']}.",
         f"- Sales: {PHONE}, {EMAIL}. Samples, utility rebate help and local representatives for all three brands.",
         "- Information is subject to change without notice; the spec sheet is the final reference for any part number.",
         ""]
    for key in BRAND_ORDER:
        b = BRANDS[key]
        L += [f"## {b['name']}", "", f"- [{b['name']} overview]({page_url(b['slug'] + '.html')}): {b['h1']} {b['blurb']}"]
        if key == "remphos":
            L.append(f"- [LBI Family Overview]({page_url('lbi.html')}): The eight LBI linkable light bar variants ({', '.join(v['name'] for v in variants) or 'LBI G1, LBI G2, LBI 65, LBI MAX, LBI Color Palette, LBI Color Palette+, LBI Color PaletteX, LBI 65 Color Palette+'}) with lengths, wattage, lumens, color, controls and example part numbers.")
        for c in by_brand[key]:
            desc = clean_text(c.get("headline") or SEO_LEADS.get(c["slug"]) or GROUP_BLURBS.get(c["group"], ""))
            L.append(f"- [{c['nav_title']}]({page_url(c['href'])}): {c['group']}. {desc}")
        L.append("")
    L += ["## Company", "",
          f"- [Resources]({page_url('resources.html')}): The 2026 Full Product Catalog (PDF) and LBI spec sheets and sell sheets.",
          f"- [Contact]({page_url('contact.html')}): Sales phone and email, both locations, samples, rebates and rep lookup.",
          f"- [Meet Eddy]({page_url('eddy.html')}): Eddy (short for Edison), the company mascot: a 5 mm LED named after Thomas Edison, created by Senior Creative Director Amy George.",
          *[f"- [{cs['client']} case study: {cs['title']} (PDF)]({abs_url(cs['pdf'])}): {cs['segment']}, {cs['location']}. {cs['result']}" for cs in studies],
          f"- [2026 Full Product Catalog (PDF)]({abs_url(CATALOG_PDF)}): Every brand and part number in one PDF.",
          "", "## Optional", "",
          f"- [Full text digest]({abs_url('llms-full.txt')}): Every category's headline, features and every part number with its specifications, in plain text.",
          f"- [Part number search index (JSON)]({abs_url('assets/js/search-index.json')}): Every part number with its page and brand.",
          ""]
    (ROOT / "llms.txt").write_text("\n".join(L))

    F = [f"# {SITE_NAME}: full product digest", "",
         f"> Plain-text edition of led-llc.com, generated from the same catalog data as the site on {LASTMOD}. Values are as printed in the 2026 Full Product Catalog; the spec sheet is the final reference.",
         "", f"Sales: {PHONE}, {EMAIL}. {HQ['name']}: {HQ['street']}, {HQ['city']}, {HQ['region']} {HQ['zip']}. {MFG['name']}: {MFG['street']}, {MFG['city']}, {MFG['region']} {MFG['zip']}.", ""]
    for key in BRAND_ORDER:
        b = BRANDS[key]
        F += [f"# {b['name']}", "", f"{b['h1']} {b['blurb']}", "", f"Page: {page_url(b['slug'] + '.html')}", ""]
        for label, text in b["points"]:
            F.append(f"- {label}: {text}")
        F.append("")
        if key == "remphos" and variants:
            F += ["## LBI Family (linkable light bars with internal drivers)", "", f"Page: {page_url('lbi.html')}", ""]
            for v in variants:
                cmp = v.get("cmp") or {}
                F += [f"### {v['name']}", "", f"{v.get('kind', '')}. {clean_text(v.get('tagline', ''))} {clean_text(v.get('lead', ''))}".strip(), "",
                      f"- Lengths: {lbi_lengths(v)}"]
                for label, k in (("Light", "light"), ("Wattage", "watts"), ("Lumens", "lm"), ("Control", "control"), ("Locations", "rating"), ("Efficacy", "eff"), ("Best for", "best")):
                    if cmp.get(k):
                        F.append(f"- {label}: {cmp[k]}")
                for feat in v.get("features") or []:
                    F.append(f"- {feat}")
                for row in v.get("specs") or []:
                    F.append(f"- {row[0]}: {row[1]}" + (f" ({row[2]})" if len(row) > 2 and row[2] else ""))
                if v.get("apps"):
                    F.append(f"- Applications: {', '.join(v['apps'])}")
                for p in v.get("parts") or []:
                    F.append(f"- {p[0]}: " + "; ".join(x for x in p[1:] if x))
                if v.get("partsNote"):
                    F.append(f"- Note: {v['partsNote']}")
                for d in v.get("docs") or []:
                    F.append(f"- {d[0]}: {abs_url('assets/docs/' + d[1])}" + (f" ({d[2]})" if len(d) > 2 and d[2] else ""))
                F.append("")
        for c in by_brand[key]:
            F += [f"## {c['nav_title']} ({b['name']} › {c['group']})", "", f"Page: {page_url(c['href'])}" + (f" · {c['pages_label']}" if c["pages_label"] else ""), ""]
            full = c["title"] + (f" — {c['subtitle']}" if c.get("subtitle") else "")
            if full != c["nav_title"]:
                F += [f"Catalog title: {full}", ""]
            for k in ("headline", "intro"):
                if c.get(k):
                    F += [clean_text(c[k]), ""]
            if c.get("callouts"):
                F += ["Highlights:"] + [f"- {clean_text(x)}" for x in c["callouts"]] + [""]
            if c.get("features"):
                F += ["Features:"] + [f"- {x.get('label', '')}" + (f" ({x['note']})" if x.get("note") else "") for x in c["features"]] + [""]
            for t in c.get("tables", []):
                F += [f"### {' | '.join(t['title_parts'])}", "", "Columns: " + ", ".join(t["columns"]), ""]
                for r in t["rows"]:
                    cells = [re.sub(r"\s+", " ", strip_bold(x)).strip() for x in r]
                    if not any(cells):
                        continue
                    if t["pn_col"] is not None and len(cells) > t["pn_col"] and cells[t["pn_col"]]:
                        pn = cells[t["pn_col"]]
                        rest = "; ".join(f"{t['columns'][i].strip()}: {v}" for i, v in enumerate(cells) if i != t["pn_col"] and v and i < len(t["columns"]))
                        F.append(f"- {pn}" + (f" — {rest}" if rest else ""))
                    else:
                        F.append("- " + "; ".join(f"{t['columns'][i].strip()}: {v}" for i, v in enumerate(cells) if v and i < len(t["columns"])))
                for n in t.get("notes") or []:
                    F.append(f"- Note: {n}")
                F.append("")
            for e in c.get("extras", []):
                if e.get("title") or e.get("text"):
                    F += [f"### {e.get('title') or 'More from the catalog'}", ""]
                    if e.get("text"):
                        F += [e["text"], ""]
                    for it in e.get("bullets") or []:
                        F.append(f"- {it}")
                    if e.get("bullets"):
                        F.append("")
            if c.get("footnotes"):
                F += ["Footnotes:"] + [f"- {x}" for x in c["footnotes"]] + [""]
            for v in c.get("videos") or []:
                F += [f"Video: {v['title']} ({v['watch']}). {v.get('summary', '')}".strip(), ""]
            for cs in c.get("case_studies") or []:
                F += [f"Case study: {cs['client']}, {cs['location']}: {cs['title']} ({abs_url(cs['pdf'])}). {cs['situation']} {cs['solution']} {cs['result']}", ""]
    (ROOT / "llms-full.txt").write_text("\n".join(F))

# ---------------------------------------------------------------- render
def main():
    if "--sync" in sys.argv:   # only when re-importing catalog transcriptions; day to day content/pages/*.json is the source
        sync_from_scratch()
        cover_images()
    brand_logos()
    publish_downloads()
    write_doc_map()   # before any page links it, so its cache-busting hash is current
    cats = load_categories()
    load_cutsheets(cats)
    nav = build_nav(cats)
    pmenu = build_product_menu(cats)
    by_brand = {k: [c for c in cats if c["brand_key"] == k] for k in BRAND_ORDER}
    n_index = search_index(cats)
    total_pn = sum(c["rowcount"] for c in cats)
    variants = lbi_variants()
    studies, videos = load_media(cats)
    IES = load_ies(cats)

    env = Environment(loader=FileSystemLoader(TPL), autoescape=select_autoescape(["html"]), trim_blocks=True, lstrip_blocks=True)
    env.filters["bold"] = bold
    env.filters["strip_bold"] = strip_bold
    env.filters["refs"] = refs
    env.filters["cellhtml"] = cellhtml
    env.filters["cattitle"] = cattitle
    # compact color chips: "LBI Color Palette bar rendering glowing red" -> "Red"
    env.filters["chip"] = lambda t: (lambda x: x[:1].upper() + x[1:])(re.sub(r"^.*?\bbar rendering (?:glowing |showing the )?", "", str(t)).replace("full RGB spectrum", "LBI Color Palette+ RGBWW"))
    env.globals.update(DOC_TITLES=DOC_TITLES, PAGE_DOCS=PAGE_DOCS, NO_REBATES=NO_REBATES, BRANDS=BRANDS, BRAND_ORDER=BRAND_ORDER, nav=nav, cats=cats, CATALOG_PDF=CATALOG_PDF, SITE_NAME=SITE_NAME,
                       total_pn=total_pn, dims=dims, dims_ratio=dims_ratio, IES=IES, logo_style=logo_style, spans=spans, NEXT_STEPS=NEXT_STEPS, PHONE=PHONE, EMAIL=EMAIL, HQ=HQ, MFG=MFG, SOCIAL=SOCIAL, RAIN=RAIN, natmax=natmax, pmenu=pmenu)

    pages = []  # (out, sitemap priority) in build order

    def render(tpl, out, priority, **ctx):
        html = newest_links(bust_cache(fix_copy(keep_together(env.get_template(tpl).render(**ctx)))))
        (ROOT / out).write_text(html)
        pages.append((out, priority))

    heroes = {c["slug"]: c["hero"]["web"] for c in cats if c["hero"]}
    home_desc = compose_description([
        "Light Efficient Design: LED retrofit lamps for HID and fluorescent fixtures, RemPhos linkable light bars and retrofit kits, and Solera solar lighting.",
        "Leading Thru Innovation."])
    brand_pics = {"led": ("assets/img/cat/bollard-post-top/hero.jpg", "contain"), "remphos": ("assets/img/product/lbi65-hero.jpg", "contain"),
                  "solera": ("assets/img/cover/p01-b1.jpg", "")}
    for k, (web, _) in list(brand_pics.items()):
        if not (ROOT / web).is_file():
            brand_pics[k] = (heroes.get(next((c["slug"] for c in cats if c["brand_key"] == k and c["hero"]), ""), HOME_IMAGE[0]), "contain")
    render("home.html", "index.html", 1.0, page="home", mosaic=[dict(m, lights=mosaic_lights(m["glows"])) for m in MOSAIC], brand_pics=brand_pics, finder=[
        dict(q=q, strong=s, href=(h if h.endswith(".html") or h == "search" else f"{h}.html")) for q, s, h in FINDER if h in ("search",) or h.endswith(".html") or any(c["slug"] == h for c in cats)],
        heroes=heroes, brand_cats=by_brand,
        seo=seo_for("index.html", f"{SITE_NAME} | LED Retrofit Lamps, RemPhos, Solera", home_desc, image=HOME_IMAGE[0], image_alt=HOME_IMAGE[1],
                    jsonld=[ld_organization(), ld_website(), ld_webpage("index.html", SITE_NAME, home_desc, image=HOME_IMAGE[0], about={"@id": SITE_URL + "#organization"})]))
    for key in BRAND_ORDER:
        b = BRANDS[key]
        out = f"{b['slug']}.html"
        groups = next(n for n in nav if n["brand"]["key"] == key)["groups"]
        hero_img = next((c["hero"]["web"] for c in by_brand[key] if c["hero"]), None)
        og_img, og_alt = BRAND_IMAGES.get(key) or (hero_img, f"{b['name']} products")
        desc = compose_description([b["h1"], b["blurb"], GROUP_BLURBS.get(b["groups"][0], "")])
        title = f"{BRAND_TITLES.get(key, b['name'])} | {SITE_NAME}"
        entries = [dict(name=c["nav_title"], url=page_url(c["href"])) for c in by_brand[key]]
        render("brand.html", out, 0.9, page=b["slug"], brand=b, groups=groups, hero_img=hero_img, cover=key,
               seo=seo_for(out, title, desc, brand_key=key, image=og_img, image_alt=og_alt, jsonld=[
                   ld_webpage(out, f"{b['name']} products", desc, kind="CollectionPage", image=og_img, about={"@type": "Brand", "name": b["name"]},
                              mainEntity={"@type": "ItemList", "name": f"{b['name']} product categories", "numberOfItems": len(entries),
                                          "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": e["name"], "url": e["url"]} for i, e in enumerate(entries)]})]))
    prod_desc = compose_description([f"Every Light Efficient Design, RemPhos and Solera product, sorted by type: LED lamps, indoor fixtures, retrofit kits, outdoor and solar, controls and displays.",
                                     "Part numbers and specifications for every category."])
    prod_entries = [dict(name=e["nav_title"], url=page_url(e["href"])) for col in pmenu for g in col["groups"] for e in g["entries"] if e.get("slug")]
    seen_urls = set(); prod_entries = [e for e in prod_entries if not (e["url"] in seen_urls or seen_urls.add(e["url"]))]
    render("products.html", "products.html", 0.9, page="products",
           seo=seo_for("products.html", f"All Products by Type | {SITE_NAME}", prod_desc, jsonld=[
               ld_webpage("products.html", "All products", prod_desc, kind="CollectionPage", breadcrumb=True,
                          mainEntity={"@type": "ItemList", "name": "Product categories", "numberOfItems": len(prod_entries),
                                      "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": e["name"], "url": e["url"]} for i, e in enumerate(prod_entries)]}),
               ld_breadcrumbs("products.html", [("Home", "index.html"), ("Products", "products.html")])]))
    for i, c in enumerate(cats):
        # More from <brand>: every other page of the brand, starting after this one, for the scrolling strip
        same = [x for x in cats if x["brand_key"] == c["brand_key"]]
        k = same.index(c)
        related = same[k + 1:] + same[:k]
        trail = [("Home", "index.html"), (c["brand"]["name"], c["brand"]["slug"] + ".html"),
                 (c["group"], f"{c['brand']['slug']}.html#{group_anchor(c['group'])}"), (c["nav_title"], c["href"])]
        og_img, og_alt = (c["hero"]["web"], c["hero"].get("shows") or c["nav_title"]) if c["hero"] else (BRAND_IMAGES.get(c["brand_key"]) or HOME_IMAGE)
        products = ld_products(c)
        if c["slug"] == "i-series":
            render_iseries(c, related, render)
            continue
        render("category.html", c["href"], 0.8, page=c["slug"], c=c, prev=cats[i - 1] if i else None, nxt=cats[i + 1] if i + 1 < len(cats) else None,
               related=related,
               seo=seo_for(c["href"], c["seo_title"], c["seo_description"], brand_key=c["brand_key"], og_type="product.group" if products else "website",
                           image=og_img, image_alt=og_alt, jsonld=[
                               ld_webpage(c["href"], c["seo_title"].split(" | ")[0], c["seo_description"], kind="CollectionPage", image=og_img, breadcrumb=True,
                                          **({"mainEntity": {"@id": page_url(c["href"]) + "#parts"}} if products else {}),
                                          **({"hasPart": ld_media(c)} if ld_media(c) else {})),
                               ld_breadcrumbs(c["href"], trail), products]))
    body, tail, fine = lbi_body()
    glance, glance_notes = lbi_glance(variants) if variants else (None, [])
    lbi_desc = compose_description(["RemPhos LBI family: linkable LED light bars with the driver inside, in 2, 3 and 4 ft.",
                                    "LBI G1 (economical), LBI G2, LBI 65 (IP65), LBI MAX, LBI Color Palette, LBI Color Palette+, LBI Color PaletteX and LBI 65 Color Palette+.",
                                    "Link up to 40 bars from one power feed, then set wattage and color on site."])
    lbi_img, lbi_alt = BRAND_IMAGES["remphos"]
    render("lbi.html", "lbi.html", 0.9, page="lbi", lbi_body=body, lbi_tail=tail, lbi_fine=fine, glance=glance, glance_notes=glance_notes,
           seo=seo_for("lbi.html", "LBI Family Overview: Linkable LED Light Bars | RemPhos", lbi_desc, og_type="product.group", image=lbi_img, image_alt=lbi_alt, jsonld=[
               ld_webpage("lbi.html", "LBI Family Overview", lbi_desc, kind="CollectionPage", image=lbi_img,
                          **({"mainEntity": {"@id": page_url("lbi.html") + "#variants"}} if variants else {})),
               ld_lbi_products(variants) if variants else None]))
    docs = [d for d in RESOURCE_DOCS if newest_path("assets/docs/" + d)]
    res_desc = compose_description(["Download the 2026 Full Product Catalog and the LBI spec sheets and sell sheets for Light Efficient Design, RemPhos and Solera.",
                                    "Every category page opens the catalog PDF at its own section."])
    render("resources.html", "resources.html", 0.6, page="resources", docs=docs, studies=studies, videos=videos,
           seo=seo_for("resources.html", f"Catalog, Spec Sheets + Downloads | {SITE_NAME}", res_desc, jsonld=[
               ld_webpage("resources.html", "Catalog, spec sheets and files", res_desc, kind="CollectionPage", breadcrumb=True,
                          hasPart=[{"@type": "DigitalDocument", "name": d.replace(".pdf", "").replace("-", " "), "url": abs_url("assets/docs/" + d), "encodingFormat": "application/pdf"} for d in docs]),
               ld_breadcrumbs("resources.html", [("Home", "index.html"), ("Resources", "resources.html")])]))
    contact_desc = compose_description([f"Reach {SITE_NAME} sales at {PHONE} or {EMAIL} for samples, rebates and your local rep.",
                                        "HQ in Cary, IL; manufacturing in Middleton, MA.", "Corporate HQ in Cary, Illinois; Innovation and Manufacturing Center in Middleton, Massachusetts."])
    render("contact.html", "contact.html", 0.6, page="contact",
           seo=seo_for("contact.html", f"Contact Sales + Locations | {SITE_NAME}", contact_desc, jsonld=[
               ld_webpage("contact.html", "Contact Light Efficient Design", contact_desc, kind="ContactPage", breadcrumb=True, about={"@id": SITE_URL + "#organization"}),
               ld_breadcrumbs("contact.html", [("Home", "index.html"), ("Contact", "contact.html")])]))
    eddy_desc = compose_description(["Meet Eddy, the Light Efficient Design mascot: a 5 mm LED named after Thomas Edison, brought to life by Senior Creative Director Amy George.",
                                     "His many looks, his history and why he is always holding something."])
    render("eddy.html", "eddy.html", 0.5, page="eddy", gallery=EDDY_GALLERY, history=EDDY_HISTORY,
           seo=seo_for("eddy.html", f"Meet Eddy, Our 5 mm LED Mascot | {SITE_NAME}", eddy_desc, brand_key="led", image="assets/img/eddy/eddy-connector.png",
                       image_alt="Eddy the LED mascot holding a linking connector", jsonld=[
               ld_webpage("eddy.html", "Meet Eddy", eddy_desc, kind="AboutPage", breadcrumb=True, image="assets/img/eddy/eddy-connector.png",
                          about={"@type": "Thing", "name": "Eddy (Edison), the Light Efficient Design mascot"},
                          creator={"@type": "Person", "name": "Amy George", "jobTitle": "Senior Creative Director", "image": SITE_URL + "assets/img/eddy/amy-george.jpg", "worksFor": {"@id": SITE_URL + "#organization"}}),
               ld_breadcrumbs("eddy.html", [("Home", "index.html"), ("Meet Eddy", "eddy.html")])]))
    write_robots()
    write_sitemap(pages)
    write_llms(cats, variants, total_pn, studies)
    if (ROOT / "TEST_COPY").is_file():
        make_test_copy()
    print(f"built {len(cats)} category pages, {n_index} part numbers in the search index, {len(pages)} pages in the sitemap, {len(variants)} LBI variants")

if __name__ == "__main__":
    main()

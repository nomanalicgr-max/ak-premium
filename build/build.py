#!/usr/bin/env python3
"""AK Premium build script (Global shell: registry-based).
Reads data/tools.json (the single source of truth for every tool),
data/hubs.json (category hub intros + FAQs) and locales/en.json (UI
strings), and OUT/config.js (SITE_URL, SITE_NAME, CONTACT_EMAIL),
extracts tool workspaces from the vendored v3 index (v3-index.html),
applies workspace overrides, and generates:
  index.html, tools/<slug>.html, tools/index.html, ur/ pages,
  about/privacy/terms/disclaimer/contact/cookies/dmca/licenses, whats-new,
  category hubs (/pdf-tools, /image-tools, ...), country/pakistan,
  sitemap.xml (real per-page lastmod from git), robots.txt, 404.html,
  sw.js, data/search-index.json, data/tools.json, locales/en.json,
  build/ (generator copy).
Run: python3 build.py   (output: OUT, see BUILD/OUT below)
To add a tool: edit data/tools.json (see README.md), add its workspace
HTML + app.js handlers, then run this script.
"""
import json, pathlib, re, html, sys, hashlib, datetime, os, shutil, subprocess
# Portable paths (Foundation): the generator runs from wherever it sits.
# BUILD = the folder holding this script. OUT = the site root: $AK_OUT wins,
# else the repo layout (build/ is a child of the site root), else the
# workspace layout (output dir next to the build dir).
BUILD = pathlib.Path(__file__).resolve().parent
_ENV_OUT = os.environ.get("AK_OUT")
if _ENV_OUT:
    OUT = pathlib.Path(_ENV_OUT)
elif (BUILD.parent / "config.js").exists():
    OUT = BUILD.parent
else:
    OUT = pathlib.Path.home() / "workspace" / "ak-premium-v4"

cfg_text = (OUT / "config.js").read_text()
def cfg_val(key):
    m = re.search(key + r':\s*"([^"]*)"', cfg_text)
    return m.group(1) if m else ""
SITE_NAME = cfg_val("SITE_NAME") or "AK Premium"
SITE_URL = cfg_val("SITE_URL").rstrip("/") or "https://ak-premium.vercel.app"
CONTACT_EMAIL = cfg_val("CONTACT_EMAIL") or "nomanalicgr@gmail.com"
FORM_EMBED = "https://docs.google.com/forms/d/e/1FAIpQLSc5viJP-VM__kJulxw6IqmYzJucTUMukVHDzSe-9ffoHO2gvg/viewform?embedded=true"
FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSc5viJP-VM__kJulxw6IqmYzJucTUMukVHDzSe-9ffoHO2gvg/viewform"
ASSET_V = "23"  # v23 (2026-11-23): advanced upgrade plan batch 3 — Merge PDF page ranges + bookmark merge, Split PDF modes, Add Page Numbers options, Add Watermark options, Unlock PDF protection check + batch, Protect PDF permission flags.
BUILD_DATE = datetime.date.today().isoformat()  # sitemap lastmod = build date (Phase 4.1)

# Content hashing (Phase 4.3): hashed filenames + immutable caching in
# vercel.json. The unhashed file is the build source; the hashed copy is
# what pages reference. Stale hashed copies from an earlier build are
# removed, so the output dir never ships two versions of one asset.
def hashed_asset(rel, transform=None):
    src = OUT / rel
    data = src.read_bytes()
    if transform:
        data = transform(data.decode("utf-8")).encode("utf-8")
    h = hashlib.sha256(data).hexdigest()[:10]
    dst = src.with_name(src.stem + "." + h + src.suffix)
    for old in src.parent.glob(src.stem + ".*" + src.suffix):
        if old != dst:
            old.unlink()
    if not dst.exists() or dst.read_bytes() != data:
        dst.write_bytes(data)
    return "/" + str(dst.relative_to(OUT))

# Fonts (Phase 4.3, v12): content-hashed like CSS/JS, so they can be cached
# immutable (see vercel.json). The @font-face URLs in styles.css and the
# preload links use these hashed names.
FONT_NAMES = ["inter-var", "plus-jakarta-var", "noto-nastaliq-urdu"]
FONT_HASHED = {n: hashed_asset("assets/fonts/" + n + ".woff2") for n in FONT_NAMES}
def _css_font_urls(css):
    for n in FONT_NAMES:
        css = css.replace("/assets/fonts/" + n + ".woff2", FONT_HASHED[n])
    return css

HASHED = {
    "styles": hashed_asset("assets/css/styles.css", transform=_css_font_urls),
    "common": hashed_asset("assets/js/common.js"),
    "core": hashed_asset("assets/js/core.js"),
    "jsonpath-bridge": hashed_asset("assets/js/jsonpath-bridge.js"),
}
# Per-tool JS hashes are added after ALL_TOOLS is built (below): one
# tools/<slug>.js per tool, written by split-app.py. The 10 category
# bundles from v9-v11 are gone.

# SRI hashes (Phase 4.2) for the 10 pinned CDN libraries, computed 2026-11-11
# by downloading each file and hashing it with SHA-384. The docx URL was
# corrected at the same time: docx@8.5.0 publishes /build/index.umd.js,
# not /build/index.js (which is a 404, so PDF to Word could not load docx).
SRI = {
 "pdf-lib": "sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI",
 "pdfjs": "sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e",
 "jsonrepair": "sha384-2I3jTKkZ/Kqabhjo6l7hVZMJ7CBTAC/T52HC0PCG9iEry5vIS5qUckwnfztzkn/I",
 "ajv2020": "sha384-vsMiC2R9fcX/SqeA9xJ+Lpbbe1fRi7RDpgHenZH7A8yXAoX+9T4m8MfuwrafZAAL",
 "jsonpath-plus": "sha384-WRNZdkoNW+1xEvqdyoIRVG67lUx2bnGU+UCK7h6NoxSegyWY6t75F/9c7c4h/Tvp",
 "marked": "sha384-948ahk4ZmxYVYOc+rxN1H2gM1EJ2Duhp7uHtZ4WSLkV4Vtx5MUqnV+l7u9B+jFv+",
 "marked-footnote": "sha384-eMG0oh50tjGAfa6zAmiAlwrgAO4MmBKb5wosyU0mpQx80qj0fUYCBt1KwO9e8qxp",
 "forge": "sha384-xE6n3RBMZWgwAhyzoIMfY7HN3oDBa/+HBwFFNyxsdY8kseup7C4Blx1yDzprEESV",
 "xlsx": "sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw",
 "jszip": "sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG",
 "mammoth": "sha384-nFoSjZIoH3CCp8W639jJyQkuPHinJ2NHe7on1xvlUA7SuGfJAfvMldrsoAVm6ECz",
 "docx": "sha384-4xaIisuLEy2lo2HkB2C4rEf7v8jbTb2kuogX6TkuEt9feTWKBSFSOzsqNNbV+sKh",
 "pptxgenjs": "sha384-Cck14aA9cifjYolcnjebXRfWGkz5ltHMBiG4px/j8GS+xQcb7OhNQWZYyWjQ+UwQ",
 "tesseract": "sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F",
 "qrcode": "sha384-3zSEDfvllQohrq0PHL1fOXJuC/jSOO34H46t6UQfobFOmxE5BpjjaIJY5F2/bMnU",
 "jspdf": "sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk",
 "js-yaml": "sha384-+pxiN6T7yvpryuJmE1gM9PX7yQit15auDb+ZwwvJOd/4be2Cie5/IuVXgQb/S9du",
 "md5": "sha384-WAahC3S+69Co45zyyuhCjvdMwo7a42Yn0mM0IgZIUlYNebG24AVkPUltj3BQnM85",
}

# Valid schema.org applicationCategory values (Phase 4.1). The old code put
# the display label ("PDF Tools") here, which is not a valid category.
CAT_APP = {
    "pdf": "UtilitiesApplication", "convert": "UtilitiesApplication",
    "image": "UtilitiesApplication", "excel": "BusinessApplication",
    "calculators": "BusinessApplication", "pakistan": "UtilitiesApplication",
    "text": "UtilitiesApplication",
    "everyday": "UtilitiesApplication", "developer": "UtilitiesApplication",
    "business": "BusinessApplication", "design": "UtilitiesApplication",
}

# Registry (Foundation, expansion brief 3.1): data/tools.json is the single
# source of truth for every tool. inventory.json is superseded (kept in this
# folder as a backup) and is no longer read.
REG = json.loads((BUILD / "data" / "tools.json").read_text())
REGISTRY = REG["tools"]
assert len({e["slug"] for e in REGISTRY}) == len(REGISTRY), "duplicate slugs in registry"
# OLD meta descriptions, kept under the old name so tool_page() is unchanged.
OLD = {e["slug"]: {"description": e["meta_description"]} for e in REGISTRY if "meta_description" in e}

CAT_LABELS = {
    "pdf": "PDF Tools", "convert": "Convert", "text": "Text Tools", "excel": "Excel Tools",
    "image": "Image Tools", "everyday": "Everyday Tools", "developer": "Developer Tools",
    "calculators": "Calculators", "business": "Business Tools", "design": "Design Tools",
    "pakistan": "Pakistan Tools",
}
# Category hubs (Global shell, expansion brief 4.2 / design brief 2.3):
# data/hubs.json holds each hub's intro (80-150 words) and 3-5 FAQs.
HUBS = json.loads((BUILD / "data" / "hubs.json").read_text())["hubs"]
HUB_BY_CAT = {h["category"]: h for h in HUBS}
HUB_URLS = {h["category"]: h["url"] for h in HUBS}
# UI strings (Global shell, expansion brief 6A): locales/en.json is the
# single source for the shell's UI copy. build.py renders static strings
# from it and injects the JS strings as window.AK_STRINGS (see page_scripts).
STRINGS = json.loads((BUILD / "locales" / "en.json").read_text())
# Homepage section order (Global shell, design brief 2.3): hero, then
# Recently used / Favourites (only when they exist), Popular, the category
# sections, Country tools, Islamic tools, FAQ. Pakistan lives in the
# Country tools band, not as a category section.
# Homepage section order (design brief 2.3, max 8 cards per section): every
# category gets its own section. The old "More tools" group (12 cards) was
# split into Everyday, Developer, Business and Design (v12).
CAT_ORDER = ["pdf", "convert", "text", "image", "excel", "calculators", "everyday", "developer", "business", "design"]
CAT_ORDER_ALL = ["pdf", "convert", "text", "excel", "image", "everyday", "developer", "calculators", "business", "design", "pakistan"]  # /tools index order

# SVG sprite: Lucide icons (ISC license, https://lucide.dev) + sun/moon for
# the theme toggle. One symbol per tool, referenced as <use href="#i-<name>">.
# Only the icons actually used are shipped (~60 symbols, a few KB).
# It is injected right after <body> on every generated page (see page_head).
SPRITE = """<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="i-archive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="5" x="2" y="3" rx="1" />
  <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
  <path d="M10 12h4" /></symbol>
    <symbol id="i-arrow-right-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m16 3 4 4-4 4" />
  <path d="M20 7H4" />
  <path d="m8 21-4-4 4-4" />
  <path d="M4 17h16" /></symbol>
    <symbol id="i-award" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" />
  <circle cx="12" cy="8" r="6" /></symbol>
    <symbol id="i-binary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="14" width="4" height="6" rx="2" />
  <rect x="6" y="4" width="4" height="6" rx="2" />
  <path d="M6 20h4" />
  <path d="M14 10h4" />
  <path d="M6 14h2v6" />
  <path d="M14 4h2v6" /></symbol>
    <symbol id="i-braces" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" />
  <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" /></symbol>
    <symbol id="i-cake" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
  <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
  <path d="M2 21h20" />
  <path d="M7 8v3" />
  <path d="M12 8v3" />
  <path d="M17 8v3" />
  <path d="M7 4h.01" />
  <path d="M12 4h.01" />
  <path d="M17 4h.01" /></symbol>
    <symbol id="i-case-sensitive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m2 16 4.039-9.69a.5.5 0 0 1 .923 0L11 16" />
  <path d="M22 9v7" />
  <path d="M3.304 13h6.392" />
  <circle cx="18.5" cy="12.5" r="3.5" /></symbol>
    <symbol id="i-chart-column" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16" />
  <path d="M18 17V9" />
  <path d="M13 17V5" />
  <path d="M8 17v-3" /></symbol>
    <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></symbol>
    <symbol id="i-columns-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" />
  <path d="M12 3v18" /></symbol>
    <symbol id="i-crop" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14" />
  <path d="M18 22V8a2 2 0 0 0-2-2H2" /></symbol>
    <symbol id="i-diff" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v14" />
  <path d="M5 10h14" />
  <path d="M5 21h14" /></symbol>
    <symbol id="i-droplet" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" /></symbol>
    <symbol id="i-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
  <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
  <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
  <path d="m2 2 20 20" /></symbol>
    <symbol id="i-file-code" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
  <path d="M14 2v5a1 1 0 0 0 1 1h5" />
  <path d="M10 12.5 8 15l2 2.5" />
  <path d="m14 12.5 2 2.5-2 2.5" /></symbol>
    <symbol id="i-file-image" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
  <path d="M14 2v5a1 1 0 0 0 1 1h5" />
  <circle cx="10" cy="12" r="2" />
  <path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22" /></symbol>
    <symbol id="i-file-minus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
  <path d="M14 2v5a1 1 0 0 0 1 1h5" />
  <path d="M9 15h6" /></symbol>
    <symbol id="i-file-pen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v9.34" />
  <path d="M14 2v5a1 1 0 0 0 1 1h5" />
  <path d="M10.378 12.622a1 1 0 0 1 3 3.003L8.36 20.637a2 2 0 0 1-.854.506l-2.867.837a.5.5 0 0 1-.62-.62l.836-2.869a2 2 0 0 1 .506-.853z" /></symbol>
    <symbol id="i-file-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
  <path d="M14 2v5a1 1 0 0 0 1 1h5" />
  <path d="M9 15h6" />
  <path d="M12 18v-6" /></symbol>
    <symbol id="i-file-spreadsheet" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
  <path d="M14 2v5a1 1 0 0 0 1 1h5" />
  <path d="M8 13h2" />
  <path d="M14 13h2" />
  <path d="M8 17h2" />
  <path d="M14 17h2" /></symbol>
    <symbol id="i-file-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
  <path d="M14 2v5a1 1 0 0 0 1 1h5" />
  <path d="M10 9H8" />
  <path d="M16 13H8" />
  <path d="M16 17H8" /></symbol>
    <symbol id="i-file-user" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
  <path d="M14 2v5a1 1 0 0 0 1 1h5" />
  <path d="M16 22a4 4 0 0 0-8 0" />
  <circle cx="12" cy="15" r="3" /></symbol>
    <symbol id="i-fingerprint" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
  <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
  <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
  <path d="M2 12a10 10 0 0 1 18-6" />
  <path d="M2 16h.01" />
  <path d="M21.8 16c.2-2 .131-5.354 0-6" />
  <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
  <path d="M8.65 22c.21-.66.45-1.32.57-2" />
  <path d="M9 6.8a6 6 0 0 1 9 5.2v2" /></symbol>
    <symbol id="i-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" />
  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
  <path d="M2 12h20" /></symbol>
    <symbol id="i-graduation-cap" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
  <path d="M22 10v6" />
  <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" /></symbol>
    <symbol id="i-hand-coins" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" />
  <path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" />
  <path d="m2 16 6 6" />
  <circle cx="16" cy="9" r="2.9" />
  <circle cx="6" cy="5" r="3" /></symbol>
    <symbol id="i-hash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9" />
  <line x1="4" x2="20" y1="15" y2="15" />
  <line x1="10" x2="8" y1="3" y2="21" />
  <line x1="16" x2="14" y1="3" y2="21" /></symbol>
    <symbol id="i-image-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21" />
  <path d="m14 19 3 3v-5.5" />
  <path d="m17 22 3-3" />
  <circle cx="9" cy="9" r="2" /></symbol>
    <symbol id="i-images" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16" />
  <path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2" />
  <circle cx="13" cy="7" r="1" fill="currentColor" />
  <rect x="8" y="2" width="14" height="14" rx="2" /></symbol>
    <symbol id="i-key" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m2 21 9.6-9.6" />
  <path d="m7.5 15.5 2.3 2.3a1 1 0 0 1 0 1.4l-2.1 2.1a1 1 0 0 1-1.4 0L4 19" />
  <circle cx="15.5" cy="7.5" r="5.5" /></symbol>
    <symbol id="i-key-round" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
  <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" /></symbol>
    <symbol id="i-landmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 18v-7" />
  <path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z" />
  <path d="M14 18v-7" />
  <path d="M18 18v-7" />
  <path d="M3 22h18" />
  <path d="M6 18v-7" /></symbol>
    <symbol id="i-languages" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6" />
  <path d="m4 14 6-6 2-3" />
  <path d="M2 5h12" />
  <path d="M7 2h1" />
  <path d="m22 22-5-10-5 10" />
  <path d="M14 18h6" /></symbol>
    <symbol id="i-layout-grid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1" />
  <rect width="7" height="7" x="14" y="3" rx="1" />
  <rect width="7" height="7" x="14" y="14" rx="1" />
  <rect width="7" height="7" x="3" y="14" rx="1" /></symbol>
    <symbol id="i-letter-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5h6" />
  <path d="M15 12h6" />
  <path d="M3 19h18" />
  <path d="m3 12 3.553-7.724a.5.5 0 0 1 .894 0L11 12" />
  <path d="M3.92 10h6.16" /></symbol>
    <symbol id="i-lightbulb" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
  <path d="M9 18h6" />
  <path d="M10 22h4" /></symbol>
    <symbol id="i-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></symbol>
    <symbol id="i-link-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2" />
  <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
  <line x1="8" x2="16" y1="12" y2="12" /></symbol>
    <symbol id="i-list-ordered" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5h10" />
  <path d="M11 12h10" />
  <path d="M11 19h10" />
  <path d="M4 4h1v5" />
  <path d="M4 9h2" />
  <path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02" /></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
  <path d="M7 11V7a5 5 0 0 1 10 0v4" /></symbol>
    <symbol id="i-lock-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
  <path d="M7 11V7a5 5 0 0 1 9.9-1" /></symbol>
    <symbol id="i-merge" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m8 6 4-4 4 4" />
  <path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22" />
  <path d="m20 22-5-5" /></symbol>
    <symbol id="i-mic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19v3" />
  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
  <rect x="9" y="2" width="6" height="13" rx="3" /></symbol>
    <symbol id="i-minimize-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m14 10 7-7" />
  <path d="M20 10h-6V4" />
  <path d="m3 21 7-7" />
  <path d="M4 14h6v6" /></symbol>
    <symbol id="i-palette" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
  <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
  <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /></symbol>
    <symbol id="i-pen-tool" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m18 13-.654-4.736a4 4 0 00-2.756-3.266l-9.163-2.9a2 2 0 00-2.017.493l-.82.819a2 2 0 00-.492 2.017l2.9 9.163a4 4 0 003.266 2.756L13 18" />
  <path d="M18.648 12.352a1.205 1.205 0 011.704 0l1.296 1.296a1.205 1.205 0 010 1.704l-6.296 6.296a1.205 1.205 0 01-1.704 0l-1.296-1.296a1.205 1.205 0 010-1.704z" />
  <path d="m3 3 6.586 6.586" />
  <circle cx="11" cy="11" r="2" /></symbol>
    <symbol id="i-percent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="5" y1="5" y2="19" />
  <circle cx="6.5" cy="6.5" r="2.5" />
  <circle cx="17.5" cy="17.5" r="2.5" /></symbol>
    <symbol id="i-presentation" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20" />
  <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
  <path d="m7 21 5-5 5 5" /></symbol>
    <symbol id="i-qr-code" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="5" height="5" x="3" y="3" rx="1" />
  <rect width="5" height="5" x="16" y="3" rx="1" />
  <rect width="5" height="5" x="3" y="16" rx="1" />
  <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
  <path d="M21 21v.01" />
  <path d="M12 7v3a2 2 0 0 1-2 2H7" />
  <path d="M3 12h.01" />
  <path d="M12 3h.01" />
  <path d="M12 16v.01" />
  <path d="M16 12h1" />
  <path d="M21 12v.01" />
  <path d="M12 21v-1" /></symbol>
    <symbol id="i-receipt" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17V7" />
  <path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8" />
  <path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z" /></symbol>
    <symbol id="i-receipt-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M13 16H8" />
  <path d="M14 8H8" />
  <path d="M16 12H8" />
  <path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z" /></symbol>
    <symbol id="i-regex" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3v10" />
  <path d="m12.67 5.5 8.66 5" />
  <path d="m12.67 10.5 8.66-5" />
  <path d="M9 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2z" /></symbol>
    <symbol id="i-replace" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4a1 1 0 0 1 1-1" />
  <path d="M15 10a1 1 0 0 1-1-1" />
  <path d="M21 4a1 1 0 0 0-1-1" />
  <path d="M21 9a1 1 0 0 1-1 1" />
  <path d="m3 7 3 3 3-3" />
  <path d="M6 10V5a2 2 0 0 1 2-2h2" />
  <rect x="3" y="14" width="7" height="7" rx="1" /></symbol>
    <symbol id="i-rotate-cw" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
  <path d="M21 3v5h-5" /></symbol>
    <symbol id="i-ruler" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
  <path d="m14.5 12.5 2-2" />
  <path d="m11.5 9.5 2-2" />
  <path d="m8.5 6.5 2-2" />
  <path d="m17.5 15.5 2-2" /></symbol>
    <symbol id="i-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18" />
  <path d="m19 8 3 8a5 5 0 0 1-6 0zV7" />
  <path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1" />
  <path d="m5 8 3 8a5 5 0 0 1-6 0zV7" />
  <path d="M7 21h10" /></symbol>
    <symbol id="i-scaling" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
  <path d="M14 15H9v-5" />
  <path d="M16 3h5v5" />
  <path d="M21 3 9 15" /></symbol>
    <symbol id="i-scan-line" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" />
  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
  <path d="M7 12h10" /></symbol>
    <symbol id="i-scan-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" />
  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
  <path d="M7 8h8" />
  <path d="M7 12h10" />
  <path d="M7 16h6" /></symbol>
    <symbol id="i-sigma" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2" /></symbol>
    <symbol id="i-split" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5" />
  <path d="M8 3H3v5" />
  <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
  <path d="m15 9 6-6" /></symbol>
    <symbol id="i-square-pen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
  <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" /></symbol>
    <symbol id="i-table" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18" />
  <rect width="18" height="18" x="3" y="3" rx="2" />
  <path d="M3 9h18" />
  <path d="M3 15h18" /></symbol>
    <symbol id="i-table-properties" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3v18" />
  <rect width="18" height="18" x="3" y="3" rx="2" />
  <path d="M21 9H3" />
  <path d="M21 15H3" /></symbol>
    <symbol id="i-terminal-square" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m7 11 2-2-2-2" />
  <path d="M11 13h4" />
  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /></symbol>
    <symbol id="i-text-quote" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 5H3" />
  <path d="M21 12H8" />
  <path d="M21 19H8" />
  <path d="M3 12v7" /></symbol>
    <symbol id="i-type" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16" />
  <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
  <path d="M9 20h6" /></symbol>
    <symbol id="i-whole-word" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="12" r="3" />
  <path d="M10 9v6" />
  <circle cx="17" cy="12" r="3" />
  <path d="M14 7v8" />
  <path d="M22 17v1c0 .5-.5 1-1 1H3c-.5 0-1-.5-1-1v-1" /></symbol>
    <symbol id="i-wrench" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" /></symbol>
    <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
    <symbol id="i-moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34" />
  <circle cx="11" cy="11" r="8" /></symbol>
    <symbol id="i-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16" />
  <path d="M4 12h16" />
  <path d="M4 19h16" /></symbol>
    <symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" />
  <path d="m6 6 12 12" /></symbol>
  </defs>
</svg>"""

# ---- Per-tool content (use_case, tip, limit, example, faq_extra) ----
# Each entry is written for that tool only. Where a tool has no entry here,
# content is generated from its own name and description plus its category.
# Per-tool content now lives in data/tools.json ("content").
CONTENT = {e["slug"]: {"use": e["content"]["use"], "tip": e["content"]["tip"], "limit": e["content"]["limit"], "example": e["content"]["example"], "faq": [tuple(f) for f in e["content"]["faq"]]} for e in REGISTRY if "content" in e}

# ---- Workspace HTML: extract from v3 index, then apply v4 overrides ----
# v3 workspace index, vendored as BUILD/v3-index.html (copy of the old
# ~/workspace/ak-premium/index.html) so the generator is self-contained.
INDEX_HTML = (BUILD / "v3-index.html").read_text()
def extract_workspace(wid):
    start = INDEX_HTML.find('<div class="workspace-tool" id="' + wid + '">')
    assert start != -1, "workspace not found: " + wid
    # end at the next workspace div, or at the FAQ section, whichever comes first
    nxt = INDEX_HTML.find('<div class="workspace-tool" id="', start + 10)
    faq = INDEX_HTML.find('<section id="section-faq"', start + 10)
    ends = [e for e in (nxt, faq) if e != -1]
    end = min(ends) if ends else len(INDEX_HTML)
    return INDEX_HTML[start:end].rstrip()
# Workspaces whose HTML is a literal in this file (Excel wizards,
# Pakistan tools), not extracted from the v3 index. Kept in sync by the
# assert after PAKISTAN_WS: add a workspace here when you add a literal one.
LITERAL_WS = {"tool-excel-formula", "tool-excel-explainer", "tool-excel-vba",
              "tool-excel-regex", "tool-excel-dax",
              "tool-land", "tool-tax", "tool-zakat", "tool-amountwords",
              "tool-urducount", "tool-merit"}
WORKSPACES = {}
for _e in REGISTRY:
    _wid = _e["workspace"]
    if _wid in LITERAL_WS or _wid in WORKSPACES:
        continue
    WORKSPACES[_wid] = extract_workspace(_wid)

# Phase 3.3: calculator numeric inputs use a text keyboard with decimal
# inputmode (mobile keyboards show a decimal point; type=number spinners
# and locale quirks go away). Handlers already parseFloat the value.
for _wid in ("tool-percent", "tool-bmi", "tool-emi", "tool-unit", "tool-discount", "tool-compound", "tool-mortgage", "tool-tip", "tool-timezone", "tool-datediff", "tool-tdee", "tool-scientific", "tool-fraction"):
    WORKSPACES[_wid] = WORKSPACES[_wid].replace('type="number"', 'type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done"')
WORKSPACES["tool-emi"] = WORKSPACES["tool-emi"].replace(
    '<pre id="emiOutput" class="terminal">EMI result will appear here.</pre>',
    '<pre id="emiOutput" class="terminal">EMI result will appear here.</pre>\n<div id="emiBreakdown"></div>')

# v4 workspace overrides (new controls, honest labels)
def ws_replace(wid, new_html):
    WORKSPACES[wid] = new_html

ws_replace("tool-compress", '''<div class="workspace-tool" id="tool-compress">
<h2>Compress PDF</h2>
<input id="compressInput" type="file" accept="application/pdf">
<label>Level <select id="compressLevel"><option value="lossless">Lossless — shrink the file structure, zero quality loss</option><option value="balanced" selected>Balanced — shrink photos to 150 DPI, text stays selectable</option><option value="small">Small — shrink photos to 96 DPI, text stays selectable</option></select></label>
<label>Quality <input id="compressQuality" type="range" min="10" max="100" value="70"> <span id="compressQualityLabel">70%</span></label>
<p class="file-limit-note">Files up to 50 MB. Text always stays selectable — pages are never turned into images. Photos already at or below the target size are left alone.</p>
<button id="compressPdfBtn" type="button" class="btn-primary">Compress PDF</button>
<p class="status" id="compressPdfStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-split", '''<div class="workspace-tool" id="tool-split">
<h2>Split PDF</h2>
<input id="splitInput" type="file" accept="application/pdf">
<label>Mode <select id="splitMode"><option value="range">Page ranges</option><option value="every">Extract every page (ZIP)</option><option value="bookmarks">Split by bookmarks (ZIP)</option><option value="everyn">Every N pages (ZIP)</option><option value="chunks">Split into equal parts (ZIP)</option><option value="size">Split by file size (ZIP)</option></select></label>
<label id="splitRowRanges">Page ranges <input id="splitRanges" type="text" placeholder="Example: 1-3, 5, 8-10"></label>
<label id="splitRowEveryN" style="display:none">Pages per part <input id="splitEveryN" type="number" min="1" value="5"></label>
<label id="splitRowChunks" style="display:none">Number of parts <input id="splitChunks" type="number" min="2" value="2"></label>
<label id="splitRowSize" style="display:none">Max size per part (MB) <input id="splitMaxMB" type="number" min="0.5" step="0.5" value="5"></label>
<p id="splitRowBookmarks" class="file-limit-note" style="display:none">Splits at each top-level bookmark, so each chapter becomes its own PDF, named after the bookmark.</p>
<p class="file-limit-note">Files up to 50 MB. Ranges are checked against the real page count.</p>
<button id="splitPdfBtn" type="button" class="btn-primary">Split PDF</button>
<p class="status" id="splitPdfStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-merge", '''<div class="workspace-tool" id="tool-merge">
<h2>Merge PDF</h2>
<input id="mergeInput" type="file" accept="application/pdf" multiple>
<div id="mergeList" class="thumb-list" aria-label="Files to merge, drag to reorder"></div>
<label>Blank pages between files <input id="mergeBlanks" type="number" min="0" max="5" value="0"></label>
<p class="file-limit-note">Files up to 50 MB each. Drag the thumbnails to change the order. For each file you can pick which pages to take and rotate them. Bookmarks from your files are kept in the merged PDF when the files have them.</p>
<button id="mergePdfBtn" type="button" class="btn-primary" disabled>Merge PDFs</button>
<p class="status" id="mergePdfStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-organize", '''<div class="workspace-tool" id="tool-organize">
<h2>Organize PDF</h2>
<input id="organizeInput" type="file" accept="application/pdf">
<div id="organizeList" class="thumb-list" aria-label="Pages, drag to reorder"></div>
<label>Or type a page order <input id="organizeOrder" type="text" placeholder="Example: 3,1,2"></label>
<button id="organizeBtn" type="button" class="btn-primary">Reorder PDF</button>
<p class="status" id="organizeStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-protect", '''<div class="workspace-tool" id="tool-protect">
<h2>Protect PDF</h2>
<p>Real standard PDF password encryption (AES-256, qpdf). The file stays a normal .pdf and opens in Acrobat and Chrome with the password you set. Keep the password safe, it cannot be recovered.</p>
<input id="protectInput" type="file" accept="application/pdf">
<label>Password <input id="protectPassword" type="password" autocomplete="off" minlength="4"></label>
<label>Owner password (optional, leave blank to use the same password) <input id="protectOwnerPassword" type="password" autocomplete="off"></label>
<label>Printing <select id="protectPrint"><option value="full" selected>Allowed, full quality</option><option value="low">Allowed, low quality only</option><option value="none">Not allowed</option></select></label>
<label><input id="protectAllowCopy" type="checkbox"> Allow copying text and images</label>
<label><input id="protectAllowForms" type="checkbox"> Allow filling in forms</label>
<label><input id="protectAllowAnnotate" type="checkbox"> Allow adding comments</label>
<label><input id="protectAllowAssemble" type="checkbox"> Allow assembling pages (insert, delete, rotate)</label>
<label><input id="protectAllowModify" type="checkbox"> Allow any other changes</label>
<p class="file-limit-note">Files up to 50 MB. The password is used in your browser only and is never sent anywhere. Screen-reader access always stays on. By default only printing is allowed: copying, editing and forms are off until you tick them.</p>
<button id="protectPdfBtn" type="button" class="btn-primary">Protect PDF with Password</button>
<p class="status" id="protectPdfStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-unlock", '''<div class="workspace-tool" id="tool-unlock">
<h2>Unlock PDF</h2>
<p>Removes the password from a standard password-protected PDF you own, keeping the original pages and layout. You must know the password. This tool does not guess or crack passwords.</p>
<input id="unlockInput" type="file" accept="application/pdf" multiple>
<label>PDF password <input id="unlockPassword" type="password" autocomplete="off"></label>
<button id="unlockCheckBtn" type="button" class="btn-secondary">Check Protection</button>
<pre id="unlockInfo" class="terminal">Protection details will appear here. Choose a file and press Check Protection to see whether it is locked, which password it needs and what is locked.</pre>
<p class="file-limit-note">Files up to 50 MB each. You can choose several files at once — the same password is tried for each, and the unlocked ones download as one ZIP.</p>
<button id="unlockPdfBtn" type="button" class="btn-primary">Unlock PDF</button>
<p class="status" id="unlockPdfStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-numbers", '''<div class="workspace-tool" id="tool-numbers">
<h2>Add Page Numbers</h2>
<input id="numbersInput" type="file" accept="application/pdf">
<label>Position <select id="numbersPosition"><option value="bc" selected>Bottom centre</option><option value="bl">Bottom left</option><option value="br">Bottom right</option><option value="tc">Top centre</option><option value="tl">Top left</option><option value="tr">Top right</option></select></label>
<div class="field-row">
<label>Font <select id="numbersFont"><option value="helvetica" selected>Helvetica</option><option value="helvetica-bold">Helvetica Bold</option><option value="times">Times Roman</option><option value="times-bold">Times Roman Bold</option><option value="courier">Courier</option><option value="courier-bold">Courier Bold</option></select></label>
<label>Size <input id="numbersSize" type="number" min="8" max="36" value="11"></label>
<label>Colour <input id="numbersColor" type="color" value="#333333"></label>
</div>
<label>Number format <select id="numbersFormat"><option value="n" selected>Number only (1, 2, 3)</option><option value="page-n">Page 1, Page 2</option><option value="page-n-of-t">Page 1 of 12</option></select></label>
<div class="field-row">
<label>Start numbering at <input id="numbersStart" type="number" min="1" value="1"></label>
<label>Skip first pages <input id="numbersSkip" type="number" min="0" value="0"></label>
<label>First pages in roman numerals (0 = none) <input id="numbersRoman" type="number" min="0" value="0"></label>
</div>
<p class="file-limit-note">Files up to 50 MB. Numbers are stamped on top of the page, so they may sit over a footer that is already there.</p>
<button id="pageNumbersBtn" type="button" class="btn-primary">Add Page Numbers</button>
<p class="status" id="pageNumbersStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-watermark", '''<div class="workspace-tool" id="tool-watermark">
<h2>Add Watermark</h2>
<input id="watermarkInput" type="file" accept="application/pdf">
<label>Watermark type <select id="watermarkKind"><option value="text" selected>Text</option><option value="image">Image (logo)</option></select></label>
<label id="watermarkTextRow">Watermark text <input id="watermarkText" type="text" placeholder="Example: DRAFT" maxlength="60"></label>
<label id="watermarkImageRow" style="display:none">Logo image (PNG or JPG) <input id="watermarkImage" type="file" accept="image/png,image/jpeg"></label>
<label id="watermarkScaleRow" style="display:none">Logo size (% of page width) <input id="watermarkImageScale" type="number" min="10" max="100" value="50"></label>
<div class="field-row">
<label>Angle (degrees) <input id="watermarkAngle" type="number" min="-90" max="90" value="-45"></label>
<label>Size <input id="watermarkSize" type="number" min="12" max="200" value="48"></label>
<label>Colour <input id="watermarkColor" type="color" value="#808080"></label>
</div>
<label>Opacity <input id="watermarkOpacity" type="range" min="0.05" max="0.8" step="0.05" value="0.35"> <span id="watermarkOpacityLabel">35%</span></label>
<label><input id="watermarkTiled" type="checkbox"> Repeat the watermark across the page (text only)</label>
<label>Pages <select id="watermarkPages"><option value="all" selected>All pages</option><option value="odd">Odd pages only</option><option value="even">Even pages only</option><option value="range">Page range</option></select></label>
<label id="watermarkRangeRow" style="display:none">Page range <input id="watermarkPageRange" type="text" placeholder="Example: 1-3, 5"></label>
<p class="file-limit-note">Files up to 50 MB. A watermark is a visible mark only. It does not password-protect the file or stop someone from copying the text.</p>
<button id="watermarkBtn" type="button" class="btn-primary">Add Watermark</button>
<p class="status" id="watermarkStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-redact", '''<div class="workspace-tool" id="tool-redact">
<h2>Redact PDF</h2>
<p>True redaction. Pages that contain the text are rebuilt as images with a black box burned in, so the covered text is gone and cannot be selected or copied. Pages without a match are copied unchanged.</p>
<input id="redactInput" type="file" accept="application/pdf">
<label>Text to redact <input id="redactText" type="text"></label>
<button id="redactPdfBtn" type="button" class="btn-primary">Redact PDF</button>
<p class="status" id="redactPdfStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-pdfword", '''<div class="workspace-tool" id="tool-pdfword">
<h2>PDF to Word</h2>
<p>Paragraphs are rebuilt from the text positions in the PDF. Original fonts, exact spacing, images and complex tables are not preserved.</p>
<input id="pdfWordInput" type="file" accept="application/pdf">
<label><input id="pdfWordOcr" type="checkbox"> Use OCR if no text is found (for scanned PDFs)</label>
<button id="pdfWordBtn" type="button" class="btn-primary">Convert PDF to Word</button>
<p class="status" id="pdfWordStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-imgcompress", '''<div class="workspace-tool" id="tool-imgcompress">
<h2>Image Compressor</h2>
<input id="imgCompressInput" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple>
<label>Quality <input id="imgCompressQuality" type="range" min="10" max="100" value="80"> <span id="imgCompressQualityLabel">80%</span></label>
<label>Format <select id="imgCompressFormat"><option value="jpeg">JPEG (smallest for photos)</option><option value="png">PNG (keeps transparency)</option><option value="webp">WebP (small, good quality)</option><option value="avif">AVIF (smallest, Chrome and Edge only)</option></select></label>
<label>Target size in KB (optional) <input id="imgCompressTargetKB" type="number" min="10" placeholder="Example: 200"></label>
<button id="imgCompressBtn" type="button" class="btn-primary">Compress Images</button>
<div id="imgCompressOutput" class="image-output"></div>
<p class="status" id="imgCompressStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-ocr", '''<div class="workspace-tool" id="tool-ocr">
<h2>Image to Text</h2>
<input id="ocrInput" type="file" accept="image/jpeg,image/png,image/webp">
<label>Language <select id="ocrLang"><option value="eng">English</option><option value="urd">Urdu</option><option value="ara">Arabic</option><option value="hin">Hindi</option><option value="eng+urd">English + Urdu</option></select></label>
<button id="ocrBtn" type="button" class="btn-primary">Read Text from Image</button>
<div class="progress" aria-hidden="true"><span id="ocrProgress"></span></div>
<pre id="ocrOutput" class="terminal">Recognized text will appear here.</pre>
<button id="ocrCopyBtn" type="button" class="btn-secondary">Copy Text</button>
<p class="status" id="ocrStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-wordpdf", '''<div class="workspace-tool" id="tool-wordpdf">
<h2>Word to PDF — Basic text conversion</h2>
<p>Basic text conversion. Headings, lists and tables are kept where the structure allows, but fonts, images, headers, footers and exact page layout are not preserved.</p>
<input id="wordPdfInput" type="file" accept=".docx">
<button id="wordPdfBtn" type="button" class="btn-primary">Convert Word to PDF</button>
<p class="status" id="wordPdfStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-pptpdf", '''<div class="workspace-tool" id="tool-pptpdf">
<h2>PPT to PDF — Basic text conversion</h2>
<p>Basic text conversion. Only the slide text is carried over. Slide designs, images, charts, animations and transitions are not preserved.</p>
<input id="pptPdfInput" type="file" accept=".pptx">
<button id="pptPdfBtn" type="button" class="btn-primary">Convert PPT to PDF</button>
<p class="status" id="pptPdfStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-excelpdf", '''<div class="workspace-tool" id="tool-excelpdf">
<h2>Excel to PDF — Basic text conversion</h2>
<p>Basic text conversion. Only the first sheet is rendered, as plain text rows. Cell colours, formulas, charts and multiple sheets are not preserved.</p>
<input id="excelPdfInput" type="file" accept=".xlsx,.xls">
<button id="excelPdfBtn" type="button" class="btn-primary">Convert Excel to PDF</button>
<p class="status" id="excelPdfStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-invoice", '''<div class="workspace-tool" id="tool-invoice">
<h2>Invoice Generator</h2>
<label>Template <select id="invoiceTemplate"><option value="1">Template 1 — plain and simple</option><option value="2">Template 2 — coloured header with notes</option></select></label>
<div class="field-row">
<label>Business name <input id="invoiceBusiness" type="text" placeholder="Your business name"></label>
<label>Client name <input id="invoiceClient" type="text" placeholder="Client name"></label>
</div>
<label>Invoice date <input id="invoiceDate" type="date"></label>
<label>Items (one per line: Item name, quantity, price)</label>
<textarea id="invoiceItems" rows="4" placeholder="Design work, 2, 5000"></textarea>
<label>Tax (%) <input id="invoiceTax" type="number" min="0" value="0"></label>
<label>Notes (Template 2 only) <input id="invoiceNotes" type="text" placeholder="Payment details, thank you note"></label>
<div class="field-row">
<button id="invoiceCalcBtn" type="button" class="btn-secondary">Calculate Summary</button>
<button id="invoicePdfBtn" type="button" class="btn-primary">Download Invoice PDF</button>
</div>
<pre id="invoiceSummary" class="terminal">Invoice summary will appear here.</pre>
<p class="status" id="invoiceStatus" aria-live="polite"></p>
</div>''')

ws_replace("tool-resume", '''<div class="workspace-tool" id="tool-resume">
<h2>Resume Builder</h2>
<label>Template <select id="resumeTemplate"><option value="1">Template 1 — classic single column</option><option value="2">Template 2 — coloured header, skills as bullets</option></select></label>
<div class="field-row">
<label>Full name <input id="resumeName" type="text" placeholder="Full name"></label>
<label>Job title <input id="resumeTitle" type="text" placeholder="Job title"></label>
</div>
<div class="field-row">
<label>Email <input id="resumeEmail" type="email" placeholder="Email"></label>
<label>Phone <input id="resumePhone" type="text" placeholder="Phone"></label>
</div>
<label>Skills (comma-separated) <input id="resumeSkills" type="text" placeholder="Excel, Power BI, Reporting"></label>
<label>Experience</label>
<textarea id="resumeExperience" rows="5" placeholder="Write your experience here…"></textarea>
<button id="resumeBtn" type="button" class="btn-primary">Download Resume PDF</button>
<p class="status" id="resumeStatus" aria-live="polite"></p>
</div>''')

# Excel wizards: replace the shared tool-excel workspace with 5 standalone workspaces
def wizard_ws(wid, title, task_id, task_options, btn_id, out_id, status_id, fields_hint):
    opts = "".join('<option value="%s">%s</option>' % (v, n) for v, n in task_options)
    return ('<div class="workspace-tool" id="%s">\n<h2>%s</h2>\n'
            '<label>Task <select id="%s">%s</select></label>\n'
            '<div id="%s"></div>\n'
            '<p class="file-limit-note">%s</p>\n'
            '<button id="%s" type="button" class="btn-primary">Generate</button>\n'
            '<pre id="%s" class="terminal" aria-live="polite">Your result will appear here.</pre>\n'
            '<p class="status" id="%s" aria-live="polite"></p>\n</div>' % (
        wid, title, task_id, opts, task_id.replace("Task", "Fields"), fields_hint, btn_id, out_id, status_id))

EXCEL_WS = {
"tool-excel-formula": wizard_ws("tool-excel-formula", "Excel Formula Generator",
    "formulaTask", [("sumif","SUMIF"),("sumifs","SUMIFS"),("countifs","COUNTIFS"),("vlookup","VLOOKUP"),("xlookup","XLOOKUP"),("indexmatch","INDEX + MATCH"),("ifformula","IF"),("nestedif","Nested IF"),("textformula","TEXT"),("datedif","DATEDIF"),("unique","UNIQUE (remove duplicates)")],
    "formulaBtn", "formulaOutput", "formulaStatus",
    "Pick a task, fill in the labelled fields, and get the exact formula with a plain-language explanation and an example. This is a template builder, not AI."),
"tool-excel-explainer": '''<div class="workspace-tool" id="tool-excel-explainer">
<h2>Formula Explainer</h2>
<label>Formula <textarea id="explainerInput" rows="4" placeholder="Paste a formula here, for example: =VLOOKUP(A2, Sheet2!A:B, 2, FALSE)"></textarea></label>
<button id="explainerBtn" type="button" class="btn-primary">Explain Formula</button>
<pre id="explainerOutput" class="terminal" aria-live="polite">The explanation will appear here.</pre>
<p class="status" id="explainerStatus" aria-live="polite"></p>
</div>''',
"tool-excel-vba": wizard_ws("tool-excel-vba", "VBA Macro Writer",
    "vbaTask", [("looprows","Loop through rows"),("copydata","Copy data to another sheet"),("autofilter","AutoFilter a table"),("sortdata","Sort a table"),("hidesheet","Hide a sheet (very hidden)")],
    "vbaBtn", "vbaOutput", "vbaStatus",
    "Pick a task, fill in the labelled fields, and get VBA code built from a fixed template. Test it on a copy of your workbook first."),
"tool-excel-regex": '''<div class="workspace-tool" id="tool-excel-regex">
<h2>Regex Creator</h2>
<label>Pattern for <select id="regexTask"><option value="email">Email address</option><option value="phonepk">Pakistan mobile number</option><option value="date">Date (DD/MM/YYYY)</option><option value="url">Web link</option><option value="numbers">Numbers in text</option><option value="cnic">Pakistan CNIC</option></select></label>
<label>Test text (optional) <textarea id="regexTest" rows="4" placeholder="Paste some text to test the pattern on..."></textarea></label>
<button id="regexBtn" type="button" class="btn-primary">Generate Pattern</button>
<pre id="regexOutput" class="terminal" aria-live="polite">Your pattern will appear here.</pre>
<p class="status" id="regexStatus" aria-live="polite"></p>
</div>''',
"tool-excel-dax": wizard_ws("tool-excel-dax", "DAX Query",
    "daxTask", [("totalsales","Total Sales"),("average","Average"),("ytd","Year to Date"),("pcttotal","Percent of Total"),("countrows","Count Rows")],
    "daxBtn", "daxOutput", "daxStatus",
    "Pick a measure, fill in your table and column names, and get a DAX measure with an explanation. Paste it into Power BI or Excel Power Pivot."),
}

# New Pakistan tools: workspaces + tool entries
# Pakistan tool entries now live in data/tools.json (category "pakistan").
# Their workspace HTML stays in PAKISTAN_WS below.
PAKISTAN_WS = {
"tool-land": '''<div class="workspace-tool" id="tool-land">
<h2>Land Converter</h2>
<label>Area <input id="landValue" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" placeholder="Example: 1"></label>
<label>From <select id="landFrom"><option value="marla">Marla</option><option value="kanal" selected>Kanal</option><option value="acre">Acre</option><option value="sqft">Square feet</option><option value="sqyd">Square yards</option><option value="sqm">Square metres</option></select></label>
<button id="landBtn" type="button" class="btn-primary">Convert Land Area</button>
<pre id="landOutput" class="terminal" aria-live="polite">The converted areas will appear here.</pre>
<p class="status" id="landStatus" aria-live="polite"></p>
</div>''',
"tool-tax": '''<div class="workspace-tool" id="tool-tax">
<h2>Pakistan Salary Tax Calculator</h2>
<label>Tax year <select id="taxYear"><option>Loading tax slabs...</option></select></label>
<label>Monthly salary (Rs) <input id="taxMonthly" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" placeholder="Example: 200000"></label>
<label><input id="taxCompareYears" type="checkbox"> Compare Tax Year 2026 vs 2027</label>
<label><input id="taxCompareSalary" type="checkbox"> Compare with a second salary</label>
<label>Second monthly salary (Rs) <input id="taxMonthly2" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" placeholder="Example: 300000"></label>
<button id="taxBtn" type="button" class="btn-primary">Calculate Tax</button>
<pre id="taxOutput" class="terminal" aria-live="polite">Your tax estimate will appear here.</pre>
<p class="tax-source" id="taxSource"></p>
<div id="taxBreakdown"></div>
<div id="taxCompare"></div>
<p class="status" id="taxStatus" aria-live="polite"></p>
<p class="file-limit-note">Estimate only, using FBR slabs for salaried individuals. Not tax advice.</p>
</div>''',
"tool-zakat": '''<div class="workspace-tool" id="tool-zakat">
<h2>Zakat Calculator</h2>
<div class="field-row"><label>Cash and bank (Rs) <input id="zakatCash" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" value="0"></label><label>Debts to subtract (Rs) <input id="zakatDebts" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" value="0"></label></div>
<div class="field-row"><label>Gold (tola) <input id="zakatGold" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" value="0"></label><label>Gold rate per tola (Rs) <input id="zakatGoldRate" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" value="0"></label></div>
<div class="field-row"><label>Silver (tola) <input id="zakatSilver" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" value="0"></label><label>Silver rate per tola (Rs) <input id="zakatSilverRate" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" value="0"></label></div>
<label>Custom nisab (Rs, optional) <input id="zakatNisab" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" placeholder="Leave empty to use the rate-based nisab"></label>
<button id="zakatBtn" type="button" class="btn-primary">Calculate Zakat</button>
<pre id="zakatOutput" class="terminal" aria-live="polite">Your Zakat estimate will appear here.</pre>
<p class="status" id="zakatStatus" aria-live="polite"></p>
<p class="file-limit-note">Estimate only, not religious advice. Nisab is 7.5 tola gold or 52.5 tola silver.</p>
</div>''',
"tool-amountwords": '''<div class="workspace-tool" id="tool-amountwords">
<h2>Amount to Words</h2>
<label>Amount (Rs) <input id="amountWordsInput" type="text" placeholder="Example: 125000"></label>
<button id="amountWordsBtn" type="button" class="btn-primary">Write in Words</button>
<div id="amountWordsOutput" class="terminal" aria-live="polite">The amount in words will appear here.</div>
<p class="status" id="amountWordsStatus" aria-live="polite"></p>
</div>''',
"tool-urducount": '''<div class="workspace-tool" id="tool-urducount">
<h2>Urdu Word Counter</h2>
<label>Urdu text <textarea id="urduCounterInput" rows="6" dir="rtl" lang="ur" placeholder="یہاں اردو متن لکھیں..."></textarea></label>
<button id="urduCounterBtn" type="button" class="btn-primary">Count Words</button>
<pre id="urduCounterOutput" class="terminal" aria-live="polite" dir="rtl">The count will appear here.</pre>
<p class="status" id="urduCounterStatus" aria-live="polite"></p>
</div>''',
"tool-merit": '''<div class="workspace-tool" id="tool-merit">
<h2>Percentage &amp; Merit Calculator</h2>
<p class="file-limit-note">Enter up to 3 parts. Weights must add up to 100%.</p>
<div class="field-row"><label>Part 1 obtained <input id="meritObtained1" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done"></label><label>Part 1 total <input id="meritTotal1" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done"></label><label>Part 1 weight % <input id="meritWeight1" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done"></label></div>
<div class="field-row"><label>Part 2 obtained <input id="meritObtained2" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done"></label><label>Part 2 total <input id="meritTotal2" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done"></label><label>Part 2 weight % <input id="meritWeight2" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done"></label></div>
<div class="field-row"><label>Part 3 obtained <input id="meritObtained3" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done"></label><label>Part 3 total <input id="meritTotal3" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done"></label><label>Part 3 weight % <input id="meritWeight3" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done"></label></div>
<button id="meritBtn" type="button" class="btn-primary">Calculate Aggregate</button>
<pre id="meritOutput" class="terminal" aria-live="polite">Your aggregate will appear here.</pre>
<p class="status" id="meritStatus" aria-live="polite"></p>
</div>''',
}

# ---- Assemble the full tool list: 62 + 6 Pakistan, Excel split into 5 ----
# Excel remap no longer needed: the registry already carries the final
# workspace ids and slugs for the five Excel wizards.
assert LITERAL_WS == set(EXCEL_WS) | set(PAKISTAN_WS), "LITERAL_WS out of sync"


def _workspace_html(wid):
    if wid in WORKSPACES:
        return WORKSPACES[wid]
    if wid in EXCEL_WS:
        return EXCEL_WS[wid]
    return PAKISTAN_WS[wid]


# Internal tool dicts, built from the registry in registry order (the order
# the homepage and /tools index list tools in). "name"/"desc" are the
# registry's title.en / short.en, kept under the old keys so the page
# builders below are unchanged.
ALL_TOOLS = []
for e in REGISTRY:
    ALL_TOOLS.append({
        "slug": e["slug"], "workspace": e["workspace"],
        "name": e["title"]["en"], "desc": e["short"]["en"],
        "category": e["category"], "group": e.get("group", ""),
        "icon": e["icon"], "tool_ws": _workspace_html(e["workspace"]),
    })
assert len({t["slug"] for t in ALL_TOOLS}) == len(ALL_TOOLS), "duplicate slugs"

# Per-tool JS hashes are added in main() (below), after split-app.py has
# written tools/<slug>.js: one tools/<slug>.js per tool. The 10 category
# bundles from v9-v11 are gone.

# Library needs per workspace (pinned versions in app.js LIB_URLS)
# Library needs per workspace now live in data/tools.json ("libs").
LIB_MAP = {e["workspace"]: list(e["libs"]) for e in REGISTRY}
LIB_SCRIPT = {
 "pdf-lib": '<script defer src="https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js" integrity="' + SRI["pdf-lib"] + '" crossorigin="anonymous"></script>',
 "pdfjs": '<script defer src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" integrity="' + SRI["pdfjs"] + '" crossorigin="anonymous"></script>',
 "xlsx": '<script defer src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" integrity="' + SRI["xlsx"] + '" crossorigin="anonymous"></script>',
 "jszip": '<script defer src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" integrity="' + SRI["jszip"] + '" crossorigin="anonymous"></script>',
 "mammoth": '<script defer src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js" integrity="' + SRI["mammoth"] + '" crossorigin="anonymous"></script>',
 "docx": '<script defer src="https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js" integrity="' + SRI["docx"] + '" crossorigin="anonymous"></script>',
 "pptxgenjs": '<script defer src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js" integrity="' + SRI["pptxgenjs"] + '" crossorigin="anonymous"></script>',
 "tesseract": '<script defer src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js" integrity="' + SRI["tesseract"] + '" crossorigin="anonymous"></script>',
 "qrcode": '<script defer src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" integrity="' + SRI["qrcode"] + '" crossorigin="anonymous"></script>',
 "jspdf": '<script defer src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" integrity="' + SRI["jspdf"] + '" crossorigin="anonymous"></script>',
 "js-yaml": '<script defer src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js" integrity="' + SRI["js-yaml"] + '" crossorigin="anonymous"></script>',
 "md5": '<script defer src="https://cdnjs.cloudflare.com/ajax/libs/spark-md5/3.0.2/spark-md5.min.js" integrity="' + SRI["md5"] + '" crossorigin="anonymous"></script>',
 "jsonrepair": '<script defer src="https://cdn.jsdelivr.net/npm/jsonrepair@3.11.0/lib/umd/jsonrepair.min.js" integrity="' + SRI["jsonrepair"] + '" crossorigin="anonymous"></script>',
 "ajv2020": '<script defer src="https://cdnjs.cloudflare.com/ajax/libs/ajv/8.17.1/ajv2020.min.js" integrity="' + SRI["ajv2020"] + '" crossorigin="anonymous"></script>',
 # jsonpath-plus ships no classic-script UMD .js build (only ESM .js and UMD
 # .cjs, which jsDelivr serves as application/node and browsers refuse).
 # So it loads as an ESM module script with SRI, plus a tiny bridge module
 # (assets/js/jsonpath-bridge.js, same-origin and content-hashed) that
 # imports the same URL (the browser reuses the SRI-verified module fetch)
 # and exposes it as window.JSONPath. The bridge is an external file, not
 # an inline script, because the enforced CSP has no 'unsafe-inline' and
 # would block an inline module script.
 "jsonpath-plus": '<script type="module" src="https://cdn.jsdelivr.net/npm/jsonpath-plus@10.3.0/dist/index-browser-esm.min.js" integrity="' + SRI["jsonpath-plus"] + '" crossorigin="anonymous"></script><script type="module" src="' + HASHED["jsonpath-bridge"] + '"></script>',
 "marked": '<script defer src="https://cdn.jsdelivr.net/npm/marked@15.0.12/marked.min.js" integrity="' + SRI["marked"] + '" crossorigin="anonymous"></script>',
 "marked-footnote": '<script defer src="https://cdn.jsdelivr.net/npm/marked-footnote@1.3.0/dist/index.umd.js" integrity="' + SRI["marked-footnote"] + '" crossorigin="anonymous"></script>',
 "forge": '<script defer src="https://cdnjs.cloudflare.com/ajax/libs/forge/1.3.1/forge.min.js" integrity="' + SRI["forge"] + '" crossorigin="anonymous"></script>',
}

# Preconnect hosts (Phase 4.3): one <link rel="preconnect"> per CDN host a
# tool page actually loads libraries from (see tool_page).
LIB_HOST = {
 "pdf-lib": "https://cdn.jsdelivr.net", "xlsx": "https://cdn.jsdelivr.net",
 "docx": "https://cdn.jsdelivr.net", "pptxgenjs": "https://cdn.jsdelivr.net",
 "tesseract": "https://cdn.jsdelivr.net", "pdfjs": "https://cdnjs.cloudflare.com",
 "jszip": "https://cdnjs.cloudflare.com", "mammoth": "https://cdnjs.cloudflare.com",
 "qrcode": "https://cdnjs.cloudflare.com", "jspdf": "https://cdnjs.cloudflare.com",
 "js-yaml": "https://cdn.jsdelivr.net", "md5": "https://cdnjs.cloudflare.com",
 "jsonrepair": "https://cdn.jsdelivr.net", "ajv2020": "https://cdnjs.cloudflare.com",
 "jsonpath-plus": "https://cdn.jsdelivr.net",
 "marked": "https://cdn.jsdelivr.net", "marked-footnote": "https://cdn.jsdelivr.net",
 "forge": "https://cdnjs.cloudflare.com",
}

def esc(x): return html.escape(str(x), quote=True)
def tool_url(t): return SITE_URL + "/tools/" + t["slug"]
def content_for(t):
    c = CONTENT.get(t["slug"], {})
    name, desc = t["name"], t["desc"]
    use = c.get("use", "Use " + name + " when you need to " + desc[0].lower() + desc[1:] + " It is made for that one job, and it does it in your browser, so you do not have to install anything or create an account. People use it at work, at home and at school, whenever the job comes up and a quick, free tool is what they need.")
    tip = c.get("tip", "Start with a small file or a short piece of text the first time, so you can see how the result looks. Once you are happy with it, use the tool on your real file.")
    limit = c.get("limit", "This tool works in your browser, so it is limited by what a browser can do. Very large files may take a while, and the result is a browser-made file, not a desktop program's output. Check the result before you rely on it.")
    example = c.get("example", "Try it once with a sample file and you will see the result in under a minute.")
    faq_extra = c.get("faq", [])
    return use, tip, limit, example, faq_extra

def faq_list(t, use, tip, limit):
    name = t["name"]
    # Specific FAQs first (from the registry content), then the generic ones
    # only as filler up to 6 total — so a tool with 4 specific FAQs shows
    # all 4, instead of the generic questions pushing them off the page.
    faqs = list(content_for(t)[4])
    faqs += [
        ("Is " + name + " free?", "Yes. " + name + " on AK Premium is free to use in your browser, with no sign-up and no account."),
        ("Do my files leave my browser when I use " + name + "?", "No. AK Premium tools run in your browser, so the files you choose are not uploaded to an AK Premium server. The libraries the tool needs load from public CDNs, but your files stay on your device."),
        ("How do I use " + name + "?", "Open the tool on this page and follow the steps under How to use, then download or copy your result."),
        ("What are the limits of " + name + "?", limit),
    ]
    return faqs[:6]

# Specific steps per tool (Phase 3.5): they name the real buttons and fields
# on the page. Tools not listed here fall back to the category steps below.
# Specific steps now live in data/tools.json ("steps").
STEPS = {e["slug"]: list(e["steps"]) for e in REGISTRY if "steps" in e}
# Related tools by workflow (Phase 3.5), not just by category.
# Curated related tools now live in data/tools.json ("related").
RELATED = {e["slug"]: list(e["related"]) for e in REGISTRY if "related" in e}
def related_tools(t):
    curated = [next((x for x in ALL_TOOLS if x["slug"] == s), None) for s in RELATED.get(t["slug"], [])]
    curated = [x for x in curated if x]
    if curated:
        return curated[:4]
    same = [x for x in ALL_TOOLS if x["category"] == t["category"] and x["slug"] != t["slug"]]
    others = [x for x in ALL_TOOLS if x["category"] != t["category"]]
    return (same + others)[:4]

# Mega-menu top tools per category (Global shell, design brief 2.4).
MEGA_TOP = {
    "pdf": ["merge-pdf", "compress-pdf", "split-pdf"],
    "image": ["image-compressor", "image-resizer", "image-converter"],
    "convert": ["pdf-to-word", "pdf-to-excel", "word-to-pdf"],
    "text": ["word-frequency", "markdown-previewer", "character-counter"],
    "calculators": ["percentage-calculator", "loan-emi-calculator", "age-calculator"],
    "developer": ["json-formatter", "base64", "text-diff-checker"],
    "excel": ["formula-generator", "vba-macro-writer", "regex-creator"],
    "business": ["invoice-generator", "resume-builder"],
    "everyday": ["qr-code-generator", "password-generator", "word-counter"],
    "design": ["color-palette"],
}
MEGA_CATS = ["pdf", "image", "convert", "text", "calculators", "developer", "excel", "business", "everyday", "design"]

def site_header(active="", lang_href="/ur/", lang_label="اردو", lang_lang="ur"):
    def cur(page):
        return ' aria-current="page"' if active == page else ""
    brand_cur = ' aria-current="page"' if active == "home" else ""
    # Mega-menu: one column per tool category (Pakistan lives under
    # Country tools, not here). Top 3 tools + "See all N tools".
    mega_cols = []
    for cat in MEGA_CATS:
        tools = [t for t in ALL_TOOLS if t["category"] == cat]
        top = [next(t for t in tools if t["slug"] == s) for s in MEGA_TOP[cat]]
        mega_cols.append('<div class="mega-col"><p class="mega-col-title"><a href="' + HUB_URLS[cat] + '">' + CAT_LABELS[cat] + '</a></p><ul>'
            + "".join('<li><a href="/tools/%s" role="menuitem">%s</a></li>' % (t["slug"], esc(t["name"])) for t in top)
            + '<li><a href="' + HUB_URLS[cat] + '" role="menuitem" class="mega-seeall">' + see_all_label(len(tools)) + ' \u2192</a></li></ul></div>')
    # Globe panel (design brief 2.4): Language / Region / Units / Paper size.
    # Defaults come from navigator.language and the timezone (JS); choices
    # are remembered in localStorage. No IP or geo lookup is ever used.
    g = STRINGS["globe"]
    def sel_options(opts):
        return "".join('<option value="%s">%s</option>' % (v, esc(l)) for v, l in opts)
    globe_panel = ('<div class="globe-panel" id="globePanel" hidden><p class="globe-title">' + esc(g["title"]) + '</p>'
        '<label for="prefLanguage">' + esc(g["language"]) + '</label><select id="prefLanguage">' + sel_options(list(g["languageOptions"].items())) + '</select>'
        '<label for="prefRegion">' + esc(g["region"]) + '</label><select id="prefRegion">' + sel_options([("global", g["regionOptions"]["global"]), ("pk", g["regionOptions"]["pk"]), ("in", g["regionOptions"]["in"]), ("ae", g["regionOptions"]["ae"]), ("uk", g["regionOptions"]["uk"]), ("us", g["regionOptions"]["us"])]) + '</select>'
        '<label for="prefUnits">' + esc(g["units"]) + '</label><select id="prefUnits">' + sel_options([("metric", g["unitsOptions"]["metric"]), ("imperial", g["unitsOptions"]["imperial"])]) + '</select>'
        '<label for="prefPaper">' + esc(g["paper"]) + '</label><select id="prefPaper">' + sel_options([("a4", g["paperOptions"]["a4"]), ("letter", g["paperOptions"]["letter"])]) + '</select>'
        '<p class="globe-note">' + esc(g["note"]) + '</p></div>')
    # Header search dropdown (Global shell): searches every tool from the
    # search index, on any page. The homepage keeps its own big search box.
    hs = STRINGS["headerSearch"]
    header_search = ('<div class="header-search" id="headerSearch" hidden><label class="sr-only" for="headerSearchInput">' + esc(hs["placeholder"]) + '</label>'
        '<input id="headerSearchInput" type="search" placeholder="' + esc(hs["placeholder"]) + '" autocomplete="off">'
        '<div id="headerSearchResults" class="header-search-results" role="listbox" aria-label="Search results"><p class="header-search-hint">' + esc(hs["hint"]) + '</p></div></div>')
    mobile_links = "".join('<a href="%s">%s</a>' % (HUB_URLS[c], CAT_LABELS[c]) for c in MEGA_CATS)
    return ('<header class="site-header"><div class="header-inner">'
    '<a class="brand" href="/"'+brand_cur+'><svg class="brand-mark" viewBox="0 0 40 40" width="34" height="34" aria-hidden="true" focusable="false"><rect width="40" height="40" rx="8"/><text x="20" y="27" text-anchor="middle">AK</text></svg><span>AK Premium</span><span class="brand-tag">Free tools. Private by design.</span></a>'
    '<nav class="main-nav" aria-label="Main navigation">'
    '<div class="nav-drop nav-drop--mega"><button type="button" class="nav-btn" id="toolsMenuBtn" aria-expanded="false" aria-haspopup="true">Tools</button>'
    '<div class="nav-menu nav-menu--mega" id="toolsMenu" role="menu" aria-label="Tool categories">'
    '<a href="/tools" role="menuitem" class="mega-all">All tools</a>'
    '<div class="mega-grid">' + "".join(mega_cols) + '</div></div></div>'
    '<a class="nav-btn nav-desktop" href="/#section-country"'+cur("country")+'>Country tools</a>'
    '<a class="nav-btn nav-desktop" href="/about"'+cur("about")+'>About</a>'
    '<a class="nav-btn nav-desktop" href="/contact"'+cur("contact")+'>Contact</a>'
    '<a class="nav-btn nav-desktop nav-lang" href="'+lang_href+'" lang="'+lang_lang+'">'+lang_label+'</a>'
    '<button type="button" class="nav-icon" id="headerSearchBtn" aria-label="Search tools" aria-expanded="false" aria-haspopup="true"><svg aria-hidden="true"><use href="#i-search"/></svg></button>'
    '<button type="button" class="nav-icon" id="globeBtn" aria-label="Language and region" aria-expanded="false" aria-haspopup="true"><svg aria-hidden="true"><use href="#i-globe"/></svg></button>'
    '<button type="button" class="theme-toggle" id="darkModeToggle" aria-label="Dark mode" aria-pressed="false"><svg class="theme-icon--moon" aria-hidden="true"><use href="#i-moon"/></svg><svg class="theme-icon--sun" aria-hidden="true"><use href="#i-sun"/></svg></button>'
    '<button type="button" class="nav-burger" id="navBurger" aria-expanded="false" aria-controls="mobileMenu" aria-label="Menu"><svg aria-hidden="true"><use href="#i-menu"/></svg></button>'
    '</nav>' + header_search + globe_panel + '</div></header>'
    '<div class="mobile-menu" id="mobileMenu" hidden><div class="mobile-menu-head"><span>AK Premium</span>'
    '<button type="button" class="nav-icon" id="mobileMenuClose" aria-label="Close menu"><svg aria-hidden="true"><use href="#i-x"/></svg></button></div>'
    '<a href="/tools">All tools</a>' + mobile_links
    + '<a href="/#section-country">Country tools</a><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy Policy</a><a href="'+lang_href+'" lang="'+lang_lang+'">'+lang_label+'</a></div>')
FOOTER = '''<footer class="site-footer"><div class="footer-inner"><div class="footer-col"><h3>Tools</h3><ul><li><a href="/pdf-tools">PDF Tools</a></li><li><a href="/image-tools">Image Tools</a></li><li><a href="/convert-tools">Convert</a></li><li><a href="/calculators">Calculators</a></li><li><a href="/developer-tools">Developer Tools</a></li><li><a href="/excel-tools">Excel Tools</a></li><li><a href="/business-tools">Business Tools</a></li><li><a href="/tools">All tools</a></li></ul></div><div class="footer-col"><h3>Country tools</h3><ul><li><a href="/country/pakistan">Pakistan tools</a></li><li><a href="/#section-country">India tools</a></li><li><a href="/#section-country">UAE &amp; Saudi tools</a></li><li><a href="/#section-country">UK tools</a></li><li><a href="/#section-country">US tools</a></li></ul></div><div class="footer-col"><h3>Company</h3><ul><li><a href="/about">About</a></li><li><a href="/contact">Contact</a></li><li><a href="/whats-new">What&rsquo;s new</a></li></ul></div><div class="footer-col"><h3>Legal</h3><ul><li><a href="/privacy">Privacy Policy</a></li><li><a href="/cookies">Cookie Policy</a></li><li><a href="/terms">Terms of Service</a></li><li><a href="/disclaimer">Disclaimer</a></li><li><a href="/dmca">DMCA</a></li><li><a href="/licenses">Licenses</a></li></ul></div></div><div class="footer-bottom"><p>&copy; 2026 AK Premium. Free tools, private by design. Files are processed in your browser and are not uploaded to an AK Premium server.</p></div></footer>'''
CONSENT = '''<div class="consent-banner" id="consentBanner" hidden><p>AK Premium uses cookies for ads and analytics only if you accept. Your files are processed in your browser and are never uploaded. <a href="/privacy">Read the Privacy Policy</a>.</p><button type="button" class="btn-primary" id="consentAccept">Accept</button><button type="button" class="btn-secondary" id="consentReject">Reject</button></div>'''
AD_SLOT = '<div class="ad-slot ad-slot-%s" data-ad-slot="%s" role="complementary" aria-label="Advertisement"></div>'

def page_head(title, description, canonical, og_type="website", extra="", body_class="", lang="en", dir="ltr", body_extra=""):
    # Theme init (Phase 4.2, CSP): an external script, not an inline one, so
    # the enforced policy needs no 'unsafe-inline'. It loads synchronously
    # in <head> before the stylesheet, so the page never flashes the wrong
    # theme. Saved choice ("ak-theme") wins, else the OS setting.
    return ('<!DOCTYPE html>\n<html lang="' + lang + '" dir="' + dir + '">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    + '<script src="' + HASHED["theme-init"] + '"></script>\n'
    + '<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">\n<meta name="theme-color" content="#0b1220" media="(prefers-color-scheme: dark)">\n'
    '<title>' + esc(title) + '</title>\n<meta name="description" content="' + esc(description) + '">\n'
    '<link rel="canonical" href="' + esc(canonical) + '">\n'
    '<meta property="og:title" content="' + esc(title) + '">\n<meta property="og:description" content="' + esc(description) + '">\n'
    '<meta property="og:type" content="' + og_type + '">\n<meta property="og:url" content="' + esc(canonical) + '">\n<meta property="og:site_name" content="' + esc(SITE_NAME) + '">\n'
    '<meta property="og:image" content="' + SITE_URL + '/assets/og-image.png">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:locale" content="' + ("ur_PK" if lang == "ur" else "en_PK") + '">\n'
    '<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="' + esc(title) + '">\n<meta name="twitter:description" content="' + esc(description) + '">\n<meta name="twitter:image" content="' + SITE_URL + '/assets/og-image.png">\n'
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n'
    '<link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png">\n'
    '<link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png">\n'
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n'
    '<link rel="manifest" href="/site.webmanifest">\n'
    '<link rel="preload" href="' + FONT_HASHED["inter-var"] + '" as="font" type="font/woff2" crossorigin>\n'
    '<link rel="preload" href="' + FONT_HASHED["plus-jakarta-var"] + '" as="font" type="font/woff2" crossorigin>\n'
    '<link rel="stylesheet" href="' + HASHED["styles"] + '">\n' + extra + '</head>\n<body' + (' class="' + body_class + '"' if body_class else '') + body_extra + '>\n<a class="skip-link" href="#main">Skip to content</a>\n' + SPRITE + '\n')

def page_scripts(libs, slug=None):
    # All first-party scripts are deferred and content-hashed (Phase 4.3);
    # defer keeps document order, so config -> common -> core -> tool file.
    # Tool pages load core.js plus their own tools/<slug>.js; every other
    # page loads core.js only.
    # window.AK_STRINGS (Global shell, expansion brief 6A): the UI strings
    # from locales/en.json, so core.js never hard-codes user-facing copy.
    # It is an external deferred file (assets/js/strings.js, generated in
    # main()), so no page needs an inline script under the enforced CSP.
    tags = '<script defer src="' + HASHED["strings"] + '"></script>\n'
    tags += "".join(LIB_SCRIPT[l] for l in libs)
    tags += '<script defer src="/config.js?v=' + ASSET_V + '"></script>\n'
    tags += '<script defer src="' + HASHED["common"] + '"></script>\n'
    tags += '<script defer src="' + HASHED["core"] + '"></script>\n'
    if slug and ("tool-" + slug) in HASHED:
        tags += '<script defer src="' + HASHED["tool-" + slug] + '"></script>\n'
    return tags

def tool_page(t):
    use, tip, limit, example, _ = content_for(t)
    faqs = faq_list(t, use, tip, limit)
    name = t["name"]
    title = (name + " Free Online | " + SITE_NAME)
    if len(title) > 60: title = (name + " | " + SITE_NAME)
    desc = (OLD.get(t["slug"], {}).get("description") or t["desc"])
    if len(desc) > 150: desc = desc[:147].rsplit(" ", 1)[0]
    desc = desc + " Free, in your browser. No sign-up."
    if len(desc) > 155: desc = desc[:152].rsplit(" ", 1)[0] + "."
    url = tool_url(t)
    cat_label = CAT_LABELS[t["category"]]
    libs = LIB_MAP.get(t["workspace"], [])
    preconnect = "".join('<link rel="preconnect" href="%s">\n' % h for h in sorted({LIB_HOST[l] for l in libs if l in LIB_HOST}))
    faq_json = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]}, ensure_ascii=False)
    app_json = json.dumps({"@context": "https://schema.org", "@type": "SoftwareApplication", "name": name, "applicationCategory": CAT_APP[t["category"]], "operatingSystem": "Web browser", "inLanguage": "en", "description": desc, "url": url, "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "isPartOf": {"@type": "WebSite", "name": SITE_NAME, "url": SITE_URL + "/"}}, ensure_ascii=False)
    crumb_json = json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/"}, {"@type": "ListItem", "position": 2, "name": cat_label, "item": SITE_URL + "/tools"}, {"@type": "ListItem", "position": 3, "name": name, "item": url}]}, ensure_ascii=False)
    steps = STEPS.get(t["slug"]) or {
        "pdf": ["Choose your PDF file using the file button above.", "Choose the settings the tool offers for this file.", "Press the main button and download or copy your result. Your file stays in your browser."],
        "convert": ["Choose the file to convert using the file button above.", "Check the options the tool offers for this file.", "Press the main button and download your new file."],
        "excel": ["Pick the task from the list, then fill in the labelled fields with your own ranges and values.", "Press Generate.", "Copy the result and paste it into Excel, then test it on a copy of your data."],
        "image": ["Choose one or more images.", "Set the quality, format or size you want.", "Press the main button and download the result, or the ZIP file if there is more than one."],
        "everyday": ["Enter or paste your text in the box above.", "Press the main button.", "Copy or download your result."],
        "developer": ["Enter or paste your text in the box above.", "Press the main button.", "Copy your result."],
        "calculators": ["Enter your numbers in the labelled fields.", "Press Calculate.", "Read the result, which is shown on the page."],
        "business": ["Fill in the fields for your business, client or resume.", "Choose a template if the tool offers one.", "Press Download and save the PDF."],
        "design": ["Enter your starting colour.", "Press the main button.", "Click a colour to copy its code."],
        "pakistan": ["Enter your numbers in the labelled fields.", "Press Calculate or Convert.", "Read the result, which is shown on the page."],
    }[t["category"]]
    steps_html = "".join("<li>" + esc(s) + "</li>" for s in steps)
    faq_html = "".join('<details><summary>' + esc(q) + '</summary>\n<p>' + esc(a) + '</p></details>' for q, a in faqs)
    related_html = "".join(card_html(r) for r in related_tools(t))
    badge = BADGES.get(t["slug"])
    badge_html = ('<p class="tool-badges"><span class="badge %s">%s</span></p>\n' % (badge[1], badge[0])) if badge else ""
    ur_html = ('<p class="ur-sub" lang="ur" dir="rtl">' + esc(UR_SUB[t["slug"]]) + '</p>\n') if t["slug"] in UR_SUB else ""
    extra = preconnect + '<script type="application/ld+json">' + app_json + '</script>\n<script type="application/ld+json">' + faq_json + '</script>\n<script type="application/ld+json">' + crumb_json + '</script>\n'
    if t["slug"] in UR_CONTENT:
        extra += '<link rel="alternate" hreflang="ur" href="' + SITE_URL + '/ur/' + t["slug"] + '">\n<link rel="alternate" hreflang="en" href="' + url + '">\n<link rel="alternate" hreflang="x-default" href="' + url + '">\n' 
    body = (page_head(title, desc, url, body_class="tool-page", extra=extra, body_extra=' data-tool="' + t["slug"] + '"')
    + site_header("")
    + '<main class="page" id="main">\n<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">\u203a</span> <a href="' + HUB_URLS[t["category"]] + '">' + esc(cat_label) + '</a> <span aria-hidden="true">\u203a</span> <span aria-current="page">' + esc(name) + '</span></nav>\n'
    + '<h1>' + esc(name) + '</h1>\n' + badge_html + ur_html
    + '<p><strong>' + esc(t["desc"]) + '</strong></p>\n'
    + '<section class="workspace" aria-label="' + esc(name) + ' tool">\n' + t["tool_ws"] + '\n</section>\n'
    + AD_SLOT % ("incontent", "incontent")
    + '<h2>What ' + esc(name) + ' does</h2>\n<p>' + esc(use) + '</p>\n'
    + '<h2>How to use ' + esc(name) + '</h2>\n<ol>' + steps_html + '</ol>\n'
    + '<h2>Tips for a good result</h2>\n<p>' + esc(tip) + '</p>\n'
    + '<div class="callout callout--limits"><p><strong>Limits to know about.</strong> ' + esc(limit) + '</p></div>\n'
    + '<h2>Example</h2>\n<p>' + esc(example) + '</p>\n'
    + '<h2>Frequently asked questions</h2>\n' + faq_html
    + '<div class="related">\n<h2>Related tools</h2>\n<div class="tool-grid">' + related_html + '</div>\n<p><a href="/tools">Browse all AK Premium tools \u2192</a></p>\n</div>\n'
    + '<div class="callout callout--privacy"><p>Your files are processed in your browser by ' + esc(name) + '. They are not uploaded to an AK Premium server, and you do not need an account. <a href="/privacy">Privacy Policy</a>.</p></div>\n'
    + AD_SLOT % ("bottom", "bottom")
    + '</main>\n' + FOOTER + CONSENT + page_scripts(libs, t["slug"]) + '</body>\n</html>\n')
    return body

def word_count(text):
    return len(re.findall(r"[A-Za-z\u0600-\u06FF]+", re.sub(r"<[^>]+>", " ", text)))

def build_tool_pages():
    out_dir = OUT / "tools"
    out_dir.mkdir(parents=True, exist_ok=True)
    counts = []
    for t in ALL_TOOLS:
        body = tool_page(t)
        # content word count: strip tags, count words in main
        wc = word_count(body)
        counts.append((t["slug"], wc))
        (out_dir / (t["slug"] + ".html")).write_text(body)
    return counts

# ---- Homepage: lists and searches tools, no workspaces ----
# Icon-tile variants (styles.css: 4 only). "warn" = text-only / basic tools
# whose output is limited; Pakistan and Excel get their own tile colour.
WARN_SLUGS = {"pdf-to-word", "pdf-to-excel", "pdf-to-ppt", "word-to-pdf", "excel-to-pdf", "ppt-to-pdf"}
def n_tools(n):
    """'1 tool' / 'N tools' — the hub.seeAll template has no plural form."""
    return "1 tool" if n == 1 else "%d tools" % n


def see_all_label(n):
    """'See all 1 tool' / 'See all N tools' (from locales)."""
    if n == 1:
        return STRINGS["hub"]["seeAllOne"]
    return STRINGS["hub"]["seeAll"].replace("{n}", str(n))


def card_icon_class(t):
    if t["slug"] in WARN_SLUGS: return " icon-warn"
    if t["category"] == "pakistan": return " icon-pk"
    if t["category"] == "excel": return " icon-excel"
    return ""

# Most-used tools, in the "Popular tools" strip at the top of the homepage.
# Global shell (design brief 2.2): the brief's 8 are Merge PDF, Compress PDF,
# JPG to PDF, PDF to Word, Image Compressor, Background Remover, Unit
# Converter, Percentage Calculator. Background Remover and Unit Converter
# do not exist yet (Wave 1 tools), so the strip uses the 6 named tools that
# exist plus PDF to Excel and Image to Text, the next most-used.
POPULAR = ["merge-pdf", "compress-pdf", "images-to-pdf", "pdf-to-word", "image-compressor", "percentage-calculator", "pdf-to-excel", "image-to-text"]
# The PDF section on the homepage shows these 8 (the most common PDF tasks)
# plus a "See all 27 tools" link to the /pdf-tools hub, which lists all 27.
TOP_PDF = ["merge-pdf", "compress-pdf", "split-pdf", "images-to-pdf", "pdf-to-word", "pdf-to-excel", "protect-pdf", "unlock-pdf"]
# Small pill shown at the top-right of a card (and on the tool page).
# Badges now live in data/tools.json ("badges").
BADGES = {e["slug"]: (e["badges"][0]["label"], e["badges"][0]["class"]) for e in REGISTRY if "badges" in e}
# Small format pill on Convert cards, so identical icons stay distinguishable.
# Format badges now live in data/tools.json ("format").
FORMAT = {e["slug"]: e["format"] for e in REGISTRY if "format" in e}
# Urdu subtitle under the six Pakistan cards (Phase 3a: lang="ur" dir="rtl").
# Urdu subtitles now live in data/tools.json ("ur_sub").
UR_SUB = {e["slug"]: e["ur_sub"] for e in REGISTRY if "ur_sub" in e}
# Urdu pages (Phase 3b): headings, steps, tips, limits and one FAQ per
# Pakistan tool. The tool controls themselves stay in English; the Urdu
# text around them explains the tool. These lines were written for this
# site, not translated by a machine, but they still need a native-speaker
# proofread before being called verified.
# Urdu page copy now lives in data/tools.json ("ur").
UR_CONTENT = {e["slug"]: {"name": e["ur"]["name"], "desc": e["ur"]["desc"], "steps": list(e["ur"]["steps"]), "tip": e["ur"]["tip"], "limit": e["ur"]["limit"], "faq": [tuple(f) for f in e["ur"]["faq"]]} for e in REGISTRY if "ur" in e}
# Search synonyms / Urdu aliases per tool (Phase 2.7). Name + category are
# already in data-keywords; these add the words people actually type.
# Search keywords now live in data/tools.json ("keywords").
KEYWORDS = {e["slug"]: ", ".join(e["keywords"]) for e in REGISTRY}

def card_html(t, extra_class=""):
    # Global shell: the card is a <div> so the favourite star can be a real
    # <button> next to the link (a button inside an <a> is invalid HTML).
    # The link keeps the row layout; the star sits at the top-right of the
    # card. data-slug is on the card so the search and the favourite
    # toggle can find it; data-target/data-group/data-keywords are unchanged.
    badge = BADGES.get(t["slug"])
    badge_html = '<span class="badge %s">%s</span>' % (badge[1], badge[0]) if badge else ""
    fmt = FORMAT.get(t["slug"])
    fmt_html = '<span class="format">%s</span>' % esc(fmt) if fmt else ""
    ur = UR_SUB.get(t["slug"])
    ur_html = '<span class="ur-sub" lang="ur" dir="rtl">%s</span>' % esc(ur) if ur else ""
    kw = (t["name"] + " " + t["category"] + " " + KEYWORDS.get(t["slug"], "")).strip()
    fav_label = STRINGS["favourites"]["add"].replace("{name}", t["name"])
    return ('<div class="tool-card%s%s" data-target="%s" data-group="%s" data-keywords="%s" data-slug="%s">'
            '<a class="tool-card-link" href="/tools/%s"><span class="icon"><svg aria-hidden="true"><use href="#%s"/></svg></span>'
            '<span class="tool-card-body"><span class="tool-card-head"><strong>%s</strong>%s%s</span>'
            '<span class="tool-card-desc">%s</span>%s</span></a>'
            '<button type="button" class="fav-btn" data-slug="%s" aria-pressed="false" aria-label="%s" title="%s">\u2605</button></div>' % (
                card_icon_class(t), extra_class, t["workspace"], esc(t.get("group", "")),
                esc(kw), t["slug"], t["slug"], esc(t["icon"]), esc(t["name"]), fmt_html, badge_html, esc(t["desc"]), ur_html,
                t["slug"], esc(fav_label), esc(fav_label)))

def build_homepage():
    n = len(ALL_TOOLS)
    # Popular strip: the 8 most-used tools, larger cards (design brief 2.2).
    popular = [next(t for t in ALL_TOOLS if t["slug"] == s) for s in POPULAR]
    cards = []
    # Recently used / Favourites (design brief 2.2): rendered empty and
    # hidden; core.js fills them from localStorage (only when they exist).
    cards.append('<section class="tool-section" id="section-recent" aria-label="Recently used" hidden><h2>' + esc(STRINGS["recent"]["heading"]) + '</h2><div class="tool-grid" id="recentGrid"></div><p><button type="button" class="btn-ghost" id="recentClear">' + esc(STRINGS["recent"]["clear"]) + '</button></p></section>')
    cards.append('<section class="tool-section" id="section-favourites" aria-label="Favourites" hidden><h2>' + esc(STRINGS["favourites"]["heading"]) + '</h2><div class="tool-grid" id="favGrid"></div><p class="section-sub">' + esc(STRINGS["favourites"]["empty"]) + '</p></section>')
    cards.append('<section class="tool-section" id="section-popular" aria-label="Popular tools"><h2>Popular tools</h2><div class="tool-grid">%s</div></section>' % "".join(card_html(t, " tool-card--popular") for t in popular))
    for cat in CAT_ORDER:
        if cat == "pdf":
            # PDF has 27 tools: show the top 8, link the rest to the hub.
            tools = [next(t for t in ALL_TOOLS if t["slug"] == s) for s in TOP_PDF]
            all_pdf = [t for t in ALL_TOOLS if t["category"] == "pdf"]
            cards.append('<section class="tool-section cv" id="section-pdf" aria-label="PDF Tools"><h2><a href="/pdf-tools">PDF Tools</a></h2><div class="tool-grid">%s</div><p class="see-all"><a href="/pdf-tools">%s \u2192</a></p></section>' % ("".join(card_html(t) for t in tools), see_all_label(len(all_pdf))))
            continue
        # Every other category: show the top 8, link the rest to the hub
        # (expansion brief §4.3; no homepage section has more than 8 cards).
        all_tools = [t for t in ALL_TOOLS if t["category"] == cat]
        if not all_tools: continue
        tools = all_tools[:8]
        cards.append('<section class="tool-section cv" id="section-%s" aria-label="%s"><h2><a href="%s">%s</a></h2><div class="tool-grid">%s</div><p class="see-all"><a href="%s">%s \u2192</a></p></section>' % (cat, CAT_LABELS[cat], HUB_URLS[cat], CAT_LABELS[cat], "".join(card_html(t) for t in tools), HUB_URLS[cat], see_all_label(len(all_tools))))
    # Country tools band (design brief 2.3): tabs per country. Only Pakistan
    # has tools today; the other tabs say so honestly and link to Contact.
    country_tabs = [("pk", "PK"), ("in", "IN"), ("ae", "AE"), ("uk", "UK"), ("us", "US")]
    country_names = {"pk": "Pakistan", "in": "India", "ae": "UAE & Saudi Arabia", "uk": "United Kingdom", "us": "United States"}
    pk_tools = [t for t in ALL_TOOLS if t["category"] == "pakistan"]
    tab_btns = "".join('<button type="button" class="country-tab%s" role="tab" data-country="%s" aria-selected="%s" aria-controls="country-panel-%s" id="country-tab-%s">%s</button>' % (" active" if code == "pk" else "", code, "true" if code == "pk" else "false", code, code, label) for code, label in country_tabs)
    panels = ['<div class="country-panel" role="tabpanel" data-panel="pk" id="country-panel-pk" aria-labelledby="country-tab-pk"><div class="tool-grid">' + "".join(card_html(t) for t in pk_tools) + '</div><p class="see-all"><a href="/country/pakistan">See all Pakistan tools \u2192</a></p></div>']
    for code, label in country_tabs[1:]:
        cname = country_names[code]
        panels.append('<div class="country-panel" role="tabpanel" data-panel="%s" id="country-panel-%s" aria-labelledby="country-tab-%s" hidden><p>%s</p><p><a href="/contact">%s</a></p></div>' % (code, code, code, esc(STRINGS["country"]["empty"].replace("{country}", cname)), esc(STRINGS["country"]["request"].replace("{country}", cname))))
    cards.append('<section class="tool-section cv country-band" id="section-country" aria-label="Country tools"><h2>Country tools</h2><p class="section-sub">Tools made for one country at a time. Pakistan is the first and fullest pack.</p><div class="country-tabs" role="tablist" aria-label="Countries">' + tab_btns + '</div>' + "".join(panels) + '</section>')
    # Islamic tools (design brief 2.3): Zakat exists today; prayer times and
    # a Hijri converter are planned for a later wave.
    zakat = next(t for t in ALL_TOOLS if t["slug"] == "zakat-calculator")
    cards.append('<section class="tool-section cv" id="section-islamic" aria-label="Islamic tools"><h2>Islamic tools</h2><div class="tool-grid">' + card_html(zakat) + '</div><p class="section-sub">' + esc(STRINGS["islamic"]["note"]) + '</p></section>')
    home_faq = [
        ("What is AK Premium?", "AK Premium is a free, browser-based toolkit with %d+ tools for PDF, image, text, Excel, everyday, developer, calculator, business, design and Pakistan tasks. Every tool runs in your browser, with no sign-up." % n),
        ("Is AK Premium free?", "Yes. The built-in tools on AK Premium are free to use in your browser."),
        ("Do files leave my browser?", "No. Built-in AK Premium tools process files locally in your browser using client-side JavaScript. Files are not uploaded to an AK Premium server."),
        ("Can I preview a file before converting it?", "Yes. When you choose a PDF, the tool page shows its name, size and page count and renders page 1 as a preview under the file chooser before you convert, so you can confirm it is the right document. Images show a thumbnail. Previews are made in your browser and files are not uploaded."),
        ("What are the limits of AK Premium?", "Each tool page states its own limits honestly. For example, PDF compression only re-encodes the photos inside a file, so a text-only PDF shrinks little, and Word, Excel and PowerPoint to PDF are basic text conversions that do not preserve exact layout, fonts or images. Scanned PDFs without a text layer need OCR first."),
        ("How do I find a tool?", "Use the search box at the top of the homepage, browse the category sections, or open a category hub such as PDF Tools or Calculators. Each tool has its own page, so you can bookmark it or share its link."),
        ("What country tools are there?", "Pakistan has a full country pack: salary tax, Zakat, land, amounts in words, Urdu word counting and merit. Tools for India, UAE & Saudi Arabia, the UK and the US are planned for later waves."),
    ]
    title = "Free Online Tools: PDF, Image, Calculators | " + SITE_NAME  # Phase 4.1: home title <= 60 chars (54); the H1 keeps the 68+ count.
    desc = "%d+ free online tools in your browser: PDF, image, video, calculators and more. No sign-up, no upload." % n
    faq_json = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in home_faq]}, ensure_ascii=False)
    app_json = json.dumps({"@context": "https://schema.org", "@type": "WebApplication", "name": SITE_NAME, "url": SITE_URL + "/", "applicationCategory": "BusinessApplication", "operatingSystem": "Web browser", "inLanguage": "en", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "description": desc, "featureList": [t["name"] for t in ALL_TOOLS]}, ensure_ascii=False)
    search_json = json.dumps({"@context": "https://schema.org", "@type": "WebSite", "name": SITE_NAME, "url": SITE_URL + "/", "potentialAction": {"@type": "SearchAction", "target": {"@type": "EntryPoint", "urlTemplate": SITE_URL + "/?q={search_term_string}"}, "query-input": "required name=search_term_string"}}, ensure_ascii=False)
    nr_before, nr_after = STRINGS["search"]["noResultsTitle"].split("{q}")
    body = (page_head(title, desc, SITE_URL + "/", extra='<script type="application/ld+json">' + app_json + '</script>\n<script type="application/ld+json">' + faq_json + '</script>\n<script type="application/ld+json">' + search_json + '</script>\n')
    + site_header("home")
    + '<main id="main" class="home-wrap">\n<section class="hero" aria-label="AK Premium tools">\n<h1>%d+ free online tools: PDF, image, video, calculators and more. Private, fast, in your browser.</h1>\n' % n
    + '<p class="hero-sub">Merge and compress PDFs, convert and edit images, work with video and audio, and use calculators for tax, loans and units. No sign-up, no upload.</p>\n'
    + '<div class="search-box"><label class="sr-only" for="heroSearch">Search AK Premium tools</label>\n<input id="heroSearch" type="search" placeholder="Search tools\u2026" autocomplete="off">\n<kbd class="search-kbd" aria-hidden="true">/</kbd><button type="button" class="search-clear" id="heroSearchClear" aria-label="Clear search" hidden>\u00d7</button></div>\n'
    + '<p class="trust-row"><span><svg aria-hidden="true"><use href="#i-check"/></svg>No upload</span><span><svg aria-hidden="true"><use href="#i-check"/></svg>No sign-up</span><span><svg aria-hidden="true"><use href="#i-check"/></svg>Free</span></p>\n'
    + '<p class="country-link">Country tools: <a href="#section-country">PK \u00b7 IN \u00b7 AE \u00b7 UK \u00b7 US \u2192</a></p>\n'
    + '<p id="searchStatus" class="search-status" role="status"></p>\n'
    + '<div id="noResults" class="no-results" hidden><p><strong>' + esc(nr_before) + '<span id="noResultsQuery"></span>' + esc(nr_after) + '</strong></p><p>' + esc(STRINGS["search"]["noResultsTry"]) + '</p><div class="no-results-links">'
    + "".join('<a href="/tools/%s">%s</a>' % (s, esc(next(t["name"] for t in ALL_TOOLS if t["slug"] == s))) for s in POPULAR[:4])
    + '</div><p>' + esc(STRINGS["search"]["noResultsRequest"]) + ' <a href="/contact">tell us which tool you need</a>.</p></div>\n'
    + '<div class="chips" aria-label="Trending searches">'
    + "".join('<button type="button" class="chip" data-query="%s">%s</button>' % (esc(q), esc(q)) for q in ["Merge PDF", "Compress PDF", "PDF to Word", "Image Compressor", "Percentage Calculator", "Zakat Calculator"])
    + '</div>\n</section>\n'
    + '<nav class="jump-bar" aria-label="Tool categories"><a href="#section-popular">Popular</a><a href="#section-pdf">PDF</a><a href="#section-convert">Convert</a><a href="#section-text">Text</a><a href="#section-image">Image</a><a href="#section-excel">Excel</a><a href="#section-calculators">Calculators</a><a href="#section-everyday">Everyday</a><a href="#section-developer">Developer</a><a href="#section-business">Business</a><a href="#section-design">Design</a><a href="#section-country">Country tools</a><a href="#section-islamic">Islamic</a><a href="#section-faq">FAQ</a></nav>\n'
    + AD_SLOT % ("leaderboard", "leaderboard")
    + "\n".join(cards)
    + '\n<section class="tool-section" id="section-faq" aria-label="Frequently asked questions"><h2>Frequently Asked Questions</h2>'
    + "".join('<h3>' + esc(q) + '</h3><p>' + esc(a) + '</p>' for q, a in home_faq)
    + '</section>\n</main>\n' + FOOTER + CONSENT + page_scripts([]) + '</body>\n</html>\n')
    (OUT / "index.html").write_text(body)
    return body

def build_tools_index():
    items = []
    for cat in CAT_ORDER_ALL:
        tools = [t for t in ALL_TOOLS if t["category"] == cat]
        if not tools: continue
        items.append('<h2><a href="' + HUB_URLS[cat] + '">' + CAT_LABELS[cat] + '</a></h2><ul>' + "".join('<li><a href="/tools/%s">%s</a> — %s</li>' % (t["slug"], esc(t["name"]), esc(t["desc"])) for t in tools) + '</ul>')
    title = "All Tools | " + SITE_NAME
    desc = "Browse all " + str(len(ALL_TOOLS)) + " free AK Premium tools: PDF, image, Excel, business, calculator and Pakistan tools, all in your browser."
    body = (page_head(title, desc, SITE_URL + "/tools")
    + site_header("tools") + '<main class="page" id="main">\n<p><a href="/">← All tools</a></p>\n<h1>All Tools</h1>\n<p>' + esc(desc) + '</p>\n' + "\n".join(items) + '\n</main>\n' + FOOTER + CONSENT + page_scripts([]) + '</body>\n</html>\n')
    (OUT / "tools" / "index.html").write_text(body)

# ---- Info pages: real, complete rewrites ----
def info_page(slug, title, desc, h1, body_html, extra="", active=""):
    url = SITE_URL + "/" + slug
    body = (page_head(title, desc, url, extra=extra)
    + site_header(active or slug) + '<main class="page" id="main">\n<h1>' + esc(h1) + '</h1>\n' + body_html + '\n</main>\n' + FOOTER + CONSENT + page_scripts([]) + '</body>\n</html>\n')
    (OUT / (slug + ".html")).write_text(body)

def build_info_pages():
    info_page("about", "About AK Premium | Free Browser Tools", "AK Premium is a free, browser-based toolkit run by Mirza Noman Ali. Learn who runs the site, why it exists, and how your files are handled.",
        "About AK Premium",
        '<p>AK Premium is a free, browser-based toolkit for PDF, image, Excel, business, calculator, design and Pakistan tasks. It is run by Mirza Noman Ali, a data analyst from Lahore, Pakistan, who built the site because the everyday tools he needed — merging a PDF, compressing a photo, building an Excel formula, checking salary tax — were either paid, required an account, or sent his files to a server.</p>'
        '<h2>Why this site exists</h2><p>The idea is simple: a tool should do one job well, in your browser, without asking for your files, your email or your money. AK Premium does not have paid features. Every tool on the site is free, and there is no account to create.</p>'
        '<h2>How the tools work</h2><p>Every tool runs in your browser with client-side JavaScript. When you choose a file, it is read by your browser, processed by your browser, and the result is downloaded to your device. AK Premium does not have a server that receives your files, and it does not store them.</p>'
        '<h2>Honest limits</h2><p>Each tool page states what its tool can and cannot do. Some conversions are basic text conversions, and some tools, such as PDF compression, trade one thing for another. Those limits are stated on the tool page, not hidden.</p>'
        '<h2>Contact</h2><p>If a tool does not work, or you have a suggestion, email <a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a>. There is no support team; the site is run by one person, and every message is read by him.</p>'
        '<p><a href="/whats-new">See what&rsquo;s new on AK Premium &rarr;</a></p>')
    info_page("privacy", "Privacy Policy | AK Premium", "AK Premium Privacy Policy: files are processed in your browser, cookies, Google AdSense and Analytics, third-party vendors, and how to opt out of personalized ads.",
        "Privacy Policy",
        '<p><strong>Last updated: 9 November 2026.</strong></p>'
        '<h2>Files you choose</h2><p>AK Premium does not collect, store or transmit the files you choose. Built-in tools process files locally in your browser using client-side JavaScript. Library files load from public CDNs, but your PDF, image and spreadsheet files are not uploaded to an AK Premium server.</p>'
        '<h2>Accounts and personal data</h2><p>AK Premium does not require an account, and does not ask you to sign up to use the built-in tools. If you contact us by email at <a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a>, we will only use your message to reply to you.</p>'
        '<h2>Cookies and consent</h2><p>AK Premium shows a cookie consent banner. Advertising and analytics scripts are loaded only after you accept. If you reject, those scripts are not loaded and no advertising or analytics cookies are set by this site. You can change your choice by clearing your browser storage for this site.</p>'
        '<h2>Google AdSense and third-party vendors</h2><p>AK Premium may show ads from Google AdSense once an AdSense account is approved and a client ID is set. Google, as a third-party vendor, uses cookies to serve ads on this site. Google\'s use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and other sites on the Internet. You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads">Google Ads Settings</a>. You can also opt out of a third-party vendor\'s use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info/choices/">www.aboutads.info/choices</a>. Ad slots on this site stay empty and invisible until an AdSense client ID is set, and no ad is placed inside or touching a tool interaction area or a button.</p>'
        '<h2>Google Analytics</h2><p>Google Analytics is loaded only after you accept cookies and only when a measurement ID is set. It collects anonymous usage information, such as which pages are visited, to help improve the site. No advertising or analytics runs while the measurement ID is empty.</p>'
        '<h2>Third-party libraries</h2><p>The site loads open libraries such as pdf-lib, pdf.js, jsPDF, SheetJS, Tesseract, mammoth, docx, pptxgenjs, JSZip and QRCode from public CDNs so tools can run in your browser. Those CDNs may log standard technical information, such as your IP address, when they serve a library file, as any web server does. The qpdf WebAssembly build used for Protect PDF and Unlock PDF is self-hosted on this site, not loaded from a CDN.</p>'
        '<h2>Contact</h2><p>For privacy questions, contact us at <a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a>.</p>')
    info_page("terms", "Terms of Service | AK Premium", "AK Premium Terms of Service: free browser tools, lawful use, no warranty, and your responsibility for the files you process.",
        "Terms of Service",
        '<p><strong>Last updated: 9 November 2026.</strong></p>'
        '<h2>Free tools, as they are</h2><p>AK Premium provides free, browser-based tools on an as-is basis, with no warranty of any kind. The tools are provided for lawful use only. You are responsible for the files you choose to process, and for keeping a copy of your original files before you use a tool.</p>'
        '<h2>What you must not do</h2><p>You must not use AK Premium to break the law, to infringe someone else\'s rights, to process files you do not have the right to process, or to try to recover a password for a file that is not yours. Protect PDF and Unlock PDF are for files you own and have the password for.</p>'
        '<h2>Results</h2><p>Results are generated in your browser. AK Premium does not guarantee that a conversion, calculation or generated formula is correct for your purpose. Check every result before you rely on it, and test generated formulas, VBA, regex and DAX on a copy of your data first. Tax and Zakat calculators are estimates only, not professional advice.</p>'
        '<h2>Changes</h2><p>AK Premium may change or remove tools at any time. These terms may be updated, and the last updated date above shows when they changed.</p>'
        '<h2>Contact</h2><p>For questions about these terms, contact <a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a>.</p>')
    info_page("disclaimer", "Disclaimer | AK Premium", "AK Premium Disclaimer: tools are not professional advice, text-based conversion limits, e-Sign is visual only, and generated code is a template.",
        "Disclaimer",
        '<p><strong>Last updated: 9 November 2026.</strong></p>'
        '<h2>Not professional advice</h2><p>Nothing on AK Premium is professional advice. Tax and Zakat calculators are estimates only, based on the figures stated on their pages. They are not tax advice, legal advice or religious advice. Consult a qualified professional before you act on a result.</p>'
        '<h2>Conversion limits</h2><p>PDF to Word, PDF to Excel and PDF to PPT rebuild text from the PDF text layer, so layout, fonts, images and complex tables are not preserved. Word, Excel and PowerPoint to PDF are basic text conversions with the same limits. Scanned PDFs without a text layer need OCR first, and OCR is not perfect.</p>'
        '<h2>e-Sign is visual only</h2><p>The e-Sign tool produces a visual signature image. It is not a legal digital signature and does not prove who signed a document.</p>'
        '<h2>Generated code and formulas</h2><p>Generated Excel formulas, VBA macros, regex patterns and DAX measures are templates built from fixed rules. They have not been run against your workbook or your data. Test them on a copy of your data before you use them.</p>'
        '<h2>Contact</h2><p>For questions, contact <a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a>.</p>')
    info_page("contact", "Contact AK Premium", "Contact AK Premium by email or with the form on this page. The site is run by Mirza Noman Ali.",
        "Contact AK Premium",
        '<div class="contact-layout"><div class="contact-info">'
        '<p>AK Premium is run by Mirza Noman Ali. The fastest way to reach him is email: <a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a>.</p>'
        '<h2>Email us</h2><p><a class="btn-primary" href="mailto:' + CONTACT_EMAIL + '?subject=AK%20Premium%20feedback">Email ' + CONTACT_EMAIL + '</a></p>'
        '<h2>What to tell us</h2><p>If a tool does not work, say which tool, what file you used, and what happened. A screenshot helps. Suggestions for new tools are welcome, especially tools that are useful in Pakistan.</p>'
        '</div><div class="contact-form-col">'
        '<h2>Send a message</h2>'
        '<p>Fill in the form and press Submit. Your message goes straight to Mirza Noman Ali through Google Forms. No email app is needed.</p>'
        '<iframe class="google-form-embed" src="' + FORM_EMBED + '" title="Contact AK Premium form" loading="lazy" style="width:100%;height:max(1000px, calc(100vh - 180px));border:0;border-radius:12px;background:#fff">Loading the contact form…</iframe>'
        '<p>If the form does not load, <a href="' + FORM_URL + '" target="_blank" rel="noopener">open the contact form in a new tab</a>.</p>'
        '</div></div>')
    info_page("cookies", "Cookie Policy | AK Premium", "AK Premium Cookie Policy: which cookies the site uses, what the consent banner does, and how to change your choice.",
        "Cookie Policy",
        '<p><strong>Last updated: 19 November 2026.</strong></p>'
        '<h2>What cookies are</h2><p>Cookies are small files a website asks your browser to store. AK Premium also uses local storage in your browser for the same kind of small settings. This page lists everything the site stores, and when.</p>'
        '<h2>What this site stores</h2><p>AK Premium stores only small settings in your browser, and only on your device:</p>'
        '<ul><li><strong>Theme</strong> (light or dark) and <strong>language, region, units and paper size</strong> choices, so the site looks and behaves the way you set it.</li>'
        '<li><strong>Your cookie choice</strong> (accepted or rejected), so the banner does not ask again.</li>'
        '<li><strong>Favourites and recently used tools</strong>, so the homepage can show them. These are tool names only, never file names or file contents.</li></ul>'
        '<p>None of these are sent to a server. They stay in your browser and you can delete them by clearing your browser storage for this site.</p>'
        '<h2>Advertising and analytics cookies</h2><p>Advertising (Google AdSense) and analytics (Google Analytics) scripts are loaded only after you press Accept on the consent banner, and only when their IDs are set. Both IDs are empty today, so no advertising or analytics cookies are set by this site at all. When an ID is set, Google may set cookies to serve ads or measure visits; see the Privacy Policy for how to opt out of personalized ads.</p>'
        '<h2>Third-party cookies</h2><p>The contact form is a Google Form. If you open or submit it, Google may set its own cookies, as it does on any Google Form. The libraries the tools use load from public CDNs; those CDNs may log standard technical information when they serve a file, as any web server does.</p>'
        '<h2>Changing your choice</h2><p>To change your consent, clear your browser storage for this site and reload the page; the banner will ask again. To delete the stored settings, clear your browser storage for this site.</p>'
        '<h2>Contact</h2><p>For questions about cookies, contact <a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a>.</p>')
    info_page("dmca", "DMCA | AK Premium", "AK Premium DMCA: how to report copyright infringement and how takedown notices are handled.",
        "DMCA",
        '<p><strong>Last updated: 19 November 2026.</strong></p>'
        '<h2>What this site hosts</h2><p>AK Premium is a set of browser tools built by Mirza Noman Ali. The site does not host user content: the tools process files in your own browser and do not upload, store or publish them, so there is no user-uploaded content on the site to take down.</p>'
        '<h2>How to send a takedown notice</h2><p>If you believe content on AK Premium infringes your copyright, send a notice by email to <a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a> with:</p>'
        '<ul><li>A description of the copyrighted work you believe is infringed.</li><li>The exact URL of the page on AK Premium where the material appears.</li><li>Your name, address, email and phone number.</li><li>A statement that you have a good-faith belief the use is not authorised by the copyright owner, its agent or the law.</li><li>A statement that the information in your notice is accurate and, under penalty of perjury, that you are authorised to act for the copyright owner.</li><li>Your physical or electronic signature.</li></ul>'
        '<h2>What happens next</h2><p>Each notice is reviewed. Material that infringes is removed or disabled promptly. If you believe material was removed by mistake, you can send a counter-notice with the same details to the same email address, and it will be reviewed the same way.</p>'
        '<h2>Contact</h2><p>For DMCA notices, email <a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a>.</p>')
    info_page("licenses", "Licenses | AK Premium", "AK Premium Licenses: the open-source libraries, icons and fonts the site uses, with their licences.",
        "Licenses",
        '<p><strong>Last updated: 19 November 2026.</strong></p>'
        '<p>AK Premium is built with open-source libraries, icons and fonts. Each one is listed below with its licence. The full licence text for each project is in that project\u2019s own repository.</p>'
        '<h2>Libraries</h2><ul>'
        '<li>pdf-lib \u2014 MIT License</li>'
        '<li>pdf.js \u2014 Apache License 2.0</li>'
        '<li>jsPDF \u2014 MIT License</li>'
        '<li>SheetJS \u2014 Apache License 2.0</li>'
        '<li>Tesseract.js \u2014 Apache License 2.0</li>'
        '<li>mammoth \u2014 MIT License</li>'
        '<li>docx \u2014 MIT License</li>'
        '<li>PptxGenJS \u2014 MIT License</li>'
        '<li>JSZip \u2014 MIT License</li>'
        '<li>QRCode \u2014 MIT License</li>'
        '<li>js-yaml (used by JSON to YAML and YAML to JSON) \u2014 MIT License</li>'
        '<li>SparkMD5 (used by Hash Generator for MD5) \u2014 WTFPL Version 2</li>'
        '<li>qpdf-wasm (used by Protect PDF and Unlock PDF) \u2014 wrapper under the MIT License; qpdf itself under the Apache License 2.0</li>'
        '<li>jsonrepair (used by JSON Formatter to repair broken JSON) \u2014 ISC License</li>'
        '<li>Ajv (used by JSON Formatter to validate JSON Schema) \u2014 MIT License</li>'
        '<li>jsonpath-plus (used by JSON Formatter for JSONPath queries) \u2014 MIT License</li>'
        '<li>marked (used by Markdown Previewer for full CommonMark rendering) \u2014 MIT License</li>'
        '<li>marked-footnote (used by Markdown Previewer for footnotes) \u2014 MIT License</li>'
        '<li>node-forge (used by e-Sign to read .p12 certificates and make detached PKCS#7 signatures) \u2014 BSD-3-Clause License</li>'
        '</ul><h2>Icons and fonts</h2><ul>'
        '<li>Lucide icons \u2014 ISC License</li>'
        '<li>Inter, Plus Jakarta Sans and Noto Nastaliq Urdu fonts \u2014 SIL Open Font License 1.1</li>'
        '</ul><p>The libraries are loaded from public CDNs or self-hosted on this site so the tools can run in your browser. Their licences do not change how the tools work for you.</p>'
        '<h2>Full licence texts</h2><p>The qpdf licence is kept on this site at <a href="/vendor/qpdf/LICENSE">vendor/qpdf/LICENSE</a>. The full third-party licence list is at <a href="/THIRD_PARTY_LICENSES">THIRD_PARTY_LICENSES</a>.</p>'
        '<h2>Contact</h2><p>For licence questions, contact <a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a>.</p>')

# ---- What's new (generated from CHANGELOG.md) + Pakistan hub ----
def md_to_html(text):
    out, para, ul = [], [], False
    def flush_para():
        nonlocal para
        if para:
            out.append("<p>" + esc(" ".join(para)) + "</p>")
            para = []
    def close_ul():
        nonlocal ul
        if ul:
            out.append("</ul>")
            ul = False
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            flush_para(); close_ul(); continue
        if line.startswith("## "):
            flush_para(); close_ul(); out.append("<h2>" + esc(line[3:].strip()) + "</h2>"); continue
        if line.startswith("### "):
            flush_para(); close_ul(); out.append("<h3>" + esc(line[4:].strip()) + "</h3>"); continue
        if line.startswith("# "):
            flush_para(); close_ul(); continue
        if line.startswith("- "):
            flush_para()
            if not ul:
                out.append("<ul>"); ul = True
            out.append("<li>" + esc(line[2:].strip()) + "</li>"); continue
        para.append(line)
    flush_para(); close_ul()
    return "\n".join(out)

def build_whats_new():
    changelog = (OUT / "docs" / "CHANGELOG.md").read_text()
    body_html = ("<p>The latest changes to AK Premium, newest first. Older entries are kept below, so you can see what changed and when.</p>\n"
                 + md_to_html(changelog))
    info_page("whats-new", "What's new | " + SITE_NAME, "The latest changes to AK Premium, newest first.",
              "What's new", body_html, active="whats-new")

# ---- Category hubs (Global shell, design brief 2.3 / expansion brief 4.2):
# one page per category with an 80-150-word intro, all its tools, a
# grid/list toggle, category tabs with counts, and 3-5 FAQs. The Pakistan
# hub lives at /country/pakistan (the country pack); /pakistan 301s to it.
def build_hub(hub):
    cat = hub["category"]
    tools = [t for t in ALL_TOOLS if t["category"] == cat]
    intro = hub["intro"]
    # Meta description: the intro's first sentence.
    desc = intro.split(". ")[0] + "."
    if len(desc) > 155:
        desc = desc[:152].rsplit(" ", 1)[0] + "."
    faq_json = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in hub["faqs"]]}, ensure_ascii=False)
    crumb_json = json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/"},
        {"@type": "ListItem", "position": 2, "name": hub["title"], "item": SITE_URL + hub["url"]}]}, ensure_ascii=False)
    extra = '<script type="application/ld+json">' + faq_json + '</script>\n<script type="application/ld+json">' + crumb_json + '</script>\n'
    # Category tabs: every hub, with its tool count; the current hub is marked.
    tabs = []
    for h in HUBS:
        n_h = len([t for t in ALL_TOOLS if t["category"] == h["category"]])
        cur = ' aria-current="page"' if h["category"] == cat else ""
        tabs.append('<a class="hub-tab" href="' + h["url"] + '"' + cur + '>' + h["title"] + ' (' + str(n_h) + ')</a>')
    ur_html = ('<p class="section-sub" lang="ur" dir="rtl">' + esc(hub["ur_intro"]) + '</p>\n') if "ur_intro" in hub else ""
    grid_html = '<div class="tool-grid hub-grid" id="hubGrid">' + "".join(card_html(t) for t in tools) + '</div>'
    if cat == "pakistan":
        grid_html = '<div class="pk-band">' + grid_html + '</div>'
    body_html = ('<p>' + esc(intro) + '</p>\n' + ur_html
        + '<nav class="hub-tabs" aria-label="Tool categories">' + "".join(tabs) + '</nav>\n'
        + '<div class="hub-tools-head"><h2>All ' + n_tools(len(tools)) + '</h2>'
        + '<div class="view-toggle" role="group" aria-label="Change view"><button type="button" data-view="grid" class="active" aria-pressed="true">' + esc(STRINGS["hub"]["gridView"]) + '</button><button type="button" data-view="list" aria-pressed="false">' + esc(STRINGS["hub"]["listView"]) + '</button></div></div>\n'
        + grid_html + '\n'
        + '<h2>Frequently asked questions</h2>\n' + "".join('<details><summary>' + esc(q) + '</summary>\n<p>' + esc(a) + '</p></details>' for q, a in hub["faqs"])
        + '<p><a href="/tools">Browse all AK Premium tools \u2192</a></p>')
    url = SITE_URL + hub["url"]
    body = (page_head(hub["title"] + " | " + SITE_NAME, desc, url, extra=extra)
        + site_header("country" if cat == "pakistan" else "")
        + '<main class="page" id="main">\n<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">\u203a</span> <span aria-current="page">' + esc(hub["title"]) + '</span></nav>\n'
        + '<h1>' + esc(hub["title"]) + '</h1>\n' + body_html + '\n</main>\n' + FOOTER + CONSENT + page_scripts([]) + '</body>\n</html>\n')
    out_path = OUT / (hub["url"].lstrip("/") + ".html")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(body)

def build_hubs():
    for hub in HUBS:
        build_hub(hub)

# ---- Urdu pages (Phase 3b): /ur/ index + one page per Pakistan tool ----
def build_ur_tool_page(t):
    u = UR_CONTENT[t["slug"]]
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in u["faq"]]}
    extra = '<script type="application/ld+json">' + json.dumps(faq_ld, ensure_ascii=False) + '</script>\n'
    extra += '<link rel="alternate" hreflang="ur" href="' + SITE_URL + '/ur/' + t["slug"] + '">\n<link rel="alternate" hreflang="en" href="' + SITE_URL + '/tools/' + t["slug"] + '">\n<link rel="alternate" hreflang="x-default" href="' + SITE_URL + '/tools/' + t["slug"] + '">\n'
    body = (page_head(u["name"] + " | " + SITE_NAME, u["desc"], SITE_URL + "/ur/" + t["slug"], extra=extra, lang="ur", dir="rtl")
    + site_header("", lang_href="/", lang_label="English", lang_lang="en")
    + '<main class="page" id="main">\n<nav class="crumbs" aria-label="Breadcrumb"><a href="/ur/">پاکستان ٹولز</a> <span aria-hidden="true">›</span> <span aria-current="page">' + esc(u["name"]) + '</span></nav>\n'
    + '<h1 lang="ur" dir="rtl">' + esc(u["name"]) + '</h1>\n<p lang="ur" dir="rtl"><strong>' + esc(u["desc"]) + '</strong></p>\n'
    + '<section class="workspace" dir="ltr" aria-label="' + esc(t["name"]) + ' tool">\n' + t["tool_ws"] + '\n</section>\n'
    + '<h2 lang="ur" dir="rtl">استعمال کا طریقہ</h2>\n<ol>' + "".join('<li lang="ur" dir="rtl">' + esc(s) + '</li>' for s in u["steps"]) + '</ol>\n'
    + '<h2 lang="ur" dir="rtl">نصیحت</h2>\n<p lang="ur" dir="rtl">' + esc(u["tip"]) + '</p>\n'
    + '<div class="callout callout--limits"><p lang="ur" dir="rtl"><strong>حدود:</strong> ' + esc(u["limit"]) + '</p></div>\n'
    + '<h2 lang="ur" dir="rtl">عمومی سوالات</h2>\n' + "".join('<details><summary lang="ur" dir="rtl">' + esc(q) + '</summary>\n<p lang="ur" dir="rtl">' + esc(a) + '</p></details>' for q, a in u["faq"])
    + '<div class="related">\n<h2 lang="ur" dir="rtl">متعلقہ ٹولز</h2>\n<div class="tool-grid">' + "".join(card_html(r) for r in related_tools(t)) + '</div>\n<p><a href="/tools">Browse all AK Premium tools →</a></p>\n</div>\n'
    + '<div class="callout callout--privacy"><p lang="ur" dir="rtl">آپ کی فائلیں آپ کے براؤزر میں ہی پروسیس ہوتی ہیں، کہیں اپ لوڈ نہیں ہوتیں۔ <a href="/privacy">Privacy Policy</a>.</p></div>\n'
    + '</main>\n' + FOOTER + CONSENT + page_scripts(LIB_MAP.get(t["workspace"], []), t["slug"]) + '</body>\n</html>\n')
    (OUT / "ur" / (t["slug"] + ".html")).write_text(body)

def build_ur_index():
    tools = [t for t in ALL_TOOLS if t["slug"] in UR_CONTENT]
    cards = ""
    for t in tools:
        u = UR_CONTENT[t["slug"]]
        cards += ('<a class="tool-card' + card_icon_class(t) + '" href="/ur/' + t["slug"] + '">'
                  '<span class="icon"><svg aria-hidden="true"><use href="#' + esc(t["icon"]) + '"/></svg></span>'
                  '<span class="tool-card-body"><span class="tool-card-head"><strong lang="ur" dir="rtl">' + esc(u["name"]) + '</strong></span>'
                  '<span class="tool-card-desc" lang="ur" dir="rtl">' + esc(u["desc"]) + '</span>'
                  '<span class="tool-card-desc">' + esc(t["name"]) + '</span></span></a>')
    extra = '<link rel="alternate" hreflang="ur" href="' + SITE_URL + '/ur/">\n<link rel="alternate" hreflang="en" href="' + SITE_URL + '/country/pakistan">\n<link rel="alternate" hreflang="x-default" href="' + SITE_URL + '/country/pakistan">\n'
    body = (page_head("پاکستان ٹولز | " + SITE_NAME, "پاکستان کے لیے مفت ٹولز: ٹیکس، زکوٰۃ، زمین، رقم الفاظ میں، اردو الفاظ اور میرٹ کیلکولیٹر۔", SITE_URL + "/ur/", extra=extra, lang="ur", dir="rtl")
    + site_header("", lang_href="/", lang_label="English", lang_lang="en")
    + '<main class="page" id="main">\n<h1 lang="ur" dir="rtl">پاکستان ٹولز</h1>\n<p lang="ur" dir="rtl"><strong>ٹیکس، زکوٰۃ، زمین اور اردو کے مفت ٹولز۔ آپ کی فائلیں آپ کے براؤزر سے باہر نہیں جاتیں۔</strong></p>\n'
    + '<div class="tool-grid">' + cards + '</div>\n'
    + '<p lang="ur" dir="rtl"><a href="/tools">تمام ٹولز دیکھیں</a> · <a href="/country/pakistan">Pakistan Tools (English)</a></p>\n'
    + '</main>\n' + FOOTER + CONSENT + page_scripts([]) + '</body>\n</html>\n')
    (OUT / "ur" / "index.html").write_text(body)

def build_ur_pages():
    (OUT / "ur").mkdir(parents=True, exist_ok=True)
    for t in ALL_TOOLS:
        if t["slug"] in UR_CONTENT:
            build_ur_tool_page(t)
    build_ur_index()

# ---- Sitemap, robots, 404 ----
def git_lastmod(rel_path):
    """Real per-page lastmod (expansion brief 10): the date of the last
    commit that changed this file on main. The repo is read from a local
    clone (AK_GIT, default ~/workspace/ak-premium-git); run `git pull` in
    it before building so the dates are current. If the generated file
    differs from HEAD it will change in the next commit, so the build date
    is used instead; if git is unavailable, the build date is used too."""
    gitdir = os.environ.get("AK_GIT") or str(pathlib.Path.home() / "workspace" / "ak-premium-git")
    try:
        head = subprocess.run(["git", "-C", gitdir, "show", "HEAD:" + rel_path],
                              capture_output=True, timeout=30)
        cur = (OUT / rel_path).read_bytes() if (OUT / rel_path).exists() else None
        if head.returncode != 0 or cur is None or head.stdout != cur:
            return BUILD_DATE
        log = subprocess.run(["git", "-C", gitdir, "log", "-1", "--format=%cs",
                              "--", rel_path], capture_output=True, text=True, timeout=30)
        d = log.stdout.strip()
        return d if re.fullmatch(r"\d{4}-\d{2}-\d{2}", d) else BUILD_DATE
    except Exception:
        return BUILD_DATE


def build_seo_files():
    pages = [(SITE_URL + "/", "index.html"),
             (SITE_URL + "/whats-new", "whats-new.html"),
             (SITE_URL + "/about", "about.html"),
             (SITE_URL + "/privacy", "privacy.html"),
             (SITE_URL + "/terms", "terms.html"),
             (SITE_URL + "/disclaimer", "disclaimer.html"),
             (SITE_URL + "/cookies", "cookies.html"),
             (SITE_URL + "/dmca", "dmca.html"),
             (SITE_URL + "/licenses", "licenses.html"),
             (SITE_URL + "/contact", "contact.html"),
             (SITE_URL + "/tools", "tools/index.html")]
    # Category hubs (incl. /country/pakistan); /pakistan is a 301 to it.
    for h in HUBS:
        pages.append((SITE_URL + h["url"], h["url"].lstrip("/") + ".html"))
    for t in ALL_TOOLS:
        pages.append((tool_url(t), "tools/" + t["slug"] + ".html"))
    pages.append((SITE_URL + "/ur/", "ur/index.html"))
    for t in ALL_TOOLS:
        if t["slug"] in UR_CONTENT:
            pages.append((SITE_URL + "/ur/" + t["slug"], "ur/" + t["slug"] + ".html"))
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u, rel in pages:
        # Real per-page lastmod (git date); no changefreq/priority (Phase 4.1).
        sitemap += '  <url><loc>' + esc(u) + '</loc><lastmod>' + git_lastmod(rel) + '</lastmod></url>\n'
    sitemap += '</urlset>\n'
    (OUT / "sitemap.xml").write_text(sitemap)
    (OUT / "robots.txt").write_text("User-agent: *\nAllow: /\nSitemap: " + SITE_URL + "/sitemap.xml\n")
    body = (page_head("Page Not Found | " + SITE_NAME, "The page you were looking for does not exist on AK Premium. Browse all free tools instead.", SITE_URL + "/404")
    + site_header("") + '<main class="page" id="main">\n<h1>Page not found</h1>\n<p>Sorry, that page does not exist. It may have moved, or the link may be wrong.</p>\n<p><a href="/">Go to the homepage</a> or <a href="/tools">browse all tools</a>.</p>\n</main>\n' + FOOTER + CONSENT + page_scripts([]) + '</body>\n</html>\n')
    (OUT / "404.html").write_text(body)
    return len(pages)

# ---- Service worker (Phase 4.4): cache the hashed core assets and the
# key pages on install; serve /assets/ cache-first (they are content-hashed
# and immutable) and pages network-first with a cache fallback. No "Works
# offline" badge is shown anywhere until this is tested in a real browser.
def build_sw():
    precache = ["/", "/country/pakistan", "/tools", HASHED["styles"], HASHED["common"], HASHED["core"],
                "/assets/fonts/inter-var.woff2", "/assets/fonts/plus-jakarta-var.woff2",
                "/assets/fonts/noto-nastaliq-urdu.woff2", "/assets/og-image.png", "/favicon.svg"]
    sw = '''/* AK Premium service worker (v18). Generated by build.py; do not hand-edit. */
const CACHE = "ak-premium-v23";
const PRECACHE = %s;
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    })));
    return;
  }
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request).then((hit) => hit || caches.match("/"))));
});
''' % json.dumps(precache)
    (OUT / "sw.js").write_text(sw)

def build_search_index():
    """search-index.json (expansion brief 3.1/4.3): the whole registry in
    search shape, so the homepage search can run off an index instead of
    the DOM. Only published tools are listed."""
    entries = [{"slug": e["slug"], "title": e["title"]["en"],
                "short": e["short"]["en"], "category": e["category"],
                "keywords": e["keywords"], "icon": e["icon"],
                "iconClass": card_icon_class(e).strip(),
                "badges": e.get("badges", []), "format": e.get("format", "")}
               for e in REGISTRY if e.get("status", "published") == "published"]
    (OUT / "data").mkdir(exist_ok=True)
    (OUT / "data" / "search-index.json").write_text(
        json.dumps({"version": 1, "tools": entries}, ensure_ascii=False, indent=1) + "\n")
    return len(entries)


def write_id2slug():
    """Element id -> tool slug map for the per-tool JS split (Phase 4.3).
    split-app.py reads BUILD/id2slug.json and routes each app.js chunk to
    tools/<slug>.js. An id used by more than one tool's workspace is shared
    (listed separately); a chunk touching a shared id goes to core.js."""
    id2slug, shared = {}, set()
    for t in ALL_TOOLS:
        for m in re.finditer(r'id="([^"]+)"', t["tool_ws"]):
            i = m.group(1)
            if i in shared:
                continue
            if i in id2slug and id2slug[i] != t["slug"]:
                shared.add(i)
                id2slug.pop(i, None)
            elif i not in id2slug:
                id2slug[i] = t["slug"]
    (BUILD / "id2slug.json").write_text(json.dumps({"map": id2slug, "shared": sorted(shared)}, indent=1, sort_keys=True) + "\n")
    return len(id2slug), len(shared)


def build_generator_files():
    """Ship the generator in the repo (expansion brief 3.1): build.py, the
    vendored v3 index, the README, the registry source, the hub content and
    the UI strings are copied into OUT/build/ (excluded from deployment by
    .vercelignore), and public copies of the registry and the UI strings are
    written to OUT/data/tools.json and OUT/locales/en.json (re-created on
    every build; edit the sources in build/data/ and build/locales/)."""
    gen = OUT / "build"
    (gen / "data").mkdir(parents=True, exist_ok=True)
    (gen / "locales").mkdir(parents=True, exist_ok=True)
    for src_file, dst_file in [(BUILD / "build.py", gen / "build.py"),
                               (BUILD / "v3-index.html", gen / "v3-index.html"),
                               (BUILD / "README.md", gen / "README.md"),
                               (BUILD / "split-app.py", gen / "split-app.py"),
                               (BUILD / "dump-id2slug.py", gen / "dump-id2slug.py"),
                               (BUILD / "id2slug.json", gen / "id2slug.json"),
                               (BUILD / "id2cat.json", gen / "id2cat.json"),
                               (BUILD / "data" / "tools.json", gen / "data" / "tools.json"),
                               (BUILD / "data" / "hubs.json", gen / "data" / "hubs.json"),
                               (BUILD / "locales" / "en.json", gen / "locales" / "en.json")]:
        if src_file.exists() and src_file.resolve() != dst_file.resolve():
            shutil.copyfile(src_file, dst_file)
    (OUT / "data").mkdir(exist_ok=True)
    shutil.copyfile(BUILD / "data" / "tools.json", OUT / "data" / "tools.json")
    (OUT / "locales").mkdir(exist_ok=True)
    # v18: write the substituted STRINGS (header-search count resolved), not
    # the raw source file, so the public copy never shows "{n}".
    (OUT / "locales" / "en.json").write_text(json.dumps(STRINGS, ensure_ascii=False, indent=1) + "\n")


def main():
    n_ids, n_shared = write_id2slug()
    print("id2slug: %d unique ids, %d shared" % (n_ids, n_shared))
    # Per-tool JS hashes (Phase 4.3, v12): split-app.py must run before the
    # build, so tools/<slug>.js exist by now. Each tool page loads core.js
    # plus its own file, both deferred and content-hashed.
    for _t in ALL_TOOLS:
        HASHED["tool-" + _t["slug"]] = hashed_asset("assets/js/tools/" + _t["slug"] + ".js")
    # v18: the header-search count is dynamic from the registry total, so it
    # never goes stale again. Only the headerSearch strings carry "{n}" as a
    # build-time placeholder; other "{n}" strings (hub "See all", search
    # results) are runtime placeholders replaced by core.js, so the
    # substitution below is deliberately targeted, not a blanket replace.
    _total = len(ALL_TOOLS)
    STRINGS["headerSearch"]["hint"] = STRINGS["headerSearch"]["hint"].replace("{n}", str(_total))
    STRINGS["headerSearch"]["placeholder"] = STRINGS["headerSearch"]["placeholder"].replace("{n}", str(_total))
    # window.AK_STRINGS as an external file (Phase 4.2, CSP): the UI strings
    # from locales/en.json, so no page needs an inline script.
    (OUT / "assets" / "js" / "strings.js").write_text("window.AK_STRINGS=" + json.dumps(STRINGS, ensure_ascii=False) + ";\n")
    HASHED["theme-init"] = hashed_asset("assets/js/theme-init.js")
    HASHED["strings"] = hashed_asset("assets/js/strings.js")
    counts = build_tool_pages()
    build_homepage()
    build_tools_index()
    build_info_pages()
    build_whats_new()
    build_hubs()
    build_ur_pages()
    build_sw()
    n_urls = build_seo_files()
    n_index = build_search_index()
    build_generator_files()
    print("tool pages:", len(counts))
    print("search index tools:", n_index)
    print("word counts (whole page incl. header/footer): min %d, max %d" % (min(w for _, w in counts), max(w for _, w in counts)))
    print("sitemap URLs:", n_urls)
    for slug, wc in sorted(counts, key=lambda x: x[1])[:5]:
        print("  shortest:", slug, wc)

if __name__ == "__main__":
    main()

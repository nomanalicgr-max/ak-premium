# AK Premium — generator README

This folder is the **generator** for the AK Premium site. The site itself is
static HTML + CSS + vanilla JS; every page is generated from one registry
file, never hand-edited.

## Layout

- `build.py` — the page generator. Run it: `python3 build.py`.
  It writes the whole site to `OUT`:
  - in this workspace: `~/workspace/ak-premium-v4/` (next to this folder)
  - in the repo: the repo root (this folder sits at `<repo>/build/`)
  - override with the `AK_OUT` environment variable.
- `data/tools.json` — **the single source of truth for every tool**
  (expansion brief §3.1). One entry per tool: slug, workspace, title/short
  (English, `{en: ...}`), category, group, icon, keywords, libs, engine,
  maxFileMB, wave, status, regions, lastReviewed, plus optional badges,
  format, related, steps, content (use/tip/limit/example/faq),
  meta_description, ur_sub and ur (Urdu copy). See the file itself; every
  field is used by `build.py` except the ones marked optional.
- `v3-index.html` — vendored copy of the old v3 homepage. `build.py`
  extracts the tool workspace HTML from it (`extract_workspace`). Do not
  edit it; new tools get their workspace HTML in `build.py` (`ws_replace`,
  `EXCEL_WS`, `PAKISTAN_WS`) or in the registry's future `workspace_html`.
- `app.js` — the source of the site's JavaScript (tool handlers, helpers).
  It is **not** rebuilt by `build.py`. `split-app.py` splits it into
  `core.js` + one `tools/<slug>.js` per tool (`assets/js/` in the output);
  the split is verified lossless (3,356 code lines, 0 missing/extra).
  Edit a handler in `app.js`, re-run `split-app.py`, then `build.py`.
  `id2slug.json` (element id -> tool slug, from `dump-id2slug.py`) drives
  the split: a chunk whose ids all belong to one tool goes to that tool's
  file; shared ids or shared helpers go to `core.js`.
- `data/hubs.json` — the 10 category hub pages (url, title, 80–150-word
  intro, 4 FAQs each; the Pakistan hub also has `ur_intro`). `build.py`
  builds every hub from this file; the homepage sections link to the hubs.
- `locales/en.json` — the English UI strings for the Global shell
  (globe panel, header search, favourites/recent, country empty state,
  Islamic note, hub labels). `build.py` renders the static shell from it
  and writes it as `assets/js/strings.js` (`window.AK_STRINGS`) for the JS.
- `migrate-to-registry.py`, `switch-to-registry.py` — the one-off scripts
  that created the registry and switched the generator to it (Foundation).
  Kept for the record; do not re-run them.
- `inventory.json` — superseded by `data/tools.json`. Kept as a backup
  only; `build.py` no longer reads it.

## How to add a tool

1. Add one entry to `data/tools.json` (copy a similar tool's entry).
   Keep the slug stable — it is the URL (`/tools/<slug>`) and must never
   change once published. Set `"status": "draft"` until it passes the
   Quality Gate (expansion brief §9); draft tools are not published and
   are not listed in `search-index.json`.
2. Add its workspace HTML (the form the visitor uses) — either a
   `ws_replace(...)` / `EXCEL_WS` / `PAKISTAN_WS` literal in `build.py`,
   or a new `tool-<name>` section in `v3-index.html` — and its handlers
   in `app.js` (then re-run `split-app.py`).
3. Run `python3 build.py` and check the diff: only the new tool's page,
   the homepage, `/tools`, the sitemap and the search index should change.
4. Run the smoke test (`~/workspace/tools/jsdom-test/run-v12.js`).
   Do not deploy until it passes.

## What build.py generates

`index.html`, `tools/<slug>.html`, `tools/index.html`, `/ur/` pages,
info pages (about/privacy/terms/disclaimer/contact/cookies/dmca/licenses),
`whats-new`, the 10 category hub pages (`/pdf-tools`, `/image-tools`,
`/convert-tools`, `/calculators`, `/developer-tools`, `/excel-tools`,
`/business-tools`, `/everyday-tools`, `/design-tools`,
`/country/pakistan`), `sitemap.xml`, `robots.txt`, `404.html`, `sw.js`,
`data/search-index.json` (published tools only), `data/tools.json`
(public copy of the registry), `locales/en.json` (public copy of the
strings) and `build/` (a copy of this generator: `build.py`,
`v3-index.html`, `README.md`, `data/tools.json`, `data/hubs.json`,
`locales/en.json`).

`build/` is excluded from deployment by `.vercelignore` (it is in the
repo for transparency, not served). `data/tools.json` at the site root
**is** served — it is public tool metadata.

## Sitemap lastmod (real per-page dates)

`build_seo_files()` sets each URL's `<lastmod>` to the date of the last
commit that changed that file on main, read from a local clone of the
repo (`AK_GIT`, default `~/workspace/ak-premium-git`). Run
`git -C ~/workspace/ak-premium-git pull` before building so the dates
are current. If a generated file differs from HEAD (it will change in
the next commit) or git is unavailable, the build date is used instead.

## Rules (from the briefs)

- Never change tool URLs/slugs once published. If a URL must change,
  add a 301 in `vercel.json`.
- Never change tax slabs, Zakat figures, or any numbers in
  `assets/data/tax-slabs.json` (they are verified FBR figures).
- Never invent data: no fake ratings, reviews, counts or testimonials.
- The per-tool JS split is `core.js` + one `tools/<slug>.js` per tool
  (v12, design brief §4.3). Shared helpers and pure-logic functions stay
  in `core.js`; the three Excel wizard task tables live in their own tool
  files. The split is verified lossless (3,356 code lines, 0 missing/extra).
  See `split-app.py` and `id2slug.json`.
- `maxFileMB` mirrors the `MAX_FILE_BYTES` guard in `app.js` (50 MB).

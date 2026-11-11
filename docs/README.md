# AK Premium v4

A free, 100% client-side (browser-only) toolkit: PDF, image, Excel,
calculator, developer, business, design and Pakistan tools. No file is
uploaded to an AK Premium server. Static site, no backend.

## What you must fill in manually

Only these five things. Everything else is done.

1. **Domain** — edit `SITE_URL` in `config.js` (currently
   `https://ak-premium.vercel.app`), then run `python3
   ../ak-premium-v4-build/build.py` to regenerate canonical URLs,
   sitemap, Open Graph tags and JSON-LD. Then add the domain in Vercel
   and submit the sitemap in Google Search Console.
2. **ADSENSE_CLIENT_ID** — in `config.js`. Leave empty (`""`) until
   Google AdSense approves this site. Ads and the ad slots stay
   completely disabled while it is empty. Do not invent an ID.
3. **GA_MEASUREMENT_ID** — in `config.js`. Leave empty (`""`) until
   you create a Google Analytics property. Analytics stays completely
   disabled while it is empty.
4. **CONTACT_EMAIL** — in `config.js`. Currently
   `nomanalicgr@gmail.com`. Change it there and re-run the build script
   so the contact page and footers update.
5. **Verified tax slabs** — in `assets/data/tax-slabs.json`. Tax Year
   2026 and 2027 are verified from official FBR sources (2026-11-09).
   Tax Year 2025 was intentionally omitted because its slabs were not
   directly verified from an official FBR document. Do not add it
   without verifying FBR Circular No. 01 of 2024-25 first. The Zakat
   bank nisab figure (Rs 503,529, Ramadan 2026) is shown only as
   reported, not verified — check the official notification each year
   before Ramadan.

## How to build

```bash
python3 ../ak-premium-v4-build/build.py
```

This regenerates `index.html`, `tools/*.html`, `tools/index.html`,
the info pages, `sitemap.xml`, `robots.txt` and `404.html` from
`config.js` and the tool definitions in the build script. Do not edit
generated pages by hand — edit the build script and re-run it.

## How to test

See `TESTING.md` for the full test record, including what was tested in
jsdom, in Node unit tests, and what must be verified in a real browser
after deploy (Compress Medium/Strong, Redact rasterization, qpdf Web
Worker, OCR language download, Lighthouse).

## Structure

- `index.html` — homepage (lists and searches tools, no workspaces)
- `tools/<slug>.html` — one crawlable page per tool (68 tools)
- `tools/index.html` — all tools by category
- `about.html`, `privacy.html`, `terms.html`, `disclaimer.html`,
  `contact.html` — info pages
- `config.js` — the single place for site settings
- `assets/css/styles.css`, `assets/js/app.js`, `assets/js/common.js`
  (consent, ads, analytics, dark mode), `assets/js/qpdf-worker.js`
- `assets/data/tax-slabs.json` — FBR salary tax slabs
- `vendor/qpdf/` — self-hosted qpdf-wasm 0.1.0 (qpdf 12.2.0, AES-256)
- `vercel.json` — cleanUrls + security headers
- `sitemap.xml`, `robots.txt`, `404.html`, `favicon.svg`, `ads.txt`
  (placeholder — add authorised seller lines only after approval)

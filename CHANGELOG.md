# AK Premium — Changelog

## v4 — 9 November 2026

A full rebuild of the site as a clean, professional, AdSense-ready static
asset. All v3 tools are kept; weak tools are fixed for real, and six new
Pakistan/Urdu tools are added.

### Architecture
- Static site, no backend. Each of the 68 tools has its own crawlable
  page at /tools/<slug> (clean URLs via vercel.json cleanUrls). The
  homepage lists and searches tools but no longer contains every tool
  workspace.
- /config.js is the single place for SITE_NAME, SITE_URL, CONTACT_EMAIL,
  ADSENSE_CLIENT_ID and GA_MEASUREMENT_ID. Canonical URLs, sitemap,
  Open Graph tags and JSON-LD are generated from SITE_URL by build.py.
  Ads and analytics stay completely disabled while their IDs are empty.
- Heavy libraries (pdf-lib, pdf.js, Tesseract, SheetJS, qpdf-wasm) load
  only on the pages that need them, with pinned versions. The homepage
  loads no heavy libraries.
- New files: vercel.json (cleanUrls + security headers), 404.html,
  favicon.svg, ads.txt (placeholder), /assets/data/tax-slabs.json,
  /vendor/qpdf (self-hosted qpdf-wasm 0.1.0).
- Shared header, footer, ad component, consent banner and styles.
  Consent banner (accept/reject) blocks ad and analytics scripts until
  consent. Ad slots are responsive with reserved min-height (no layout
  shift), at most one above the fold, none inside or touching the tool
  interaction area or buttons, one in-content and one at the bottom.
  Slots stay empty and invisible if no AdSense client ID is set.
- Dark mode (follows the operating system, with a manual toggle).
  Drag-and-drop uploads, progress indicators, human error messages,
  50 MB per-file limit with a friendly warning, labels on inputs,
  keyboard focus styles, aria-live results.

### Fixed tools (real fixes, no fake claims)
- Compress PDF: 3 levels. Light re-saves with object streams.
  Medium and Strong render pages with pdf.js and re-encode as JPEG at
  the chosen quality. Original size, new size and % saved are shown.
  Strong warns that text becomes non-selectable.
- Protect PDF and Unlock PDF: real standard AES-256 PDF encryption and
  decryption with qpdf-wasm (qpdf 12.2.0, self-hosted, in a Web Worker).
  The fake .akenc approach is removed completely. Wrong password gives
  a clear wrong-password message; a non-encrypted file is reported as
  such. Round-trip tested: encrypt → inspect → wrong password rejected
  → decrypt restores the original pages.
- Redact PDF: true redaction. Pages with a match are rasterized and the
  black box is burned into the image, so the text layer on those pages
  is destroyed. Unaffected pages are copied unchanged.
- PDF to Word / Excel / PPT: paragraphs and simple tables rebuilt from
  pdf.js text positions (lines by y-coordinate, columns by x-gaps).
  PDF to Word has an optional OCR fallback for scanned PDFs. Honest
  notes about layout limits are on each tool page.
- Word / PPT / Excel to PDF: kept and labelled "Basic text conversion"
  in the tool title and on the page, because layout, fonts, images and
  charts are not preserved.
- Split PDF: multiple ranges (1-3, 5, 8-10), "extract every page" as a
  ZIP, and ranges validated against the real page count.
- Merge PDF: drag-and-drop reordering with page thumbnails.
- Organize PDF: visual thumbnail reordering, delete and rotate per page.
- Image Compressor: batch upload, target quality or target file size,
  PNG/WebP/JPEG format options, before/after sizes, ZIP for multiple
  images.
- Image to Text (OCR): Tesseract.js with a language selector including
  Urdu (urd), English, Arabic and Hindi, plus a progress bar.
- Excel Formula Generator, VBA Macro Writer, Regex Creator, DAX Query:
  keyword matching is replaced with structured wizards. Pick a task,
  fill labelled fields, get the exact formula/code with a plain-language
  explanation and an example. Never claimed to be AI.
- Invoice Generator and Resume Builder: 2 clean templates each.
- Other tools (QR, password, JSON, Base64, diff, CSV, color palette,
  invoice, resume, calculators): checked for bugs, empty-input errors
  and mobile layout; no regressions found.

### New tools — Pakistan / Urdu
- Land Converter (Marla/Kanal/Acre/sq ft/sq yd/sq m).
- Pakistan Salary Tax Calculator (FBR slabs in
  /assets/data/tax-slabs.json, Tax Year label, "estimate only"
  disclaimer; Tax Year 2026 and 2027 verified from official FBR
  sources on 2026-11-09; Tax Year 2025 omitted because it was not
  directly verified).
- Zakat Calculator (2.5%, nisab by gold/silver rate; the reported
  Ramadan 2026 bank nisab of Rs 503,529 is shown only as reported,
  not verified).
- Amount to Words (English and Urdu, for invoices and cheques).
- Urdu Word/Character Counter (RTL display).
- Percentage / Marks / Merit-Aggregate Calculator (generic weighted
  formula, user-editable weights).

### SEO
- Every tool page: unique title (max 60 chars, tool name first),
  unique meta description (max 155 chars), one H1, canonical, Open
  Graph and Twitter tags, breadcrumb, 484–636 visible words of unique
  content, FAQ of 5–6 questions, Related tools, and JSON-LD for
  SoftwareApplication (free, price 0), FAQPage and BreadcrumbList.
- Homepage: H1 matches the real scope (not only PDFs), category
  sections, internal links to all 68 tools.
- Removed from public pages: the FAQ text about setting
  GA_MEASUREMENT_ID in app.js, ConvertAPI/CloudConvert notes, "What new
  PDF tools were added in this version?", and the duplicated "Do files
  leave my browser?" entry (now once per page, mirrored in JSON-LD).
- Sitemap: 75 URLs (home + 5 info pages + tools index + 68 tool
  pages), lastmod 2026-11-09. robots.txt links the sitemap.

### AdSense-ready pages
- About, Privacy Policy, Terms, Disclaimer and Contact rewritten as
  real, complete pages. Privacy covers Google AdSense and Analytics,
  cookies, third-party vendors, how to opt out of personalized ads,
  CDN-loaded libraries, and the fact that files are processed locally.
  Contact has a working mailto plus a form that opens the user's email
  app addressed to CONTACT_EMAIL.

### Hotfix — 9 November 2026 (same day)
- Tool pages showed an empty tool area because the v3 stylesheet
  hides `.workspace-tool` until it gains `active`, and nothing on the
  new per-tool pages added that class. Fixed in two layers: app.js
  now activates the single workspace on `/tools/` pages, and tool
  pages carry `<body class="tool-page">` with a stylesheet rule that
  shows the workspace even if app.js fails.
- A second live check still showed the old behaviour because
  vercel.json had set year-long `immutable` caching on /assets/*.
  Fixed: assets now cache for 1 hour with revalidation, and all local
  asset URLs are versioned (`?v=2`) so browsers fetch the new files.

### Hotfix 2 — 9 November 2026 (same day, after fresh-browser verification)
- Cookie consent banner could never be dismissed because the
  stylesheet's `display:flex` overrode the `hidden` attribute.
  Added `.consent-banner[hidden]{display:none}`.
- PDF tools showed only a status line after a successful download.
  `downloadBlob` now always leaves a visible "Download <filename>"
  link in the tool area.
- Formula Generator quoted plain-text criteria correctly now
  (SUMIF with Lahore builds `=SUMIF(A2:A20, "Lahore", B2:B20)`),
  and wizard placeholders with quotes no longer break the input HTML.
- Redact now reports the real error instead of a generic message,
  and its success message reports the true number of matched pages.
- Asset version bumped to `?v=3`.

### v5.2 — 10 November 2026 (contact form on the right)
- Contact page is now two columns: text on the left, Google Form on
  the right. The form frame is taller (1000px, 1150px on phones) so
  it does not scroll inside itself. Info and tool pages also get a
  centred 1180px container with side padding.

### v5.1 — 10 November 2026 (Google Forms contact form)
- The mailto contact form is replaced by a real Google Form ("Contact
  AK Premium") embedded on the contact page: Your name, Your email,
  Which tool is this about?, Message. Responses go to Noman's Google
  Forms account. Fallback link opens the form in a new tab.

### v5 — 10 November 2026 (user-reported fixes)
- Tool cards were empty: the SVG sprite (18 icons) was never copied
  into the v4 pages, and the card used class `tool-icon` while the CSS
  styles `.tool-card .icon`. Both fixed — every card now shows its
  icon in a coloured tile.
- Contact form showed an error page on Send: it was a GET form to a
  mailto: URL. It is now handled in JavaScript, building a proper
  encoded mailto link and opening it without navigating the page,
  with a success note and a Copy message fallback.
- Hero now spans the same width as the tool grid (shared 1280px
  container) instead of sitting narrower and centred.
- Mobile: contact form fields stack full-width, grid is 2 equal
  columns at 640px and a single column at 420px, tighter header.
- Asset version bumped to `?v=5`.

### Hotfix 3 — 9 November 2026 (same day)
- Redact failed in the browser with "detached ArrayBuffer": pdf.js
  transfers the file buffer to its Web Worker, which empties it, so
  pdf-lib could not load the same buffer. pdf.js now gets a copy
  (`bytes.slice(0)`) and pdf-lib keeps the original. Verified with a
  real canvas: the redacted page's text layer is destroyed and other
  pages stay intact.
- Compress now says "N% larger" when the output is bigger than the
  input, instead of the misleading "0% smaller".
- Asset version bumped to `?v=4`.

### Honesty and brand
- No misleading claims. "Premium" is only the site name; there are no
  paid features, no upgrade prompts, and no capability a tool does not
  truly have. The privacy promise is accurate: files are processed in
  the browser and are not uploaded to an AK Premium server.

## v3 — 3 November 2026
- iLovePDF-style tool pages, search fix, real Privacy/Terms/About/
  Contact pages, SEO. GitHub commit 7e9983f, Vercel Production Ready.

## v2 — 1 November 2026
- 62 tools, file preview, auto-fit grid, FAQ fix. GitHub commit
  b67e952, Vercel Production Ready.

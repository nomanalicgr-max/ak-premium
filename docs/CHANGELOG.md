# AK Premium — Changelog

## v9 — 11 November 2026 (Phase 4: SEO, security, performance, accessibility, analytics, cleanup)

### SEO and social
- Full favicon set (16, 32, apple-touch-icon 180, 192, 512, favicon.ico)
  plus site.webmanifest, all from the same flat indigo AK mark.
- Sitemap now uses the build date as lastmod on every URL and drops
  changefreq and priority.
- Tool pages now use a valid schema.org applicationCategory
  (UtilitiesApplication or BusinessApplication) instead of the display
  label, which was not a valid category.

### Security
- HSTS header (max-age 63072000, includeSubDomains) and a
  Content-Security-Policy-Report-Only header. Report-Only, not enforced,
  because there is no report endpoint to check violations against yet.
- SRI (SHA-384) integrity attributes on all 10 pinned CDN library scripts,
  static and lazy-loaded.
- Fixed a real bug found while computing the SRI hashes: the docx library
  URL pointed at docx@8.5.0/build/index.js, which is a 404. The package
  publishes /build/index.umd.js. PDF to Word could not load docx in a real
  browser; it now uses the correct file.
- WhatsApp link deliberately NOT added to the contact page: it would
  publish the maker's phone number. The direct email link stays.

### Performance
- app.js (195 KB) is split into core.js (shared helpers, navigation,
  search, generic workspace UX, all pure-logic functions) plus one
  small bundle per tool category. A tool page loads core.js plus its own
  bundle only; the homepage loads core.js only.
- All first-party CSS and JS now use content-hashed filenames
  (styles.<hash>.css, core.<hash>.js) with immutable caching (1 year).
  The old unhashed files are removed from the repo.
- Service worker (sw.js) caches the hashed core assets and key pages and
  serves assets cache-first. No "Works offline" badge is shown until
  this is tested in a real browser.

### Accessibility
- Skip to content link on every page (visible on keyboard focus).
- Workspace status lines now carry aria-live="polite" so screen readers
  announce results. Error messages already use role="alert".

### Analytics
- Consent-gated event plumbing only (AK.track in common.js): tool_view,
  tool_start, tool_success and tool_error, with the tool slug only. No
  file names are ever sent. Nothing is sent while the GA ID is empty or
  cookies are not accepted.

### Repo hygiene
- README.md, CHANGELOG.md and TESTING.md moved from the public root to
  /docs/ and excluded from the Vercel deployment with .vercelignore.

### Not verified
- Real-browser render (desktop/mobile), Lighthouse scores, CLS with the
  new hashed assets, dark-mode visual check of every component,
  keyboard-only walkthrough in a real browser, service worker behaviour
  offline, and whether the Report-Only CSP would block anything if
  enforced. Urdu copy still needs a native-speaker proofread, and /ur/
  tool controls remain in English.

## v8 — 11 November 2026 (Phase 3: tool pages, calculators, Urdu)

### Tool pages
- Breadcrumb on every tool page (Home > category > tool), badges under the
  H1, and a short limits callout plus a short privacy callout instead of
  the long repeated paragraphs. FAQs are now collapsible details.
- Related tools are shown as cards, curated by workflow (for example
  Merge PDF suggests Split, Organize and Compress) instead of by category
  alone. Steps are now specific to the top 20 tools and name the real
  buttons and fields on the page.
- Privacy fix: the regex-creator example no longer uses a real phone
  number. It now uses the clearly generic 0300-1234567.

### Workspace UX
- Every file tool now has a drag-and-drop zone: drag a file onto it, or
  click to choose. The file name shows once a file is chosen.
- A file tool's main button stays disabled until a file is chosen, so a
  press with no file does nothing instead of failing.
- After a download, a success card appears with the download link, a
  Start over button (clears the tool) and next-step links to related tools.
- Friendly errors: a password-protected PDF points to Unlock PDF, a scan
  with no text layer points to OCR PDF, a damaged PDF points to Repair PDF.

### Calculators
- Live results: calculators recalculate while typing, once the inputs are
  complete. No more pressing Calculate for every change.
- Copy result, Share link and Print buttons under every calculator output.
  A share link pre-fills the inputs and runs the calculation on load.
- Money grouping toggle on tax, Zakat and EMI: western (1,234,567) or
  lakh/crore (12,34,567), remembered in the browser.
- Salary tax shows a slab-wise breakdown table and a source line: "Tax
  Year 2027 (FY 2026-27) · data verified 9 Nov 2026 · Source: FBR". EMI
  shows a breakdown (EMI, principal, interest, total, months). Zakat
  accepts a custom nisab in rupees.
- Calculator number fields now use a decimal keyboard on phones instead
  of the number spinner.

### Urdu
- New Urdu section: /ur/ index plus one Urdu page per Pakistan tool
  (land, salary tax, Zakat, amount to words, Urdu word counter, merit),
  with hreflang links both ways and an EN | اردو switch in the header.
- Urdu elements carry lang="ur" dir="rtl". The six Pakistan tool pages
  show their Urdu subtitle under the H1. The tool controls themselves
  stay in English for now.
- Urdu copy was written for this site but still needs a native-speaker
  proofread before being called verified.

### Not verified
- Real-browser render (desktop/mobile), Lighthouse scores, CLS with the
  new fonts, full dark-mode visual pass of every component. The automated
  checks below cover structure and known-answer calculations only.

## v7 — 11 November 2026 (Phase 2: homepage, navigation, cards, icons, search)

### Homepage and navigation
- New hero: "Free PDF tools and Pakistan calculators. Your files never leave
  your browser." with a one-line sub, an Urdu line, and a trust row
  (No upload, No sign-up, Free). Search box is 52px with a clear button and
  a "/" keyboard shortcut.
- New section order: Popular tools, Pakistan Tools (highlighted band with
  Urdu subtitles), PDF, Convert, Image, Excel, Calculators, More tools
  (Everyday, Developer, Business and Design grouped), FAQ. A sticky
  category jump bar sits under the header with scroll-spy.
- Header: Tools mega-menu, Pakistan link, About, Contact, search icon and
  the dark-mode toggle. On phones the links become a full-screen menu.
  "All Tools" now links to /tools. New real footer with three columns
  (Tools, Pakistan Tools, Company) and a "What's new" page generated from
  this changelog. New /pakistan hub page listing the six Pakistan tools.

### Cards and icons
- Cards are now compact rows (icon left, title and description right),
  about 72-88px tall, 1 column on phones, 2 columns from 480px.
- All 62 inventory icons plus the 6 Pakistan icons are now real Lucide
  line icons (ISC license), one per tool, shipped as a single inline SVG
  sprite (68 symbols including search, menu and close). The old 18-icon
  set is gone.
- Badges on cards and tool pages: "Text only" (PDF to Word/Excel/PPT),
  "Basic" (Word/Excel/PPT to PDF) and "Verified TY2027" (salary tax).
  Convert cards carry a small format pill (PDF to DOCX, XLSX to PDF...).
- Card descriptions rewritten for consistency; the misleading
  "Re-save a PDF, smaller file" is now "Reduce PDF file size (Light,
  Medium or Strong)".

### Search
- Synonyms and Urdu aliases for every tool (merge = join/combine,
  zakat = زکوٰۃ, land = مرلہ/کنال...), spaceless matching ("pdftoword"
  finds PDF to Word), word-prefix matching, and Arabic-to-Urdu letter
  normalisation so either keyboard spelling matches.
- No-results state with 4 popular suggestions and a contact link.
  /?q=merge prefills the search (with SearchAction schema), Enter opens
  the first result, arrow keys move between results.

### Verification
- run-v7.js: all checks pass (head contract on 78 pages, 74 homepage
  cards, section order, badges, Urdu search, no-results, ?q= prefill,
  dropdown and mobile menu toggles, "/" shortcut).
- Not verified: real-browser render (desktop/mobile), Lighthouse scores,
  dark-mode visual check of every component.

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

### v6 — 11 November 2026 (Phase 1: design system)
- `styles.css` rewritten as one clean file (was 5 stacked layers, v1-v5
  overriding each other): tokens, fonts, base, layout, components,
  pages, utilities, dark overrides (tokens only), print. Zero
  `!important` except the reduced-motion rule. Dead rules removed
  (`.more-panel`, `.nav-more`, `.ad-sidebar`, old gradient hero,
  `.tool-page-header`, `.dropzone`, `.tool-success`, `.excel-layout`
  — none of them had any live markup; dropzone returns in Phase 3
  with real markup).
- One colour system, tokens exactly as specified: single indigo
  primary `#4f46e5`, Pakistan green accent, status colours, 4px
  spacing scale, radius 8/12/16. No gradients on buttons, brand or
  hero. No hard-coded colours in components — every colour is a
  token. Icon tiles cut from 9 pastel colours to 4 variants
  (default indigo, Pakistan green, Excel teal, warning amber),
  with dark-mode equivalents. All checked pairs pass WCAG AA
  (text 4.5:1, icons 3:1); one near-miss found and fixed in
  verification (dark button hover `#6366f1` was 4.47:1, now
  `#4338ca` at 7.9:1).
- Fonts self-hosted in `/assets/fonts/`: Inter variable (Latin,
  72,920 bytes), Plus Jakarta Sans variable (Latin, 27,348 bytes),
  Noto Nastaliq Urdu (Arabic subset, 239,060 bytes, downloads only
  when Urdu text is on the page via `unicode-range`). Preloaded in
  every page head. No Google Fonts request, matching the privacy
  promise. Type scale per spec; Urdu rules (Nastaliq, +12% size,
  line-height 2.1, no letter-spacing).
- Dark mode done properly: old 6-rule patch removed; everything
  follows the tokens. Saved choice (`localStorage "ak-theme"`)
  overrides the OS setting. Inline script in `<head>` before the
  stylesheet prevents a theme flash. Toggle is now a 44px icon
  button (sun/moon) with `aria-pressed` and `aria-label="Dark
  mode"`. `theme-color` metas added for light/dark.
- "iLovePDF" naming removed everywhere: `data-ilove` is now
  `data-group`, `.ilove-tab` is now `.tab` (app.js selectors
  updated together; search/filter verified working in jsdom).
- Brand: flat indigo SVG logo + wordmark (no gradient square),
  tagline "Free tools. Private by design." next to the logo, same
  mark in `favicon.svg`, and a new 1200x630 `assets/og-image.png`
  used for `og:image` / `twitter:image` (large summary card).
- Contact page: the inlined `<style>` block is gone; its layout
  rules now live only in `styles.css` (same two-column layout,
  same 1000/1150px form heights).
- Asset version bumped to `?v=6`. Content-hashed filenames are
  deferred to Phase 4.3.
- Verification: new `~/workspace/tools/jsdom-test/run-v6.js`,
  37 checks, all PASS (76 pages: icons resolve, 1 h1, canonical,
  valid JSON-LD, flash script before CSS, preloads, theme-color,
  og:image, v6 assets; theme flash/toggle and search/filter run
  live in jsdom; contrast computed for 25 token pairs).
  Not verified in this phase: real-browser render (desktop +
  mobile), Lighthouse scores, CLS with the new fonts — those need
  the live browser check after deploy.

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

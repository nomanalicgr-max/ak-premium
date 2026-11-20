# AK Premium — Changelog

## v18 — 20 November 2026 (2026-11-20 live re-audit fixes: hub counts, header-search count, sticky nav, merge-PDF numbering)

### Fixes from the 20 November live re-audit
- Hub intros now show the post-v17 counts: 37 PDF tools, 13 image tools, 15 calculators, 12 text tools and 14 developer tools (they still said 27, 4, 5, 10 and 6). The FAQ answers and meta descriptions follow the same numbers, because they are generated from the same intro text.
- The header search count is now dynamic: it reads the registry total at build time (117 tools), so it can never go stale again. It said "68 tools" before; the placeholder and the hint under the search box both show the live count now.
- Homepage section headings no longer hide under the sticky category bar when jumped to: sections now carry a 140px scroll margin, clearing the sticky header and the jump bar.
- Merge PDF thumbnail numbering fixed: uploading the same file twice labelled the thumbnails "01." and "11." because the label code added the number to a string instead of adding two numbers. Thumbnails now read "01.", "02." and so on, and merging still works in the shown order.
- Harness run-v18.js: 321 checks, all passing, including the new v18 checks for the hub counts, the dynamic search count, the scroll margin and the merge-PDF numbering.

### JavaScript split and testing
- The in-place build no longer fails at the generator-shipping step: build.py now skips copying a file onto itself (shutil SameFileError) when the output tree is the working tree.
- ASSET_V is now "18" (config.js?v=18) and the service-worker cache is "ak-premium-v18".

## v17 — 19 November 2026 (Wave 1 batch 5: 10 developer & text tools, 107 → 117 tools)

### New tools (expansion brief §8.1, §14.3)
- Ten developer and text tools, all pure client-side: Speech to Text (Web Speech API, live transcript + interim results, language select en-US/en-GB/ur-PK/ar-SA/hi-IN, copy transcript; the limit callout discloses that the browser vendor may process the audio on its own speech service), Slug Generator (live slug from any title, lower-case letters/numbers/hyphens, non-English letters converted where possible, copy slug), JSON to YAML and YAML to JSON (js-yaml 4.1.0, MIT, pinned with SRI), JSON to XML and XML to JSON (hand-rolled converters, no new library), JSON to CSV (flattens nested objects with dotted keys, download as .csv), JWT Decoder (header + payload + signature shown, base64url decode; the limit callout states it does not check the signature), Hash Generator (text or file up to 10 MB; MD5, SHA-1, SHA-256, SHA-384, SHA-512; SHA via crypto.subtle, MD5 via SparkMD5), URL Encode Decode (value mode and full-URL mode, which keeps : / ? = &).
- Every new tool has unique content per the Quality Gate: a specific 80–120-word intro, 4–6 steps naming the real controls, 2–3 tips, honest limits, a concrete example with real numbers verified against the tool (for example slug "Hello World! My First Post" → hello-world-my-first-post, SHA-256("hello") = 2cf24dba…9824, MD5("hello") = 5d41402abc4b2a76b9719d911017c592), and 4 tool-specific FAQs (468 FAQ questions across the site now, all unique).
- Honest limits are stated on each new tool: speech to text needs a browser with speech recognition and a microphone, and the vendor may process the audio; the YAML tools reject duplicate keys and non-plain scalars; XML conversion escapes special characters and renames invalid tag names; JSON to CSV needs an array of objects (a single object is wrapped); the JWT decoder never verifies a signature; the hash generator takes files up to 10 MB only.
- Speech to Text cannot be fully verified in the cloud test browser (no microphone, no speech-recognition engine), so only its friendly-error guard path was tested there — like Text to Speech in v16, it needs a re-check on a real device with a microphone. Currency Converter, HEIC to JPG and Background Remover are still not built, for the reasons already recorded (live rate API, licence).

### JavaScript split and testing
- Per-tool JS split extended: core.js + one tools/<slug>.js per tool (117 files). The split is verified lossless (5,197 code lines, 0 missing/extra). The shared batch 5 logic (slugify, JSON↔YAML/XML/CSV, JWT decode, hashing, URL encode/decode, speech-recognition constructor) lives in core.js; per-tool files never read a core const table directly (the v15 jsdom lesson).
- A real bug was found and fixed by the harness during verification: the hash generator's MD5 path passed a Uint8Array (text) or ArrayBuffer (file) to blueimp-md5, which only takes strings — it silently hashed the text "104,101,108,108,111" instead of "hello", so every MD5 was wrong. MD5 now uses SparkMD5 3.0.2 (WTFPL Version 2, cdnjs, pinned with SRI): text goes in as a string, files as an ArrayBuffer, both verified against Node's crypto (including bytes above 0x7F). The Licenses page and THIRD_PARTY_LICENSES now list js-yaml (MIT) and SparkMD5 (WTFPL Version 2).
- Harness run-v17.js: 300 checks, all passing, including live known-answer checks for all 10 new tools (slug hello-world-my-first-post + cafe-tea-2026, JSON↔YAML and JSON↔XML round trips, JSON→CSV two rows + nested address.city, JWT sample token → HS256 header and John Doe payload, SHA-256/MD5/SHA-1 of "hello", URL encode/decode both modes, speech-to-text friendly error without the API) and the existing known-answer tax (200,000/month TY2027 → 156,000), Zakat (→ 25,000) and EMI (→ 22,244.45) checks. Sitemap is 146 URLs (was 136). ASSET_V is now "17" (config.js?v=17) and the service-worker cache is "ak-premium-v17".

## v16 — 19 November 2026 (Wave 1 batch 4: 10 text & writing tools, 97 → 107 tools)

### New tools (expansion brief §8.1, §14.3)
- Ten text and writing tools, all pure client-side with no network calls: Character Counter (live counts — characters, characters without spaces, words, sentences, paragraphs, reading time — sharing the word-counter counting engine), Lorem Ipsum Generator (paragraphs, sentences or words, 1–10, copy output), Remove Duplicate Lines (keep first occurrence, case-sensitive toggle, count removed), Sort Lines (A–Z, Z–A, numeric, longest/shortest first, ignore-empty-lines option), Text to Speech (SpeechSynthesis API, voice select, rate and pitch sliders, Speak/Stop, friendly error when the browser has no reading-aloud support), Markdown Previewer (live preview; hand-rolled safe subset parser that escapes HTML first and never injects raw HTML — no new library), Fancy Text Generator (bold, italic, bold italic, monospace, script, double-struck, circled and small caps via Unicode mapping tables, copy per style), Find and Replace (plain text, match-case toggle, replace-all with a count), Readability Checker (Flesch Reading Ease + Flesch-Kincaid grade, sentence/word/syllable counts; syllables by the vowel-group rule, documented on the page), Word Frequency Counter (top words with counts, optional stopword exclusion, case-insensitive).
- New "Text Tools" category and /text-tools hub (expansion brief §4.2): all 10 tools are in the text category (word-counter stays in Everyday). The homepage gains a Text tools section (8 cards + "See all 10 tools →"), a jump-bar Text link, and a mega-menu Text column.
- Every new tool has unique content per the Quality Gate: a specific 80–120-word intro, 4–6 steps naming the real controls, 2–3 tips, honest limits, a concrete example with real numbers verified against the tool (for example the fox sentences score Flesch 93.7, grade 2.3), and 4 tool-specific FAQs (428 FAQ questions across the site now, all unique).
- Honest limits are stated on each new tool: the markdown previewer supports a safe subset only (headings, bold, italic, code, lists, links, quotes, rules, code blocks — no tables, footnotes or raw HTML); text to speech depends on the voices installed on the device and may sound different per browser; the readability syllable count is a heuristic, not a dictionary lookup; fancy text uses Unicode characters that may not display on very old devices.
- Speech to Text and Slug Generator are NOT built in this batch: they go in batch 5 (speech to text needs a vendor-processing disclosure). Currency Converter, HEIC to JPG and Background Remover are also not built, for the reasons already recorded (live rate API, licence).

### JavaScript split and testing
- Per-tool JS split extended: core.js + one tools/<slug>.js per tool (107 files). The split is verified lossless (4,793 code lines, 0 missing/extra). The shared text logic (lorem, dedupe, sort, find-replace, syllables, readability, word frequency, markdown, fancy styles, voice list) lives in core.js; per-tool files never read a core const table directly (the v15 jsdom lesson).
- Two real bugs were found and fixed by the harness during verification: the lorem LIVE_CALCS entry had no `inputs` key, which the live-recalc binding reads without a guard (it crashed core.js on the lorem page), and the find-and-replace handler still used the old `frBtn`/`frCopyBtn` variable names after the rename to `findrepBtn`/`findrepCopyBtn` (the fraction calculator owns `frBtn`). Both are fixed and the split re-verified lossless.
- Harness run-v16.js: 292 checks, all passing, including live known-answer checks for all 10 new tools (character count "Hello world" → 11 chars, lorem 2 sentences = the classic first two, dedupe removes 2, sort A–Z, find-replace cat → dog ×2, readability fox → 93.7/2.3, word frequency bird/cat/dog 1 each, markdown heading + bold renders and a pasted `<script>` tag is escaped, fancy bold "Hello" → mathematical bold in 8 rows, text to speech shows the friendly error without the API) and the existing known-answer tax (200,000/month TY2027 → 156,000), Zakat (→ 25,000) and EMI (→ 22,244.45) checks. Sitemap is 136 URLs (was 125). ASSET_V is now "16" (config.js?v=16) and the service-worker cache is "ak-premium-v16".

## v15 — 19 November 2026 (Wave 1 batch 3: 10 calculators & converters, 87 → 97 tools)

### New tools (expansion brief §8.1, §14.3)
- Ten calculators and converters, all pure client-side with no network calls: Unit Converter (9 unit types — length, weight, temperature, area, volume, speed, data, time, energy — one shared engine, live result), Discount Calculator (discount amount + final price), Compound Interest (maturity amount + interest earned), Mortgage Calculator (monthly payment; reuses the existing EMI formula), Tip Calculator (tip, total, per-person split), Time Zone Converter (date/time + two IANA zones via Intl.DateTimeFormat, 17 curated zones, DST handled), Date Difference (days, weeks + days, months), Calorie & TDEE Calculator (BMR + TDEE via Mifflin-St Jeor), Scientific Calculator (display + keypad, sin/cos/tan in degrees, log, ln, sqrt, power, factorial, pi, e — safe shunting-yard evaluator, no eval on user input), Fraction Calculator (add/subtract/multiply/divide, simplified fraction + decimal).
- Every new tool has unique content per the Quality Gate: a specific 80–120-word intro, 4–6 steps naming the real controls, 2–3 tips, honest limits, a concrete example with real numbers verified against the tool (for example 1 kg = 2.2046 lb), and 4 tool-specific FAQs (388 FAQ questions across the site now, all unique).
- Honest limits are stated on each new tool, and the Calorie & TDEE Calculator's limit callout carries a clear health disclaimer (estimates only, not medical advice, consult a clinician for personal guidance).
- Currency Converter is NOT built in this batch: it needs a live exchange-rate API, which will need verification in a later batch. No fake rates were shipped and no registry entry or page exists for it.

### JavaScript split and testing
- Per-tool JS split extended: core.js + one tools/<slug>.js per tool (97 files). The split is verified lossless (4,386 code lines, 0 missing/extra). The shared unit-conversion engine and the scientific evaluator live in core.js.
- A real bug was found and fixed during verification: the unit-converter handler read core const tables directly from its per-tool file, which works in a real browser but fails under jsdom's separate eval calls. All const-table access now stays inside core functions (convertUnit returns the formatted display text, unitOptions serves the dropdowns).
- Harness run-v15.js: 293 checks, all passing, including live known-answer checks for all 10 new calculators (for example 1 km = 1000 m, 1000 at 20% off = 800, 1/2 + 1/3 = 5/6, sin(30) = 0.5, Lahore 12:00 → London 07:00 in winter / 08:00 in summer) and the existing known-answer tax (200,000/month TY2027 → 156,000), Zakat (→ 25,000) and EMI (→ 22,244.45) checks. Sitemap is 125 URLs (was 115). ASSET_V is now "15" (config.js?v=15) and the service-worker cache is "ak-premium-v15".

## v14 — 19 November 2026 (Wave 1 batch 2: 9 image tools, 78 → 87 tools)

### New tools (expansion brief §8.1, §14.3)
- Nine image tools, all canvas-based in the browser with one shared engine (convertImageFile in core.js): PNG to JPG, JPG to PNG, WebP to JPG, WebP to PNG, JPG to WebP (0.92 quality, friendly error if the browser cannot encode WebP), SVG to PNG (chosen width, default 1024 px, viewBox fallback), Image Cropper (drag a rectangle on the preview plus X/Y/Width/Height boxes, PNG output), Rotate & Flip Image (Rotate Left/Right in 90-degree steps, Flip Horizontal/Vertical, live preview, PNG/JPEG output), Passport Photo Maker (centre-crops to exact passport sizes by country: PK/UK/EU/AE 35×45 mm, IN/US 2×2 in, CA 50×70 mm, JPG output).
- Every new tool has unique content per the Quality Gate: a specific 80–120-word intro, 4–6 steps naming the real controls, 2–3 tips, honest limits, a concrete example, and 4 tool-specific FAQs (348 FAQ questions across the site now, all unique).
- Honest limits are stated on each new tool: converters handle one image at a time at original size; JPG output flattens transparency to white; SVG to PNG cannot draw SVGs linking external images or fonts; the cropper output is always PNG; Rotate/Flip JPEG output flattens transparency; Passport Photo Maker only sets size and shape and cannot guarantee a form will accept the photo, and some visas use a different size.
- HEIC to JPG is NOT built in this batch: no MIT/Apache/BSD HEIC decoder exists — every in-browser HEIC decoder goes through libheif (LGPL-3.0) plus libde265 (LGPL-3.0), and HEVC is patent-encumbered. No fake converter was shipped and no registry entry or page exists for it. It needs a licence decision before it can be built.

### Homepage (design brief §2.3)
- The homepage category-section cap is now enforced by the generator for every category, not just PDF: each section shows at most 8 cards with a "See all N tools →" link using the full count. With 13 image tools the image section had 13 cards; it now shows 8 with "See all 13 tools →". Hubs and the /tools index still list all tools.

### JavaScript split and testing
- Per-tool JS split extended: core.js + one tools/<slug>.js per tool (87 files). The split is verified lossless (3,980 code lines, 0 missing/extra). The shared canvas engine lives in core.js.
- Harness run-v14.js: 252 checks, all passing, including the known-answer tax (200,000/month TY2027 → 156,000), Zakat (→ 25,000) and EMI (→ 22,244.45) checks, and a Node canvas round-trip (real pixels: PNG→JPG valid JPEG, JPG→PNG valid PNG, transparency flattens to white, rotate 90° swaps dimensions, flip mirrors, crop and passport sizes exact). Sitemap is 115 URLs (was 106). ASSET_V is now "14" (config.js?v=14) and the service-worker cache is "ak-premium-v14".

## v13 — 19 November 2026 (Wave 1 batch 1: 10 PDF tools, 68 → 78 tools)

### New tools (expansion brief §8.1, §14.3)
- Five landing pages on shared engines, each with its own page, content and FAQs: JPG to PDF and PNG to PDF (share the Images to PDF engine, one image per A4 page), PDF to JPG and PDF to PNG (share the PDF to Images engine, output fixed to that format, per-page links plus one ZIP), HTML to PDF (shares the TXT/HTML to PDF engine, plain 12-point text).
- Five new tools with real client-side functionality and no new CDN library: Extract Images from PDF (embedded image objects as PNGs, per-image links plus ZIP), Add Header & Footer to PDF (stamps header and footer text on every page), Flatten PDF (flattens form fields, removes annotations), PDF Metadata Editor (shows and edits Title, Author, Subject and Keywords), Resize PDF Page Size (scales every page to A4, Letter or Legal, aspect preserved).
- Every new tool has unique content per the Quality Gate: a specific 80–120-word intro, 4–6 steps naming the real controls, 2–3 tips, honest limits, a concrete example, and 4 tool-specific FAQs (312 FAQ questions across the site now, all unique). The three shared engines (images-to-pdf, pdf-to-images, txt-html-to-pdf) are refactored into shared core functions; normal-use behaviour is identical, with a 50 MB file-size guard and on-demand pdf.js loading for PDF to Images.
- Honest limits are stated on each new tool: Extract Images finds only embedded image objects (not vector drawings or backgrounds); Flatten cannot be undone and removes annotations; Header/Footer uses a fixed small grey font; Metadata edits only the four named fields; Resize does not carry over form fields or links; JPG/PNG to PDF places one image per page with no rotation; HTML to PDF strips tags to plain text.

### JavaScript split and testing
- Per-tool JS split extended: core.js + one tools/<slug>.js per tool (78 files). The split is verified lossless (3,664 code lines, 0 missing/extra). Shared engines live in core.js.
- Harness run-v13.js: 234 checks, all passing, including the known-answer tax (200,000/month TY2027 → 156,000), Zakat (→ 25,000) and EMI (→ 22,244.45) checks. Sitemap is 106 URLs (was 96). ASSET_V is now "13" (config.js?v=13) and the service-worker cache is "ak-premium-v13".

## v12 — 18 November 2026 (Design Phases 2–4 completion: unique content for all 68 tools, More-section split, per-tool JS, enforced CSP)

### Content (design brief §3.5)
- All 68 tools now have unique content: a specific 80–120-word intro, 3–6 steps naming the real controls on that tool's page, 2–3 tips, honest limits, a concrete example, and 4 tool-specific FAQs. The 42 tools that used the generic fallback (including the 19 pages that still showed "Set any options the tool shows") are rewritten; the 8 tools that had FAQs but no steps now have steps. Two old steps were wrong and are corrected: PDF to Text said "tick the OCR option first" (no such option exists) and "Press Convert" (the button is "Extract Text"); QR Code Generator said "copy it into your document" (the real flow is "Download QR PNG"). Invoice Generator and Resume Builder now name their Template 1 / Template 2 choice.
- No tool claims a feature it does not have; limits stay honest (text-only converters, Basic layout, 50 MB per file, scanned PDFs need OCR first).

### Homepage (design brief §2.3)
- The "More tools" section (12 cards) is split into four sections — Everyday, Developer, Business, Design — each with at most 8 cards, a hub-linked heading and a "See all N tools →" link. The jump bar lists all four. Every category section now has an explicit "See all N tools →" link.

### Tool pages and accessibility (design brief §3.2, §4.4)
- Workspace titles are now <h2> (they were <h3> directly after the <h1>); the mega-menu column titles and the globe panel title are <p> with the same styling, so the heading order is sequential on every page.
- The favourite star is a 44px touch target (was 28px).
- Errors are announced: every error status now uses role="alert" and links the workspace's first input with aria-describedby (setError in app.js; the PDF friendly-error helper does the same).
- The primary button is sticky at the bottom of the screen on phones (with safe-area-inset-bottom); the consent banner no longer covers the footer — the page gets bottom padding equal to the banner's height while it is visible.
- The contact form iframe height is now max(1000px, calc(100vh - 180px)): it grows on tall screens and never shows an inner scroll (a cross-origin Google Form iframe cannot auto-size).
- The Licenses page now links to the on-site licence files (/vendor/qpdf/LICENSE and /THIRD_PARTY_LICENSES, a new file at the repo root).
- /ur/ pages now carry their hreflang="ur" self-link (they had only en + x-default).

### SEO and performance (design brief §4.1, §4.3)
- Home title is now "Free Online Tools: PDF, Image, Calculators | AK Premium" (54 characters, was 73). The H1 keeps the "68+ …" count.
- Tool pages and the homepage now carry inLanguage "en" in their JSON-LD.
- Tool pages now preconnect to the CDN host(s) their libraries actually load from (jsDelivr and/or cdnjs).
- Fonts are content-hashed and served immutable (inter-var, plus-jakarta-var, noto-nastaliq-urdu); the @font-face URLs and preload links use the hashed names.

### JavaScript split and security (design brief §4.2, §4.3)
- Per-tool JS split: core.js + one tools/<slug>.js per tool (68 files). The 10 category bundles are deleted. The split is verified lossless (3,356 code lines, 0 missing/extra). Shared helpers, pure-logic functions and the three Excel wizard task tables live in their own tool files; shared code stays in core.js.
- Content-Security-Policy is now ENFORCED (was Report-Only). The two inline scripts are externalised: the theme flash-prevention script is now assets/js/theme-init.js, and window.AK_STRINGS is now assets/js/strings.js (generated from locales/en.json). script-src no longer contains 'unsafe-inline'. connect-src adds tessdata.projectnaptha.com (Tesseract language data) and worker-src adds cdn.jsdelivr.net (the Tesseract worker loads from jsDelivr) — both verified against the Tesseract.js v5 files.
- Analytics: a next_step_click event (destination tool slug only) and an anonymous window.onerror counter (count only, no message or file data) are added; both are consent-gated like the other events.

### Fixes from the 18 November visual check
- Opening the globe panel now closes the mega-menu and vice versa (the two panels overlapped when both were left open).
- The Favourites helper text ("Tap the star on any tool to save it here.") no longer sits tight against the card's bottom edge.

### Not done in this release (still gated or standing decisions)
- Wave 1 tools (Background Remover, Unit Converter, video/audio, and the Video & Audio / Finance & Tax / Text & Writing categories) are NOT in this release; they start only on the explicit "v11 OK, Wave 1 shuru karo" approval.
- No WhatsApp contact link (it would publish the owner's phone number).
- JavaScript is not minified (homepage JS gzip is ~35 KB — core 32,682 + common 2,766 — inside the 60 KB budget; minification was skipped to keep the lossless split verification exact).
- The /vendor/* files stay at max-age=3600, not immutable: they are referenced by fixed names with no content hash, so immutable caching would serve stale files after an update.

## v11 — 17 November 2026 (Global shell: global homepage, mega-menu, hubs, country tools)

### Homepage (expansion brief §14.2, design brief Phase 2)
- The hero is now global: "68+ free online tools: PDF, image, video,
  calculators and more. Private, fast, in your browser." The count is
  the real published tool count, computed at build time; Pakistan no
  longer appears in the hero. The Urdu hero line is gone (non-English
  lines appear only when that language is selected). The trust row reads
  "No upload · No sign-up · Free", with a "Country tools: PK · IN · AE ·
  UK · US →" text link under it (two-letter codes, no emoji flags).
- The Popular strip is now 8 tools: Merge PDF, Compress PDF, Images to
  PDF, PDF to Word, Image Compressor, Percentage Calculator, PDF to
  Excel, Image to Text. Two of the brief's named 8 do not exist yet
  (Background Remover, Unit Converter); they land in Wave 1, and PDF to
  Excel + Image to Text fill the strip until then.
- Category sections show the top 8 PDF tools with a "See all 27 tools →"
  link; the other categories show all their tools (each has 8 or fewer)
  with the heading linked to its hub. The homepage never lists every
  tool: 58 cards in total.
- The old Pakistan category section is now a Country tools band with
  tabs (PK / IN / AE / UK / US). Pakistan is the first and fullest tab;
  the other tabs honestly say no tools exist for that country yet and
  link to Contact. The stored region preference does not switch the
  default tab, because only Pakistan has tools.
- A small Islamic tools section (Zakat Calculator + a note that prayer
  times and a Hijri converter are planned for a later wave). No fake
  tools, no Islamic hub yet.
- Recently used and Favourites sections (empty and hidden until there
  is something to show). Every card now has a star button that saves
  the tool to Favourites in localStorage; recent tools are recorded
  when a tool page is visited. Nothing about files is ever stored.
- Search results now announce "Found N tool(s) matching ..." from the
  shared strings, and `/?q=` still prefills the homepage search.

### Header, footer, navigation
- The Tools menu is now a mega-menu: one column per category with the
  top 3 tools and a "See all N tools →" link (design: "See all 1 tool").
- A globe button opens a Language & region panel: Language (English
  only today), Region, Units (metric/imperial), Default paper size
  (A4/letter). Defaults come from the browser language and timezone;
  no IP or location lookup is used. Preferences are stored in
  localStorage and are used as defaults; deeper Intl formatting lands
  with the tools that use it.
- The header search icon now opens a dropdown that searches all 68
  tools from `/data/search-index.json` (up to 8 results, Enter opens
  the first, Escape closes).
- The footer has four columns: Tools (hub links), Country tools,
  Company, and a new Legal column (Privacy, Cookie Policy, Terms,
  Disclaimer, DMCA, Licenses).

### Hubs and country pages
- Ten category hub pages, generated from `data/hubs.json`: /pdf-tools,
  /image-tools, /convert-tools, /calculators, /developer-tools,
  /excel-tools, /business-tools, /everyday-tools, /design-tools and
  /country/pakistan. Each has an 80–150-word intro, 4 FAQs, tabs
  linking to the other hubs, and a grid/list view toggle.
- `/pakistan` is now `/country/pakistan` (301 redirect in vercel.json).
  All internal links were updated; the old file is gone.
- Three new legal pages: Cookie Policy, DMCA, Licenses (every library
  used, with its licence, including the qpdf-wasm wrapper MIT / qpdf
  Apache-2.0 split and the Lucide ISC + font OFL licences).

### Under the hood
- UI strings live in one file, `locales/en.json`, rendered into the
  static shell and injected into every page as `window.AK_STRINGS` for
  the JavaScript. A public copy ships at `/locales/en.json`, and the
  generator copy ships under `build/locales/`.
- `data/search-index.json` entries now also carry badges, format and
  iconClass, so Favourites/Recent cards render exactly like the
  homepage cards.
- The card markup changed so the star can be a real button: the card
  is a `<div>` with an inner link and a sibling star button (a button
  inside a link would be invalid HTML). Keyboard navigation now follows
  the inner links.
- Asset version is now v11 (`config.js?v=11`, service-worker cache
  `ak-premium-v11`). Sitemap: 96 URLs (10 hubs + 3 legal pages, minus
  the old /pakistan URL).

### Fixed with this deploy
- Clicking a card's favourite star also opened the tool workspace
  (scrolled to the top and set a #tool- hash), because the card's
  click handler fired before the star's. The card handler now ignores
  clicks that come from the star button.
- "See all 1 tools" / "All 1 tools" on the Design hub and in the
  mega-menu now read "See all 1 tool" / "All 1 tool".

### Notes and honest limits (unchanged from the briefs)
- The hero mentions video and audio tools, which do not exist yet;
  they are the Wave 1 phase that follows this one. The Popular strip
  names Background Remover and Unit Converter the same way.
- Hubs follow the 10 registry categories for now; the brief's larger
  hub taxonomy (video, audio, text, SEO, …) arrives as those tools do.
- The per-tool JavaScript split stays as `core.js` + one bundle per
  category (see build/README.md).

## v10 — 17 November 2026 (Foundation: tool registry + generator)

### Registry (expansion brief §3.1)
- All 68 tools now live in one registry, `data/tools.json`, the single
  source of truth. Cards, menus, search, sitemap, related tools,
  breadcrumbs and JSON-LD are generated from it; nothing is hard-coded
  per tool any more. `build.py` reads the registry (the old
  `inventory.json` is superseded and no longer read).
- The registry carries, per tool: slug, workspace, title/short (English),
  category, group, icon, keywords, libs, engine, maxFileMB, wave, status,
  regions, lastReviewed, plus badges, format, related, steps, content
  (use/tip/limit/example/FAQ), meta description and Urdu copy where they
  exist. Every value was migrated from the old build data and verified
  equal by 11 automated equivalence checks; the regenerated site is
  byte-identical to the v9 site except for the items below.
- A public copy of the registry ships at `/data/tools.json`, and
  `/data/search-index.json` (all 68 published tools) is generated for the
  homepage search to use instead of the DOM.

### Generator
- The generator (`build.py` + its README) now ships in the repo under
  `build/` (excluded from deployment by `.vercelignore`), with the
  vendored v3 workspace index and the registry source. It runs from
  wherever it sits: in the repo, or in the workspace build folder.
- Sitemap `<lastmod>` is now the real per-page date: the last commit
  that changed that file on main. Before, every URL carried the build
  date. If a page will change in the next commit, or git is unavailable,
  the build date is used instead.
- The per-tool JavaScript split stays as `core.js` + one bundle per
  category (not one file per tool): 68 files would duplicate the shared
  helpers, and the split is already verified lossless. See `build/README.md`.

### Fixed with this deploy
- The live `/tools` page was still the old v8 page (it was missed in the
  v9 deploy): it loaded `/assets/css/styles.css?v=8` and
  `/assets/js/app.js?v=8`, both deleted in v9, so it rendered unstyled
  and its search did not work. This deploy ships the v9 page.

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

v17 re-trigger: re-run Vercel check after quota reset

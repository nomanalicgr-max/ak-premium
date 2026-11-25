import json, re, pathlib
SRC = pathlib.Path('/home/hatch/workspace/ak-premium-v4-build/app.js')
OUT = pathlib.Path('/home/hatch/workspace/ak-premium-v4/assets/js')
# Element id -> tool slug (dump-id2slug.py, from the registry + workspaces).
# An id used by more than one tool's workspace is shared; a chunk touching
# a shared id goes to core.js, because it serves more than one tool.
id2slug_data = json.load(open('/home/hatch/workspace/ak-premium-v4-build/id2slug.json'))
id2slug = id2slug_data['map']
shared_ids = set(id2slug_data['shared'])
lines = SRC.read_text().split('\n')
# section boundaries (comment line index, title)
secs = []
for i, line in enumerate(lines):
    if line.startswith('/* ----------'):
        secs.append((i, line.strip()))
secs.append((len(lines), 'END'))

def is_anchor(line):
    return bool(re.match(r'^(const|let|var) \w+ = \$\("', line) or
                line.startswith('(function ') or
                re.match(r'^function \w+\(', line) or
                re.match(r'^async function \w+\(', line) or
                re.match(r'^document\.getElementById', line) or
                line.startswith('initWizard(') or
                re.match(r'^const \w+_TASKS = ', line))

# function/IIFE names that are shared helpers -> core, even inside tool sections
CORE_NAMES = {
    'loadPdfLibDoc', 'sizeChangeNote', 'parsePageSelection', 'extractPdfLines',
    'splitLineIntoColumns', 'extractPdfText', 'ocrPdfPages',
    'containsAll', 'generateFormula', 'explainFormula', 'vbaAdvancedForm',
    'generateVba', 'regexTool', 'generateDax',
    'extractPdfTextWithPassword', 'runQpdf', 'runQpdfInfo', 'getLastQpdfError',
    'readPdfOutline', 'buildPdfOutline', 'pdfOutlineTitleText', 'pdfDestPageRef',
    'pdfFindNamedDest', 'pdfTitleHex', 'parsePageList',
    'wizardField', 'quoteCriteria', 'initWizard',
    'loadTaxData', 'calcSalaryTax', 'numToWordsEn', 'numToWordsUr',
    'readJpegOrientation', 'exifOrientationOfFile', 'renderArbitraryRotatedImage',
    'deskewBestAngle',
    'orientedCanvasFromFile', 'encodePng8FromCanvas', 'flattenCanvasOnColour',
    'addWrappedTextPaginatedFrom', 'initCategoryFromHash', 'activateToolPageWorkspace',
    'median', 'drawRichTextRuns', 'imageBlobDimensions',
}
# Pure helpers used by exactly ONE tool -> that tool's bundle, not core.
# (countInkPixels / inkBBoxFromImageData stay in core: remove-pages AND
# crop-pdf both call them. A helper in a tool bundle is still visible to
# that tool's page, which loads core.js first and then its own bundle.)
TOOL_NAMES = {
    'encodeBmpFromCanvas': 'image-converter',
    'encodeGifFromCanvas': 'image-converter',
    'packIcoFromPngs': 'image-converter',
    'extractJpegApp1Exif': 'image-converter',
    'spliceJpegExif': 'image-converter',
    'tiffImageToCanvas': 'image-converter',
    'imageFileToCanvas': 'image-converter',
    'ocrDarkPixels': 'image-to-text',
    'osdScriptToLang': 'image-to-text',
    'ocrPreprocessCanvas': 'image-to-text',
    'renderOcrWords': 'image-to-text',
    'ocrWordsToText': 'image-to-text',
    'imgResizeFaceCropRect': 'image-resizer',
    'svgIntrinsicSize': 'svg-to-png',
    'applyCropAspect': 'image-cropper',
    'vectorBlankText': 'redact-pdf',
    'wrapTextToWidth': 'edit-pdf',
    'cropBoxFromRatio': 'crop-pdf',
    'rangesFromPages': 'remove-pages',
    'listPdfFonts': 'pdf-to-pdf-a',
    'wordLevelDiff': 'compare-pdf',
    'pixelDiff': 'compare-pdf',
    'renderPdfPageCanvas': 'compare-pdf',
    'repairQpdfReport': 'repair-pdf',
    'pdfLayoutToMarkdown': 'pdf-to-markdown',
    'mdInlineRuns': 'create-pdf',
    'drawStyledRuns': 'create-pdf',
    'renderMarkdownToPdf': 'create-pdf',
    'summarizeTextTfIdf': 'local-summarizer',
    'glossaryTranslate': 'translate-helper',
    'validateFieldValue': 'pdf-forms',
    'extractPdfRawImages': 'extract-images-from-pdf',
    'buildXmpPacket': 'pdf-metadata-editor',
    'formatDateTimeLocal': 'pdf-metadata-editor',
    'resizePdfPageInPlace': 'resize-pdf-page-size',
    'decodeContentStream': 'resize-pdf-page-size',
    'sanitizeHtmlForPdf': 'html-to-pdf',
    'htmlToPdfRendered': 'html-to-pdf',
    'pdfWordLineRuns': 'pdf-to-word',
    'docxTableFromGrid': 'pdf-to-word',
    'excelChartData': 'excel-to-pdf',
    'wordHtmlRuns': 'word-to-pdf',
    'parseWordHtml': 'word-to-pdf',
    'layoutWordBlocks': 'word-to-pdf',
    'parsePptxSlides': 'ppt-to-pdf',
    'txtHtmlHeaderFooter': 'txt-html-to-pdf',
    'txtMdInlineRuns': 'txt-html-to-pdf',
    'txtHtmlMarkdownToPdf': 'txt-html-to-pdf',
    'txtHtmlPlainToPdf': 'txt-html-to-pdf',
    'validateFormula': 'formula-generator',
    'formulaParenBalance': 'formula-generator',
    'KNOWN_EXCEL_FUNCTIONS': 'formula-generator',
    'checkVbaSyntax': 'vba-macro-writer',
    'checkDaxSyntax': 'dax-query',
    'KNOWN_DAX_FUNCTIONS': 'dax-query',
    'explainRegex': 'regex-creator',
    'aoaToCsv': 'excel-to-csv',
    'hiddenRowsFromXlsx': 'excel-to-csv',
    'detectCsvEncoding': 'csv-to-excel',
    # v32: single-tool pure calculator helpers (no $("...") ids, so the
    # splitter would otherwise fall through to core; cf. v31 generatePassword).
    'calculateAge': 'age-calculator',
    'percentageCalc': 'percentage-calculator',
    'bmiCalc': 'bmi-calculator',
    'parseCgpa': 'cgpa-calculator',
    'cgpaWhatIf': 'cgpa-calculator',
    'cgpaRequiredAverage': 'cgpa-calculator',
    'discountCalc': 'discount-calculator',
    'compoundCalc': 'compound-interest',
    'tipCalc': 'tip-calculator',
    'fractionCalc': 'fraction-calculator',
    'fractionSteps': 'fraction-calculator',
    'mixedFraction': 'fraction-calculator',
    'invoiceTotals': 'invoice-generator',
    'parseInvoiceItems': 'invoice-generator',
    'formatInvoiceNumber': 'invoice-generator',
    'csvCellValue': 'csv-to-excel',
    'csvSheetName': 'csv-to-excel',
    'csvRowsToSheet': 'csv-to-excel',
    'csvParseText': 'csv-to-excel',
    'styleCsvWorkbook': 'csv-to-excel',
    'csvDelimLabel': 'csv-to-excel',
    'csvPreviewSource': 'csv-to-excel',
    'csvRunPreview': 'csv-to-excel',
    'passportCropRect': 'passport-photo-maker',
    'drawPassportGuide': 'passport-photo-maker',
    'passportPrintSheet': 'passport-photo-maker',
    'drawPassportPreview': 'passport-photo-maker',
    'hexToRgb': 'color-palette',
    'rgbToHex': 'color-palette',
    'mixHex': 'color-palette',
    'wcagLuminance': 'color-palette',
    'wcagContrastRatio': 'color-palette',
    'wcagContrastGrade': 'color-palette',
    'colorHarmonies': 'color-palette',
    'shadeTintScale': 'color-palette',
    'CSS_COLOR_NAMES': 'color-palette',
    'parseColorInput': 'color-palette',
    'renderPalette': 'color-palette',
    'paletteToCssVars': 'color-palette',
    'paletteToTailwind': 'color-palette',
    'paletteSwatchSheet': 'color-palette',
    'qrPayloadForType': 'qr-code-generator',
    'drawQrCanvas': 'qr-code-generator',
    'qrSvgString': 'qr-code-generator',
    'qrScanTest': 'qr-code-generator',
    'renderQrFields': 'qr-code-generator',
    'qrGenerate': 'qr-code-generator',
    'ageMilestones': 'age-calculator',
    'normalCdf': 'bmi-calculator',
    'bmiChildPercentile': 'bmi-calculator',
    'bmiFromImperial': 'bmi-calculator',
    'bmiWaistRatio': 'bmi-calculator',
    'reverseDiscount': 'discount-calculator',
    'compoundYearTable': 'compound-interest',
    'tipSplitByItems': 'tip-calculator',
    'fractionSumChain': 'fraction-calculator',
    'invoiceFormData': 'invoice-generator',
    'buildInvoicePdf': 'invoice-generator',
    'resumeFormData': 'resume-builder',
    'buildResumePdf': 'resume-builder',
    'renderResumePreview': 'resume-builder',
    'resumeAtsCheck': 'resume-builder',
    'passphraseWords': 'password-generator',
    'generatePassword': 'password-generator',
    'generatePassphrase': 'password-generator',
    'passphraseEntropy': 'password-generator',
    'generatePronounceable': 'password-generator',
    'generatePin': 'password-generator',
    'passwordZxcvbnNote': 'password-generator',
    'pwdModeRows': 'password-generator',
    # v33: Calculators 2 + Pakistan pure helpers -> their tool bundles.
    'initTzZones': 'time-zone-converter',
    'tzLabel': 'time-zone-converter',
    'tzWallToUtc': 'time-zone-converter',
    'tzMeetingPlan': 'time-zone-converter',
    'tzWorkingOverlap': 'time-zone-converter',
    'buildIcsEvent': 'time-zone-converter',
    'pkHolidaySet': 'date-difference',
    'workingDaysBetween': 'date-difference',
    'addDaysToDate': 'date-difference',
    'addMonthsClamped': 'date-difference',
    'ymdBreakdown': 'date-difference',
    'countdownParts': 'date-difference',
    'tdeeGoalTarget': 'calorie-tdee-calculator',
    'tdeeMacros': 'calorie-tdee-calculator',
    'katchMcArdle': 'calorie-tdee-calculator',
    'imperialToMetric': 'calorie-tdee-calculator',
    'landUnitsForMarla': 'land-converter',
    'landPriceEstimate': 'land-converter',
    'landFromDimensions': 'land-converter',
    'landMarlaSize': 'land-converter',
    'zakatTotals': 'zakat-calculator',
    'hijriYearEnd': 'zakat-calculator',
    'amountWordsFor': 'amount-to-words',
    'chequeLine': 'amount-to-words',
    'urduCountStats': 'urdu-word-counter',
    # v34: Text A pure helpers -> their tool bundles.
    'graphemeCount': 'character-counter',
    'utf8ByteSize': 'character-counter',
    'dedupeLines': 'remove-duplicate-lines',
    'levenshtein': 'remove-duplicate-lines',
    'slugifyText': 'slug-generator',
    'transliterateText': 'slug-generator',
    'translitMap': 'slug-generator',
    'slugStopwords': 'slug-generator',
    # v34 fix (parent, post-stage-2): pure single-tool helpers that fell
    # through to core (same trap as v31 generatePassword / v32 helpers).
    # sortLinesFn is called only by the sort-lines handler; the fancy
    # cluster is used only by the fancy-text-generator handler.
    # NOTE on const tables: is_anchor() only treats a const as an anchor
    # when its value starts with $(" (or it is a _TASKS table), so a plain
    # const table rides inside the PRECEDING anchor's chunk (or the section
    # preamble, which always goes to core). FANCY_MAPS rides with the
    # buildFancyMap chunk, so it needs no entry. SMALL_CAPS sits in the
    # section preamble (before the first anchor) so it STAYS in core and
    # the fancy bundle reads it from there — same pattern as
    # LOREM_SENTENCES (loremIpsum lives in core) and STOPWORDS
    # (wordFrequency lives in core; local-summarizer also reads it).
    'sortLinesFn': 'sort-lines',
    'buildFancyMap': 'fancy-text-generator',
    'fancyStyles': 'fancy-text-generator',
    'fancyRows': 'fancy-text-generator',
    'meritReversePlanner': 'percentage-marks-calculator',
    'pctToGpa': 'percentage-marks-calculator',
    'gpaToPct': 'percentage-marks-calculator',
    # v35: Text B pure helpers -> their tool bundles. (readabilityScore
    # and wordFrequency stay in core by design: the first is called by the
    # v34 word-counter handler too, the second by the word-frequency
    # handler and the local-summarizer path; DALE_CHALL rides inside the
    # readabilityExtraScores chunk, and URDU_STOPWORDS sits in the section
    # preamble with STOPWORDS, so both stay in core by design.)
    'ttsSplitSentences': 'text-to-speech',
    'ttsWordSpans': 'text-to-speech',
    'ttsWordAt': 'text-to-speech',
    'readabilityExtraScores': 'readability-checker',
    'readabilityHighlightHtml': 'readability-checker',
    'sttFormatTime': 'speech-to-text',
    'sttSegmentsToText': 'speech-to-text',
}
# Load-time const lookups of DYNAMICALLY created controls -> that tool's
# bundle, not core. The split routes a chunk by the ids it touches, but
# ids created by JS (innerHTML of a wrapper div) are invisible to
# dump-id2slug.py, so such a chunk has no known slug and falls through to
# core — where it runs BEFORE the tool bundle creates the element, the
# lookup returns null, the guarded `if (el)` skips the listener, and the
# control silently does nothing. (Found in v24: the remove-pages blank/
# search buttons, the rotate auto-rotate/deskew buttons, the crop scope
# select and the edit font select were all dead in the split build while
# the unsplit probe passed. A chunk that references at least one STATIC id
# of the tool routes correctly on its own — e.g. rdPatternSel, which also
# touches the static redactText id — so only the pure-dynamic ones are
# listed here.)
TOOL_CONSTS = {
    'rotAutoBtn': 'rotate-pdf',
    'rotDeskewBtn': 'rotate-pdf',
    'rmSearchBtn': 'remove-pages',
    'rmBlankBtn': 'remove-pages',
    'crScopeEl': 'crop-pdf',
    'edFontSel': 'edit-pdf',
}
# data tables that live inside a tool section but are read by core helpers
# (loadTaxData reads TAX_SLABS_FALLBACK; numToWordsEn reads ONES_EN/TENS_EN).
CORE_CONSTS = {'TAX_SLABS_FALLBACK', 'ONES_EN', 'TENS_EN', 'TAX_DATA', 'REDACT_PATTERNS'}  # also let TAX_DATA (loadTaxData in core reads it)
# REDACT_PATTERNS: the table is declared at the tail of the crop section
# (app.js ~5653), so without hoisting it rides inside the cropPdfBtn chunk
# into tools/crop-pdf.js — but only redact-pdf.js reads it, so the redact
# page threw "REDACT_PATTERNS is not defined" whenever a pattern was
# chosen. Hoisting it to core (loaded on every page) fixes it.
def hoist_core_consts(chunk_lines):
    """Pull CORE_CONSTS statements out of a chunk; return (kept, hoisted)."""
    kept, hoisted, i = [], [], 0
    while i < len(chunk_lines):
        m = re.match(r'^(?:const|let) (\w+) = ', chunk_lines[i])
        if m and m.group(1) in CORE_CONSTS:
            j = i
            while j < len(chunk_lines) and not chunk_lines[j].rstrip().endswith(';'):
                j += 1
            hoisted.extend(chunk_lines[i:j + 1])
            i = j + 1
        else:
            kept.append(chunk_lines[i])
            i += 1
    return kept, hoisted
# Wizard task tables (data, one per Excel wizard) -> that wizard's tool file.
# The bare initWizard(...) binding calls are anchors too; they carry no
# $("...") ids, so they are classified by their output/status element ids.
TASKS_MAP = {
    'FORMULA_TASKS': 'formula-generator', 'VBA_TASKS': 'vba-macro-writer',
    'REGEX_TASKS': 'regex-creator', 'DAX_TASKS': 'dax-query',
}
# whole sections that go to core unchanged (by section title start)
CORE_SECTIONS = [
    'helpers', 'success card', 'friendly errors', 'money formatting',
    'navigation categories', 'hero search', 'header nav', 'global shell',
    'Phase 1 tools: pure logic', 'Phase 2 tools: pure logic',
    'calculators recalculate live', 'copy result / share link',
    'drag-and-drop zone', "main button disabled", 'File preview',
]
def section_is_core(title):
    # Case-insensitive: section comments use "Global shell", the keyword
    # list uses "global shell"; both must match.
    return any(k in title.lower() for k in CORE_SECTIONS)

def anchor_name(line):
    m = re.match(r'^(?:async )?function (\w+)\(', line)
    if m: return m.group(1)
    m = re.match(r'^\(function (\w+)\(', line)
    if m: return m.group(1)
    m = re.match(r'^initWizard\("(\w+)"', line)
    if m: return 'initWizard-' + m.group(1)
    m = re.match(r'^(?:const|let|var) (\w+) =', line)
    if m: return m.group(1)
    return None

outputs = {'core': []}
assignment = []  # (line, name, target)
for j in range(len(secs) - 1):
    start, title = secs[j]
    end = secs[j + 1][0]
    comment = lines[start]
    if section_is_core(title):
        outputs['core'].append('\n'.join(lines[start:end]).rstrip('\n'))
        assignment.append((start + 1, title[:50], 'core (whole section)'))
        continue
    # split section into chunks by anchor
    anchors = [i for i in range(start + 1, end) if is_anchor(lines[i])]
    # preamble: text between the comment and the first anchor (const tables etc.)
    preamble_end = anchors[0] if anchors else end
    preamble = '\n'.join(lines[start + 1:preamble_end]).strip('\n')
    if preamble:
        outputs['core'].append(preamble)
        assignment.append((start + 1, 'preamble of ' + title[:40], 'core'))
    seen_comment = {'core': False}
    for k, a in enumerate(anchors):
        nxt = anchors[k + 1] if k + 1 < len(anchors) else end
        chunk_lines, hoisted = hoist_core_consts(lines[a:nxt])
        if hoisted:
            outputs['core'].append('\n'.join(hoisted).rstrip('\n'))
            assignment.append((a + 1, 'hoisted ' + ', '.join(CORE_CONSTS & {re.match(r'^(?:const|let) (\w+)', l).group(1) for l in hoisted if re.match(r'^(?:const|let) (\w+)', l)}), 'core'))
        chunk = '\n'.join(chunk_lines).rstrip('\n')
        name = anchor_name(lines[a])
        ids = re.findall(r'\$\("([^"]+)"\)', chunk)
        slugs = {id2slug[i] for i in ids if i in id2slug}
        has_shared = any(i in shared_ids for i in ids)
        # A wizard binding call carries its tool in its output/status ids
        # (initWizard("formula", ..., "formulaOutput", "formulaStatus")).
        if lines[a].startswith('initWizard('):
            m = re.match(r'^initWizard\("[^"]+", [^,]+, "([^"]+)", "([^"]+)"', lines[a])
            if m:
                slugs = {id2slug[i] for i in (m.group(1), m.group(2)) if i in id2slug}
        # A chunk belongs to one tool only when every id it touches is that
        # tool's own. Shared ids (the Excel wizards' Generate/Copy buttons)
        # or ids from two tools mean shared code -> core.
        if name in CORE_NAMES:
            target = 'core'
        elif name in TOOL_NAMES:
            target = 'tool-' + TOOL_NAMES[name]
        elif name in TOOL_CONSTS:
            target = 'tool-' + TOOL_CONSTS[name]
        elif name in TASKS_MAP:
            target = 'tool-' + TASKS_MAP[name]
        elif has_shared or len(slugs) > 1:
            target = 'core'
        elif len(slugs) == 1:
            target = 'tool-' + next(iter(slugs))
        else:
            target = 'core'
        if target not in outputs:
            outputs[target] = []
        # attach the section comment before the first chunk of this section in this file
        if not seen_comment.get(target):
            outputs[target].append(comment)
            seen_comment[target] = True
        outputs[target].append(chunk)
        assignment.append((a + 1, name or lines[a][:40], target))

header = '''/* AK Premium v12 — split from app.js (Phase 4.3).
   core.js holds the shared helpers, navigation, search, generic workspace
   UX (dropzone, success card, live calculators) and every pure-logic
   function. Each tools/<slug>.js holds only the DOM bindings for one tool.
   A tool page loads core.js plus its own tool file, both deferred. */'''
core_head = lines[0]  # original file header comment (lines 1-6 are the header)
# rebuild: core.js = original header + core chunks; tool files get their own header
core_text = '\n'.join(lines[0:6]).rstrip('\n') + '\n\n' + '\n\n'.join(outputs['core']) + '\n'
(OUT / 'core.js').write_text(core_text)
print('core.js:', len(core_text), 'bytes,', core_text.count('\n'), 'lines')
(OUT / 'tools').mkdir(exist_ok=True)
for target, chunks in sorted(outputs.items()):
    if target == 'core':
        continue
    slug = target[5:]
    text = '/* AK Premium v12 — %s (split from app.js). Loads after core.js, only on its own tool page. */\n\n' % slug + '\n\n'.join(chunks) + '\n'
    (OUT / 'tools' / (slug + '.js')).write_text(text)
    print(target + '.js:', len(text), 'bytes,', text.count('\n'), 'lines')
# The 10 category bundles from v9-v11 are gone; remove them (unhashed and
# hashed copies) so the output dir never ships two versions of one tool's code.
for old in sorted(OUT.glob('bundle-*.js')):
    old.unlink()
    print('deleted old bundle:', old.name)
print()
for line_no, name, target in assignment:
    print(f'{line_no:5d}  {str(name)[:55]:55s} -> {target}')

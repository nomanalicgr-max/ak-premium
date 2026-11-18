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
    'extractPdfTextWithPassword', 'runQpdf',
    'wizardField', 'quoteCriteria', 'initWizard',
    'loadTaxData', 'calcSalaryTax', 'numToWordsEn', 'numToWordsUr',
    'addWrappedTextPaginatedFrom', 'initCategoryFromHash', 'activateToolPageWorkspace',
}
# data tables that live inside a tool section but are read by core helpers
# (loadTaxData reads TAX_SLABS_FALLBACK; numToWordsEn reads ONES_EN/TENS_EN).
CORE_CONSTS = {'TAX_SLABS_FALLBACK', 'ONES_EN', 'TENS_EN', 'TAX_DATA'}  # also let TAX_DATA (loadTaxData in core reads it)
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

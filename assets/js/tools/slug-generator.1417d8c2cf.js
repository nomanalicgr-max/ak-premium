/* AK Premium v12 — slug-generator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Developer tools (batch 5) ---------- */

function translitMap() {
  return {
    "ا": "a", "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h", "خ": "kh", "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh", "ص": "s", "ض": "d", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f", "ق": "q", "ك": "k", "ک": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "و": "w", "ي": "y", "ی": "y", "ة": "h", "ى": "a", "ء": "", "آ": "aa", "أ": "a", "إ": "i", "ؤ": "w", "ئ": "y", "ٱ": "a",
    "پ": "p", "چ": "ch", "ٹ": "t", "ڈ": "d", "ڑ": "r", "ں": "n", "ھ": "h", "ہ": "h", "گ": "g", "ے": "e", "ژ": "zh",
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    "А": "a", "Б": "b", "В": "v", "Г": "g", "Д": "d", "Е": "e", "Ё": "yo", "Ж": "zh", "З": "z", "И": "i", "Й": "y", "К": "k", "Л": "l", "М": "m", "Н": "n", "О": "o", "П": "p", "Р": "r", "С": "s", "Т": "t", "У": "u", "Ф": "f", "Х": "kh", "Ц": "ts", "Ч": "ch", "Ш": "sh", "Щ": "shch", "Ъ": "", "Ы": "y", "Ь": "", "Э": "e", "Ю": "yu", "Я": "ya",
    "\u064b": "", "\u064c": "", "\u064d": "", "\u064e": "", "\u064f": "", "\u0650": "", "\u0651": "", "\u0652": "", "\u0670": "", "\u0640": ""
  };
}

function transliterateText(text) {
  const m = translitMap();
  return [...String(text || "")].map((ch) => (m[ch] !== undefined ? m[ch] : ch)).join("");
}
// Small words dropped from a slug when the stop-word box is ticked.

function slugStopwords() {
  return new Set("the a an and or of to in on for with is are was were be at by from as it its this that ke ka ki ko se mein main aur ya hai hain tha thi per tak ne".split(" "));
}

function slugifyText(text, opts) {
  opts = opts || {};
  let s = String(text || "");
  if (opts.transliterate) s = transliterateText(s);
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let words = s.split(/[^a-z0-9]+/).filter(Boolean);
  if (opts.stopwords) {
    const stop = slugStopwords();
    const kept = words.filter((w) => !stop.has(w));
    if (kept.length) words = kept;
  }
  let slug = words.join("-");
  const max = parseInt(opts.maxLength, 10);
  if (!isNaN(max) && max > 0 && slug.length > max) {
    const cut = slug.lastIndexOf("-", max);
    slug = cut > 0 ? slug.slice(0, cut) : slug.slice(0, max);
  }
  return slug;
}

function updateSlug() {
  const input = $("slugInput");
  const text = (input || {}).value || "";
  const slug = slugifyText(text, {
    transliterate: !!($("slugTransliterate") || {}).checked,
    stopwords: !!($("slugStopwords") || {}).checked,
    maxLength: ($("slugMaxLen") || {}).value || ""
  });
  if ($("slugOutput")) $("slugOutput").textContent = text.trim() ? slug : "Your slug will appear here.";
  const urlOut = $("slugUrlOutput");
  if (urlOut) {
    const base = (($("slugBaseUrl") || {}).value || "").trim();
    urlOut.textContent = base && text.trim() && slug ? base.replace(/\/+$/, "") + "/" + slug : "The full address will appear here.";
  }
}

const slugInput = $("slugInput");
if (slugInput) slugInput.addEventListener("input", updateSlug);
["slugTransliterate", "slugStopwords"].forEach((id) => { const el = $(id); if (el) el.addEventListener("change", updateSlug); });
["slugMaxLen", "slugBaseUrl"].forEach((id) => { const el = $(id); if (el) el.addEventListener("input", updateSlug); });

const slugCopyBtn = $("slugCopyBtn");
if (slugCopyBtn) slugCopyBtn.addEventListener("click", () => {
  const text = ($("slugOutput") || {}).textContent || "";
  if (!text || text === "Your slug will appear here.") { setStatus("slugStatus", "Type a title first, then use Copy Slug."); return; }
  copyTextToClipboard(text, "slugStatus");
});
// "mm:ss" stamp for a transcript line, from seconds since listening started.

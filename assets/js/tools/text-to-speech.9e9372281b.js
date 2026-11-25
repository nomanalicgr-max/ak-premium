/* AK Premium v12 — text-to-speech (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

const ttsRate = $("ttsRate");
if (ttsRate) ttsRate.addEventListener("input", () => { const l = $("ttsRateLabel"); if (l) l.textContent = ttsRate.value; });

const ttsPitch = $("ttsPitch");
if (ttsPitch) ttsPitch.addEventListener("input", () => { const l = $("ttsPitchLabel"); if (l) l.textContent = ttsPitch.value; });

function ttsPopulateVoices() {
  const sel = $("ttsVoice");
  if (!sel) return;
  const voices = ttsVoiceList();
  sel.innerHTML = "";
  if (!voices.length) {
    const o = document.createElement("option");
    o.value = "";
    o.textContent = "Default voice";
    sel.appendChild(o);
    return;
  }
  voices.forEach((v, i) => {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = v.name + (v.lang ? " (" + v.lang + ")" : "");
    sel.appendChild(o);
  });
}
// Split text into spoken chunks: one sentence per chunk, and a sentence
// longer than ~200 characters is cut at a comma, a semicolon or a word
// edge, so a long paragraph is never handed to the browser in one piece
// (some browsers cut long utterances short). Chunks never split a word
// unless a single word is longer than the cut.

function ttsSplitSentences(text) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return [];
  const sentences = s.match(/[^.!?]+[.!?]+["'\u201d\u2019)]?|[^.!?]+$/g) || [s];
  const out = [];
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (sentence.length <= 200) { out.push(sentence); continue; }
    let rest = sentence;
    while (rest.length > 200) {
      let cut = -1;
      for (let i = 200; i > 40; i--) { if (rest[i] === "," || rest[i] === ";") { cut = i + 1; break; } }
      if (cut < 0) { const sp = rest.lastIndexOf(" ", 200); cut = sp > 40 ? sp : 200; }
      out.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}
// Word spans for the live highlight: each word with its start/end in the chunk.

function ttsWordSpans(text) {
  const s = String(text || "");
  const spans = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(s)) !== null) spans.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  return spans;
}
// Index of the word being spoken at a character offset (-1 if none yet).

function ttsWordAt(spans, charIndex) {
  for (let i = 0; i < spans.length; i++) {
    if (charIndex >= spans[i].start && charIndex < spans[i].end) return i;
    if (charIndex < spans[i].start) return i > 0 ? i - 1 : -1;
  }
  return spans.length ? spans.length - 1 : -1;
}
// Show the chunk being read, with the current word highlighted.

function ttsShowChunk() {
  const q = window.__ttsQueue;
  const box = $("ttsHighlight");
  if (!box) return;
  if (!q || !q.chunks.length) { box.innerHTML = ""; return; }
  const spans = ttsWordSpans(q.chunks[q.index]);
  box.innerHTML = "";
  spans.forEach((sp, i) => {
    const w = document.createElement("span");
    w.textContent = sp.word;
    if (i === q.word) { w.style.backgroundColor = "var(--primary-soft)"; w.style.borderRadius = "4px"; w.style.padding = "0 2px"; }
    box.appendChild(w);
    if (i < spans.length - 1) box.appendChild(document.createTextNode(" "));
  });
}
// Speak the next chunk in the queue; called again when one ends.

function ttsSpeakNext() {
  const q = window.__ttsQueue;
  if (!q || q.stopped) return;
  if (q.index >= q.chunks.length) {
    window.__ttsQueue = null;
    const pb = $("ttsProgressWrap"); if (pb) pb.style.display = "none";
    const p = $("ttsProgress"); if (p) p.textContent = "";
    setStatus("ttsStatus", "Done. Finished reading.");
    return;
  }
  const text = q.chunks[q.index];
  q.word = -1;
  ttsShowChunk();
  const u = new SpeechSynthesisUtterance(text);
  const voices = ttsVoiceList();
  const vi = parseInt(($("ttsVoice") || {}).value, 10);
  if (!isNaN(vi) && voices[vi]) u.voice = voices[vi];
  u.rate = parseFloat(($("ttsRate") || {}).value) || 1;
  u.pitch = parseFloat(($("ttsPitch") || {}).value) || 1;
  u.onboundary = (ev) => {
    const q2 = window.__ttsQueue;
    if (!q2) return;
    q2.word = ttsWordAt(ttsWordSpans(text), ev.charIndex || 0);
    ttsShowChunk();
  };
  u.onend = () => {
    const q2 = window.__ttsQueue;
    if (!q2 || q2.stopped || q2.paused) return;
    q2.index++;
    setProgress("ttsProgressBar", Math.round(q2.index / q2.chunks.length * 100));
    const p = $("ttsProgress");
    if (p) p.textContent = "Reading " + Math.min(q2.index + 1, q2.chunks.length) + " of " + q2.chunks.length + ".";
    ttsSpeakNext();
  };
  u.onerror = (ev) => {
    const q2 = window.__ttsQueue;
    if (!q2 || q2.stopped || q2.paused) return;
    if (ev && ev.error === "canceled") return; // Stop pressed.
    q2.index++;
    ttsSpeakNext();
  };
  window.speechSynthesis.speak(u);
  setProgress("ttsProgressBar", Math.round(q.index / q.chunks.length * 100));
  const p = $("ttsProgress");
  if (p) p.textContent = "Reading " + (q.index + 1) + " of " + q.chunks.length + ".";
}

const ttsSpeakBtn = $("ttsSpeakBtn");
if (ttsSpeakBtn) ttsSpeakBtn.addEventListener("click", () => {
  if (!("speechSynthesis" in window) || !window.speechSynthesis) { setError("ttsStatus", "Your browser does not support reading aloud. Try Chrome or Edge on desktop or Android."); return; }
  const text = ($("ttsInput") || {}).value || "";
  if (!text.trim()) { setError("ttsStatus", "Please type some text to read aloud first."); return; }
  window.speechSynthesis.cancel();
  const chunks = ttsSplitSentences(text);
  if (!chunks.length) { setError("ttsStatus", "Please type some text to read aloud first."); return; }
  window.__ttsQueue = { chunks: chunks, index: 0, word: -1, paused: false, stopped: false };
  const pb = $("ttsProgressWrap"); if (pb) pb.style.display = "block";
  setStatus("ttsStatus", "Reading aloud. Press Stop to end it early.");
  ttsSpeakNext();
});

const ttsStopBtn = $("ttsStopBtn");
if (ttsStopBtn) ttsStopBtn.addEventListener("click", () => {
  const q = window.__ttsQueue;
  if (q) q.stopped = true;
  window.__ttsQueue = null;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  const box = $("ttsHighlight"); if (box) box.innerHTML = "";
  const pb = $("ttsProgressWrap"); if (pb) pb.style.display = "none";
  const p = $("ttsProgress"); if (p) p.textContent = "";
  setStatus("ttsStatus", "Stopped.");
});

const ttsPauseBtn = $("ttsPauseBtn");
if (ttsPauseBtn) ttsPauseBtn.addEventListener("click", () => {
  const q = window.__ttsQueue;
  if (!q || !window.speechSynthesis) { setStatus("ttsStatus", "Nothing is being read right now."); return; }
  if (q.paused) return;
  q.paused = true;
  window.speechSynthesis.pause();
  setStatus("ttsStatus", "Paused. Press Resume to carry on.");
});

const ttsResumeBtn = $("ttsResumeBtn");
if (ttsResumeBtn) ttsResumeBtn.addEventListener("click", () => {
  const q = window.__ttsQueue;
  if (!q || !q.paused) { setStatus("ttsStatus", "Nothing is paused right now."); return; }
  q.paused = false;
  window.speechSynthesis.resume();
  setStatus("ttsStatus", "Reading aloud. Press Stop to end it early.");
});
if ("speechSynthesis" in window && window.speechSynthesis) {
  ttsPopulateVoices();
  window.speechSynthesis.onvoiceschanged = ttsPopulateVoices;
} else {
  ttsPopulateVoices();
}

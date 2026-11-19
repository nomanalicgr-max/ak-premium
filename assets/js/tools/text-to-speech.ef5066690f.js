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

const ttsSpeakBtn = $("ttsSpeakBtn");
if (ttsSpeakBtn) ttsSpeakBtn.addEventListener("click", () => {
  if (!("speechSynthesis" in window) || !window.speechSynthesis) { setError("ttsStatus", "Your browser does not support reading aloud. Try Chrome or Edge on desktop or Android."); return; }
  const text = ($("ttsInput") || {}).value || "";
  if (!text.trim()) { setError("ttsStatus", "Please type some text to read aloud first."); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = ttsVoiceList();
  const vi = parseInt(($("ttsVoice") || {}).value, 10);
  if (!isNaN(vi) && voices[vi]) u.voice = voices[vi];
  u.rate = parseFloat(($("ttsRate") || {}).value) || 1;
  u.pitch = parseFloat(($("ttsPitch") || {}).value) || 1;
  u.onend = () => setStatus("ttsStatus", "Done. Finished reading.");
  u.onerror = () => setError("ttsStatus", "Could not read this text aloud. Try a shorter text or another voice.");
  window.speechSynthesis.speak(u);
  setStatus("ttsStatus", "Reading aloud. Press Stop to end it early.");
});

const ttsStopBtn = $("ttsStopBtn");
if (ttsStopBtn) ttsStopBtn.addEventListener("click", () => {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  setStatus("ttsStatus", "Stopped.");
});
if ("speechSynthesis" in window && window.speechSynthesis) {
  ttsPopulateVoices();
  window.speechSynthesis.onvoiceschanged = ttsPopulateVoices;
} else {
  ttsPopulateVoices();
}

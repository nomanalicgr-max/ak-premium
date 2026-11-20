/* AK Premium v12 — speech-to-text (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Developer tools (batch 5) ---------- */

const sttStartBtn = $("sttStartBtn");
if (sttStartBtn) sttStartBtn.addEventListener("click", () => {
  const Ctor = sttRecognitionCtor();
  if (!Ctor) { setError("sttStatus", "Your browser does not support speech recognition. Try Chrome or Edge on desktop or Android."); return; }
  if (window.__sttListening) return;
  let rec;
  try {
    rec = new Ctor();
  } catch (e) {
    setError("sttStatus", "Speech recognition could not start on this device. Try again.");
    return;
  }
  rec.lang = ($("sttLang") || {}).value || "en-US";
  rec.continuous = true;
  rec.interimResults = true;
  window.__sttRec = rec;
  window.__sttListening = true;
  if ($("sttTranscript")) $("sttTranscript").textContent = "";
  if ($("sttInterim")) $("sttInterim").textContent = "";
  sttStartBtn.disabled = true;
  if ($("sttStopBtn")) $("sttStopBtn").disabled = false;
  setStatus("sttStatus", "Listening… Speak now.");
  rec.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) {
        const el = $("sttTranscript");
        if (el) el.textContent = (el.textContent || "") + res[0].transcript;
      } else interim += res[0].transcript;
    }
    if ($("sttInterim")) $("sttInterim").textContent = interim;
  };
  rec.onerror = (event) => {
    window.__sttListening = false;
    window.__sttRec = null;
    sttStartBtn.disabled = false;
    if ($("sttStopBtn")) $("sttStopBtn").disabled = true;
    const code = (event && event.error) || "";
    if (code === "not-allowed" || code === "service-not-allowed") setError("sttStatus", "Microphone access was blocked. Allow the microphone for this site and try again.");
    else if (code === "no-speech") setError("sttStatus", "No speech was heard. Check your microphone and speak again.");
    else if (code === "network") setError("sttStatus", "The speech service could not be reached. Check your connection and try again.");
    else if (code === "aborted") setStatus("sttStatus", "Listening stopped.");
    else setError("sttStatus", "Speech recognition stopped with an error. Try again.");
  };
  rec.onend = () => {
    const was = window.__sttListening;
    window.__sttListening = false;
    window.__sttRec = null;
    sttStartBtn.disabled = false;
    if ($("sttStopBtn")) $("sttStopBtn").disabled = true;
    if (was) setStatus("sttStatus", "Stopped listening. Press Start Listening to dictate again.");
  };
  try {
    rec.start();
  } catch (e) {
    window.__sttListening = false;
    window.__sttRec = null;
    sttStartBtn.disabled = false;
    if ($("sttStopBtn")) $("sttStopBtn").disabled = true;
    setError("sttStatus", "Speech recognition could not start on this device. Try again.");
  }
});

const sttStopBtn = $("sttStopBtn");
if (sttStopBtn) sttStopBtn.addEventListener("click", () => {
  window.__sttListening = false;
  if (window.__sttRec) { try { window.__sttRec.stop(); } catch (e) {} }
  sttStartBtn.disabled = false;
  sttStopBtn.disabled = true;
  setStatus("sttStatus", "Stopped listening. Press Start Listening to dictate again.");
});

const sttCopyBtn = $("sttCopyBtn");
if (sttCopyBtn) sttCopyBtn.addEventListener("click", () => {
  const text = ($("sttTranscript") || {}).textContent || "";
  if (!text.trim()) { setStatus("sttStatus", "Listen first, then use Copy Transcript."); return; }
  copyTextToClipboard(text, "sttStatus");
});

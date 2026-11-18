/* AK Premium v12 — formula-explainer (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v4: standalone Formula Explainer page ---------- */

(function initExplainerPage() {
  const btn = $("explainerBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const input = ($("explainerInput") || {}).value || "";
    if (!input.trim()) { setError("explainerStatus", "Please paste a formula starting with = first."); return; }
    const out = $("explainerOutput");
    if (out) out.textContent = explainFormula(input);
    setStatus("explainerStatus", "Done.");
  });
})();

/* v4 tool pages: each tool page embeds exactly one workspace, and the
   v3 CSS hides .workspace-tool until it gains .active (which only
   happened on homepage card clicks). A tool page has no cards and no
   #tool- hash, so without this the tool area stays an empty white box.
   Activate the single workspace on any /tools/ page. */

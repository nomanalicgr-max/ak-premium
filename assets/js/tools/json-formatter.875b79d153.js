/* AK Premium v12 — json-formatter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Developer ---------- */

const jsonFormatBtn = $("jsonFormatBtn");
if (jsonFormatBtn) jsonFormatBtn.addEventListener("click", () => {
  try {
    const text = ($("jsonInput") || {}).value || "";
    $("jsonOutput").textContent = prettyJson(text);
    const tree = $("jsonTreeOutput"); if (tree) tree.innerHTML = "";
    setStatus("jsonStatus", "Done. JSON formatted." + jsonDupNote(text));
  }
  catch (e) { setError("jsonStatus", "Invalid JSON: " + e.message); }
});

const jsonMinifyBtn = $("jsonMinifyBtn");
if (jsonMinifyBtn) jsonMinifyBtn.addEventListener("click", () => {
  try { $("jsonOutput").textContent = minifyJson($("jsonInput").value); setStatus("jsonStatus", "Done. JSON minified."); }
  catch (e) { setError("jsonStatus", "Invalid JSON: " + e.message); }
});

const jsonValidateBtn = $("jsonValidateBtn");
if (jsonValidateBtn) jsonValidateBtn.addEventListener("click", () => {
  try { JSON.parse($("jsonInput").value); $("jsonOutput").textContent = "Valid JSON."; setStatus("jsonStatus", "Done. JSON is valid."); }
  catch (e) { setError("jsonStatus", "Invalid JSON: " + e.message); }
});

const jsonCopyBtn = $("jsonCopyBtn");
if (jsonCopyBtn) jsonCopyBtn.addEventListener("click", () => {
  const text = $("jsonOutput") ? $("jsonOutput").textContent : "";
  if (!text || text.startsWith("Formatted JSON")) { setStatus("jsonStatus", "Format, minify or validate JSON first, then use Copy."); return; }
  copyTextToClipboard(text, "jsonStatus");
});

/* JSON Formatter (advanced): repair, sort keys, duplicate-key check, tree
   view, JSON Schema validation and JSONPath queries. Repair uses
   jsonrepair (ISC), schema validation uses Ajv 2020-12 (MIT), queries use
   jsonpath-plus (MIT) — all in the browser, nothing is uploaded. */

const jsonRepairBtn = $("jsonRepairBtn");
if (jsonRepairBtn) jsonRepairBtn.addEventListener("click", async () => {
  const text = ($("jsonInput") || {}).value || "";
  if (!text.trim()) { setError("jsonStatus", "Paste some JSON first."); return; }
  if (!window.JSONRepair) { const ok = await loadLibrary("jsonrepair", "jsonStatus"); if (!ok) return; }
  try {
    const fixed = window.JSONRepair.jsonrepair(text);
    const parsed = JSON.parse(fixed);
    $("jsonOutput").textContent = JSON.stringify(parsed, null, 2);
    const tree = $("jsonTreeOutput"); if (tree) tree.innerHTML = "";
    setStatus("jsonStatus", "Done. JSON repaired and formatted." + jsonDupNote(fixed));
  } catch (e) { setError("jsonStatus", "Could not repair this JSON: " + e.message); }
});

const jsonSortBtn = $("jsonSortBtn");
if (jsonSortBtn) jsonSortBtn.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(($("jsonInput") || {}).value || "");
    $("jsonOutput").textContent = JSON.stringify(sortJsonKeys(parsed), null, 2);
    const tree = $("jsonTreeOutput"); if (tree) tree.innerHTML = "";
    setStatus("jsonStatus", "Done. Keys sorted alphabetically at every level.");
  } catch (e) { setError("jsonStatus", "Invalid JSON: " + e.message); }
});

const jsonTreeBtn = $("jsonTreeBtn");
if (jsonTreeBtn) jsonTreeBtn.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(($("jsonInput") || {}).value || "");
    const tree = $("jsonTreeOutput");
    if (tree) tree.innerHTML = jsonTreeHtml(parsed, 0);
    $("jsonOutput").textContent = "Tree view is shown below. Click any section to fold or unfold it.";
    setStatus("jsonStatus", "Done. Tree view shown below.");
  } catch (e) { setError("jsonStatus", "Invalid JSON: " + e.message); }
});

const jsonSchemaBtn = $("jsonSchemaBtn");
if (jsonSchemaBtn) jsonSchemaBtn.addEventListener("click", async () => {
  const text = ($("jsonInput") || {}).value || "";
  const schemaText = ($("jsonSchemaInput") || {}).value || "";
  if (!text.trim()) { setError("jsonStatus", "Paste some JSON first."); return; }
  if (!schemaText.trim()) { setError("jsonStatus", "Paste a JSON Schema in the schema box first."); return; }
  if (!window.ajv2020) { const ok = await loadLibrary("ajv2020", "jsonStatus"); if (!ok) return; }
  try {
    const data = JSON.parse(text);
    const schema = JSON.parse(schemaText);
    const ajv = new window.ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    if (validate(data)) {
      $("jsonOutput").textContent = "Valid against the schema.";
      setStatus("jsonStatus", "Done. The JSON matches the schema (JSON Schema 2020-12).");
    } else {
      const errs = (validate.errors || []).map((er) => (er.instancePath || "(root)") + " " + er.message).join("\n");
      $("jsonOutput").textContent = "Not valid against the schema:\n" + errs;
      setStatus("jsonStatus", "Done. " + (validate.errors || []).length + " problem(s) found — see the output above.");
    }
  } catch (e) { setError("jsonStatus", "Could not validate: " + e.message); }
});

const jsonPathBtn = $("jsonPathBtn");
if (jsonPathBtn) jsonPathBtn.addEventListener("click", () => {
  const text = ($("jsonInput") || {}).value || "";
  const query = (($("jsonPathInput") || {}).value || "").trim();
  if (!text.trim()) { setError("jsonStatus", "Paste some JSON first."); return; }
  if (!query) { setError("jsonStatus", "Type a JSONPath query first, for example $.store.book[*].title"); return; }
  if (!window.JSONPath) { setError("jsonStatus", "The JSONPath library did not load. Check your connection and try again."); return; }
  try {
    const data = JSON.parse(text);
    const results = window.JSONPath.JSONPath({ path: query, json: data });
    $("jsonOutput").textContent = JSON.stringify(results, null, 2);
    const tree = $("jsonTreeOutput"); if (tree) tree.innerHTML = "";
    setStatus("jsonStatus", "Done. " + results.length + " match" + (results.length === 1 ? "" : "es") + " for " + query + ".");
  } catch (e) { setError("jsonStatus", "Invalid query or JSON: " + e.message); }
});

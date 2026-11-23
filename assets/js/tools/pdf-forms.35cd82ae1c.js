/* AK Premium v12 — pdf-forms (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Advanced Batch 5: pdf-a, repair, compare, markdown, scan, ocr ---------- */

function validateFieldValue(value, rule) {
  const v = String(value === undefined || value === null ? "" : value).trim();
  if (!rule || rule.kind === "none") return "";
  if (rule.kind === "required") return v ? "" : "is required";
  if (rule.kind === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "must be a valid email address";
  if (rule.kind === "number") {
    if (!v) return "must be a number";
    const n = Number(v);
    if (isNaN(n)) return "must be a number";
    if (rule.min !== "" && rule.min !== undefined && n < Number(rule.min)) return "must be at least " + rule.min;
    if (rule.max !== "" && rule.max !== undefined && n > Number(rule.max)) return "must be at most " + rule.max;
    return "";
  }
  return "";
}

const formsPdfBtn = $("formsPdfBtn");
let formsFields = []; /* builder state: [{type, label, name, options, validation, min, max}] */
let formsFillDoc = null, formsFillName = "", formsFillFields = []; /* fill flow: [{field, type, row}] */
const formsFieldSlug = (label, i) => (String(label || "field").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "field") + "_" + (i + 1);
const formsRenderFieldList = () => {
  const list = $("formsFieldList"); if (!list) return;
  list.innerHTML = "";
  formsFields.forEach((f, i) => {
    const row = document.createElement("div"); row.className = "field-row";
    const span = document.createElement("span");
    span.textContent = (i + 1) + ". " + f.label + " (" + f.type + (f.validation !== "none" ? ", " + f.validation : "") + ")";
    const rm = document.createElement("button"); rm.type = "button"; rm.className = "btn-secondary"; rm.textContent = "Remove"; rm.dataset.idx = String(i);
    rm.addEventListener("click", () => { formsFields.splice(i, 1); formsRenderFieldList(); });
    row.appendChild(span); row.appendChild(rm); list.appendChild(row);
  });
};

const formsAddFieldBtn = $("formsAddFieldBtn");

const formsFieldType = $("formsFieldType");
if (formsFieldType) formsFieldType.addEventListener("change", () => {
  const row = $("formsFieldOptionsRow"); if (row) row.style.display = (formsFieldType.value === "radio" || formsFieldType.value === "dropdown") ? "" : "none";
});

const formsFieldValidation = $("formsFieldValidation");
if (formsFieldValidation) formsFieldValidation.addEventListener("change", () => {
  const row = $("formsFieldMinMaxRow"); if (row) row.style.display = formsFieldValidation.value === "number" ? "" : "none";
});
if (formsAddFieldBtn) formsAddFieldBtn.addEventListener("click", () => {
  const type = $("formsFieldType") ? $("formsFieldType").value : "text";
  const label = ($("formsFieldLabel") ? $("formsFieldLabel").value : "").trim();
  if (!label) { setError("formsPdfStatus", "Type a label for the field first (for example Full name)."); return; }
  const options = ($("formsFieldOptions") ? $("formsFieldOptions").value : "").split(",").map((x) => x.trim()).filter(Boolean);
  if ((type === "radio" || type === "dropdown") && options.length < 2) { setError("formsPdfStatus", "Radio and dropdown fields need at least two options, separated by commas."); return; }
  formsFields.push({ type, label, name: formsFieldSlug(label, formsFields.length), options, validation: $("formsFieldValidation") ? $("formsFieldValidation").value : "none", min: $("formsFieldMin") ? $("formsFieldMin").value : "", max: $("formsFieldMax") ? $("formsFieldMax").value : "" });
  if ($("formsFieldLabel")) $("formsFieldLabel").value = "";
  formsRenderFieldList();
  setStatus("formsPdfStatus", formsFields.length + " field(s) added. Press Create Fillable PDF when the form is ready.");
});
if (formsPdfBtn) formsPdfBtn.addEventListener("click", async () => {
  try {
    if (!needLibrary(!!window.PDFLib, "pdf-lib", "formsPdfStatus")) return;
    const L = window.PDFLib;
    const doc = await L.PDFDocument.create(); let page = doc.addPage([595, 842]); const form = doc.getForm();
    const font = await doc.embedFont(L.StandardFonts.HelveticaBold);
    const plain = await doc.embedFont(L.StandardFonts.Helvetica);
    let y = 780;
    const newPageIfNeeded = (need) => { if (y - need < 50) { page = doc.addPage([595, 842]); y = 780; } };
    page.drawText(($("formsTitle") && $("formsTitle").value) || "Application Form", { x: 50, y, size: 20, font }); y -= 40;
    const fields = formsFields.length ? formsFields : [
      { type: "text", label: "Full name", name: "fullName", options: [], validation: "required", min: "", max: "" },
      { type: "text", label: "Email", name: "email", options: [], validation: "email", min: "", max: "" },
      { type: "checkbox", label: "Agree", name: "agree", options: [], validation: "none", min: "", max: "" },
      { type: "dropdown", label: "Category", name: "category", options: ["General", "Support", "Sales"], validation: "none", min: "", max: "" }
    ];
    for (const f of fields) {
      newPageIfNeeded(70);
      page.drawText(f.label + ":", { x: 50, y, size: 12, font });
      if (f.validation === "required") page.drawText("*", { x: 50 + plain.widthOfTextAtSize(f.label + ":", 12) + 4, y, size: 12, font, color: L.rgb(0.8, 0, 0) });
      y -= 18;
      if (f.type === "text" || f.type === "date") {
        const tf = form.createTextField(f.name);
        if (f.validation === "required") tf.enableRequired();
        tf.addToPage(page, { x: 50, y: y - 5, width: 300, height: 20, borderWidth: 1 });
        if (f.type === "date") page.drawText("DD/MM/YYYY", { x: 360, y, size: 9, font: plain, color: L.rgb(0.4, 0.4, 0.4) });
        y -= 28;
      } else if (f.type === "checkbox") {
        const cb = form.createCheckBox(f.name);
        if (f.validation === "required") cb.enableRequired();
        cb.addToPage(page, { x: 50, y: y - 5, width: 15, height: 15, borderWidth: 1 });
        y -= 28;
      } else if (f.type === "dropdown") {
        const dd = form.createDropdown(f.name);
        dd.addOptions(f.options); dd.select(f.options[0]);
        if (f.validation === "required") dd.enableRequired();
        dd.addToPage(page, { x: 50, y: y - 5, width: 200, height: 20, borderWidth: 1 });
        y -= 28;
      } else if (f.type === "radio") {
        const rg = form.createRadioGroup(f.name);
        if (f.validation === "required") rg.enableRequired();
        let rx = 50;
        for (const opt of f.options) {
          rg.addOptionToPage(opt, page, { x: rx, y: y - 5, width: 14, height: 14, borderWidth: 1 });
          page.drawText(opt, { x: rx + 18, y, size: 11, font: plain });
          rx += 18 + plain.widthOfTextAtSize(opt, 11) + 16;
          if (rx > 480) { rx = 50; y -= 24; newPageIfNeeded(40); }
        }
        y -= 28;
      }
      if (f.validation === "email") { page.drawText("Must be a valid email address.", { x: 50, y: y + 8, size: 9, font: plain, color: L.rgb(0.4, 0.4, 0.4) }); }
      else if (f.validation === "number") { page.drawText("Must be a number" + (f.min !== "" ? " from " + f.min : "") + (f.max !== "" ? " to " + f.max : "") + ".", { x: 50, y: y + 8, size: 9, font: plain, color: L.rgb(0.4, 0.4, 0.4) }); }
    }
    form.updateFieldAppearances();
    const bytes = await doc.save(); downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-form.pdf");
    setStatus("formsPdfStatus", "Done. Fillable form PDF downloaded (" + fields.length + " field(s)). " + (formsFields.length ? "" : "No custom fields were added, so the standard name, email, agree and category form was used. ") + "Required fields are marked with a red * in the PDF; email and number rules are written next to the field.");
  } catch (e) { if (!setPdfError("formsPdfStatus", e)) setError("formsPdfStatus", "Could not create a form PDF."); }
});
/* ---- Fill an existing PDF form ---- */

const formsListBtn = $("formsListBtn");
if (formsListBtn) formsListBtn.addEventListener("click", async () => {
  const file = ($("formsFillInput") && $("formsFillInput").files) ? $("formsFillInput").files[0] : null;
  if (!file) { setError("formsFillStatus", "Please select a fillable PDF file first."); return; }
  try {
    const doc = await loadPdfLibDoc(file, "formsFillStatus"); if (!doc) return;
    const form = doc.getForm();
    const fields = form.getFields();
    if (!fields.length) { setError("formsFillStatus", "This PDF has no form fields to fill."); return; }
    formsFillDoc = doc; formsFillName = file.name; formsFillFields = [];
    const list = $("formsFillList"); list.innerHTML = "";
    const L = window.PDFLib;
    for (const field of fields) {
      const row = document.createElement("div"); row.className = "field-row";
      const lab = document.createElement("label"); lab.textContent = field.getName();
      row.appendChild(lab);
      let type = "text", input = null;
      if (field instanceof L.PDFTextField) { type = "text"; input = document.createElement("input"); input.type = "text"; input.value = field.getText() || ""; }
      else if (field instanceof L.PDFCheckBox) { type = "checkbox"; input = document.createElement("input"); input.type = "checkbox"; input.checked = field.isChecked(); }
      else if (field instanceof L.PDFDropdown) { type = "dropdown"; input = document.createElement("select"); for (const opt of field.getOptions()) { const o = document.createElement("option"); o.value = opt; o.textContent = opt; input.appendChild(o); } const sel = field.getSelected(); if (sel && sel.length) input.value = sel[0]; }
      else if (field instanceof L.PDFRadioGroup) { type = "radio"; input = document.createElement("select"); for (const opt of field.getOptions()) { const o = document.createElement("option"); o.value = opt; o.textContent = opt; input.appendChild(o); } const sel = field.getSelected(); if (sel) input.value = sel; }
      else { const span = document.createElement("span"); span.textContent = " (unsupported field type, skipped)"; row.appendChild(span); list.appendChild(row); continue; }
      row.appendChild(input);
      const rule = document.createElement("select"); rule.className = "fill-rule";
      rule.innerHTML = "<option value=\"none\">No check</option><option value=\"required\">Required</option><option value=\"email\">Must be an email</option><option value=\"number\">Must be a number</option>";
      row.appendChild(rule);
      list.appendChild(row);
      formsFillFields.push({ field, type, input, rule });
    }
    setStatus("formsFillStatus", "Done. " + formsFillFields.length + " field(s) found in " + file.name + ". Fill them in, pick a check per field if you want one, then press Download Filled PDF.");
  } catch (e) { if (!setPdfError("formsFillStatus", e)) setError("formsFillStatus", "Could not read this PDF form. It may be encrypted or damaged."); }
});

const formsFillBtn = $("formsFillBtn");
if (formsFillBtn) formsFillBtn.addEventListener("click", async () => {
  if (!formsFillDoc || !formsFillFields.length) { setError("formsFillStatus", "List the fields of a PDF first (choose a file, then press List Fields)."); return; }
  try {
    const errors = [];
    for (const item of formsFillFields) {
      const kind = item.rule.value;
      const val = item.type === "checkbox" ? (item.input.checked ? "checked" : "") : item.input.value;
      const err = validateFieldValue(val, { kind });
      if (err) errors.push(item.field.getName() + " " + err);
    }
    if (errors.length) { setError("formsFillStatus", "Please fix: " + errors.join("; ") + "."); return; }
    for (const item of formsFillFields) {
      if (item.type === "text") item.field.setText(item.input.value);
      else if (item.type === "checkbox") { if (item.input.checked) item.field.check(); else item.field.uncheck(); }
      else if (item.type === "dropdown") item.field.select(item.input.value);
      else if (item.type === "radio") item.field.select(item.input.value);
    }
    formsFillDoc.getForm().updateFieldAppearances();
    const bytes = await formsFillDoc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-filled.pdf");
    setStatus("formsFillStatus", "Done. Filled PDF downloaded (" + formsFillFields.length + " field(s) filled from " + formsFillName + ").");
  } catch (e) { if (!setPdfError("formsFillStatus", e)) setError("formsFillStatus", "Could not save the filled PDF."); }
});
/* Extractive summary by TF-IDF: each sentence is a document, terms that
   appear in few sentences count more; earlier sentences get a position
   boost; near-duplicate sentences are dropped. mode "points" returns the
   top sentences as bullets, mode "paragraph" returns them in document
   order as one paragraph. Pure, no AI. Returns {sentences, picked}. */

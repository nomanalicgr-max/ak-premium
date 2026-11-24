/* AK Premium v12 — resume-builder (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 2 handlers: Business ---------- */

function resumeFormData() {
  /* Null-safe: the live preview calls this once at page load, on every page. */
  return {
    name: ((($("resumeName") || {}).value) || "").trim(),
    title: ((($("resumeTitle") || {}).value) || "").trim(),
    email: ((($("resumeEmail") || {}).value) || "").trim(),
    phone: ((($("resumePhone") || {}).value) || "").trim(),
    skills: ((($("resumeSkills") || {}).value) || "").split(",").map((s) => s.trim()).filter(Boolean),
    experience: ((($("resumeExperience") || {}).value) || "").trim(),
    education: ((($("resumeEducation") || {}).value) || "").trim(),
    template: $("resumeTemplate") ? $("resumeTemplate").value : "1",
    accent: ($("resumeAccent") || {}).value || "#4f46e5",
    twoPage: !!($("resumeTwoPage") && $("resumeTwoPage").checked)
  };
}

function buildResumePdf(data) {
  const JsPDF = getJsPdf();
  if (!JsPDF) return null;
  const ac = String(data.accent || "#4f46e5").replace("#", "");
  let ar = parseInt(ac.slice(0, 2), 16), ag = parseInt(ac.slice(2, 4), 16), ab = parseInt(ac.slice(4, 6), 16);
  if (isNaN(ar) || isNaN(ag) || isNaN(ab)) { ar = 79; ag = 70; ab = 229; }
  const doc = new JsPDF();
  let truncated = false;
  let y = 20;
  const fit = (h) => {
    if (y + h <= 278) return true;
    if (data.twoPage) { doc.addPage(); y = 20; return true; }
    truncated = true; return false;
  };
  const put = (text, size, bold) => {
    if (!fit(size === 13 ? 8 : 7)) return false;
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(text, 15, y); y += size === 13 ? 8 : 7;
    return true;
  };
  const putLines = (lines, size) => {
    for (const line of lines) { if (!put(line, size, false)) return false; }
    return true;
  };
  if (data.template === "2") {
    doc.setFillColor(ar, ag, ab); doc.rect(0, 0, 210, 36, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.text(data.name, 15, 16);
    doc.setFontSize(13); doc.text(data.title, 15, 26);
    doc.setTextColor(0, 0, 0); y = 48;
  } else if (data.template === "3") {
    doc.setFontSize(20); doc.text(data.name, 15, 20);
    doc.setFontSize(13); doc.text(data.title, 15, 29);
    doc.setDrawColor(180, 180, 180); doc.line(15, 34, 195, 34);
    y = 44;
  } else {
    doc.setFontSize(20); doc.setTextColor(ar, ag, ab); doc.text(data.name, 15, 20);
    doc.setTextColor(0, 0, 0); doc.setFontSize(13); doc.text(data.title, 15, 29);
    y = 42;
  }
  const contact = [data.email, data.phone].filter(Boolean).join("  |  ");
  if (contact) put(contact, 11, false);
  y += 4;
  if (data.skills.length) {
    put("Skills", 13, true);
    if (data.template === "2") {
      for (const sk of data.skills) { if (!put("- " + sk, 11, false)) break; }
    } else {
      putLines(wrapPdfText(doc, data.skills.join(", "), 170), 11);
    }
    y += 4;
  }
  if (data.experience) {
    put("Experience", 13, true);
    putLines(wrapPdfText(doc, data.experience, 170), 11);
    y += 4;
  }
  if (data.education) {
    put("Education", 13, true);
    putLines(wrapPdfText(doc, data.education, 170), 11);
  }
  return { doc, truncated };
}

function renderResumePreview(data) {
  const el = $("resumePreview");
  if (!el) return;
  let html = "<hr><p><strong>" + escapeHtml(data.name || "Your name") + "</strong><br>" + escapeHtml(data.title || "Job title") + "</p>";
  const contact = [data.email, data.phone].filter(Boolean).join(" | ");
  if (contact) html += "<p>" + escapeHtml(contact) + "</p>";
  if (data.skills.length) html += "<p><strong>Skills</strong><br>" + data.skills.map(escapeHtml).join(", ") + "</p>";
  if (data.experience) html += "<p><strong>Experience</strong><br>" + escapeHtml(data.experience).replace(/\n/g, "<br>") + "</p>";
  if (data.education) html += "<p><strong>Education</strong><br>" + escapeHtml(data.education).replace(/\n/g, "<br>") + "</p>";
  el.innerHTML = html;
}

function resumeAtsCheck(resumeText, jobDesc) {
  const STOP = new Set("and the for with you are this that have from will your can our was are has had but not all any one two per via etc".split(" "));
  const words = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w));
  const jdWords = words(jobDesc);
  if (!jdWords.length) return { error: "Please paste a job description first." };
  const resumeSet = new Set(words(resumeText));
  const counts = {};
  jdWords.forEach((w) => { counts[w] = (counts[w] || 0) + 1; });
  const uniq = Object.keys(counts);
  const matched = uniq.filter((w) => resumeSet.has(w));
  const missing = uniq.filter((w) => !resumeSet.has(w)).sort((a, b) => counts[b] - counts[a]);
  const score = Math.round(matched.length / uniq.length * 100);
  return { score, matched: matched.sort(), missing: missing.slice(0, 20), total: uniq.length };
}

const resumeBtn = $("resumeBtn");
if (resumeBtn) resumeBtn.addEventListener("click", () => {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "resumeStatus")) return;
  const data = resumeFormData();
  if (!data.name || !data.title) { setError("resumeStatus", "Please enter your full name and job title."); return; }
  const built = buildResumePdf(data);
  if (!built) { setError("resumeStatus", "Could not start the PDF. Please reload the page and try again."); return; }
  built.doc.save("ak-premium-resume.pdf");
  setStatus("resumeStatus", "Done. Resume PDF downloaded." + (built.truncated ? " Kept to one page: some content was left out. Tick 'Allow a second page' to include everything." : ""));
});

const resumeDocxBtn = $("resumeDocxBtn");
if (resumeDocxBtn) resumeDocxBtn.addEventListener("click", async () => {
  if (!window.docx) {
    const ok = await loadLibrary("docx", "resumeStatus");
    if (!ok || !window.docx) return;
  }
  const data = resumeFormData();
  if (!data.name || !data.title) { setError("resumeStatus", "Please enter your full name and job title."); return; }
  const docx = window.docx;
  const paras = [
    new docx.Paragraph({ text: data.name, heading: docx.HeadingLevel.TITLE }),
    new docx.Paragraph({ text: data.title, heading: docx.HeadingLevel.HEADING_1 })
  ];
  const contact = [data.email, data.phone].filter(Boolean).join(" | ");
  if (contact) paras.push(new docx.Paragraph({ text: contact }));
  if (data.skills.length) {
    paras.push(new docx.Paragraph({ text: "Skills", heading: docx.HeadingLevel.HEADING_2 }));
    data.skills.forEach((sk) => paras.push(new docx.Paragraph({ text: sk, bullet: { level: 0 } })));
  }
  if (data.experience) {
    paras.push(new docx.Paragraph({ text: "Experience", heading: docx.HeadingLevel.HEADING_2 }));
    data.experience.split("\n").filter(Boolean).forEach((line) => paras.push(new docx.Paragraph({ text: line })));
  }
  if (data.education) {
    paras.push(new docx.Paragraph({ text: "Education", heading: docx.HeadingLevel.HEADING_2 }));
    data.education.split("\n").filter(Boolean).forEach((line) => paras.push(new docx.Paragraph({ text: line })));
  }
  const doc = new docx.Document({ sections: [{ children: paras }] });
  const blob = await docx.Packer.toBlob(doc);
  downloadBlob(blob, "ak-premium-resume.docx");
  setStatus("resumeStatus", "Done. Resume Word file downloaded.");
});

const resumeAtsBtn = $("resumeAtsBtn");
if (resumeAtsBtn) resumeAtsBtn.addEventListener("click", () => {
  const data = resumeFormData();
  const jobDesc = ($("resumeJobDesc") || {}).value || "";
  const result = resumeAtsCheck([data.name, data.title, data.email, data.phone, data.skills.join(" "), data.experience, data.education].join("\n"), jobDesc);
  if (result.error) { setStatus("resumeStatus", result.error); return; }
  const warnings = [];
  if (!data.name) warnings.push("Add your full name.");
  if (!data.title) warnings.push("Add a job title.");
  if (!data.email) warnings.push("Add an email address.");
  if (!data.phone) warnings.push("Add a phone number.");
  if (!data.skills.length) warnings.push("Add at least one skill.");
  if (!data.experience) warnings.push("Add your experience.");
  if (!data.education) warnings.push("Add your education.");
  const out = $("resumeAtsOut");
  if (out) {
    out.innerHTML = "<p>Keyword match: " + result.score + "% (" + result.matched.length + " of " + result.total + " words from the job description appear in your resume).</p>"
      + (result.missing.length ? "<p>Missing keywords: " + result.missing.map(escapeHtml).join(", ") + ".</p>" : "<p>No missing keywords found.</p>")
      + (warnings.length ? "<p>Missing sections: " + warnings.map(escapeHtml).join(" ") + "</p>" : "");
  }
  setStatus("resumeStatus", "Done. ATS check complete.");
});

const resumeSaveBtn = $("resumeSaveBtn");
if (resumeSaveBtn) resumeSaveBtn.addEventListener("click", () => {
  const data = resumeFormData();
  data.skills = data.skills.join(", ");
  downloadText(JSON.stringify(data, null, 2), "ak-premium-resume.json", "application/json");
  setStatus("resumeStatus", "Done. Resume saved as JSON. Load it back with Load JSON.");
});

const resumeLoadFile = $("resumeLoadFile");
if (resumeLoadFile) resumeLoadFile.addEventListener("change", () => {
  const f = resumeLoadFile.files && resumeLoadFile.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || ""));
      const map = { name: "resumeName", title: "resumeTitle", email: "resumeEmail", phone: "resumePhone", skills: "resumeSkills", experience: "resumeExperience", education: "resumeEducation", template: "resumeTemplate", accent: "resumeAccent" };
      Object.keys(map).forEach((k) => { const el = $(map[k]); if (el && data[k] !== undefined && data[k] !== null) el.value = String(data[k]); });
      const two = $("resumeTwoPage");
      if (two && data.twoPage !== undefined) two.checked = !!data.twoPage;
      renderResumePreview(resumeFormData());
      setStatus("resumeStatus", "Done. Resume loaded from JSON.");
    } catch (e) { setError("resumeStatus", "That file is not a saved resume JSON file."); }
  };
  reader.readAsText(f);
});
["resumeName", "resumeTitle", "resumeEmail", "resumePhone", "resumeSkills", "resumeExperience", "resumeEducation", "resumeTemplate", "resumeAccent", "resumeTwoPage"].forEach((id) => {
  const el = $(id);
  if (el) el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" || el.type === "color" ? "change" : "input", () => renderResumePreview(resumeFormData()));
});
renderResumePreview(resumeFormData());

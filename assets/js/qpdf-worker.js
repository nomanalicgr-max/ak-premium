/* AK Premium qpdf worker — real standard PDF encryption (AES-256, qpdf 12.2.0).
   Runs in a Web Worker so the wasm work never blocks the page.
   Self-hosted pinned build: /vendor/qpdf (@arshad-shah/qpdf-wasm@0.1.0).
   Passwords live only in this worker for the duration of one call.
   Ops: protect (opts: userPassword, ownerPassword, permissions), unlock,
   optimize, info (returns the qpdf --json encryption details: algorithm,
   revision, key length, capabilities and which password matched),
   flatten (renders annotation appearances into the page content with
   --flatten-annotations=all; link annotations are kept). */
import { configure, encrypt, decrypt, inspect, optimize, run } from "/vendor/qpdf/index.js";
configure({ wasmUrl: "/vendor/qpdf/qpdf.wasm?v=5" });
self.onmessage = async (e) => {
  const { op, bytes, password } = e.data || {};
  const opts = e.data.opts || null;
  try {
    const input = new Uint8Array(bytes);
    if (op === "protect") {
      const userPw = (opts && opts.userPassword) || password;
      const ownerPw = (opts && opts.ownerPassword) || password;
      const perms = (opts && opts.permissions) || { print: "full", extract: false, modify: "none" };
      const out = await encrypt(input, {
        userPassword: userPw,
        ownerPassword: ownerPw,
        permissions: perms
      });
      self.postMessage({ ok: true, bytes: out.bytes }, [out.bytes.buffer]);
    } else if (op === "info") {
      const pw = password ? password : undefined;
      const info = await inspect(input, pw);
      let enc = null;
      if (!info.needsPassword && info.stdout) {
        try { enc = (JSON.parse(info.stdout).encrypt) || null; } catch (err) { enc = null; }
      }
      self.postMessage({ ok: true, info: { encrypted: info.encrypted, needsPassword: info.needsPassword, pdfVersion: info.pdfVersion, pageCount: info.pageCount, encrypt: enc } });
    } else if (op === "unlock") {
      const info = await inspect(input);
      if (!info.encrypted) { self.postMessage({ ok: false, error: "NOT_ENCRYPTED" }); return; }
      const out = await decrypt(input, password);
      self.postMessage({ ok: true, bytes: out.bytes }, [out.bytes.buffer]);
    } else if (op === "optimize") {
      /* Lossless compression: object streams + flate recompression +
         removing unreferenced resources. No page is re-rendered, so text
         stays selectable and nothing loses quality. */
      const out = await optimize(input);
      self.postMessage({ ok: true, bytes: out.bytes }, [out.bytes.buffer]);
    } else if (op === "flatten") {
      /* Render annotation appearances into the page content. Link
         annotations are kept as links; annotations with no appearance
         stream have nothing to draw and are left in place by qpdf. */
      const result = await run(["--flatten-annotations=all", "input.pdf", "output.pdf"], { "input.pdf": input });
      if (result.exitCode !== 0) {
        const msg = (result.stderr || "qpdf flatten failed").slice(0, 300);
        if (/invalid password|incorrect password/i.test(msg)) { self.postMessage({ ok: false, error: "WRONG_PASSWORD" }); return; }
        throw new Error(msg);
      }
      const out = result.files["output.pdf"];
      if (!out) throw new Error("qpdf did not produce output.pdf");
      self.postMessage({ ok: true, bytes: out }, [out.buffer]);
    } else {
      self.postMessage({ ok: false, error: "UNKNOWN_OP" });
    }
  } catch (err) {
    const code = err && err.code ? err.code : String(err && err.message || err);
    if (code === "WRONG_PASSWORD" || code === "NOT_ENCRYPTED") {
      self.postMessage({ ok: false, error: code });
      return;
    }
    const detail = String(err && err.cause ? (err.cause.message || err.cause) : (err && err.message || err)).slice(0, 300);
    self.postMessage({ ok: false, error: code + " :: " + detail });
  }
};

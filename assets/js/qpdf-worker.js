/* AK Premium qpdf worker — real standard PDF encryption (AES-256, qpdf 12.2.0).
   Runs in a Web Worker so the wasm work never blocks the page.
   Self-hosted pinned build: /vendor/qpdf (@arshad-shah/qpdf-wasm@0.1.0).
   Passwords live only in this worker for the duration of one call. */
import { configure, encrypt, decrypt, inspect } from "/vendor/qpdf/index.js";
configure({ wasmUrl: "/vendor/qpdf/qpdf.wasm" });
self.onmessage = async (e) => {
  const { op, bytes, password } = e.data || {};
  try {
    const input = new Uint8Array(bytes);
    if (op === "protect") {
      const out = await encrypt(input, {
        userPassword: password,
        ownerPassword: password,
        permissions: { print: "full", extract: false, modify: "none" }
      });
      self.postMessage({ ok: true, bytes: out.bytes }, [out.bytes.buffer]);
    } else if (op === "unlock") {
      const info = await inspect(input);
      if (!info.encrypted) { self.postMessage({ ok: false, error: "NOT_ENCRYPTED" }); return; }
      const out = await decrypt(input, password);
      self.postMessage({ ok: true, bytes: out.bytes }, [out.bytes.buffer]);
    } else {
      self.postMessage({ ok: false, error: "UNKNOWN_OP" });
    }
  } catch (err) {
    self.postMessage({ ok: false, error: err && err.code ? err.code : String(err && err.message || err) });
  }
};

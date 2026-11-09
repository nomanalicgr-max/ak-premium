# qpdf-wasm (self-hosted, pinned)

Package: `@arshad-shah/qpdf-wasm@0.1.0` (MIT wrapper; qpdf 12.2.0, Apache-2.0).
Source: https://github.com/arshad-shah/qpdf-wasm
Installed via npm on 2026-11-09 and copied here from the published package.
Round-trip tested in Node on 2026-11-09: encrypt (AES-256, user+owner password)
-> inspect (encrypted, needsPassword) -> wrong password rejected as WRONG_PASSWORD
-> decrypt restores a 1-page PDF. See TESTING.md.

Used only on /tools/protect-pdf and /tools/unlock-pdf, lazily, in a Web Worker.
No pthreads / SharedArrayBuffer are required, so no COOP/COEP headers are needed.
Do NOT upgrade without re-running the round-trip test.

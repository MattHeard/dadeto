# THREEFOLD signal-station composite — 2026-10-22

- Unexpected hurdle: existing report-path fixtures filed from the default coarse scale, and renderer tests treated shell/console overlap as intentional rendering at every scale.
- Diagnosis: the shared hierarchy already filters render identities by authored threshold, but the physical report reducer did not enforce the same target scale.
- Fix: added the signal-station threshold as a shared core constant; render-only hierarchy proxies the console with the shell above scale −2 and exposes the console at −2 or finer. Report attempts and closure prompts use that threshold. Regression fixtures now make intended fine-scale report actions explicit.
- Next guidance: keep physical scene geometry separate from projection metadata; add each semantic composite behind the shared hierarchy API, then continue the unimplemented packing and geometry-first acceptance matrix.

# CHRO1 handheld presentation

- Unexpected hurdle: CHRO1's generated toy config still selected a text input, and its adapter only rendered command-stream previews at 320×270.
- Diagnosis: the shared canvas presenter already supports Mosslight's 160×144 pixelated frame and the virtual keypad dispatches keydown/keyup payloads to the toy.
- Fix: use `mosslight-keypad` + `canvas-2d`, render the board in the Mosslight palette, persist the embedded state through `runToy`, and normalize it through the versioned untimed Chronoflow save contract.
- Next-time guidance: keep command replay for solver parity tests, and test keypad actions across separate calls using the same persistent toy environment. Embedded play must never infer trusted time or timed credit.

# Number type setter

- **Unexpected hurdle:** Extracting the `dom.setType` call felt trivial but worth isolating so future changes to type-setting live in one spot.
- **Diagnosis & options considered:** I added `setNumberInputType(dom, input)` and kept `createBaseNumberInput` focused on wiring the helpers, avoiding duplicated string literals if the type changes.
- **What I learned:** Even a single line helper can clarify the intention when it's a key property like the input type; small helpers should be documented so future agents know it exists.
- **Follow-ups/open questions:** None—lint still passes.

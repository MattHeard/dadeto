# Number input query helper

- **Unexpected hurdle:** Moving the `dom.querySelector` into a helper clarified the responsibility, but I double-checked the arguments to ensure the same container and selector pair persisted.
- **Diagnosis & options considered:** I added `queryNumberInput(dom, container)` so `ensureNumberInput` just asks for the existing element before creating a new one.
- **What I learned:** Even small helper extractions can improve readability, especially when the original function mixes lookup and creation logic.
- **Follow-ups/open questions:** None—lint still passes.

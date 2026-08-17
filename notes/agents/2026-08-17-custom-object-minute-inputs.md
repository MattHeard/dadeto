# Custom object-minute input methods

- Unexpected hurdle: the browser keeps the toy input in both the DOM element
  and the input-value store.
- Diagnosis: custom form updates that changed only `.value` could be lost when
  the toy reads its live input state.
- Chosen fix: `objectMinuteForms.js` synchronizes both stores on every form
  input and restores valid JSON fields when switching methods.
- Next-time guidance: add a focused browser handler test whenever a new input
  method is added, then verify the generated beta page and the deployed form.

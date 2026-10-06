# Chronoflow standalone handheld

- Unexpected hurdle: the standalone screen displayed a 160:144 ratio label, but its HTML grid scaled smoothly and did not use the actual handheld renderer.
- Diagnosis: CHRO1 already produced the correct 160×144 board shapes, while Mosslight's renderer kept its shape drawing private to the RPG page.
- Fix: extract Mosslight's pixel shape drawing as `drawCanvasShapes()`, move the Chronoflow board shapes into one shared renderer module, and draw them to an intrinsic 160×144 standalone canvas. Keep aligned transparent DOM buttons for accessible selection and controls.
- Next time: reuse the handheld shape contract and renderer for standalone and embedded presentations; assert intrinsic canvas dimensions and pixelated CSS in the browser journey.

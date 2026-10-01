# Toy input and output order

Every generated toy includes a Swap input/output button in the controls row below input. The shared delegated layout handler moves the existing output key and value nodes above input, then restores them below the controls on the next click. Keeping node identity preserves event listeners, capture state, and the current canvas. The button stays below input in both layouts; aria-pressed reports whether output is first. Metadata and post content retain their order. Check repeated swaps followed by input and output updates, including focus mode, when changing toy markup.

The full check exposed two long exact HTML expectations in `test/generator/generator.test.js`; one expectation contains two toys. Update every toy occurrence when adding shared controls, then run that fixture suite with Node's `--experimental-vm-modules` flag before the aggregate coverage runner.

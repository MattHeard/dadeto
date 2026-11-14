# PAIN1 — Paint

Submit to open a blank drawing canvas. Draw with your finger, stylus, or mouse. Use Color and Brush size to change the brush. Check Eraser to erase; uncheck it to paint again. Clear removes the drawing.

Full screen fills the browser viewport. Exit full screen or Escape returns to the blog. The drawing survives toggling and screen rotation. Browser chrome remains visible.

Input is ignored. Submitting again, changing output, or reloading discards the drawing; this version does not save it.

## What this toy does

A freehand 2D painting canvas with touch, mouse, and pen controls.

## Input

Any text is accepted and ignored.

### Example

```text
Start painting
```

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string",
  "description": "Optional text, ignored by Paint."
}
```

## Output

An interactive painting panel when the paint output method is selected.

### Example

A white canvas with Color, Brush size, Eraser, Clear, and Full screen controls.

## Behavior

The canvas starts blank. Pointer capture continues a stroke outside the canvas. A second touch is ignored while a stroke is active. Clear erases all pixels. Full screen changes only the display size, preserving pixels.

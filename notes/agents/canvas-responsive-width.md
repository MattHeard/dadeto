# Responsive canvas output

The embedded canvas-2d presenter kept its native drawing dimensions as its display size, leaving the game small inside a wide output container. Shared generated-page CSS now sets the presenter to full width and its canvas to `width: 100%; height: auto`. The intrinsic bitmap dimensions still determine the aspect ratio and drawing coordinates. Pixelated scaling preserves handheld artwork. Check the rendered canvas bounds against its parent at phone and desktop widths when investigating layout regressions.

# Paint — failure-modes

If drawing scrolls the page, verify touch-action:none on the canvas. If strokes are offset, check CSS-to-bitmap scaling. If full screen clears the picture, check that canvas width and height are never assigned during toggles. Full screen fills the browser viewport and keeps browser chrome visible.

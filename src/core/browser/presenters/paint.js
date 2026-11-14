/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */

/**
 * Create a touch-friendly painting surface. Resizing only changes CSS, preserving pixels.
 * @param {string} _input Unused toy payload.
 * @param {DOMHelpers} dom DOM helpers.
 * @returns {HTMLElement} Interactive paint panel.
 */
export function createPaintElement(_input, dom) {
  const root = dom.createElement('div');
  root.style.cssText = 'background:#eee;padding:12px;box-sizing:border-box;';
  root.setAttribute('data-paint-surface', '');
  root.style.color = '#202020';
  const toolbar = dom.createElement('div');
  toolbar.style.cssText =
    'display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:12px;';
  const color = /** @type {HTMLInputElement} */ (dom.createElement('input'));
  color.type = 'color';
  color.value = '#202020';
  addControl(toolbar, color, 'Color', dom);
  const size = /** @type {HTMLInputElement} */ (dom.createElement('input'));
  size.type = 'range';
  size.min = '1';
  size.max = '60';
  size.value = '8';
  addControl(toolbar, size, 'Brush size', dom);
  const eraser = /** @type {HTMLInputElement} */ (dom.createElement('input'));
  eraser.type = 'checkbox';
  addControl(toolbar, eraser, 'Eraser', dom);
  const canvas = /** @type {HTMLCanvasElement} */ (dom.createElement('canvas'));
  canvas.width = 1200;
  canvas.height = 800;
  canvas.setAttribute(
    'aria-label',
    'Drawing canvas. Draw with touch, a pen, or a mouse.'
  );
  canvas.style.cssText =
    'display:block;width:100%;height:auto;max-height:calc(100dvh - 150px);background:white;touch-action:none;cursor:crosshair;';
  const context = canvas.getContext('2d');
  const clear = addButton(toolbar, 'Clear', dom);
  clear.addEventListener('click', () =>
    context?.clearRect(0, 0, canvas.width, canvas.height)
  );
  const fullscreen = addButton(toolbar, 'Full screen', dom);
  wireFullscreen(root, fullscreen);
  dom.appendChild(root, toolbar);
  dom.appendChild(root, canvas);
  if (context) wireDrawing(canvas, context, { color, size, eraser });
  return root;
}

/**
 * Append a labeled native control.
 * @param {HTMLElement} toolbar Toolbar.
 * @param {HTMLInputElement} control Input.
 * @param {string} text Label.
 * @param {DOMHelpers} dom DOM helpers.
 */
function addControl(toolbar, control, text, dom) {
  const label = dom.createElement('label');
  label.textContent = `${text} `;
  dom.appendChild(label, control);
  dom.appendChild(toolbar, label);
}

/**
 * Append a touch-sized button.
 * @param {HTMLElement} toolbar Toolbar.
 * @param {string} text Button text.
 * @param {DOMHelpers} dom DOM helpers.
 * @returns {HTMLButtonElement} Button.
 */
function addButton(toolbar, text, dom) {
  const button = /** @type {HTMLButtonElement} */ (dom.createElement('button'));
  button.type = 'button';
  button.textContent = text;
  button.style.minHeight = '44px';
  dom.appendChild(toolbar, button);
  return button;
}

/**
 * Toggle a viewport-filling panel, including on mobile browsers without Fullscreen API.
 * @param {HTMLElement} root Paint panel.
 * @param {HTMLButtonElement} button Toggle.
 */
function wireFullscreen(root, button) {
  let expanded = false;
  const original = root.style.cssText;
  const toggle = () => {
    expanded = !expanded;
    root.style.cssText = original;
    if (expanded)
      root.style.cssText +=
        'position:fixed;inset:0;z-index:2147483647;overflow:auto;overscroll-behavior:contain;';
    button.textContent = ['Full screen', 'Exit full screen'][Number(expanded)];
    button.setAttribute('aria-pressed', String(expanded));
  };
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', toggle);
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded) toggle();
  });
}

/**
 * Attach pointer drawing with capture so strokes finish outside the canvas.
 * @param {HTMLCanvasElement} canvas Drawing surface.
 * @param {CanvasRenderingContext2D} context Drawing context.
 * @param {{color:HTMLInputElement,size:HTMLInputElement,eraser:HTMLInputElement}} controls Tools.
 */
function wireDrawing(canvas, context, controls) {
  let pointer = /** @type {number | null} */ (null);
  let last = { x: 0, y: 0 };
  /**
   * Draw the next segment of the active stroke.
   * @param {PointerEvent} event Pointer sample.
   */
  const draw = event => {
    const next = point(canvas, event);
    context.globalCompositeOperation = 'source-over';
    if (controls.eraser.checked)
      context.globalCompositeOperation = 'destination-out';
    context.strokeStyle = controls.color.value;
    context.lineWidth = Number(controls.size.value);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(last.x, last.y);
    context.lineTo(next.x + 0.001, next.y);
    context.stroke();
    last = next;
  };
  canvas.addEventListener('pointerdown', event => {
    if (pointer !== null || event.button !== 0) return;
    event.preventDefault();
    pointer = event.pointerId;
    canvas.setPointerCapture(pointer);
    last = point(canvas, event);
    draw(event);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId === pointer) draw(event);
  });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerId !== pointer) return;
    draw(event);
    pointer = null;
  });
  const stop = () => {
    pointer = null;
  };
  canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener('lostpointercapture', stop);
}

/**
 * Convert viewport coordinates into stable drawing coordinates.
 * @param {HTMLCanvasElement} canvas Surface.
 * @param {PointerEvent} event Pointer.
 * @returns {{x:number,y:number}} Drawing coordinates.
 */
function point(canvas, event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) * canvas.width) / bounds.width,
    y: ((event.clientY - bounds.top) * canvas.height) / bounds.height,
  };
}

/**
 * Original four-by-six handheld alphabet; rows are hexadecimal bit masks.
 * @type {Record<string, string>}
 */
const GLYPHS = {
  A: '699f99',
  B: 'e9e99e',
  C: '788887',
  D: 'e9999e',
  E: 'f8e88f',
  F: 'f8e888',
  G: '788b97',
  H: '99f999',
  I: '722227',
  J: '111196',
  K: '9acaa9',
  L: '88888f',
  M: '9ff999',
  N: '9ddbb9',
  O: '699996',
  P: 'e99e88',
  Q: '6999b7',
  R: 'e99ea9',
  S: '78e11e',
  T: 'f22222',
  U: '999996',
  V: '999962',
  W: '999ff9',
  X: '996699',
  Y: '996222',
  Z: 'f1248f',
  0: '69bd96',
  1: '262227',
  2: '69124f',
  3: 'e1611e',
  4: '99f111',
  5: 'f8e11e',
  6: '68e996',
  7: 'f12444',
  8: '696996',
  9: '699716',
  ' ': '000000',
  '.': '000022',
  ',': '000024',
  ':': '022022',
  ';': '022024',
  '!': '222202',
  '?': '691202',
  '-': '000f00',
  '/': '112448',
  "'": '220000',
  '’': '220000',
  '"': '550000',
  '(': '244442',
  ')': '422224',
  '♥': '6ff620',
  '·': '000200',
  '…': '00000a',
  '↑': '272222',
  '↓': '222272',
  '›': '024420',
  '+': '022722',
  '%': '912489',
};

/**
 * Paint hard-edged bitmap lettering without browser font rasterization.
 * @param {CanvasRenderingContext2D} context Target canvas.
 * @param {string} text Visible label.
 * @param {number} x Left pixel coordinate.
 * @param {number} y Baseline pixel coordinate.
 * @returns {void}
 */
export function drawPixelText(context, text, x, y) {
  Array.from(text.toUpperCase()).forEach((letter, column) => {
    const glyph = GLYPHS[letter] || GLYPHS['?'];
    for (let row = 0; row < 6; row++) {
      const bits = parseInt(glyph[row], 16);
      for (let pixel = 0; pixel < 4; pixel++)
        if (bits & (8 >> pixel))
          context.fillRect(
            Math.round(x) + column * 5 + pixel,
            Math.round(y) - 6 + row,
            1,
            1
          );
    }
  });
}

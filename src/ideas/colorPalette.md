 # Random Color‑Palette Generator Toy Idea

 Author: o4-mini via codex-cli
 **Description**

 A simple interactive toy for the blog that generates a random color palette.
 Visitors can specify how many colors (swatches) they want, click "Generate", and see
 an array of randomly generated hex color codes. Optionally, these codes can be
 displayed as colored swatches.

 **Key Points**
 - Input: Number of colors (default to 5 if input is invalid).
 - Uses existing `env.get("getRandomNumber")` to produce random values.
 - Generates `count` random colors in `#RRGGBB` format.
 - Returns JSON string: `{ "palette": ["#a1b2c3", "#ddee11", ...] }`.
 - Can be easily wired into an `<article>` with `data-module-path` and `data-function-name`
   just like other interactive toys.

 **Example Usage in Blog Post**
 ```html
 <article
   id="random-colors"
   data-module-path="/toys/2025-04-15/colorPalette.js"
   data-function-name="generatePalette">
   <input placeholder="# of colors" />
   <button>Generate</button>
   <div class="output"><p class="output"></p></div>
 </article>
 ```

 **Prototype Code Outline**
 ```js
 export function generatePalette(input, env) {
   const getRand = env.get("getRandomNumber");
   const count = Number(input) || 5;
   const pad2 = n => n.toString(16).padStart(2, "0");
   const colors = Array.from({ length: count }, () => {
     const r = Math.floor(getRand() * 256);
     const g = Math.floor(getRand() * 256);
     const b = Math.floor(getRand() * 256);
     return `#${pad2(r)}${pad2(g)}${pad2(b)}`;
   });
   return JSON.stringify({ palette: colors });
 }
 ```
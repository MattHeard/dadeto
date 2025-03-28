import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";


export default defineConfig([
  { ignores: ["public/", ".stryker-tmp/"] },
  { files: ["**/*.{js,mjs,cjs}"] },
  { files: ["**/*.{js,mjs,cjs}"], languageOptions: { globals: {...globals.browser, ...globals.node} } },
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"] },
  { rules: { complexity: ["warn", { max: 2 }] } },
  {
    files: ["**/*.test.js"],
    languageOptions: {
      globals: globals.jest
    }
  }
]);
import eslintJs from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["public/", ".stryker-tmp/"] },
  {
    // Apply recommended rules and configure general JS settings
    ...eslintJs.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      }
    },
    rules: {
      complexity: ["warn", { max: 2 }], // Keep existing complexity rule
      "no-unused-vars": ["warn", { "vars": "all", "args": "after-used", "ignoreRestSiblings": false }],
      "no-console": "off",
      "eqeqeq": ["warn", "always"],
      "curly": ["warn", "all"],
      // Add other project-specific rules here if needed
    }
  },
  {
    // Specific configuration for test files
    files: ["**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
      }
    }
  }
];
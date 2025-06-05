import { describe, it, expect } from "@jest/globals";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";

const require = createRequire(import.meta.url);
const filePath = require.resolve("../../src/browser/toys.js");

async function loadParseJSONResult() {
  const code = readFileSync(filePath, "utf8");
  const tempPath = join(dirname(filePath), `pjson.${Date.now()}.mjs`);
  writeFileSync(tempPath, `${code}\nexport { parseJSONResult as __fn };`);
  const mod = await import(pathToFileURL(tempPath).href);
  unlinkSync(tempPath);
  return mod.__fn;
}

describe("parseJSONResult direct", () => {
  it("returns null for invalid JSON", async () => {
    const fn = await loadParseJSONResult();
    expect(fn("{bad")).toBeNull();
  });

  it("parses valid JSON", async () => {
    const fn = await loadParseJSONResult();
    expect(fn('{"a":1}')).toEqual({ a: 1 });
  });
});

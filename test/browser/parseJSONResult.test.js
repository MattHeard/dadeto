import { describe, test, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

function loadParseJSONResult() {
  const filePath = path.join(process.cwd(), "src/browser/toys.js");
  const code = fs.readFileSync(filePath, "utf8");
  const match = code.match(/function parseJSONResult\(result\) {[^]*?\n}\n/);
  return eval(`(${match[0]})`);
}

describe("parseJSONResult", () => {
  test("returns null for invalid JSON", () => {
    const parseJSONResult = loadParseJSONResult();
    expect(parseJSONResult("not json")).toBeNull();
  });

  test("returns object for valid JSON", () => {
    const parseJSONResult = loadParseJSONResult();
    expect(parseJSONResult("{\"a\":1}")).toEqual({ a: 1 });
  });
});

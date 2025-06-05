import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { createRequire } from "module";
import vm from "vm";

const require = createRequire(import.meta.url);

const filePath = require.resolve("../../src/browser/toys.js");

function getParseJSONResult() {
  const code = readFileSync(filePath, "utf8");
  const match = code.match(/function parseJSONResult\(result\) {[^]*?\n}\n/);
  if (!match) {
    throw new Error("parseJSONResult not found");
  }
  const script = new vm.Script(`${match[0]}; parseJSONResult`, {
    filename: filePath,
  });
  return script.runInNewContext();
}

describe("parseJSONResult", () => {
  it("returns null when JSON parsing fails", () => {
    const parseJSONResult = getParseJSONResult();
    expect(parseJSONResult("not json")).toBeNull();
  });

  it("does not return undefined for invalid JSON", () => {
    const parseJSONResult = getParseJSONResult();
    expect(parseJSONResult("not json")).not.toBeUndefined();
  });

  it("parses valid JSON into an object", () => {
    const parseJSONResult = getParseJSONResult();
    const result = parseJSONResult('{"a":1}');
    expect(result).toEqual({ a: 1 });
  });

  it("returns null when called with undefined", () => {
    const parseJSONResult = getParseJSONResult();
    expect(parseJSONResult(undefined)).toBeNull();
  });
});

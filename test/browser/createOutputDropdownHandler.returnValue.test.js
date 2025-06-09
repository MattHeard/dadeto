import { test, expect, jest } from "@jest/globals";
import { createOutputDropdownHandler } from "../../src/browser/toys.js";

test("createOutputDropdownHandler returns handler result", () => {
  const handleDropdownChange = jest.fn(() => "result");
  const getData = jest.fn();
  const dom = {};
  const handler = createOutputDropdownHandler(handleDropdownChange, getData, dom);
  const evt = { currentTarget: { id: "x" } };
  const value = handler(evt);
  expect(value).toBe("result");
  expect(handleDropdownChange).toHaveBeenCalledWith(evt.currentTarget, getData, dom);
});

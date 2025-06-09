import { describe, it, expect } from "@jest/globals";
import {
  getPlayer,
  getPosition
} from "../../src/presenters/ticTacToeBoard.js";

describe("ticTacToeBoard getters", () => {
  it("getPlayer returns undefined for null or undefined", () => {
    expect(getPlayer(undefined)).toBeUndefined();
    expect(getPlayer(null)).toBeUndefined();
  });

  it("getPosition returns undefined for null or undefined", () => {
    expect(getPosition(undefined)).toBeUndefined();
    expect(getPosition(null)).toBeUndefined();
  });
});

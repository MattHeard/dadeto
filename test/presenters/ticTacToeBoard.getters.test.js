import fs from "fs";
import path from "path";
import { describe, it, expect } from "@jest/globals";

function loadGetters() {
  const filePath = path.join(process.cwd(), "src/presenters/ticTacToeBoard.js");
  const code = fs.readFileSync(filePath, "utf8");
  const playerMatch = code.match(/function getPlayer\(move\) {[^]*?\n}\n/);
  const positionMatch = code.match(/function getPosition\(move\) {[^]*?\n}\n/);
  const getPlayer = eval("(" + playerMatch[0] + ")");
  const getPosition = eval("(" + positionMatch[0] + ")");
  return { getPlayer, getPosition };
}

describe("ticTacToeBoard getters", () => {
  it("getPlayer returns undefined for null or undefined", () => {
    const { getPlayer } = loadGetters();
    expect(getPlayer(undefined)).toBeUndefined();
    expect(getPlayer(null)).toBeUndefined();
  });

  it("getPosition returns undefined for null or undefined", () => {
    const { getPosition } = loadGetters();
    expect(getPosition(undefined)).toBeUndefined();
    expect(getPosition(null)).toBeUndefined();
  });
});

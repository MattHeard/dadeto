import { describe, test, expect } from "@jest/globals";
import { generateBlog } from "../../src/generator/generator.js";

const header = "<body>";
const footer = "</body>";
const wrapHtml = html => `<html>${html}</html>`;

describe("TOY_OUTPUT_TYPES dropdown", () => {
  test("generateBlog includes all toy output options", () => {
    const blog = {
      posts: [
        {
          key: "TYO1",
          title: "Toy Post",
          publicationDate: "2025-01-01",
          toy: { modulePath: "./toys/2025-03-19/identity.js", functionName: "identity" }
        }
      ]
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const match = html.match(/<select class="output">([\s\S]*?)<\/select>/);
    expect(match).not.toBeNull();
    const select = match[1];
    const options = [
      "text",
      "pre",
      "tic-tac-toe",
      "battleship-solitaire-fleet",
      "battleship-solitaire-clues-presenter"
    ];
    for (const value of options) {
      expect(select).toContain(`<option value="${value}">${value}</option>`);
    }
  });
});

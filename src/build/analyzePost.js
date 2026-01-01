#!/usr/bin/env node
/**
 * CLI tool to analyze a blog post draft.
 * Usage: node analyzePost.js "Your post content here"
 *    or: echo "Your post content" | node analyzePost.js
 */

import { analyzeText, generateFeedback } from "./textUtils.js";

async function getInput() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    return args.join(" ");
  }

  // Read from stdin
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const text = await getInput();
  const trimmed = text.trim();

  if (!trimmed) {
    console.log("No text provided.");
    process.exit(1);
  }

  const analysis = analyzeText(trimmed);
  const feedback = generateFeedback(analysis);

  console.log("--- Post Analysis ---");
  console.log("Words: " + analysis.wordCount + " / " + analysis.target);
  console.log("Delta: " + (analysis.delta >= 0 ? "+" : "") + analysis.delta);
  console.log("Sentences: " + analysis.sentenceCount);
  console.log("Avg words/sentence: " + analysis.avgWordsPerSentence);
  console.log("");
  console.log("--- Feedback ---");
  for (const item of feedback) {
    console.log("- " + item);
  }

  if (analysis.isExactly100) {
    console.log("");
    console.log("Ready for title suggestions!");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

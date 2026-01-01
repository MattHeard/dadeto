#!/usr/bin/env node
/**
 * CLI tool to insert a new blog post into blog.json.
 * Usage: node insertPost.js --key KEY --title "Three Word Title" --content "Post content..."
 */

import { readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BLOG_JSON_PATH = join(__dirname, "../blog.json");

/**
 * Generate a key from a title.
 * Takes first 4 letters of the first word, uppercased, plus a number for disambiguation.
 * @param {string} title - The post title
 * @param {string[]} existingKeys - Keys already in use
 * @returns {string} A unique key (e.g., "PREP1")
 */
function generateKey(title, existingKeys) {
  const firstWord = title.trim().split(/\s+/)[0] || "";
  const base = firstWord.slice(0, 4).toUpperCase();

  // Find the next available number suffix
  let counter = 1;
  while (existingKeys.includes(base + counter)) {
    counter++;
  }

  return base + counter;
}

/**
 * Get today's date in YYYY-MM-DD format.
 * @returns {string} Today's date
 */
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function parseArgs(args) {
  const result = { key: null, title: null, content: null, tags: [] };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--key" && args[i + 1]) {
      result.key = args[i + 1];
      i += 2;
    } else if (arg === "--title" && args[i + 1]) {
      result.title = args[i + 1];
      i += 2;
    } else if (arg === "--content" && args[i + 1]) {
      result.content = args[i + 1];
      i += 2;
    } else if (arg === "--tags" && args[i + 1]) {
      result.tags = args[i + 1].split(",").map(t => t.trim());
      i += 2;
    } else {
      i++;
    }
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.title) {
    console.error("Error: --title is required");
    process.exit(1);
  }
  if (!args.content) {
    console.error("Error: --content is required");
    process.exit(1);
  }

  // Read existing blog.json
  const blogJson = await readFile(BLOG_JSON_PATH, "utf8");
  const blog = JSON.parse(blogJson);
  const existingKeys = blog.posts.map(p => p.key);

  // Generate key if not provided
  const key = args.key || generateKey(args.title, existingKeys);

  // Create the new post
  const newPost = {
    key,
    title: args.title,
    publicationDate: getTodayDate(),
    content: [args.content]
  };

  if (args.tags.length > 0) {
    newPost.tags = args.tags;
  }

  // Insert at the beginning (newest first)
  blog.posts.unshift(newPost);

  // Write back
  await writeFile(BLOG_JSON_PATH, JSON.stringify(blog, null, 2) + "\n", "utf8");

  console.log("Post inserted successfully!");
  console.log("Key: " + key);
  console.log("Title: " + args.title);
  console.log("Date: " + newPost.publicationDate);
  console.log("");
  console.log("Run 'npm run generate' to rebuild the blog.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

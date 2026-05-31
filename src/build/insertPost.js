#!/usr/bin/env node
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const BLOG_JSON_PATH = join(dirname(fileURLToPath(import.meta.url)), './blog.json');
function parseArgs(args) {
  const result = { key: null, title: null, content: null, tags: [] };
  for (let i = 0; i < args.length; ) {
    const arg = args[i], value = args[i + 1];
    if (arg === '--key' && value) { result.key = value; i += 2; }
    else if (arg === '--title' && value) { result.title = value; i += 2; }
    else if (arg === '--content' && value) { result.content = value; i += 2; }
    else if (arg === '--tags' && value) { result.tags = value.split(',').map(tag => tag.trim()); i += 2; }
    else i += 1;
  }
  return result;
}
const today = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};
function generateKey(title, existingKeys) {
  const base = (title.trim().split(/\s+/)[0] || '').slice(0, 4).toUpperCase();
  let counter = 1;
  while (existingKeys.includes(`${base}${counter}`)) counter += 1;
  return `${base}${counter}`;
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.title) throw new Error('--title is required');
  if (!args.content) throw new Error('--content is required');
  const blog = JSON.parse(await readFile(BLOG_JSON_PATH, 'utf8'));
  const existingKeys = blog.posts.map(post => post.key);
  const key = args.key || generateKey(args.title, existingKeys);
  const post = { key, title: args.title, publicationDate: today(), content: [args.content] };
  if (args.tags.length > 0) post.tags = args.tags;
  blog.posts.unshift(post);
  await writeFile(BLOG_JSON_PATH, `${JSON.stringify(blog, null, 2)}\n`, 'utf8');
  console.log('Post inserted successfully!');
  console.log(`Key: ${key}`);
  console.log(`Title: ${args.title}`);
  console.log(`Date: ${post.publicationDate}`);
  console.log('');
  console.log("Run 'npm run generate' to rebuild the blog.");
}
main().catch(error => {
  console.error(error);
  process.exit(1);
});

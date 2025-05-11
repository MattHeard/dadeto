#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define base directories
const projectRoot = path.resolve(__dirname, '../..'); // Adjust based on script location
const srcDir = path.resolve(projectRoot, 'src');
const publicDir = path.resolve(projectRoot, 'public');
const srcToysDir = path.resolve(srcDir, 'toys');
const srcBrowserDir = path.resolve(srcDir, 'browser');
const publicBrowserDir = path.join(publicDir, 'browser');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy src/blog.json to public/blog.json
const srcBlogJson = path.join(srcDir, 'blog.json');
const publicBlogJson = path.join(publicDir, 'blog.json');
fs.copyFileSync(srcBlogJson, publicBlogJson);
console.log('Copied: src/blog.json -> public/blog.json');

// --- Copy Toy Files ---

// Predicate to check if an entry is a JS file (excluding .test.js)
function isCorrectJsFileEnding(entry) {
  return entry.name.endsWith('.js') && !entry.name.endsWith('.test.js');
}

function isJsFile(entry) {
  return entry.isFile() && isCorrectJsFileEnding(entry);
}

// Function to recursively find JS files in a directory (excluding .test.js)
function getDirEntries(dir) {
  return fs.readdirSync(dir, { withFileTypes: true });
}

function getActualNewFiles(entry, fullPath) {
  if (entry.isDirectory()) {
    return findJsFiles(fullPath);
  }
  return [fullPath];
}

function shouldCheckEntry(entry) {
  return entry.isDirectory() || isJsFile(entry);
}

function getPossibleNewFiles(entry, fullPath) {
  if (shouldCheckEntry(entry)) {
    return getActualNewFiles(entry, fullPath);
  }
  return [];
}

function accumulateJsFiles(jsFiles, entry, dir) {
  const fullPath = path.join(dir, entry.name);
  const newFiles = getPossibleNewFiles(entry, fullPath);
  return jsFiles.concat(newFiles);
}

function findJsFiles(dir) {
  const entries = getDirEntries(dir);
  return entries.reduce((jsFiles, entry) => accumulateJsFiles(jsFiles, entry, dir), []);
}

// Find all JS files in src/toys
const toyFiles = findJsFiles(srcToysDir);

// Copy each toy file to the corresponding path in public
toyFiles.forEach(filePath => {
  const relativePath = path.relative(srcToysDir, filePath);
  const destPath = path.join(publicDir, relativePath);
  const destDir = path.dirname(destPath);

  // Ensure the destination directory exists
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Copy the file
  fs.copyFileSync(filePath, destPath);
  console.log(`Copied: ${filePath} -> ${destPath}`);
});

console.log('Toy files copied successfully!');

// --- Copy Presenter Files ---
const srcPresentersDir = path.resolve(srcDir, 'presenters');
const publicPresentersDir = path.join(publicDir, 'presenters');

if (fs.existsSync(srcPresentersDir)) {
  const presenterFiles = findJsFiles(srcPresentersDir);
  presenterFiles.forEach(filePath => {
    const relativePath = path.relative(srcPresentersDir, filePath);
    const destPath = path.join(publicPresentersDir, relativePath);
    const destDir = path.dirname(destPath);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(filePath, destPath);
    console.log(`Copied presenter: ${filePath} -> ${destPath}`);
  });
  console.log('Presenter files copied successfully!');
} else {
  console.warn(`Warning: presenters directory not found at ${srcPresentersDir}`);
}

// --- Copy src/browser to public/browser ---

function handleDirectoryEntry(entry, src, dest) {
  const srcPath = path.join(src, entry.name);
  const destPath = path.join(dest, entry.name);
  if (entry.isDirectory()) {
    copyDirRecursive(srcPath, destPath);
  } else {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied: ${srcPath} -> ${destPath}`);
  }
}

function processDirectoryEntries(entries, src, dest) {
  for (const entry of entries) {
    handleDirectoryEntry(entry, src, dest);
  }
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  processDirectoryEntries(entries, src, dest);
}

if (fs.existsSync(srcBrowserDir)) {
  copyDirRecursive(srcBrowserDir, publicBrowserDir);
  console.log('Browser files copied successfully!');
} else {
  console.warn(`Warning: browser directory not found at ${srcBrowserDir}`);
}

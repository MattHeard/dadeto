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
const srcUtilsDir = path.resolve(srcDir, 'utils');
const publicUtilsDir = path.join(publicDir, 'utils');

// New directory with handlers used by interactive components
const srcInputHandlersDir = path.resolve(srcDir, 'inputHandlers');
const publicInputHandlersDir = path.join(publicDir, 'inputHandlers');
const srcConstantsDir = path.resolve(srcDir, 'constants');
const publicConstantsDir = path.join(publicDir, 'constants');

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
/**
 * Determine if an entry has a valid JavaScript file name.
 * @param {fs.Dirent} entry - Directory entry to check.
 * @returns {boolean} `true` for non-test `.js` files.
 */
function isCorrectJsFileEnding(entry) {
  return entry.name.endsWith('.js') && !entry.name.endsWith('.test.js');
}

/**
 * Check if a directory entry is a JavaScript file.
 * @param {fs.Dirent} entry - Entry to evaluate.
 * @returns {boolean} Whether the entry is a JS file.
 */
function isJsFile(entry) {
  return entry.isFile() && isCorrectJsFileEnding(entry);
}

// Function to recursively find JS files in a directory (excluding .test.js)
/**
 * Read directory entries with type information.
 * @param {string} dir - Directory path.
 * @returns {fs.Dirent[]} Array of directory entries.
 */
function getDirEntries(dir) {
  return fs.readdirSync(dir, { withFileTypes: true });
}

/**
 * Resolve the files represented by a directory entry.
 * @param {fs.Dirent} entry - Directory entry.
 * @param {string} fullPath - Full path to the entry.
 * @returns {string[]} New file paths discovered.
 */
function getActualNewFiles(entry, fullPath) {
  if (entry.isDirectory()) {
    return findJsFiles(fullPath);
  }
  return [fullPath];
}

/**
 * Determine if a directory entry should be inspected.
 * @param {fs.Dirent} entry - Entry to inspect.
 * @returns {boolean} `true` if the entry may contain JS files.
 */
function shouldCheckEntry(entry) {
  return entry.isDirectory() || isJsFile(entry);
}

/**
 * Get potential JavaScript files from an entry.
 * @param {fs.Dirent} entry - Directory entry.
 * @param {string} fullPath - Full path to the entry.
 * @returns {string[]} File paths to include.
 */
function getPossibleNewFiles(entry, fullPath) {
  if (shouldCheckEntry(entry)) {
    return getActualNewFiles(entry, fullPath);
  }
  return [];
}

/**
 * Accumulate JavaScript file paths from a directory entry.
 * @param {string[]} jsFiles - Array of discovered files.
 * @param {fs.Dirent} entry - Current directory entry.
 * @param {string} dir - Directory being scanned.
 * @returns {string[]} Updated array of file paths.
 */
function accumulateJsFiles(jsFiles, entry, dir) {
  const fullPath = path.join(dir, entry.name);
  const newFiles = getPossibleNewFiles(entry, fullPath);
  return jsFiles.concat(newFiles);
}

/**
 * Recursively find JavaScript files in a directory.
 * @param {string} dir - Directory to search.
 * @returns {string[]} All JS file paths.
 */
function findJsFiles(dir) {
  const entries = getDirEntries(dir);
  return entries.reduce(
    (jsFiles, entry) => accumulateJsFiles(jsFiles, entry, dir),
    []
  );
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
  console.warn(
    `Warning: presenters directory not found at ${srcPresentersDir}`
  );
}

// --- Copy src/utils to public/utils ---
if (fs.existsSync(srcUtilsDir)) {
  copyDirRecursive(srcUtilsDir, publicUtilsDir);
  console.log('Utils files copied successfully!');
} else {
  console.warn(`Warning: utils directory not found at ${srcUtilsDir}`);
}

// --- Copy src/inputHandlers to public/inputHandlers ---
if (fs.existsSync(srcInputHandlersDir)) {
  copyDirRecursive(srcInputHandlersDir, publicInputHandlersDir);
  console.log('Input handler files copied successfully!');
} else {
  console.warn(
    `Warning: inputHandlers directory not found at ${srcInputHandlersDir}`
  );
}

// --- Copy src/constants to public/constants ---
if (fs.existsSync(srcConstantsDir)) {
  copyDirRecursive(srcConstantsDir, publicConstantsDir);
  console.log('Constants files copied successfully!');
} else {
  console.warn(`Warning: constants directory not found at ${srcConstantsDir}`);
}

// --- Copy src/browser to public/browser ---

/**
 * Copy a directory entry to the destination path.
 * @param {fs.Dirent} entry - Entry to copy.
 * @param {string} src - Source directory path.
 * @param {string} dest - Destination directory path.
 * @returns {void}
 */
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

/**
 * Process and copy an array of directory entries.
 * @param {fs.Dirent[]} entries - Directory entries.
 * @param {string} src - Source directory path.
 * @param {string} dest - Destination directory path.
 * @returns {void}
 */
function processDirectoryEntries(entries, src, dest) {
  for (const entry of entries) {
    handleDirectoryEntry(entry, src, dest);
  }
}

/**
 * Recursively copy a directory to a destination.
 * @param {string} src - Source directory.
 * @param {string} dest - Destination directory.
 * @returns {void}
 */
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

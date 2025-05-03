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

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

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

function findJsFiles(dir) {
  const entries = getDirEntries(dir);
  function getNewFiles(entry, fullPath) {
    if (entry.isDirectory()) {
      return findJsFiles(fullPath);
    } else if (isJsFile(entry)) {
      return [fullPath];
    }
    return [];
  }

  return entries.reduce((jsFiles, entry) => {
    const fullPath = path.join(dir, entry.name);
    let newFiles = getNewFiles(entry, fullPath);
    return jsFiles.concat(newFiles);
  }, []);
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

// --- Copy Specific Assets ---

const assetsToCopy = [
  { src: path.join(srcDir, 'blog.json'), dest: path.join(publicDir, 'blog.json') },
  { src: path.join(srcBrowserDir, 'data.js'), dest: path.join(publicDir, 'data.js') },
  { src: path.join(srcBrowserDir, 'main.js'), dest: path.join(publicDir, 'main.js') },
  { src: path.join(srcBrowserDir, 'toys.js'), dest: path.join(publicDir, 'toys.js') },
  { src: path.join(srcBrowserDir, 'audio-controls.js'), dest: path.join(publicDir, 'audio-controls.js') },
  { src: path.join(srcBrowserDir, 'document.js'), dest: path.join(publicDir, 'document.js') },
  { src: path.join(srcBrowserDir, 'tags.js'), dest: path.join(publicDir, 'tags.js') }
];

assetsToCopy.forEach(asset => {
  if (fs.existsSync(asset.src)) {
    fs.copyFileSync(asset.src, asset.dest);
    console.log(`Copied: ${asset.src} -> ${asset.dest}`);
  } else {
    console.warn(`Warning: Asset not found, skipping copy: ${asset.src}`);
  }
});

console.log('Specific assets copied successfully!');

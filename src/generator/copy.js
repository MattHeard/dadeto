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

// Function to recursively find JS files in the toys directory
function findJsFiles(dir) {
  let jsFiles = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      jsFiles = jsFiles.concat(findJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
      jsFiles.push(fullPath);
    }
  }
  return jsFiles;
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

// --- Copy Specific Assets --- 

const assetsToCopy = [
  { src: path.join(srcDir, 'blog.json'), dest: path.join(publicDir, 'blog.json') },
  { src: path.join(srcBrowserDir, 'data.js'), dest: path.join(publicDir, 'data.js') },
  { src: path.join(srcBrowserDir, 'main.js'), dest: path.join(publicDir, 'main.js') },
  { src: path.join(srcBrowserDir, 'toy-controls.js'), dest: path.join(publicDir, 'toy-controls.js') },
  { src: path.join(srcBrowserDir, 'audio-controls.js'), dest: path.join(publicDir, 'audio-controls.js') }
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

#!/usr/bin/env node

/**
 * This script copies toy JavaScript files from src/toys to public
 * It preserves the directory structure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Source and destination directories
const srcDir = path.join(__dirname, 'src', 'toys');
const destDir = path.join(__dirname, 'public');

/**
 * Copy a file from source to destination
 * @param {string} src - Source file path
 * @param {string} dest - Destination file path
 */
function copyFile(src, dest) {
  // Create destination directory if it doesn't exist
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  // Copy the file
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${src} -> ${dest}`);
}

/**
 * Recursively copy files from source to destination
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyToyFiles(src, dest) {
  // Get all files and directories in the source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const relativePath = path.relative(srcDir, srcPath);
    const destPath = path.join(dest, relativePath);
    
    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyToyFiles(srcPath, dest);
    } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
      // Copy JavaScript files but exclude test files
      copyFile(srcPath, destPath);
    }
  }
}

// Execute the copy function
copyToyFiles(srcDir, destDir);
console.log('Toy files copied successfully!');

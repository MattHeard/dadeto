#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { renderObjectMinuteRentalSearchEndpoint, runCore } from '../core/build/runCore.js';
import {
  createPathAdapters,
  getCurrentDirectory,
  resolveProjectDirectories,
} from "./path.js";
import { createFsAdapters } from "./fs.js";

const __dirname = getCurrentDirectory(import.meta.url);
const { projectRoot, srcDir, publicDir } = resolveProjectDirectories(__dirname);

const environmentDependencies = {
  console,
  createFsAdapters,
  createPathAdapters,
  projectRoot,
  publicDir,
  srcDir,
};

runCore(environmentDependencies);

const rentalSearchPagePath = path.join(
  publicDir,
  'object-minute-rental-search',
  'index.html'
);
const rentalSearchPage = fs.readFileSync(rentalSearchPagePath, 'utf8');
const configuredRentalSearchPage = renderObjectMinuteRentalSearchEndpoint({
  html: rentalSearchPage,
  target: process.env.DADETO_BUILD_TARGET ?? 'local',
  productionEndpoint: process.env.OBJECT_MINUTE_RENTAL_SEARCH_URL,
});
fs.writeFileSync(rentalSearchPagePath, configuredRentalSearchPage, 'utf8');

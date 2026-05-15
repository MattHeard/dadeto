#!/usr/bin/env node

import { runAnalyzePost } from "../core/build/analyzePost.js";

runAnalyzePost({
  Buffer,
  console,
  process,
}).catch(err => {
  console.error(err);
  process.exit(1);
});

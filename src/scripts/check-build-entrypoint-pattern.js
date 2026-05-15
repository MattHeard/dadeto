import fs from "node:fs";
import path from "node:path";

const entrypoints = JSON.parse(
  fs.readFileSync(path.resolve("src/build/entrypoint-patterns.json"), "utf8")
).entrypoints;

const failures = [];
for (const filePath of entrypoints) {
  const source = fs.readFileSync(path.resolve(filePath), "utf8");
  const importLines = source.split("\n").filter(line => line.startsWith("import "));
  const topLevelNames = new Set([...source.matchAll(/^function\s+([A-Za-z0-9_$]+)/gm)].map(match => match[1]));
  if (!source.startsWith("#!/usr/bin/env node")) failures.push(`${filePath}: missing shebang`);
  if (importLines.length < 2 || importLines.filter(line => line.includes("../core/")).length !== 1 || importLines.filter(line => !line.includes("../core/")).length < 1) failures.push(`${filePath}: imports are not in the expected env/core split`);
  if (topLevelNames.size !== 2 || !topLevelNames.has("loadEnvironmentDependencies") || !topLevelNames.has("executeWorkflow")) failures.push(`${filePath}: top-level names must be loadEnvironmentDependencies and executeWorkflow only`);
  if (![
    "function loadEnvironmentDependencies()",
    "function executeWorkflow(environmentDependencies)",
    "executeWorkflow(loadEnvironmentDependencies());",
    "runCopyWorkflow()",
    "runCopyDendriteWorkflow()",
  ].some(snippet => source.includes(snippet))) failures.push(`${filePath}: required direct execution pattern snippets are missing`);
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`Checked ${entrypoints.length} build entrypoints for the three-step pattern.`);
}

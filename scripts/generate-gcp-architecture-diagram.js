import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const infraDir = join(root, 'infra');
const cloudDir = join(root, 'src', 'cloud');
const coreCloudDir = join(root, 'src', 'core', 'cloud');
const outputPath = join(root, 'docs', 'architecture', 'gcp-infrastructure.puml');

const quote = value => `"${value.replaceAll('"', '\\"')}"`;
const alias = value => value.replaceAll(/[^A-Za-z0-9_]/g, '_');

const readJavaScript = async directory => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return readJavaScript(path);
    return entry.isFile() && entry.name.endsWith('.js') ? [await readFile(path, 'utf8')] : [];
  }));
  return files.flat();
};

const readSources = async directory =>
  Promise.all(
    (await readdir(directory, { withFileTypes: true }))
      .filter(entry => entry.isDirectory())
      .map(async entry => {
        const directoryPath = join(directory, entry.name);
        const contents = await readJavaScript(directoryPath);
        const corePath = join(coreCloudDir, entry.name);
        let coreContents = [];
        try {
          coreContents = await readJavaScript(corePath);
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
        return { name: entry.name, source: [...contents, ...coreContents].join('\n') };
      }),
  );

const collectTerraform = async () => {
  const files = (await readdir(infraDir)).filter(file => file.endsWith('.tf'));
  const source = (await Promise.all(files.map(file => readFile(join(infraDir, file), 'utf8')))).join('\n');
  const functions = [...source.matchAll(/resource\s+"google_cloudfunctions(?:2)?_function"\s+"([^"]+)"/g)].map(match => match[1]);
  const buckets = [...source.matchAll(/resource\s+"google_storage_bucket"\s+"([^"]+)"/g)].map(match => match[1]);
  const schedulers = [...source.matchAll(/resource\s+"google_cloud_scheduler_job"\s+"([^"]+)"/g)].map(match => match[1]);
  const schedulerEdges = [...source.matchAll(/resource\s+"google_cloud_scheduler_job"\s+"([^"]+)[\s\S]*?uri\s*=\s*google_cloudfunctions_function\.([^.]+)\.https_trigger_url/g)].map(match => [match[1], match[2]]);
  return { functions, buckets, schedulers, schedulerEdges };
};

const collectDataEdges = sources => {
  const data = new Map();
  for (const { name, source } of sources) {
    const collections = [...source.matchAll(/\.collection(?:Group)?\(\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
    const docs = [...source.matchAll(/\.doc\(\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
    const storage = /\.bucket\(|\.file\(/.test(source);
    const entries = data.get(name) ?? { collections: new Set(), docs: new Set(), storage };
    collections.forEach(value => entries.collections.add(value));
    docs.forEach(value => entries.docs.add(value));
    entries.storage ||= storage;
    data.set(name, entries);
  }
  return data;
};

const render = ({ functions, buckets, schedulers, schedulerEdges }, data) => {
  const lines = [
    '@startuml Dendrite_GCP_Infrastructure',
    'title Dendrite GCP Infrastructure (generated from infra/ and src/cloud/)',
    'skinparam componentStyle rectangle',
    'skinparam shadowing false',
    'skinparam linetype ortho',
    '',
    'package "Cloud Functions" {',
    ...functions.sort().map(name => `  component ${quote(name)} as fn_${alias(name)} <<Cloud Function>>`),
    '}',
    '',
    'package "Firestore document types detected in src/" {',
  ];
  const documentTypes = new Set([...data.values()].flatMap(entry => [...entry.collections, ...entry.docs]));
  lines.push(...[...documentTypes].sort().map(name => `  database ${quote(name)} as db_${alias(name)} <<Document type>>`));
  lines.push('}', '', 'package "Cloud Storage" {');
  lines.push(...buckets.sort().map(name => `  folder ${quote(name)} as bucket_${alias(name)} <<Bucket>>`));
  lines.push('}', '', 'package "Triggers" {');
  lines.push(...schedulers.sort().map(name => `  component ${quote(name)} as scheduler_${alias(name)} <<Cloud Scheduler>>`));
  lines.push('}', '', "' Terraform scheduler targets");
  for (const [scheduler, functionName] of schedulerEdges) {
    lines.push(`scheduler_${alias(scheduler)} --> fn_${alias(functionName)} : invokes`);
  }
  lines.push('', "' Source-derived Firestore and Storage dependencies");
  for (const [name, entry] of data) {
    const functionName = functions.find(candidate => candidate.replaceAll('_', '-') === name);
    if (!functionName) continue;
    for (const collection of entry.collections) lines.push(`fn_${alias(functionName)} --> db_${alias(collection)} : reads/writes`);
    for (const document of entry.docs) lines.push(`fn_${alias(functionName)} --> db_${alias(document)} : reads/writes`);
    if (entry.storage && buckets.length) lines.push(`fn_${alias(functionName)} --> bucket_${alias(buckets.find(bucket => bucket.includes('dendrite_static')) ?? buckets[0])} : reads/writes`);
  }
  lines.push('', 'note bottom', '  Terraform resources are authoritative for deployed components.\\n  Firestore and Storage edges are inferred from recognizable source calls.', 'end note', '', '@enduml', '');
  return lines.join('\n');
};

const main = async () => {
  const terraform = await collectTerraform();
  const sources = await readSources(cloudDir);
  const diagram = render(terraform, collectDataEdges(sources));
  await writeFile(outputPath, diagram);
  console.log(`Wrote ${outputPath}`);
};

await main();

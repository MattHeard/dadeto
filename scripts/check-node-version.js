const majorVersion = Number.parseInt(process.versions.node.split('.')[0], 10);

if (majorVersion < 22) {
  console.error(`Dadeto requires Node.js 22 or newer (found ${process.versions.node}).`);
  process.exit(1);
}

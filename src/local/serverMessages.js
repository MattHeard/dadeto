export function formatListenErrorMessage(port) {
  return [
    `writer server could not bind to port ${port}.`,
    'This usually happens when the process is started inside a restricted sandbox.',
    'Start it from a full shell instead, for example:',
    '  npm run start:writer:watch',
    `Then open http://localhost:${port}/writer/`,
  ].join('\n');
}

export function formatSymphonyListenErrorMessage(port) {
  return [
    `symphony server could not bind to port ${port}.`,
    'This usually happens when the process is started inside a restricted sandbox.',
    'Start it from a full shell instead, for example:',
    '  npm run start:symphony',
    `Then open http://localhost:${port}/api/symphony/status`,
  ].join('\n');
}

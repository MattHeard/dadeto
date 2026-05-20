export function normalizeObjectPrefix(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.replace(/^\/+|\/+$/g, '');
  return trimmed ? `${trimmed}/` : '';
}

export function objectKeyForPath(path, objectPrefix = '') {
  const key = path.replace(/^\/+/, '') || 'index.html';

  if (key.endsWith('/')) {
    return `${objectPrefix}${key}index.html`;
  }

  return `${objectPrefix}${key}`;
}

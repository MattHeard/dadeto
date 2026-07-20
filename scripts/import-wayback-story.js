#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const WAYBACK_PREFIX = 'https://web.archive.org/web/';
const DEFAULT_DELAY_MS = 3000;
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 3;

export function parseWaybackUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Input must be a valid Wayback URL');
  }
  if (url.hostname !== 'web.archive.org' || !url.pathname.startsWith('/web/')) {
    throw new Error(
      'Input must be a Wayback URL: https://web.archive.org/web/...'
    );
  }
  const match = url.pathname.match(/^\/web\/(\d{4,14})(?:id_)?\/(.+)$/);
  if (!match)
    throw new Error(
      'Wayback URL must include a capture timestamp and original URL'
    );
  const timestamp = match[1].padEnd(14, '0');
  const originalUrl = decodeURIComponent(match[2]);
  return {
    sourceUrl: url.href,
    timestamp,
    originalUrl: new URL(originalUrl).href,
  };
}

const decode = value =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
const text = value =>
  decode(
    value
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
const first = (html, pattern) => html.match(pattern)?.[1] ?? '';
const links = html =>
  [
    ...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi),
  ].map(m => ({ href: decode(m[1]), label: text(m[2]) }));

export function parseArchivedPage(html, sourceUrl, resolvedUrl, timestamp) {
  const allLinks = links(html).filter(link => /^https?:\/\//i.test(link.href));
  const optionLinks = allLinks.filter(
    link =>
      /option|choose|continue|next/i.test(link.label) ||
      /\/p\//i.test(link.href)
  );
  const alternativeLinks = allLinks.filter(link =>
    /alternative|variant/i.test(link.label)
  );
  const title = text(
    first(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ||
      first(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i)
  );
  const author = text(first(html, /(?:author|byline)[^>]*>([\s\S]*?)<\//i));
  const content = text(
    first(html, /<(?:main|article)\b[^>]*>([\s\S]*?)<\/(?:main|article)>/i)
  );
  const pageNumber =
    first(html, /(?:page|page-number)["'\s:=]+(?:[^>]*>)?\s*(\d+)/i) || null;
  const variantName =
    text(first(html, /(?:variant|version)["'\s:=]+(?:[^>]*>)?\s*([^<\n]+)/i)) ||
    null;
  return {
    sourceWaybackUrl: sourceUrl,
    resolvedOriginalUrl: resolvedUrl,
    captureTimestamp: timestamp,
    title,
    authorName: author,
    content,
    pageNumber,
    variantName,
    options: optionLinks.map(({ label, href }) => ({ label, targetUrl: href })),
    alternatives: alternativeLinks.map(({ label, href }) => ({
      label,
      targetUrl: href,
    })),
    parent: null,
    status: content || title ? 'complete' : 'ambiguous',
  };
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const transient = status => status === 408 || status === 429 || status >= 500;
async function fetchWithRetry(url, options) {
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      const cached = await readFile(options.cacheFile(url), 'utf8').catch(
        () => null
      );
      if (cached) return { html: cached, resolvedUrl: url, cached: true };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs);
      const response = await fetch(
        `${WAYBACK_PREFIX}${options.timestamp}/${url}`,
        { signal: controller.signal }
      );
      clearTimeout(timer);
      if (
        !response.ok &&
        transient(response.status) &&
        attempt < options.retries
      ) {
        await sleep(2 ** attempt * 1000);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      await writeFile(options.cacheFile(url), html);
      return { html, resolvedUrl: response.url, cached: false };
    } catch (error) {
      if (attempt >= options.retries) throw error;
      await sleep(2 ** attempt * 1000);
    }
  }
  throw new Error('unreachable');
}

export async function importStory(startUrl, config = {}) {
  const start = parseWaybackUrl(startUrl);
  const outputDir =
    config.outputDir ??
    join(
      'wayback-imports',
      `${start.timestamp}-${createHash('sha1').update(start.originalUrl).digest('hex').slice(0, 10)}`
    );
  const cacheDir = config.cacheDir ?? join(outputDir, 'cache');
  await mkdir(cacheDir, { recursive: true });
  const cacheFile = url =>
    join(cacheDir, `${createHash('sha1').update(url).digest('hex')}.html`);
  const options = {
    timestamp: start.timestamp,
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    retries: config.retries ?? DEFAULT_RETRIES,
    cacheFile,
  };
  const queue = [{ url: start.originalUrl, parent: null }];
  const seen = new Set();
  const pages = [];
  while (queue.length) {
    const item = queue.shift();
    const originalUrl = item.url;
    const key = new URL(originalUrl).href;
    if (seen.has(key)) continue;
    seen.add(key);
    if (pages.length) await sleep(config.delayMs ?? DEFAULT_DELAY_MS);
    let record;
    try {
      const result = await fetchWithRetry(key, options);
      record = parseArchivedPage(
        result.html,
        `${WAYBACK_PREFIX}${start.timestamp}/${key}`,
        result.resolvedUrl,
        start.timestamp
      );
      record.parent = item.parent;
      for (const link of [...record.options, ...record.alternatives]) {
        if (!seen.has(link.targetUrl))
          queue.push({
            url: link.targetUrl,
            parent: {
              sourceUrl: key,
              label: link.label,
              targetUrl: link.targetUrl,
            },
          });
      }
    } catch (error) {
      record = {
        sourceWaybackUrl: `${WAYBACK_PREFIX}${start.timestamp}/${key}`,
        resolvedOriginalUrl: key,
        captureTimestamp: start.timestamp,
        options: [],
        alternatives: [],
        parent: item.parent,
        status: 'missing',
        error: error.message,
      };
    }
    pages.push(record);
  }
  await mkdir(join(outputDir, 'pages'), { recursive: true });
  await Promise.all(
    pages.map((page, index) =>
      writeFile(
        join(outputDir, 'pages', `${String(index + 1).padStart(4, '0')}.json`),
        JSON.stringify(page, null, 2)
      )
    )
  );
  await writeFile(
    join(outputDir, 'manifest.json'),
    JSON.stringify(
      {
        ...start,
        createdAt: new Date().toISOString(),
        pageCount: pages.length,
        pages: pages.map((page, index) => ({
          file: `pages/${String(index + 1).padStart(4, '0')}.json`,
          url: page.resolvedOriginalUrl,
          status: page.status,
        })),
      },
      null,
      2
    )
  );
  return { outputDir, pageCount: pages.length };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const input = process.argv[2];
  if (!input)
    throw new Error(
      `Usage: node scripts/import-wayback-story.js "${WAYBACK_PREFIX}..."`
    );
  importStory(input, {
    delayMs: Number(process.env.WAYBACK_DELAY_MS) || DEFAULT_DELAY_MS,
  })
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

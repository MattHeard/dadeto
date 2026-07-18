#!/usr/bin/env node

import express from 'express';
import { resolve } from 'node:path';

const siteRoot = resolve(process.env.TEMPLATE_ACCEPTANCE_SITE ?? 'public');
const staticRoot = resolve(process.env.TEMPLATE_ACCEPTANCE_STATIC ?? 'infra');
const rootAssetRoot = resolve(staticRoot, 'browser', 'assets');
const remoteAssetOrigin =
  process.env.TEMPLATE_ACCEPTANCE_ASSET_ORIGIN ??
  'https://www.dendritestories.co.nz';
const port = Number(process.env.PORT ?? 4173);

const app = express();
app.use(express.static(siteRoot, { extensions: ['html'] }));
app.use(express.static(rootAssetRoot));
app.use(express.static(staticRoot));
app.get('/img/logo.png', async (_request, response) => {
  const asset = await fetch(`${remoteAssetOrigin}/img/logo.png`);
  response.status(asset.status);
  response.set('Content-Type', asset.headers.get('content-type') ?? 'image/png');
  response.send(Buffer.from(await asset.arrayBuffer()));
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Template acceptance server listening on http://127.0.0.1:${port}`);
  console.log(`Generated pages: ${siteRoot}`);
  console.log(`Cloud static assets: ${staticRoot}`);
  console.log(`Cloud root assets: ${rootAssetRoot}`);
});

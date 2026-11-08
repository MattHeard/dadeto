import { expect, it } from '@jest/globals';
import { posix } from 'node:path';
import { createWgs84AssetCopies } from '../../../../src/logic/core/build/wgs84-assets.js';

it('includes actual relocated sources and every stable public compatibility module', () => {
  expect(createWgs84AssetCopies('/source', '/artifact', posix.join)).toEqual([
    {
      source: '/source/adapters/wgs84.js',
      target: '/artifact/adapters/wgs84.js',
    },
    {
      source: '/source/logic/boundary/wgs84/coordinates.js',
      target: '/artifact/logic/boundary/wgs84/coordinates.js',
    },
    {
      source: '/source/logic/core/wgs84/wgs84.js',
      target: '/artifact/logic/core/wgs84/wgs84.js',
    },
    {
      source: '/source/build/assets/wgs84/root.js.txt',
      target: '/artifact/core/wgs84.js',
    },
    {
      source: '/source/build/assets/wgs84/index.js.txt',
      target: '/artifact/core/wgs84/index.js',
    },
    {
      source: '/source/build/assets/wgs84/math.js.txt',
      target: '/artifact/core/wgs84/wgs84.js',
    },
    {
      source: '/source/build/assets/wgs84/toy.js.txt',
      target: '/artifact/core/browser/toys/2026-08-20/wgs84Distance.js',
    },
  ]);
});

it('delegates both roots to the injected path operation and propagates failures', () => {
  const join = (...parts) => parts.join('::');
  const copies = createWgs84AssetCopies('SRC', 'OUT', join);
  expect(copies[0]).toEqual({
    source: 'SRC::adapters/wgs84.js',
    target: 'OUT::adapters/wgs84.js',
  });
  const error = new Error('path failure');
  expect(() =>
    createWgs84AssetCopies('SRC', 'OUT', () => {
      throw error;
    })
  ).toThrow(error);
});

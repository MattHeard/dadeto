import { describe, test, expect } from '@jest/globals';
import { headElement } from '../../src/generator/head.js';

describe('headElement constant', () => {
  test('contains basic head markup', () => {
    expect(headElement).toContain('<head>');
    expect(headElement).toContain('<meta charset="UTF-8">');
    expect(headElement).toContain('</head>');
  });
});

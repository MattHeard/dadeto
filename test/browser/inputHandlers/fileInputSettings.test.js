import { describe, expect, it } from '@jest/globals';
import { FILE_INPUT_SETTINGS } from '../../../src/core/browser/inputHandlers/fileInputSettings.js';

describe('FILE_INPUT_SETTINGS', () => {
  it('exports the file input contract used by the file handler', () => {
    expect(FILE_INPUT_SETTINGS).toStrictEqual({
      type: 'file',
      className: 'toy-file-input',
      accept: '.csv,text/csv,text/plain',
    });
  });
});

import fs from 'fs';
import path from 'path';
import { describe, test, expect } from '@jest/globals';

const sourcePath = path.join(process.cwd(), 'src/browser/toys.js');

describe('inputHandlersMap constant source', () => {
  test('definition includes expected handler mappings', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    const regex =
      /const inputHandlersMap = \{\s*text: textHandler,\s*textarea: textareaHandler,\s*file: fileHandler,\s*number: numberHandler,\s*kv: kvHandler,\s*'blog-key': blogKeyHandler,\s*'real-hourly-wage': realHourlyWageHandler,\s*'dendrite-story': dendriteStoryHandler,\s*'dendrite-page': dendritePageHandler,\s*'moderator-ratings': moderatorRatingsHandler,\s*'keyboard-capture': keyboardCaptureHandler,\s*'gamepad-capture': gamepadCaptureHandler,\s*'gamepad-button-mapper': joyConMapperHandler,\s*default: defaultHandler,?\s*\};/s;
    expect(src).toMatch(regex);
  });
});

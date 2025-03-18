// textFormatter.test.js

import { getFormattedText } from '../src/textFormatter';

describe('getFormattedText', () => {
  it('should return an empty string when given an empty string', () => {
    const text = '';
    const formattedText = getFormattedText(text);
    expect(formattedText).toBe('');
  });
});

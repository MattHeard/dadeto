// textFormatter.test.js

import { getFormattedText } from '../src/textFormatter';

describe('getFormattedText', () => {
  it('should return an empty string when given an empty string', () => {
    const text = '';
    const formattedText = getFormattedText(text);
    expect(formattedText).toBe('');
  });

  it('should return "foo" when given "foo" as input', () => {
    const text = 'foo';
    const formattedText = getFormattedText(text);
    expect(formattedText).toBe('foo');
  });
});

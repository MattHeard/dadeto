import { italics } from '../../../src/core/toys/2025-03-21/italics.js';

describe('italics function', () => {
  test('returns non-string values unchanged', () => {
    expect(italics(null)).toBe(null);
    expect(italics(undefined)).toBe(undefined);
    expect(italics(42)).toBe(42);
    expect(italics(true)).toBe(true);
    expect(italics({})).toEqual({});
    expect(italics([])).toEqual([]);
  });

  test('leaves regular text unchanged', () => {
    expect(italics('Regular text without markdown')).toBe(
      'Regular text without markdown'
    );
    expect(italics('')).toBe('');
  });

  test('adds <em> tags around asterisk-style italics while preserving asterisks', () => {
    expect(italics('This is *italic* text')).toBe(
      'This is <em>*italic*</em> text'
    );
    expect(italics('*Start* and end')).toBe('<em>*Start*</em> and end');
    expect(italics('Start and *end*')).toBe('Start and <em>*end*</em>');
    expect(italics('Multiple *italic* words in *one* string')).toBe(
      'Multiple <em>*italic*</em> words in <em>*one*</em> string'
    );
  });

  test('adds <em> tags around underscore-style italics while preserving underscores', () => {
    expect(italics('This is _italic_ text')).toBe(
      'This is <em>_italic_</em> text'
    );
    expect(italics('_Start_ and end')).toBe('<em>_Start_</em> and end');
    expect(italics('Start and _end_')).toBe('Start and <em>_end_</em>');
    expect(italics('Multiple _italic_ words in _one_ string')).toBe(
      'Multiple <em>_italic_</em> words in <em>_one_</em> string'
    );
  });

  test('handles both asterisk and underscore styles in the same string', () => {
    expect(italics('*Asterisk* and _underscore_')).toBe(
      '<em>*Asterisk*</em> and <em>_underscore_</em>'
    );
    expect(italics('Text with _multiple_ *italic* _formats_ mixed *in*')).toBe(
      'Text with <em>_multiple_</em> <em>*italic*</em> <em>_formats_</em> mixed <em>*in*</em>'
    );
  });

  test('does not add <em> tags around bold double-asterisk markdown', () => {
    expect(italics('This is **bold** text')).toBe('This is **bold** text');
    expect(italics('**Start** and end')).toBe('**Start** and end');
    expect(italics('Mixed **bold** and *italic*')).toBe(
      'Mixed **bold** and <em>*italic*</em>'
    );
  });

  test('does not add <em> tags around bold double-underscore markdown', () => {
    expect(italics('This is __bold__ text')).toBe('This is __bold__ text');
    expect(italics('__Start__ and end')).toBe('__Start__ and end');
    expect(italics('Mixed __bold__ and _italic_')).toBe(
      'Mixed __bold__ and <em>_italic_</em>'
    );
  });

  test('handles bold at end of string (afterText empty)', () => {
    expect(italics('foo **bold**')).toBe('foo **bold**');
    expect(italics('**justbold**')).toBe('**justbold**');
  });

  test('handles complex mixed formatting correctly', () => {
    expect(italics('**Bold** and *italic* mixed')).toBe(
      '**Bold** and <em>*italic*</em> mixed'
    );
    expect(italics('__Bold__ and _italic_ mixed')).toBe(
      '__Bold__ and <em>_italic_</em> mixed'
    );
    expect(italics('**Bold with *nested italic***')).toBe(
      '**Bold with *nested italic***'
    );
    expect(italics('__Bold with _nested italic___')).toBe(
      '__Bold with _nested italic___'
    );
    expect(
      italics(
        'Text with **bold** and *italic* and __more bold__ and _more italic_'
      )
    ).toBe(
      'Text with **bold** and <em>*italic*</em> and __more bold__ and <em>_more italic_</em>'
    );
  });

  test('handles bold text spanning multiple lines', () => {
    const input = '**bold\n*italic***';
    expect(italics(input)).toBe(input);
  });

  test('preserves bold text containing newlines', () => {
    const input = '**bold\ntext** and _italic_';
    const expected = '**bold\ntext** and <em>_italic_</em>';
    expect(italics(input)).toBe(expected);
  });

  test('preserves bold text with a newline and no italics', () => {
    const input = '**multi\nline**';
    expect(italics(input)).toBe(input);
  });
});

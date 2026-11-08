import { parseImpactArguments } from '../../../../src/logic/boundary/local/impact-arguments.js';

describe('impact option boundary', () => {
  test('preserves the original sparse-option diagnostic rather than inventing a structural error', () => {
    expect(parseImpactArguments(Array(2), undefined)).toEqual({
      ok: true,
      input: {
        paths: null,
        baseRef: undefined,
        error: 'Unsupported impact option: undefined.',
      },
    });
  });
  test.each([
    [[], undefined, null, undefined],
    [[], '', null, ''],
    [[], 'default', null, 'default'],
    [['--base', 'main'], undefined, null, 'main'],
    [['--base', '-ref'], 'default', null, '-ref'],
    [['--base', 'first', '--base', 'last'], undefined, null, 'last'],
    [['--files', 'a', 'b'], undefined, ['a', 'b'], undefined],
    [['--files', '', '-'], '', ['', '-'], ''],
    [['--files', 'a', '--files', 'b'], undefined, ['a', 'b'], undefined],
    [['--files', 'a', '--files'], undefined, ['a'], undefined],
  ])('preserves options %p with default %p', (argv, base, paths, baseRef) => {
    expect(parseImpactArguments(argv, base)).toEqual({
      ok: true,
      input: { paths, baseRef, error: '' },
    });
  });

  test.each([
    [
      ['--files'],
      undefined,
      undefined,
      'Provide one or more paths after --files.',
    ],
    [
      ['--files', '--base', 'main'],
      'default',
      'default',
      'Provide one or more paths after --files.',
    ],
    [['--base'], undefined, undefined, 'Provide a Git ref after --base.'],
    [['--base', ''], 'default', 'default', 'Provide a Git ref after --base.'],
    [
      ['--base', '--unknown'],
      undefined,
      undefined,
      'Provide a Git ref after --base.',
    ],
    [
      ['--base', 'main', '--base'],
      undefined,
      'main',
      'Provide a Git ref after --base.',
    ],
    [
      ['--unknown'],
      undefined,
      undefined,
      'Unsupported impact option: --unknown.',
    ],
    [[''], 'default', 'default', 'Unsupported impact option: .'],
    [
      ['--files', 'a', '--'],
      undefined,
      undefined,
      'Unsupported impact option: --.',
    ],
    [
      ['--files', 'a'],
      'default',
      'default',
      'Choose explicit --files or Git status/base discovery, not both.',
    ],
    [
      ['--base', 'main', '--files', 'a'],
      undefined,
      'main',
      'Choose explicit --files or Git status/base discovery, not both.',
    ],
    [
      ['--files', 'a', '--base', 'main'],
      undefined,
      'main',
      'Choose explicit --files or Git status/base discovery, not both.',
    ],
  ])('preserves diagnostic for %p', (argv, base, baseRef, error) => {
    expect(parseImpactArguments(argv, base)).toEqual({
      ok: true,
      input: { paths: null, baseRef, error },
    });
  });

  test.each(
    [
      undefined,
      null,
      ['--files', undefined],
      ['--files', null],
      ['--files', {}],
      ['--base', {}],
      [Symbol('option')],
    ].map(argv => [argv])
  )('defines structural failure for %p', argv => {
    const result = parseImpactArguments(argv, undefined);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(TypeError);
    expect(result).not.toHaveProperty('input');
  });

  test.each([17, true, {}, { length: 0 }])(
    'preserves original empty interpretation of %p',
    argv => {
      expect(parseImpactArguments(argv, undefined)).toEqual({
        ok: true,
        input: { paths: null, baseRef: undefined, error: '' },
      });
    }
  );

  test.each([
    undefined,
    null,
    false,
    0,
    'failure',
    Symbol('failure'),
    {},
    new Error('failure'),
  ])('retains exact thrown value %p', failure => {
    const argv = Object.defineProperty([], 'length', { value: 1 });
    Object.defineProperty(argv, '0', {
      get() {
        throw failure;
      },
    });
    const result = parseImpactArguments(argv, undefined);
    expect(result.ok).toBe(false);
    expect(result.error).toBe(failure);
    expect(result).not.toHaveProperty('input');
  });

  test('retains original reads and coercion without modifying caller-owned paths', () => {
    const calls = [];
    const member = {
      startsWith(prefix) {
        calls.push(prefix);
        return false;
      },
    };
    const argv = ['--files', member];
    const result = parseImpactArguments(argv, undefined);
    expect(result).toEqual({
      ok: true,
      input: { paths: [member], baseRef: undefined, error: '' },
    });
    expect(result.input.paths[0]).toBe(member);
    expect(calls).toEqual(['--']);
    expect(argv).toEqual(['--files', member]);
    expect(result.input.paths).not.toBe(argv);
  });
});

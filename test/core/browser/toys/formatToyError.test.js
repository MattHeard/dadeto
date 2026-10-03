import { describe, expect, jest, test } from '@jest/globals';
import {
  formatToyError,
  formatToyConversionError,
  runToyCalculation,
  runToyRequest,
  runToyFailureBoundary,
  runToyArrayCalculation,
} from '../../../../src/core/browser/toys/formatToyError.js';

describe('toy error formatting', () => {
  test('array boundaries serialize success and calculator failures without changing input arrays', () => {
    const values = [0, false, null, { id: 'first' }];
    expect(runToyArrayCalculation(() => values)).toBe(
      '[0,false,null,{"id":"first"}]'
    );
    expect(values).toEqual([0, false, null, { id: 'first' }]);
    expect(
      runToyArrayCalculation(() => {
        throw 'denied';
      })
    ).toBe('[]');
  });
  test('array boundaries catch success serialization failures but let fallback serialization failures escape', () => {
    const stringify = jest.spyOn(JSON, 'stringify');
    try {
      stringify.mockImplementationOnce(() => {
        throw new Error('bad result');
      });
      expect(runToyArrayCalculation(() => [1])).toBe('[]');
      expect(stringify.mock.calls).toEqual([[[1]], [[]]]);
      stringify.mockImplementation(() => {
        throw new Error('bad formatter');
      });
      expect(() => runToyArrayCalculation(() => [1])).toThrow('bad formatter');
    } finally {
      stringify.mockRestore();
    }
  });
  test('failure executors retain success identity and deliver the original thrown value once', () => {
    const value = { original: true };
    expect(
      runToyFailureBoundary(
        () => value,
        () => {
          throw new Error('unexpected rejection');
        }
      )
    ).toBe(value);
    const failures = [];
    expect(
      runToyFailureBoundary(
        () => {
          throw null;
        },
        error => {
          failures.push(error);
          return value;
        }
      )
    ).toBe(value);
    expect(failures).toEqual([null]);
  });

  test('request pipelines parse once, calculate the same object and format the result', () => {
    const events = [];
    const request = { value: 7 };
    const result = runToyRequest(
      'original input',
      input => {
        events.push(['parse', input]);
        return request;
      },
      parsed => {
        expect(parsed).toBe(request);
        events.push(['calculate', parsed.value]);
        return { doubled: parsed.value * 2 };
      }
    );
    expect(events).toEqual([
      ['parse', 'original input'],
      ['calculate', 7],
    ]);
    expect(result).toBe('{\n  "doubled": 14\n}');
  });

  test.each(['parse', 'calculate', 'serialize'])(
    'request pipelines retain %s errors and do not run later stages',
    stage => {
      const events = [];
      const visit = name => {
        events.push(name);
        if (name === stage) throw new Error(`${stage} failed`);
      };
      const result = runToyRequest(
        'request',
        () => {
          visit('parse');
          return {};
        },
        () => {
          visit('calculate');
          return { toJSON: () => visit('serialize') };
        }
      );
      expect(events).toEqual(
        ['parse', 'calculate', 'serialize'].slice(
          0,
          ['parse', 'calculate', 'serialize'].indexOf(stage) + 1
        )
      );
      expect(result).toBe(formatToyError(`${stage} failed`));
    }
  );

  test('calculation boundaries preserve success and the original failure message and indentation', () => {
    expect(runToyCalculation(() => 'unchanged')).toBe('unchanged');
    expect(
      runToyCalculation(() => {
        throw new Error('failed');
      })
    ).toBe(formatToyError('failed'));
    expect(
      runToyCalculation(() => {
        throw { message: 42 };
      }, 0)
    ).toBe('{"valid":false,"error":42}');
    expect(
      runToyCalculation(() => {
        throw 'missing message';
      }, 0)
    ).toBe('{"valid":false}');
    expect(() =>
      runToyCalculation(() => {
        throw null;
      })
    ).toThrow(TypeError);
  });
  test('supports compact legacy errors without changing pretty defaults or omitted messages', () => {
    expect(formatToyError('bad input', 0)).toBe(
      '{"valid":false,"error":"bad input"}'
    );
    expect(formatToyError('bad input')).toBe(
      '{\n  "valid": false,\n  "error": "bad input"\n}'
    );
    expect(formatToyError(undefined, 0)).toBe('{"valid":false}');
  });
  test('formats validation errors with the invalid flag', () => {
    expect(JSON.parse(formatToyError('bad input'))).toEqual({
      valid: false,
      error: 'bad input',
    });
  });

  test('formats conversion errors without the validation flag', () => {
    expect(JSON.parse(formatToyConversionError('cannot convert'))).toEqual({
      error: 'cannot convert',
    });
  });
});

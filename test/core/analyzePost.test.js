import { jest } from '@jest/globals';
import { getInput, runAnalyzePost } from '../../src/core/build/analyzePost.js';

describe('analyzePost', () => {
  test('getInput returns argv text when provided', async () => {
    const input = await getInput(
      { argv: ['node', 'script', 'hello', 'world'], stdin: [] },
      Buffer
    );
    expect(input).toBe('hello world');
  });

  test('getInput reads from stdin when argv is empty', async () => {
    /**
     *
     */
    async function* makeChunks() {
      yield Buffer.from('hello ');
      yield Buffer.from('stdin');
    }

    const input = await getInput(
      { argv: ['node', 'script'], stdin: makeChunks() },
      Buffer
    );
    expect(input).toBe('hello stdin');
  });

  test('runAnalyzePost exits when input is blank', async () => {
    const log = jest.fn();
    const exit = jest.fn();

    await runAnalyzePost({
      process: { argv: ['node', 'script', '   '], stdin: [], exit },
      Buffer,
      console: { log },
    });

    expect(log).toHaveBeenCalledWith('No text provided.');
    expect(exit).toHaveBeenCalledWith(1);
  });

  test('runAnalyzePost prints analysis and feedback for non-100-word text', async () => {
    const log = jest.fn();

    await runAnalyzePost({
      process: {
        argv: ['node', 'script', 'One two three.'],
        stdin: [],
        exit: jest.fn(),
      },
      Buffer,
      console: { log },
    });

    expect(log).toHaveBeenCalledWith('--- Post Analysis ---');
    expect(log).toHaveBeenCalledWith('Words: 3 / 100');
    expect(log).toHaveBeenCalledWith('Delta: -97');
    expect(log).toHaveBeenCalledWith('--- Feedback ---');
    expect(log).not.toHaveBeenCalledWith('Ready for title suggestions!');
  });

  test('runAnalyzePost prints ready message for exactly 100 words', async () => {
    const words = Array.from({ length: 100 }, (_, i) => `w${String(i)}`).join(
      ' '
    );
    const log = jest.fn();

    await runAnalyzePost({
      process: { argv: ['node', 'script', words], stdin: [], exit: jest.fn() },
      Buffer,
      console: { log },
    });

    expect(log).toHaveBeenCalledWith('Delta: +0');
    expect(log).toHaveBeenCalledWith('Ready for title suggestions!');
  });
});

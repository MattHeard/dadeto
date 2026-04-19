import { beforeEach, describe, expect, test } from '@jest/globals';
import { cozyHouseAdventure } from '../../../src/core/browser/toys/2026-04-19/cozyHouseAdventure.js';

describe('cozyHouseAdventure', () => {
  let tempData;
  let env;

  beforeEach(() => {
    tempData = {};
    env = new Map([
      ['getRandomNumber', () => 0.1],
      ['getCurrentTime', () => '07:15'],
      ['getData', () => ({ temporary: { COZY1: tempData } })],
      [
        'setLocalTemporaryData',
        data => {
          tempData = { ...tempData, ...data.temporary?.COZY1 };
        },
      ],
    ]);
  });

  test('welcomes player and prompts to begin build', () => {
    const result = cozyHouseAdventure('Rowan', env);

    expect(result).toMatch(/Welcome home, Rowan/);
    expect(tempData.name).toBe('Rowan');
    expect(tempData.state).toBe('intro');
  });

  test('starts build loop and visits a construction station', () => {
    cozyHouseAdventure('Rowan', env);

    const yard = cozyHouseAdventure('build', env);
    const station = cozyHouseAdventure('foundation', env);

    expect(yard).toMatch(
      /Next tasks: foundation \/ materials \/ roof \/ garden/
    );
    expect(station).toMatch(/Type `level soil`/);
    expect(tempData.state).toBe('foundation');
    expect(tempData.inventory).toContain('tea thermos');
  });

  test('completes all build stages and records progress', () => {
    cozyHouseAdventure('Rowan', env);
    cozyHouseAdventure('build', env);

    cozyHouseAdventure('foundation', env);
    cozyHouseAdventure('level soil', env);

    cozyHouseAdventure('materials', env);
    cozyHouseAdventure('pack insulation', env);

    cozyHouseAdventure('roof', env);
    cozyHouseAdventure('lay shingles', env);

    cozyHouseAdventure('garden', env);
    const ending = cozyHouseAdventure('plant herbs', env);

    expect(ending).toMatch(/You built a peaceful home/);
    expect(tempData.progress).toEqual([
      'foundation',
      'materials',
      'roof',
      'garden',
    ]);
    expect(tempData.inventory).toEqual(
      expect.arrayContaining(['foundation', 'materials', 'roof', 'garden'])
    );
    expect(tempData.state).toBe('yard');
  });

  test('adds random cozy bonus line when random check passes', () => {
    cozyHouseAdventure('Rowan', env);
    cozyHouseAdventure('build', env);
    env.set('getRandomNumber', () => 0.95);

    const result = cozyHouseAdventure('materials', env);

    expect(result).toMatch(/A robin lands nearby/);
  });

  test('returns system error when dependencies fail', () => {
    env.delete('getData');

    const result = cozyHouseAdventure('anything', env);

    expect(result).toMatch(/SYSTEM ERROR: fireplace smoke in the command line/);
  });
});

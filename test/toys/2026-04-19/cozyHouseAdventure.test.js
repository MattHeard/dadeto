import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  cozyHouseAdventure,
  cozyHouseAdventureTestOnly,
} from '../../../src/core/browser/toys/2026-04-19/cozyHouseAdventure.js';

describe('cozyHouseAdventure', () => {
  it('covers dependency, state, and narrative helper contracts', () => {
    const getData = () => ({ ok: true });
    expect(
      cozyHouseAdventureTestOnly.requireEnvFunction(
        new Map([['getData', getData]]),
        'getData',
        'state accessor'
      )
    ).toBe(getData);
    expect(() =>
      cozyHouseAdventureTestOnly.requireEnvFunction(
        new Map(),
        'getData',
        'state accessor'
      )
    ).toThrow('Missing state accessor dependency');
    expect(cozyHouseAdventureTestOnly.getScopedState({})).toEqual({});
    expect(
      cozyHouseAdventureTestOnly.getScopedState({
        temporary: { COZY1: { name: 'A' } },
      })
    ).toEqual({ name: 'A' });
    expect(cozyHouseAdventureTestOnly.getTemporaryState({})).toEqual({});
    expect(
      cozyHouseAdventureTestOnly.getTemporaryState({ COZY1: { name: 'B' } })
    ).toEqual({ name: 'B' });
    expect(cozyHouseAdventureTestOnly.introMessage('A')).toContain(
      'Welcome home, A'
    );
    expect(cozyHouseAdventureTestOnly.yardMessage('12:00')).toContain('12:00');
    expect(
      cozyHouseAdventureTestOnly.appendIfMissing(['foundation'], 'foundation')
    ).toEqual(['foundation']);
    expect(
      cozyHouseAdventureTestOnly.appendIfMissing(['foundation'], 'roof')
    ).toEqual(['foundation', 'roof']);
    expect(
      cozyHouseAdventureTestOnly.addCompletedStage(
        { inventory: [], progress: [] },
        'garden'
      )
    ).toEqual({ inventory: ['garden'], progress: ['garden'] });
    expect(
      cozyHouseAdventureTestOnly.isHouseComplete([
        'foundation',
        'materials',
        'roof',
        'garden',
      ])
    ).toBe(true);
    expect(
      cozyHouseAdventureTestOnly.isHouseComplete(['foundation', 'materials'])
    ).toBe(false);
    expect(
      cozyHouseAdventureTestOnly.getCompletionLine(['foundation'])
    ).toContain('next cozy task');
    expect(
      cozyHouseAdventureTestOnly.getCompletionLine([
        'foundation',
        'materials',
        'roof',
        'garden',
      ])
    ).toContain('peaceful home');
    expect(cozyHouseAdventureTestOnly.introMessage('A')).toBe(
      "> Welcome home, A.\n> A gentle rain taps the porch while your tiny-house project waits in the yard.\n> Type 'build' when you're ready to start laying out your cozy home."
    );
    expect(cozyHouseAdventureTestOnly.yardMessage('12:00')).toBe(
      '> 12:00 — You stand in the yard with tea in hand and a warm checklist.\n> Next tasks: foundation / materials / roof / garden.\n> What would you like to do?'
    );
    expect(cozyHouseAdventureTestOnly.resolveYardSelection('roof')).toBe(
      'roof'
    );
    expect(cozyHouseAdventureTestOnly.resolveYardSelection('nothing')).toBe(
      'yard'
    );
    expect(cozyHouseAdventureTestOnly.getInputName('  ')).toBe('Builder');
    expect(cozyHouseAdventureTestOnly.getInputName(' Rowan ')).toBe('Rowan');
    expect(cozyHouseAdventureTestOnly.getPlayerState({})).toBe('intro');
    expect(cozyHouseAdventureTestOnly.getPlayerState({ state: 'garden' })).toBe(
      'garden'
    );
    expect(cozyHouseAdventureTestOnly.getStoredList()).toEqual([]);
    expect(cozyHouseAdventureTestOnly.getStoredList(['roof'])).toEqual([
      'roof',
    ]);
    expect(cozyHouseAdventureTestOnly.getBonusText(0.8)).toBe('');
    expect(cozyHouseAdventureTestOnly.getBonusText(0.81)).toContain(
      'A robin lands nearby'
    );
    expect(cozyHouseAdventureTestOnly.getStateHandler('yard')).toBeDefined();
  });
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

  test('reports each missing runtime dependency and normalizes commands', () => {
    for (const key of [
      'getCurrentTime',
      'getRandomNumber',
      'setLocalTemporaryData',
    ]) {
      const missing = new Map(env);
      missing.delete(key);
      expect(cozyHouseAdventure('Rowan', missing)).toMatch(/SYSTEM ERROR/);
    }
    cozyHouseAdventure('Rowan', env);
    expect(cozyHouseAdventure(' BUILD ', env)).toMatch(/Next tasks/);
  });

  test('exposes exact dependency contracts for runtime context and adventure entry', () => {
    for (const [key, label] of [
      ['getCurrentTime', 'time provider'],
      ['getRandomNumber', 'random number generator'],
      ['setLocalTemporaryData', 'temporary state setter'],
    ]) {
      const missing = new Map(env);
      missing.delete(key);
      expect(() =>
        cozyHouseAdventureTestOnly.createRuntimeContext('build', {}, missing)
      ).toThrow(`Missing ${label} dependency for cozy house adventure.`);
    }
    const context = cozyHouseAdventureTestOnly.createRuntimeContext(
      '  BuIlD  ',
      {},
      env
    );
    expect(context.lowerInput).toBe('build');
    const noData = new Map(env);
    noData.delete('getData');
    expect(() =>
      cozyHouseAdventureTestOnly.runAdventure('anything', noData)
    ).toThrow('Missing state accessor dependency for cozy house adventure.');
  });

  test('starts from empty temporary data shapes', () => {
    env.set('getData', () => ({}));

    const noTemporary = cozyHouseAdventure('  ', env);

    expect(noTemporary).toMatch(/Welcome home, Builder/);

    env.set('getData', () => ({ temporary: {} }));

    const noScopedState = cozyHouseAdventure('Alex', env);

    expect(noScopedState).toMatch(/Welcome home, Alex/);
  });

  test('re-prompts for yard, intro, and stage commands that do not match', () => {
    cozyHouseAdventure('Rowan', env);

    expect(cozyHouseAdventure('wait', env)).toMatch(/type 'build'/);

    cozyHouseAdventure('build', env);

    expect(cozyHouseAdventure('look around', env)).toMatch(/plan is simple/);

    cozyHouseAdventure('foundation', env);

    expect(cozyHouseAdventure('hammer nails', env)).toMatch(/Not quite/);
    expect(tempData.state).toBe('foundation');
  });

  test('falls back to yard for unknown saved state without stored lists', () => {
    tempData = {
      name: 'Rowan',
      state: 'mystery',
    };

    const result = cozyHouseAdventure('foundation', env);

    expect(result).toMatch(/Type `level soil`/);
    expect(tempData.inventory).toEqual([]);
    expect(tempData.progress).toEqual([]);
  });

  test('does not duplicate already completed stage entries', () => {
    tempData = {
      name: 'Rowan',
      state: 'foundation',
      inventory: ['foundation'],
      progress: ['foundation'],
    };

    cozyHouseAdventure('level soil', env);

    expect(tempData.inventory).toEqual(['foundation']);
    expect(tempData.progress).toEqual(['foundation']);
  });
});

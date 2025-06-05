import { describe, test, expect, beforeEach } from '@jest/globals';
import { cyberpunkAdventure } from '../../../src/toys/2025-03-30/cyberpunkAdventure.js';

describe('Cyberpunk Text Game', () => {
  let tempData;
  let env;

  beforeEach(() => {
    tempData = {};
    env = new Map([
      ['getRandomNumber', () => 0.5],
      ['getCurrentTime', () => '23:59'],
      ['getData', () => ({ temporary: { CYBE1: tempData } })],
      [
        'setData',
        data => {
          tempData = { ...tempData, ...data.temporary?.CYBE1 };
        },
      ],
    ]);
  });

  test('initial naming and intro', () => {
    expect(cyberpunkAdventure('Blaze', env)).toMatch(/Welcome, Blaze/);
    expect(cyberpunkAdventure('start', env)).toMatch(
      /you're in the Neon Market/
    );
  });

  test('goes to Hacker Den and requires password', () => {
    cyberpunkAdventure('Blaze', env);
    cyberpunkAdventure('start', env);
    expect(cyberpunkAdventure('hacker', env)).toMatch(/requires a password/);
    expect(cyberpunkAdventure('zero', env)).toMatch(/cracked implant/);
    expect(tempData.inventory).toContain('cracked implant');
    expect(tempData.visited).toContain('hacker');
  });

  test('shows hint if incorrect hacker password is given', () => {
    tempData = {
      name: 'Blaze',
      state: 'hacker:door',
      inventory: [],
      visited: [],
    };
    env.set('getData', () => ({ temporary: { CYBE1: tempData } }));
    const result = cyberpunkAdventure('foobar', env);
    if (typeof result === 'object') {
      expect(result.output).toMatch(
        /Hint: the password is a number and a name/
      );
      expect(result.nextState).toBe('hacker:door');
    } else {
      expect(result).toMatch(/Hint: the password is a number and a name/);
    }
  });

  test('goes to Transport Hub and trades datapad', () => {
    tempData = {
      name: 'Blaze',
      state: 'hub',
      inventory: ['datapad'],
      visited: [],
    };
    env.set('getData', () => ({ temporary: { CYBE1: tempData } }));
    expect(cyberpunkAdventure('transport', env)).toMatch(
      /Trains screech overhead./
    );
    expect(cyberpunkAdventure(' ', env)).toMatch(/vendor offers/);
    expect(cyberpunkAdventure('trade datapad', env)).toMatch(/neural ticket/);
    expect(tempData.inventory).toContain('neural ticket');
    expect(tempData.inventory).not.toContain('datapad');
    expect(tempData.visited).toContain('transport');
  });

  test('shows trade prompt if no datapad in inventory at transport:trade', () => {
    tempData = {
      name: 'Blaze',
      state: 'transport:trade',
      inventory: [],
      visited: [],
    };
    env.set('getData', () => ({ temporary: { CYBE1: tempData } }));
    const result = cyberpunkAdventure('trade datapad', env);
    if (typeof result === 'object') {
      expect(result.output).toMatch(/Do you want to trade/);
      expect(result.nextState).toBe('transport:trade');
    } else {
      expect(result).toMatch(/Do you want to trade/);
    }
  });

  test('goes to Back Alley and finds stimpack (success)', () => {
    tempData = {
      name: 'Blaze',
      state: 'hub',
      inventory: [],
      visited: [],
    };
    env.set('getData', () => ({ temporary: { CYBE1: tempData } }));
    expect(cyberpunkAdventure('alley', env)).toMatch(/shadows move with you./);
    expect(cyberpunkAdventure(' ', env)).toMatch(/hidden stash: a stimpack/);
    expect(tempData.inventory).toContain('stimpack');
    expect(tempData.visited).toContain('alley');
  });

  test('trips wire in alley if stealth check fails', () => {
    tempData = {
      name: 'Blaze',
      state: 'alley:stealth',
      inventory: [],
      visited: [],
    };
    env.set('getData', () => ({ temporary: { CYBE1: tempData } }));
    env.set('getRandomNumber', () => 0.1); // fail
    const result = cyberpunkAdventure('sneak', env);
    if (typeof result === 'object') {
      expect(result.output).toMatch(
        /trip a wire|Sirens start up|sprint back to the Market/i
      );
      expect(result.nextState).toBe('hub');
    } else {
      expect(result).toMatch(
        /trip a wire|Sirens start up|sprint back to the Market/i
      );
    }
  });

  test('trips wire in alley if stealth check is exactly 0.3', () => {
    tempData = {
      name: 'Blaze',
      state: 'alley:stealth',
      inventory: [],
      visited: [],
    };
    env.set('getData', () => ({ temporary: { CYBE1: tempData } }));
    env.set('getRandomNumber', () => 0.3); // boundary
    const result = cyberpunkAdventure('sneak', env);
    if (typeof result === 'object') {
      expect(result.output).toMatch(
        /trip a wire|Sirens start up|sprint back to the Market/i
      );
      expect(result.nextState).toBe('hub');
    } else {
      expect(result).toMatch(
        /trip a wire|Sirens start up|sprint back to the Market/i
      );
    }
    expect(tempData.inventory).not.toContain('stimpack');
    expect(tempData.visited).not.toContain('alley');
  });

  test('unknown input in hub', () => {
    cyberpunkAdventure('Blaze', env);
    cyberpunkAdventure('start', env);
    expect(cyberpunkAdventure('xyz', env)).toMatch(/Unclear direction/);
  });

  test('resets on unknown state (default switch case)', () => {
    tempData = {
      name: 'Blaze',
      state: 'bogus:state',
      inventory: [],
      visited: [],
    };
    env.set('getData', () => ({ temporary: { CYBE1: tempData } }));
    const result = cyberpunkAdventure('anything', env);
    if (typeof result === 'object') {
      expect(result.output).toMatch(/Glitch in the grid/);
      expect(result.nextState).toBe('intro');
    } else {
      expect(result).toMatch(/Glitch in the grid/);
    }
  });

  test('returns SYSTEM ERROR if an exception is thrown (catch block)', () => {
    env.set('getData', () => {
      throw new Error('fail!');
    });
    const result = cyberpunkAdventure('anything', env);
    expect(result).toMatch(/SYSTEM ERROR: neural link failure/);
  });

  test('starts new game if CYBE1 data is missing', () => {
    env.set('getData', () => ({ temporary: {} }));
    const result = cyberpunkAdventure('Blaze', env);
    expect(result).toMatch(
      /Welcome, Blaze|your story begins|start to continue|Neon Market/i
    );
  });

  test("defaults name to 'Stray' if no input and no name in temporary data", () => {
    env.set('getData', () => ({ temporary: {} }));
    const result = cyberpunkAdventure('   ', env);
    expect(result).toMatch(/Stray/);
  });
});

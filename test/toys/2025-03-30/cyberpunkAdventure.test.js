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
      ['setData', (data) => {
        tempData = { ...tempData, ...data.temporary?.CYBE1 };
      }],
    ]);
  });

  test('initial naming and intro', () => {
    expect(cyberpunkAdventure('Blaze', env)).toMatch(/Welcome, Blaze/);
    expect(cyberpunkAdventure('start', env)).toMatch(/you're in the Neon Market/);
  });

  test('goes to Hacker Den and requires password', () => {
    cyberpunkAdventure('Blaze', env);
    cyberpunkAdventure('start', env);
    expect(cyberpunkAdventure('hacker', env)).toMatch(/requires a password/);
    expect(cyberpunkAdventure('zero', env)).toMatch(/cracked implant/);
    expect(tempData.inventory).toContain('cracked implant');
    expect(tempData.visited).toContain('hacker');
  });

  test('goes to Transport Hub and trades datapad', () => {
    tempData = {
      name: 'Blaze',
      state: 'hub',
      inventory: ['datapad'],
      visited: []
    };
    env.set('getData', () => ({ temporary: { CYBE1: tempData } }));
    expect(cyberpunkAdventure('transport', env)).toMatch(/Trains screech overhead./); 
    expect(cyberpunkAdventure(' ', env)).toMatch(/vendor offers/); 
    expect(cyberpunkAdventure('trade datapad', env)).toMatch(/neural ticket/); 
    expect(tempData.inventory).toContain('neural ticket');
    expect(tempData.inventory).not.toContain('datapad');
    expect(tempData.visited).toContain('transport');
  });

  test('goes to Back Alley and finds stimpack (success)', () => {
    tempData = {
      name: 'Blaze',
      state: 'hub',
      inventory: [],
      visited: []
    };
    env.set('getData', () => ({ temporary: { CYBE1: tempData } }));
    expect(cyberpunkAdventure('alley', env)).toMatch(/shadows move with you./); 
    expect(cyberpunkAdventure(' ', env)).toMatch(/hidden stash: a stimpack/); 
    expect(tempData.inventory).toContain('stimpack');
    expect(tempData.visited).toContain('alley');
  });

  test('unknown input in hub', () => {
    cyberpunkAdventure('Blaze', env);
    cyberpunkAdventure('start', env);
    expect(cyberpunkAdventure('xyz', env)).toMatch(/Unclear direction/);
  });
});
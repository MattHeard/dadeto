// fishingGame.test.js
import { fishingGame } from '../../../src/core/browser/toys/2025-03-29/fishingGame';

// Helper function to create a fixed environment.
const createEnv = (randomValue, currentTime) =>
  new Map([
    ['getRandomNumber', () => randomValue],
    ['getCurrentTime', () => currentTime],
  ]);

describe('fishingGame', () => {
  // Test various outcomes based on bait and random values.

  test('throws when a required env dependency is missing', () => {
    const envWithoutDeps = new Map();
    expect(() => fishingGame('worm', envWithoutDeps)).toThrow(
      'Fishing game missing getCurrentTime dependency'
    );
  });

  test('handles empty input gracefully', () => {
    const env = createEnv(0.5, '2025-03-29T08:00:00');
    const output = fishingGame('   ', env);
    expect(output).toMatch(/without any bait/i);
    expect(output).toMatch(
      /bubbling, fresh currents as dawn breaks with promise/i
    );
  });

  test('recognizes a known bait and applies its modifier (e.g., worm, modifier 0.0)', () => {
    const env = createEnv(0.25, '2025-12-15T22:00:00'); // winter night
    const output = fishingGame('worm', env);
    // With base chance 0.25, effective chance remains 0.25 (< 0.3) → no catch.
    expect(output).toMatch(/wriggling worm/i);
    expect(output).toMatch(/water stays silent/i);
    expect(output).toMatch(/crisp, icy waters beneath a silent, starry sky/i);
  });

  test('applies negative modifier for poor bait (e.g., bread, modifier -0.05)', () => {
    const env = createEnv(0.35, '2025-06-10T14:00:00'); // summer afternoon
    const output = fishingGame('bread', env);
    // With base chance 0.35 and modifier -0.05, effective chance is 0.3 (edge case: 0.3 → should get common carp outcome)
    expect(output).toMatch(/slice of bread/i);
    // Effective chance exactly 0.3 should be in the next bracket.
    expect(output).toMatch(/common carp surfaces gently/i);
    expect(output).toMatch(/warm, shimmering waves under a vibrant sun/i);
  });

  test('negative modifier can reduce chance below silent threshold', () => {
    const env = createEnv(0.25, '2025-06-10T14:00:00');
    const output = fishingGame('bread', env);
    // With base chance 0.25 and modifier -0.05, effective chance is 0.2 < 0.3
    expect(output).toMatch(/slice of bread/i);
    expect(output).toMatch(/water stays silent/i);
  });

  test('applies positive modifier for good bait (e.g., cheese, modifier 0.1)', () => {
    const env = createEnv(0.75, '2025-09-05T19:00:00'); // fall evening
    const output = fishingGame('cheese', env);
    // With base chance 0.75 and modifier 0.1, effective chance is 0.85 (edge: should get legendary outcome)
    expect(output).toMatch(/pungent piece of cheese/i);
    expect(output).toMatch(/legendary golden fish leaps forth/i);
    expect(output).toMatch(/cool, reflective ponds in the glow of twilight/i);
  });

  test('handles unrecognized bait as unconventional bait with no modifier', () => {
    const env = createEnv(0.8, '2025-04-01T10:00:00'); // spring morning
    const output = fishingGame('mystery lure', env);
    expect(output).toMatch(/unconventional bait/i);
    // With base chance 0.8 and modifier 0, effective chance is 0.8 → glimmering trout outcome.
    expect(output).toMatch(/glimmering trout appears/i);
    expect(output).toMatch(
      /bubbling, fresh currents as dawn breaks with promise/i
    );
  });

  test('produces common carp outcome for effectiveChance between 0.3 and 0.6', () => {
    const env = createEnv(0.5, '2025-11-20T16:00:00'); // fall afternoon
    const output = fishingGame('minnow', env);
    // Minnow modifier is 0.1, so effective chance = 0.6 → borderline. We define < 0.6 as common carp.
    // Since effectiveChance equals 0.6 exactly, it should fall into the next bracket (trout) if we use < comparison.
    // Let’s adjust: effectiveChance < 0.3, < 0.6, < 0.85, else. So 0.6 goes to trout.
    expect(output).toMatch(/darting minnow/i);
    expect(output).toMatch(/glimmering trout appears/i);
  });

  test('produces legendary outcome for very high effectiveChance', () => {
    const env = createEnv(0.9, '2025-07-04T12:00:00'); // summer noon
    const output = fishingGame('doughnut', env);
    // Doughnut modifier is 0.2, so effective chance = 1.1 clamped to 1 → legendary fish.
    expect(output).toMatch(/tempting doughnut/i);
    expect(output).toMatch(/legendary golden fish leaps forth/i);
    expect(output).toMatch(/warm, shimmering waves under a vibrant sun/i);
  });

  test('uses night mood for early morning hours', () => {
    const env = createEnv(0.5, '2025-06-10T03:00:00'); // summer night
    const output = fishingGame('worm', env);
    expect(output).toMatch(/beneath a silent, starry sky/i);
  });

  test('recognizes insect bait and applies its modifier', () => {
    const env = createEnv(0.1, '2025-05-02T09:00:00');
    const output = fishingGame('insect', env);
    expect(output).toMatch(/lively insect/i);
    // baseChance 0.1 with modifier 0.05 keeps chance below 0.3
    expect(output).toMatch(/water stays silent/i);
  });
  test('recognizes grub bait and mentions its description', () => {
    const env = createEnv(0.4, '2025-07-15T10:00:00');
    const output = fishingGame('grub', env);
    expect(output).toMatch(/succulent grub/i);
  });

  test('recognizes sausage bait and applies its modifier', () => {
    const env = createEnv(0.5, '2025-06-10T14:00:00');
    const output = fishingGame('sausage', env);
    expect(output).toMatch(/savory sausage/i);
    expect(output).toMatch(/glimmering trout appears/i);
    expect(output).toMatch(/warm, shimmering waves under a vibrant sun/i);
  });

  test('recognizes maggot bait and applies its negative modifier', () => {
    const env = createEnv(0.3, '2025-07-01T08:00:00');
    const output = fishingGame('maggot', env);
    expect(output).toMatch(/squirming maggot/i);
    // Base chance 0.3 with modifier -0.1 results in 0.2 < 0.3
    expect(output).toMatch(/water stays silent/i);
  });

  test('recognizes shiny bait and applies its modifier', () => {
    const env = createEnv(0.7, '2025-07-04T12:00:00');
    const output = fishingGame('shiny bait', env);
    expect(output).toMatch(/glittering lure/i);
    expect(output).toMatch(/legendary golden fish leaps forth/i);
  });
});

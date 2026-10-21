import { getThreefoldHarborMemorial } from '../../../../src/core/browser/game/threefold/campaign.js';

describe('THREEFOLD campaign continuity', () => {
  test.each([
    [
      'evacuated',
      'Both passenger groups reached shore before the ferry went down.',
    ],
    [
      'partial',
      'One passenger group reached shore; the other was lost with the ferry.',
    ],
    ['lost', 'Both passenger groups were lost with the ferry.'],
  ])(
    'records the %s passenger outcome without inventing names',
    (passengers, detail) => {
      expect(
        getThreefoldHarborMemorial({
          scene: { id: 'broken-gate' },
          episode: { ferry: 'lost', passengers },
        })
      ).toEqual({
        title: 'Harrowfen ferry memorial',
        text: `The Belltops harbor bell marks the Harrowfen ferry, lost in the Broken Gate surge. ${detail} No passenger names are listed.`,
      });
    }
  );

  test.each([
    [null, null],
    [undefined, null],
    [
      {
        scene: { id: 'belltops' },
        episode: { ferry: 'lost', passengers: 'lost' },
      },
      null,
    ],
    [
      {
        scene: { id: 'broken-gate' },
        episode: { ferry: 'afloat', passengers: 'aboard' },
      },
      null,
    ],
    [
      {
        scene: { id: 'broken-gate' },
        episode: { ferry: 'lost', passengers: 'aboard' },
      },
      null,
    ],
  ])('omits the memorial for ineligible source %p', (source, expected) => {
    expect(getThreefoldHarborMemorial(source)).toBe(expected);
  });
});

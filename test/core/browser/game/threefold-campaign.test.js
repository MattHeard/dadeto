import { getThreefoldHarborCampaignContent } from '../../../../src/core/browser/game/threefold/campaign.js';

describe('THREEFOLD campaign continuity', () => {
  test.each([
    [
      'evacuated',
      'Both passenger groups reached shore before the ferry went down.',
      'Orla notes that both passenger groups reached shore before the ferry sank. The loss of the vessel still weighs on her watch, but she trusts Mara to give a full account of the rescue.',
    ],
    [
      'partial',
      'One passenger group reached shore; the other was lost with the ferry.',
      "Orla credits Mara with getting one passenger group ashore, but keeps her trust provisional until the other group's loss is accounted for.",
    ],
    [
      'lost',
      'Both passenger groups were lost with the ferry.',
      "Orla's trust in Mara's harbor judgment is shaken after both passenger groups were lost with the ferry. She asks for a full account; the record does not establish which warnings reached the ferry.",
    ],
  ])(
    'records the %s passenger outcome in both harbor records',
    (passengers, memorial, response) => {
      expect(
        getThreefoldHarborCampaignContent({
          scene: { id: 'broken-gate' },
          episode: { ferry: 'lost', passengers },
        })
      ).toEqual({
        harborMemorial: {
          title: 'Harrowfen ferry memorial',
          text: `The Belltops harbor bell marks the Harrowfen ferry, lost in the Broken Gate surge. ${memorial} No passenger names are listed.`,
        },
        orlaHarborResponse: {
          title: "Orla's harbor response",
          text: response,
        },
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
  ])(
    'omits harbor campaign content for ineligible source %p',
    (source, expected) => {
      expect(getThreefoldHarborCampaignContent(source)).toBe(expected);
    }
  );
});

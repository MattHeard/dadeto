import {
  getThreefoldCampaignPressureState,
  getThreefoldCampaignPlaces,
  getThreefoldHarborCampaignContent,
} from '../../../../src/core/browser/game/threefold/campaign.js';
import { createThreefoldSiltMarginWaterPuzzle } from '../../../../src/core/browser/game/threefold/silt-margin-water.js';
import { createThreefoldHearthgapsScene } from '../../../../src/core/browser/game/threefold/hearthgaps.js';
import { createThreefoldBelltopsScene } from '../../../../src/core/browser/game/threefold/belltops.js';
import { createThreefoldRuntime } from '../../../../src/core/browser/game/threefold/runtime.js';
import { createThreefoldSimulation } from '../../../../src/core/browser/game/threefold/simulation.js';
import { createThreefoldSimulationSaveStore } from '../../../../src/core/browser/game/threefold/save.js';

describe('THREEFOLD campaign continuity', () => {
  test('publishes saved regional pressure outcomes in any active route', () => {
    const values = new Map();
    const storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    };
    const thresholds = {
      urgentAtMinutes: 4,
      surgeAtMinutes: 9,
      aftermathAtMinutes: 15,
    };
    const hearthgaps = createThreefoldSimulation(
      thresholds,
      createThreefoldHearthgapsScene()
    );
    hearthgaps.hearthgaps = {
      runoffChoice: 'shared-bypass',
      floodedHomeIds: ['hearthgaps-brin-homes'],
    };
    expect(
      createThreefoldSimulationSaveStore(storage, 'hearthgaps').save(hearthgaps)
    ).toBe(true);

    const runtime = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    const pressure = runtime.getSnapshot().campaign.pressure;
    expect(pressure).toContainEqual({
      id: 'hearthgaps-runoff',
      label: 'Hearthgaps runoff',
      state: 'shared-bypass',
      detail: 'hearthgaps-brin-homes',
    });
    expect(runtime.frame().threefold.campaignPressure).toEqual(pressure);

    runtime.resetSave();
    expect(runtime.getSnapshot().campaign.pressure).toContainEqual(
      expect.objectContaining({ id: 'hearthgaps-runoff' })
    );
  });

  test('combines saved Quay, Hearthgaps, and Silt pressure outcomes', () => {
    expect(
      getThreefoldCampaignPressureState({
        belltops: {
          scene: { id: 'belltops' },
          player: { destroyedGeometryIds: ['belltops-pressure-regulator'] },
        },
        hearthgaps: {
          scene: { id: 'hearthgaps' },
          hearthgaps: { runoffChoice: 'shared-bypass' },
        },
        'silt-margin': {
          scene: { id: 'silt-margin' },
          siltMargin: {
            guardian: 'guided-aside',
            signal: 'sent',
            quietingEvidenceHeard: false,
            waterPuzzle: createThreefoldSiltMarginWaterPuzzle({
              crossingOpen: true,
            }),
          },
        },
      })
    ).toEqual([
      {
        id: 'belltops-quay',
        label: 'Quay pressure regulator',
        state: 'damaged',
      },
      {
        id: 'hearthgaps-runoff',
        label: 'Hearthgaps runoff',
        state: 'shared-bypass',
        detail: 'hearthgaps-brin-homes',
      },
      {
        id: 'silt-margin-choir',
        label: 'Silt Margin crossing and Choir signal',
        state: 'sent',
        detail: 'crossing-open',
      },
    ]);
  });

  test('omits undecided, invalid, and mismatched region records', () => {
    expect(
      getThreefoldCampaignPressureState({
        belltops: {
          scene: { id: 'belltops' },
          player: {},
        },
        hearthgaps: {
          scene: { id: 'hearthgaps' },
          hearthgaps: { runoffChoice: 'undecided' },
        },
        'silt-margin': {
          scene: { id: 'silt-margin' },
          siltMargin: { guardian: 'present', signal: 'sent' },
        },
        grainlands: {
          scene: { id: 'grainlands' },
          grainlands: { spiderFate: 'present', bridgeOutcome: 'intact' },
        },
        weftways: {
          scene: { id: 'hearthgaps' },
          hearthgaps: { runoffChoice: 'shared-bypass' },
        },
      })
    ).toEqual([
      {
        id: 'belltops-quay',
        label: 'Quay pressure regulator',
        state: 'intact',
      },
    ]);
    expect(getThreefoldCampaignPressureState(null)).toEqual([]);
    expect(
      getThreefoldCampaignPressureState({
        belltops: {
          scene: { id: 'belltops' },
          player: { destroyedGeometryIds: [] },
        },
      })
    ).toEqual([
      {
        id: 'belltops-quay',
        label: 'Quay pressure regulator',
        state: 'intact',
      },
    ]);
    expect(
      getThreefoldCampaignPressureState({
        hearthgaps: {
          scene: { id: 'hearthgaps' },
          hearthgaps: { runoffChoice: 'not-a-choice' },
        },
      })
    ).toEqual([]);
  });

  test('derives the Hearthgaps flood footprint and closed Choir crossing', () => {
    expect(
      getThreefoldCampaignPressureState({
        hearthgaps: {
          scene: { id: 'hearthgaps' },
          hearthgaps: { runoffChoice: 'brin-diversion' },
        },
        'silt-margin': {
          scene: { id: 'silt-margin' },
          siltMargin: {
            guardian: 'present',
            signal: 'blocked',
            waterPuzzle: createThreefoldSiltMarginWaterPuzzle(),
          },
        },
      })
    ).toEqual([
      {
        id: 'hearthgaps-runoff',
        label: 'Hearthgaps runoff',
        state: 'brin-diversion',
        detail: 'hearthgaps-downstream-homes',
      },
      {
        id: 'silt-margin-choir',
        label: 'Silt Margin crossing and Choir signal',
        state: 'blocked',
        detail: 'crossing-flooded',
      },
    ]);
  });

  test('indexes the active and valid saved regions in authored order', () => {
    expect(
      getThreefoldCampaignPlaces(
        {
          'silt-margin': { scene: { id: 'silt-margin' } },
          weftways: { scene: { id: 'grainlands' } },
          belltops: null,
        },
        'belltops'
      )
    ).toEqual([
      { id: 'silt-margin', label: 'Silt Margin', active: false },
      { id: 'belltops', label: 'Belltops', active: true },
    ]);
  });

  test('does not infer visits from unknown or mismatched scene records', () => {
    expect(
      getThreefoldCampaignPlaces(
        {
          weftways: { scene: { id: 'grainlands' } },
          custom: { scene: { id: 'custom' } },
        },
        'unlisted'
      )
    ).toEqual([]);
  });

  test.each([
    [
      'evacuated',
      'Both passenger groups reached shore before the ferry went down.',
      'Orla notes that both passenger groups reached shore before the ferry sank. The loss of the vessel still weighs on her watch, but she trusts Mara to give a full account of the rescue.',
      "The ferry engineer reached shore with the first passenger group and is available to advise Orla's harbor crew.",
    ],
    [
      'partial',
      'One passenger group reached shore; the other was lost with the ferry.',
      "Orla credits Mara with getting one passenger group ashore, but keeps her trust provisional until the other group's loss is accounted for.",
      "The ferry engineer reached shore with the first passenger group and is available to advise Orla's harbor crew. The second passenger group was lost.",
    ],
    [
      'lost',
      'Both passenger groups were lost with the ferry.',
      "Orla's trust in Mara's harbor judgment is shaken after both passenger groups were lost with the ferry. She asks for a full account; the record does not establish which warnings reached the ferry.",
      'The ferry engineer remained aboard when the ferry went down; no ferry engineer is available to advise the harbor crew.',
    ],
  ])(
    'records the %s passenger outcome in all harbor records',
    (passengers, memorial, response, engineer) => {
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
        harborEngineerAvailability: {
          title: 'Harbor engineering support',
          text: engineer,
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

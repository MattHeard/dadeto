import {
  COMMONS_CONTENT,
  validCommonsContent,
} from '../../../../src/core/browser/game/the-commons-of-tomorrow/content.js';

describe('The Commons of Tomorrow authored chapter', () => {
  test('contains two connected districts and residents with explicit terminal values', () => {
    expect(validCommonsContent()).toBe(true);
    expect(Object.keys(COMMONS_CONTENT.maps)).toEqual(['commons', 'weir']);
    expect(COMMONS_CONTENT.npcs).toHaveLength(4);
    expect(COMMONS_CONTENT.npcs.every(npc => npc.reason.length > 0)).toBe(true);
    expect(new Set(COMMONS_CONTENT.npcs.map(npc => npc.values[0])).size).toBe(
      4
    );
  });

  test('offers two immediate agreements and an evidence-gated seasonal pact', () => {
    const [riverRoom, crossing, pact] = COMMONS_CONTENT.quest.choices;
    expect(riverRoom.effects).toMatchObject({
      marshRestored: true,
      bridgeOpen: false,
    });
    expect(crossing.effects).toMatchObject({
      marshRestored: false,
      bridgeOpen: true,
    });
    expect(pact.requires).toContain('gauge-reading');
    expect(pact.effects).toMatchObject({
      seasonalClosure: true,
      bridgeOpen: true,
    });
  });

  test('provides authored horizontal practices and concrete charter clauses', () => {
    expect(COMMONS_CONTENT.practices.map(practice => practice.id)).toEqual([
      'habitat-listening',
      'open-circle',
      'living-repair',
    ]);
    expect(COMMONS_CONTENT.charter.clauses).toHaveLength(3);
  });

  test('rejects content that collapses the evidence-gated route', () => {
    const invalid = {
      ...COMMONS_CONTENT,
      quest: {
        ...COMMONS_CONTENT.quest,
        choices: COMMONS_CONTENT.quest.choices.slice(0, 2),
      },
    };
    expect(validCommonsContent(invalid)).toBe(false);
    expect(validCommonsContent({ ...COMMONS_CONTENT, npcs: [] })).toBe(false);
    expect(validCommonsContent({ ...COMMONS_CONTENT, maps: null })).toBe(false);
    expect(validCommonsContent({ ...COMMONS_CONTENT, quest: null })).toBe(
      false
    );
    expect(
      validCommonsContent({
        ...COMMONS_CONTENT,
        quest: { ...COMMONS_CONTENT.quest, evidence: [] },
      })
    ).toBe(false);
    expect(
      validCommonsContent({
        ...COMMONS_CONTENT,
        quest: {
          ...COMMONS_CONTENT.quest,
          choices: COMMONS_CONTENT.quest.choices.map(choice => ({
            ...choice,
            id: 'same',
          })),
        },
      })
    ).toBe(false);
    expect(
      validCommonsContent({
        ...COMMONS_CONTENT,
        npcs: COMMONS_CONTENT.npcs.map((npc, index) =>
          index ? npc : { ...npc, reason: '' }
        ),
      })
    ).toBe(false);
    expect(
      validCommonsContent({
        ...COMMONS_CONTENT,
        charter: { clauses: [] },
      })
    ).toBe(false);
  });
});

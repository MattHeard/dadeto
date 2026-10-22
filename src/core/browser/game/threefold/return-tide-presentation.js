import { previewThreefoldGrowthEffects } from './simulation.js';
import {
  getThreefoldReturnTidePhase,
  getThreefoldReturnTideObligations,
} from './return-tide.js';
import {
  RETURN_TIDE_PEOPLE,
  RETURN_TIDE_DEVICES,
} from './return-tide-world.js';
import { getThreefoldReturnTideInteraction } from './return-tide-interactions.js';

/** @type {Record<string,string>} */
const LOSS_TEXT = {
  'quay-low-district': 'Low Quay homes flooded; residents need new shelter.',
  'quay-hospital':
    'The hospital approach is lost; surviving crews must move care uphill.',
  'quay-pumps':
    'City pumps are ruined; recovery needs manual drainage and replacement machinery.',
  'choir-branches':
    'The Final Seal severed irreplaceable Choir branches. Reopening cannot revive them.',
  'root-crossings':
    'Deep-root crossings are lost; the caravans need alternate paths.',
  'hearthgaps-homes':
    'The sacrifice channel flooded Latchfolk homes. The manual agreement did not spare their buildings.',
  'nursery-chambers':
    'Nursery chambers flooded; surviving Clades must relocate their remaining young.',
  'living-breakwater':
    'The living breakwater died back after the deep channels were cut.',
};
/** @type {Record<string,string[]>} */
const SITE_LOSSES = {
  belltops: ['quay-low-district', 'quay-hospital', 'quay-pumps'],
  'lantern-ward': ['quay-low-district'],
  hearthgaps: ['hearthgaps-homes'],
  weftways: ['root-crossings'],
  grainlands: ['nursery-chambers'],
  'silt-margin': ['choir-branches', 'root-crossings'],
  'crownback-reach': ['living-breakwater'],
  'wakeform-shoals': ['living-breakwater'],
};

/**
 * Publish only surveyed aftermath, with explicit costs and nearby physical choices.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Active region.
 * @param {import('./return-tide.js').ThreefoldReturnTide} tide Actual macro timeline.
 * @param {import('./return-tide.js').ReturnTideFacts} facts Available preparations.
 * @param {string} [notice] Result of the most recent deliberate interaction.
 * @returns {{phase:string,title:string,text:string,hud:string,notice:string,epilogue:string[],finished:boolean,interaction:ReturnType<typeof getThreefoldReturnTideInteraction>}} Player-facing context.
 */
export function presentThreefoldReturnTide(state, tide, facts, notice = '') {
  const phase = getThreefoldReturnTidePhase(tide);
  const interaction = getThreefoldReturnTideInteraction(state, tide, facts);
  const until = Math.max(0, 1800 - tide.elapsedGameSeconds);
  const text =
    phase === 'warning'
      ? `Return Tide rises in ${Math.ceil(until / 60)} game minutes, peaks at minute 60 and recedes at minute 90 of this tide horizon. Independent seal, spillway and manifold controls can combine. Waiting or refusing still changes the world.`
      : `Return Tide ${phase}. ${tide.regulatorFailed ? 'The incomplete or damaged distributed regulator failed. ' : 'Historical damage and deaths remain. '}${phase === 'aftermath' ? 'The story can conclude without victory or intervention. E surveys local high-water records; other places remain unsurveyed.' : 'Surviving preparation changes casualties, not past material losses.'}`;
  return {
    phase,
    title: 'The Return Tide',
    notice,
    text: `${interaction ? `${text} ${interaction.detail}` : text}${notice ? ` ${notice}` : ''}`,
    hud: interaction?.label || `RETURN TIDE · ${phase.toUpperCase()}`,
    epilogue: observedEpilogue(tide, facts),
    finished: phase === 'aftermath',
    interaction,
  };
}

/**
 * Revisit only the places whose high-water records Mara actually surveyed.
 * @param {import('./return-tide.js').ThreefoldReturnTide} tide Actual and observed history.
 * @param {import('./return-tide.js').ReturnTideFacts} facts Known public campaign facts.
 * @returns {string[]} Authored consequences and surviving obligations without grading.
 */
function observedEpilogue(tide, facts) {
  const rows = [];
  for (const sceneId of tide.observedSceneIds) {
    rows.push(`${sceneId}: the high-water survey is recorded.`);
    if (sceneId === 'belltops')
      rows.push(...civicReckoning(facts.civicAccount));
    for (const loss of SITE_LOSSES[sceneId] || [])
      if (tide.damageIds.includes(loss)) rows.push(LOSS_TEXT[loss]);
    for (const person of RETURN_TIDE_PEOPLE.filter(
      candidate => candidate.sceneId === sceneId
    )) {
      if (tide.rememberedGrowthDeaths.includes(person.key))
        rows.push(
          `${person.key}: the earlier growth death remains; the tide did not restore this person.`
        );
      else if (tide.deathIds.includes(person.key))
        rows.push(
          `${person.key}: died in the Return Tide; no later repair restores this person.`
        );
      else if (tide.displacedGroups.includes(person.faction || 'assembly'))
        rows.push(
          `${person.key}: survived and writes from an upland refuge; their old home or post remains lost.`
        );
      else
        rows.push(
          `${person.key}: survived here. Prior choices and debts remain.`
        );
    }
  }
  if (tide.observedSceneIds.length)
    rows.push(...getThreefoldReturnTideObligations(tide));
  if (tide.controls.foldglassBound && tide.observedSceneIds.length)
    rows.push(
      'The distributed response still sacrificed homes and Foldglass freedom; this is no cost-free ending.'
    );
  return [...new Set(rows)];
}

/**
 * Connect public accountability to the actual report and ferry outcomes.
 * @param {import('./return-tide.js').ReturnTideFacts['civicAccount']} account Saved civic record.
 * @returns {string[]} Concrete public account without inferring private knowledge.
 */
function civicReckoning(account) {
  if (!account) return [];
  const rows = [];
  if (account.reportFiled) {
    rows.push(
      account.iriConfessionDisclosed
        ? 'Civic reckoning: Iri’s confession is public; the Assembly calls for the missing relay warnings to be traced before responsibility is assigned.'
        : 'Civic reckoning: Iri’s pressure-regulator log is public, but the confession about thinning relay warnings was not filed; responsibility remains contested.'
    );
  } else {
    rows.push(
      'Civic reckoning: Mara filed no signal-station report, so the Assembly has no public account from her of Iri’s pressure-regulator decisions.'
    );
  }
  const passengerOutcomes = {
    evacuated:
      'Both ferry passenger groups reached shore before the surge; harbor crews can draw on their surviving engineers.',
    partial:
      account.ferryOutcome === 'lost'
        ? 'One ferry passenger group reached shore; the other was lost with the wreck, leaving fewer harbor engineers for recovery.'
        : 'One ferry passenger group reached shore; the other remained aboard the surviving ferry, leaving harbor crews short-handed.',
    lost: 'Neither ferry passenger group reached shore before the ferry was lost.',
    aboard:
      account.ferryOutcome === 'lost'
        ? 'Neither ferry passenger group was evacuated before the ferry was lost.'
        : 'Neither ferry passenger group was evacuated before the crisis ended; they remain aboard the surviving ferry.',
  };
  const passengerAccount = account.passengerOutcome
    ? passengerOutcomes[account.passengerOutcome]
    : undefined;
  if (passengerAccount) rows.push(`Harbor reckoning: ${passengerAccount}`);
  return rows;
}

/**
 * Add fixed-grid physical markers and a two-line handheld prompt to the shared frame.
 * @param {Record<string, any>} frame Existing 160 by 144 Mosslight payload.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Active region.
 * @param {ReturnType<typeof presentThreefoldReturnTide>} content Visible tide context.
 * @returns {Record<string, any>} Same renderer contract with readable controls.
 */
export function renderThreefoldReturnTide(frame, state, content) {
  const small = [
    'hearthgaps',
    'silt-margin',
    'grainlands',
    'weftways',
  ].includes(state.scene.id);
  const shapes = small ? physicalMarkers(state) : [];
  const warned = small
    ? previewThreefoldGrowthEffects(state).creatureIds.filter(id =>
        RETURN_TIDE_PEOPLE.some(person => person.id === id)
      )
    : [];
  if (content.interaction || content.phase !== 'warning' || warned.length) {
    const warning = warned.length
      ? `A GROWS THROUGH ${warned.map(id => RETURN_TIDE_PEOPLE.find(person => person.id === id)?.key.toUpperCase()).join('/')}`
      : '';
    const words = (
      warning ||
      content.notice ||
      content.interaction?.label ||
      frame.toast ||
      content.hud
    ).split(' ');
    const lines = [''];
    for (const word of words) {
      const last = lines.length - 1;
      if (`${lines[last]}${word}`.length > 27) lines.push(`${word} `);
      else lines[last] += `${word} `;
    }
    shapes.push({
      type: 'rect',
      x: 0,
      y: 112,
      width: 160,
      height: 32,
      fill: '#182f36',
    });
    lines.slice(0, 2).forEach((line, index) =>
      shapes.push({
        type: 'text',
        x: 8,
        y: 120 + index * 16,
        text: line.trim(),
        font: '8px monospace',
        fill: '#e9d88d',
      })
    );
  }
  return {
    ...frame,
    toast: content.notice
      ? `${content.notice} ${frame.toast || ''}`.trim()
      : frame.toast,
    shapes: [...frame.shapes, ...shapes],
    threefold: { ...frame.threefold, returnTide: content },
  };
}

/**
 * Draw new people and hardware at their continuous-world positions on small-world maps.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Active scene.
 * @returns {any[]} Quantized markers; simulation positions remain unchanged.
 */
function physicalMarkers(state) {
  const width = state.scene.bounds.max.x - state.scene.bounds.min.x;
  const height = state.scene.bounds.max.y - state.scene.bounds.min.y;
  const threatened = new Set(previewThreefoldGrowthEffects(state).creatureIds);
  const deaths = new Set(
    (state.encounter.growthDeaths || []).map(death => death.creatureId)
  );
  const people = RETURN_TIDE_PEOPLE.filter(
    person => person.sceneId === state.scene.id
  ).flatMap(person => {
    const actor = /** @type {{position?:{x:number,y:number}}|undefined} */ (
      state.scene.creatures.find(creature => creature.id === person.id)
    );
    return actor?.position && !deaths.has(person.id)
      ? [{ id: person.id, position: actor.position, actor: true }]
      : [];
  });
  const devices = RETURN_TIDE_DEVICES.filter(
    device =>
      device.sceneId === state.scene.id &&
      !state.player.destroyedGeometryIds.includes(device.id)
  ).map(device => ({
    id: device.id,
    position: { x: device.x, y: device.y },
    actor: false,
  }));
  return [...people, ...devices].map(item => ({
    type: 'rect',
    x:
      Math.round(
        (8 + ((item.position.x - state.scene.bounds.min.x) / width) * 144) / 8
      ) * 8,
    y:
      Math.round(
        (28 + ((state.scene.bounds.max.y - item.position.y) / height) * 72) / 8
      ) * 8,
    width: 8,
    height: 8,
    fill: threatened.has(item.id)
      ? '#d65d54'
      : item.actor
        ? '#d28b69'
        : '#bfd77c',
    ...(threatened.has(item.id) ? { growthPreview: true } : {}),
    ...(item.actor ? { actorId: item.id } : { geometryId: item.id }),
  }));
}

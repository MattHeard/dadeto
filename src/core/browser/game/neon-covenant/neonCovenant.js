import { createMosslightRuntime } from '../mosslight-valley/runtime.js';
import { createSaveAdapter } from '../mosslight-valley/save.js';
import { mosslightValley } from '../mosslight-valley/mosslightValley.js';
import { startMosslightPage } from '../mosslight-valley/pagePresenter.js';
import { registerMosslightTools } from '../mosslight-valley/webmcp.js';
import { LAB_CONTENT } from './content.js';
import { migratePersonnel, validPersonnel } from './personnel.js';
import { validIncidentChains } from './incidents.js';
import {
  createNeonState,
  stepNeon,
  labJournal,
  renderNeon,
} from './simulation.js';

/**
 * Reject incompatible or corrupt lab ledgers before the shared runtime sees them.
 * @param {Record<string, any>} state Imported campaign.
 * @returns {boolean} Whether the campaign meets the lab save contract.
 */
export function validLabSave(state) {
  const lab = state.lab;
  return Boolean(
    lab &&
      validPersonnel(lab) &&
      lab.rulesVersion === 2 &&
      validIncidentChains(lab) &&
      Object.values(lab.incidentChains).every(
        chain => chain.warnedAt <= state.world.day
      ) &&
      (lab.firstShiftGuide === undefined ||
        (Number.isInteger(lab.firstShiftGuide) &&
          lab.firstShiftGuide >= 0 &&
          lab.firstShiftGuide <= 4)) &&
      LAB_CONTENT.maps[state.world.mapId] &&
      Array.isArray(state.world.npcs) &&
      Array.isArray(state.lastActions) &&
      state.world.flags &&
      !state.world.flags.ending &&
      state.world.relationships &&
      Number.isFinite(state.world.player.x) &&
      Number.isFinite(state.world.player.y) &&
      Number.isInteger(state.world.day) &&
      state.world.day > 0 &&
      state.world.player.x >= 0 &&
      state.world.player.x < LAB_CONTENT.maps[state.world.mapId].width &&
      state.world.player.y >= 0 &&
      state.world.player.y < LAB_CONTENT.maps[state.world.mapId].height &&
      ['up', 'down', 'left', 'right'].includes(state.world.player.facing) &&
      [
        'cash',
        'debt',
        'compute',
        'cooling',
        'racks',
        'morale',
        'trust',
        'scrutiny',
        'risk',
        'decisions',
        'hired',
        'incidents',
      ].every(key => Number.isFinite(lab[key])) &&
      lab.decisions >= 0 &&
      lab.decisions <= 6 &&
      ['balanced', 'careful', 'sprint'].includes(lab.policy) &&
      ['licensed', 'scraped'].includes(lab.data) &&
      Object.hasOwn(LAB_CONTENT.projects, lab.focus) &&
      ['research', 'safety', 'service'].every(
        role => Number.isInteger(lab.teams?.[role]) && lab.teams[role] >= 0
      ) &&
      ['research', 'evaluated'].every(field =>
        Object.keys(LAB_CONTENT.projects).every(id =>
          Number.isFinite(lab[field]?.[id])
        )
      ) &&
      [
        'deployed',
        'contracts',
        'fulfilled',
        'expired',
        'promises',
        'report',
        'history',
      ].every(key => Array.isArray(lab[key])) &&
      lab.deployed.every((/** @type {string} */ id) =>
        Object.hasOwn(LAB_CONTENT.projects, id)
      ) &&
      lab.contracts.every((/** @type {string} */ id) =>
        Object.hasOwn(LAB_CONTENT.contracts, id)
      ) &&
      (!state.dialogue ||
        (Array.isArray(state.dialogue.lines) &&
          Array.isArray(state.dialogue.choices) &&
          state.dialogue.lines.every(
            (/** @type {Record<string, any>} */ line) =>
              typeof line?.text === 'string'
          ) &&
          state.dialogue.choices.every(
            (/** @type {Record<string, any>} */ choice) =>
              typeof choice?.label === 'string' &&
              (!choice.command ||
                choice.command === 'page:orientation' ||
                LAB_CONTENT.npcs.some(
                  (/** @type {Record<string, any>} */ actor) =>
                    choice.command === `promise:${actor.id}`
                ))
          ))) &&
      (!state.menu ||
        (typeof state.menu.page === 'string' &&
          Number.isInteger(state.menu.selected) &&
          state.menu.selected >= 0))
  );
}

/**
 * Compose lab rules with the same fixed-step engine and independent save slots.
 * @param {Record<string, any> | Map<string, any>} options Browser adapters or toy environment.
 * @returns {Record<string, any>} Shared runtime interface.
 */
export function createNeonRuntime(options = {}) {
  const opts = options instanceof Map ? { env: options } : options;
  const save = createSaveAdapter(opts.env, {
    key: 'neon-covenant-saves-v2',
    game: 'neon-covenant',
    validate: validLabSave,
    migrate: migratePersonnel,
    restore: restoreLabState,
  });
  return /** @type {Record<string, any>} */ (
    createMosslightRuntime({
      ...opts,
      content: LAB_CONTENT,
      systems: { create: createNeonState, step: stepNeon, journal: labJournal },
      save,
      renderer: renderNeon,
    })
  );
}

/**
 * Rebind authored room geometry and cast when importing portable state.
 * @param {Record<string, any>} state Validated saved campaign.
 * @returns {Record<string, any>} State with trusted content references.
 */
function restoreLabState(state) {
  const world = {
    ...state.world,
    map: LAB_CONTENT.maps[state.world.mapId],
    npcs: LAB_CONTENT.npcs,
    player: {
      ...LAB_CONTENT.start,
      x: state.world.player.x,
      y: state.world.player.y,
      facing: state.world.player.facing,
    },
  };
  return { ...state, world };
}

/**
 * Run the synchronous blog toy through the existing handheld input adapter.
 * @param {string} input Serialized buttons or keyboard event.
 * @param {Map<string, any>} env Dadeto persistence adapters.
 * @returns {string} Serialized shared canvas frame.
 */
export function neonCovenant(input, env) {
  return mosslightValley(input, env, createNeonRuntime);
}

/**
 * Mount the same mobile presenter with the lab runtime and named agent tools.
 * @param {Record<string, any>} options Browser lifecycle dependencies.
 * @returns {Function} Presenter disposer.
 */
export function startNeonPage(options) {
  return startMosslightPage({
    ...options,
    createRuntime: createNeonRuntime,
    saveFilename: 'neon-covenant-save.json',
    registerTools: (
      /** @type {Parameters<typeof registerMosslightTools>[0]} */ adapters
    ) =>
      registerMosslightTools({
        ...adapters,
        profile: { prefix: 'neon', title: 'Neon Covenant' },
      }),
  });
}

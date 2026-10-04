import { createMosslightRuntime } from '../mosslight-valley/runtime.js';
import { createSaveAdapter } from '../mosslight-valley/save.js';
import { mosslightValley } from '../mosslight-valley/mosslightValley.js';
import { startMosslightPage } from '../mosslight-valley/pagePresenter.js';
import { registerMosslightTools } from '../mosslight-valley/webmcp.js';
import { LAB_CONTENT } from './content.js';
import { migratePersonnel, validPersonnel } from './personnel.js';
import { validIncidentChains } from './incidents.js';
import { migratePrograms, validPrograms, researchOptions } from './research.js';
import { migrateEvaluations, validEvaluations } from './evaluation.js';
import { EVALUATION_CASES } from './evaluationContent.js';
import { migrateDeployments, validDeployments } from './operations.js';
import { DEPLOYMENT_PROFILES } from './operationsContent.js';
import { labReportLines, readableLabPages } from './forecast.js';
import { migrateRelationships, validRelationships } from './relationships.js';
import { RELATIONSHIP_CONTENT } from './relationshipContent.js';
import { neonAudio } from './audio.js';
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
      (state.audioMuted === undefined ||
        typeof state.audioMuted === 'boolean') &&
      validPersonnel(lab) &&
      lab.rulesVersion === 6 &&
      validRelationships(lab, state.world.day) &&
      validPrograms(lab) &&
      validEvaluations(lab) &&
      validDeployments(lab) &&
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
      typeof lab.focus === 'string' &&
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
                validResearchChoice(lab, choice.command) ||
                LAB_CONTENT.npcs.some(
                  (/** @type {Record<string, any>} */ actor) =>
                    choice.command === `promise:${actor.id}`
                ))
          ))) &&
      (!state.menu ||
        (typeof state.menu.page === 'string' &&
          (!state.menu.page.startsWith('testcase:') ||
            Object.hasOwn(
              EVALUATION_CASES[lab.focus],
              state.menu.page.slice(9)
            )) &&
          Number.isInteger(state.menu.selected) &&
          (!state.menu.page.startsWith('relationship:') ||
            Object.hasOwn(RELATIONSHIP_CONTENT, state.menu.page.slice(13))) &&
          (!state.menu.page.startsWith('deployment:') ||
            Object.hasOwn(DEPLOYMENT_PROFILES, state.menu.page.slice(11))) &&
          state.menu.selected >= 0))
  );
}

/**
 * Accept only authored setting confirmations in a portable dialogue.
 * @param {Record<string, any>} lab Saved research focus.
 * @param {string} command Candidate choice operation.
 * @returns {boolean} Whether the operation uses a bounded program setting.
 */
function validResearchChoice(lab, command) {
  if (typeof command !== 'string' || !command.startsWith('configure:'))
    return false;
  const parts = command.split(':');
  return (
    parts.length === 3 &&
    Object.hasOwn(researchOptions(lab.focus, parts[1]), parts[2])
  );
}

/**
 * Compose lab rules with the same fixed-step engine and independent save slots.
 * @param {Record<string, any> | Map<string, any>} options Browser adapters or toy environment.
 * @returns {Record<string, any>} Shared runtime interface.
 */
export function createNeonRuntime(options = {}) {
  const opts = options instanceof Map ? { env: options } : options;
  const audio = opts.audio || neonAudio();
  const save = createSaveAdapter(opts.env, {
    key: 'neon-covenant-saves-v2',
    game: 'neon-covenant',
    validate: validLabSave,
    migrate: (/** @type {Record<string, any>} */ state) =>
      migrateRelationships(
        migrateDeployments(
          migrateEvaluations(migratePrograms(migratePersonnel(state)))
        )
      ),
    restore: restoreLabState,
  });
  const runtime = /** @type {Record<string, any>} */ (
    createMosslightRuntime({
      ...opts,
      audio,
      content: LAB_CONTENT,
      systems: {
        create: createNeonState,
        step: (
          /** @type {Record<string, any>} */ state,
          /** @type {string[]} */ actions
        ) => {
          const next = stepNeon(state, actions);
          audio.observe?.(state, next);
          return next;
        },
        journal: labJournal,
      },
      save,
      renderer: renderNeon,
    })
  );
  audio.observe?.(runtime.getSnapshot(), runtime.getSnapshot());
  return runtime;
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
  return { ...state, world, dialogue: restoreStaffDialogue(state.dialogue) };
}

/**
 * Repair an already-open older staff conversation without replaying decisions.
 * @param {Record<string, any> | null} dialogue Saved conversation.
 * @returns {Record<string, any> | null} Complete prose and choices in bounded pages.
 */
function restoreStaffDialogue(dialogue) {
  if (
    !dialogue ||
    !LAB_CONTENT.npcs.some(
      (/** @type {Record<string, any>} */ actor) =>
        actor.id === dialogue.actorId
    ) ||
    !dialogue.lines.some(
      (/** @type {Record<string, any>} */ line) =>
        labReportLines([line.text]).length > 4
    )
  )
    return dialogue;
  const index = readableLabPages(
    dialogue.lines.slice(0, dialogue.index),
    4
  ).length;
  const lines = readableLabPages(dialogue.lines, 4);
  return { ...dialogue, lines, index, choices: lines[index].choices || [] };
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
    audio: neonAudio(options.windowObj),
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

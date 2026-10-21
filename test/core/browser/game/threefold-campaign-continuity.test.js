import { jest } from '@jest/globals';
import { createThreefoldRuntime } from '../../../../src/core/browser/game/threefold/runtime.js';
import { createThreefoldBelltopsScene } from '../../../../src/core/browser/game/threefold/belltops.js';
import { createThreefoldGrainlandsScene } from '../../../../src/core/browser/game/threefold/grainlands.js';
import {
  createThreefoldCampaignStorage,
  getThreefoldRegionRecordKey,
  THREEFOLD_CAMPAIGN_RECORD_KEYS,
  THREEFOLD_SHARED_SAVE_KEYS,
} from '../../../../src/core/browser/game/threefold/campaign-storage.js';
import {
  restoreThreefoldCampaignBackup,
  serializeThreefoldCampaignBackup,
} from '../../../../src/core/browser/game/threefold/campaign-backup.js';
import { createThreefoldSimulationSaveStore } from '../../../../src/core/browser/game/threefold/save.js';

/** @returns {any} Instrumented shared browser storage. */
function storageAdapter() {
  const values = new Map();
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: jest.fn((key, value) => values.set(key, value)),
    removeItem: key => values.delete(key),
  };
}

describe('THREEFOLD complete campaign continuity', () => {
  test('commits one whole document per action and keeps alternating stale regions current', () => {
    const storage = storageAdapter();
    const gate = createThreefoldRuntime({ storage });
    const quay = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    storage.setItem.mockClear();
    quay.dispatch('grow');
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const damaged = quay.getSnapshot();
    gate.dispatch({ type: 'wait', elapsedGameMinutes: 15 });
    expect(gate.getSnapshot().campaign.clock.elapsedGameSeconds).toBe(915);
    quay.resume();
    expect(quay.getSnapshot().campaign.clock.elapsedGameSeconds).toBe(915);
    expect(quay.getSnapshot().campaign.iriFate).toEqual(
      damaged.campaign.iriFate
    );
    expect(quay.getSnapshot().campaign.network.nurseryFlooded).toBe(true);
    quay.dispatch('shrink');
    expect(gate.getSnapshot().campaign.clock.elapsedGameSeconds).toBe(930);
    expect(gate.getSnapshot().campaign.network).toEqual(
      quay.getSnapshot().campaign.network
    );
    const total = gate
      .getSnapshot()
      .campaign.network.volumesCubicMeters.reduce(
        (sum, volume) => sum + volume,
        0
      );
    expect(total).toBeCloseTo(0.005, 12);
  });

  test('refreshes another page of the same region before acting instead of rewinding damage', () => {
    const storage = storageAdapter();
    const first = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    const older = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    first.dispatch('grow');
    const destroyed = first.getState().player.destroyedGeometryIds;
    older.dispatch('shrink');
    expect(older.getState().player.destroyedGeometryIds).toEqual(destroyed);
    expect(first.getSnapshot().campaign.clock.elapsedGameSeconds).toBe(30);
  });

  test('roundtrips visited regions, irreversible fate, water and clock into a fresh device', () => {
    const storage = storageAdapter();
    const quay = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    quay.dispatch('grow');
    const nursery = createThreefoldRuntime({
      storage,
      scene: createThreefoldGrainlandsScene(),
    });
    nursery.dispatch({ type: 'wait', elapsedGameMinutes: 15 });
    const backup = nursery.exportCampaign();
    const records = restoreThreefoldCampaignBackup(backup);
    expect(Object.keys(records)).toEqual(THREEFOLD_CAMPAIGN_RECORD_KEYS);
    const destination = storageAdapter();
    const restored = createThreefoldRuntime({
      storage: destination,
      scene: createThreefoldGrainlandsScene(),
    });
    destination.setItem.mockClear();
    restored.importCampaign(backup);
    expect(destination.setItem).toHaveBeenCalledTimes(1);
    expect(restored.exportCampaign()).toBe(backup);
    const reopenedQuay = createThreefoldRuntime({
      storage: destination,
      scene: createThreefoldBelltopsScene(),
    });
    expect(reopenedQuay.getState().player.destroyedGeometryIds).toEqual(
      quay.getState().player.destroyedGeometryIds
    );
    expect(reopenedQuay.getSnapshot().campaign.iriFate.outcome).toBe('dead');
    expect(restored.getSnapshot().campaign.network.volumesCubicMeters).toEqual(
      nursery.getSnapshot().campaign.network.volumesCubicMeters
    );
  });

  test.each([
    'malformed',
    'partial',
    'bad-region',
    'wrong-region',
    'bad-clock',
    'bad-outcomes',
    'bad-pressure',
    'wrong-game',
    'wrong-version',
    'extra',
  ])('rejects %s backup before changing any progress', kind => {
    const storage = storageAdapter();
    const runtime = createThreefoldRuntime({ storage });
    runtime.dispatch('grow');
    const before = runtime.exportCampaign();
    const envelope = JSON.parse(before);
    const key = getThreefoldRegionRecordKey('broken-gate');
    if (kind === 'partial') delete envelope.records[key];
    if (kind === 'bad-region') envelope.records[key] = '{}';
    if (kind === 'wrong-region')
      envelope.records[getThreefoldRegionRecordKey('grainlands')] =
        envelope.records[key];
    if (kind === 'bad-clock')
      envelope.records[THREEFOLD_SHARED_SAVE_KEYS.clock] = '{}';
    if (kind === 'bad-outcomes')
      envelope.records[THREEFOLD_SHARED_SAVE_KEYS.outcomes] = null;
    if (kind === 'bad-pressure')
      envelope.records[THREEFOLD_SHARED_SAVE_KEYS.pressure] = '{}';
    if (kind === 'wrong-game') envelope.game = 'other';
    if (kind === 'wrong-version') envelope.schemaVersion = 99;
    if (kind === 'extra') envelope.records.unknown = null;
    storage.setItem.mockClear();
    expect(() =>
      runtime.importCampaign(
        kind === 'malformed' ? '{' : JSON.stringify(envelope)
      )
    ).toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(runtime.exportCampaign()).toBe(before);
  });

  test('failed strict restore preserves both storage and live progress', () => {
    const storage = storageAdapter();
    const runtime = createThreefoldRuntime({ storage });
    const earlier = runtime.exportCampaign();
    runtime.dispatch('grow');
    const before = runtime.exportCampaign();
    const persisted = [...storage.values];
    storage.setItem.mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => runtime.importCampaign(earlier)).toThrow('could not be saved');
    expect(runtime.exportCampaign()).toBe(before);
    expect([...storage.values]).toEqual(persisted);
  });

  test('keeps failed ordinary progress locally and prevents it overwriting a newer page', () => {
    const storage = storageAdapter();
    const older = createThreefoldRuntime({ storage });
    storage.setItem.mockImplementationOnce(() => {
      throw new Error('quota');
    });
    older.dispatch('grow');
    expect(older.frame().threefold.campaignPersistence.dirty).toBe(true);
    const newer = createThreefoldRuntime({ storage });
    newer.dispatch({ type: 'wait', elapsedGameMinutes: 15 });
    const persisted = [...storage.values];
    older.save();
    expect([...storage.values]).toEqual(persisted);
    expect(older.getSnapshot().campaign.clock.elapsedGameSeconds).toBe(15);
    expect(older.exportCampaign()).toContain('threefold-campaign-backup');
  });

  test('reads legacy records without an eager migration write and rejects nested/failed transactions', () => {
    const storage = storageAdapter();
    const legacy = createThreefoldRuntime().exportSave();
    const key = getThreefoldRegionRecordKey('broken-gate');
    storage.values.set(key, legacy);
    const campaign = createThreefoldCampaignStorage(storage);
    expect(createThreefoldCampaignStorage(campaign)).toBe(campaign);
    expect(campaign.getItem(key)).toBe(legacy);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(() =>
      campaign.transaction(() => campaign.transaction(() => null))
    ).toThrow('already active');
    expect(() =>
      campaign.transaction(() => {
        campaign.setItem(key, null);
        throw new Error('abort');
      })
    ).toThrow('abort');
    expect(campaign.getItem(key)).toBe(legacy);
    expect(() => campaign.setItem('unknown', 'bad')).toThrow('Unknown');
    expect(campaign.transaction(() => null).persisted).toBe(true);
    expect(createThreefoldSimulationSaveStore(campaign).clear()).toBe(true);
    expect(campaign.getItem(key)).toBeNull();
  });

  test('rejects malformed storage documents, invalid maps and unsupported backups', () => {
    for (const raw of [
      '{',
      '{}',
      '[]',
      'null',
      JSON.stringify({
        game: 'threefold-campaign-records',
        schemaVersion: 1,
        revision: -1,
      }),
    ]) {
      const storage = storageAdapter();
      storage.values.set('dadeto.threefold.campaign.v1', raw);
      const campaign = createThreefoldCampaignStorage(storage);
      expect(campaign.getItem('unknown')).toBeNull();
      expect(campaign.getStatus().available).toBe(false);
      expect(campaign.replaceCampaign(campaign.readCampaign().records)).toBe(
        false
      );
      expect(storage.setItem).not.toHaveBeenCalled();
    }
    const campaign = createThreefoldCampaignStorage(null);
    expect(() => campaign.replaceCampaign(null)).toThrow();
    expect(() => campaign.replaceCampaign([])).toThrow();
    expect(() => campaign.replaceCampaign({})).toThrow();
    expect(() => restoreThreefoldCampaignBackup(null)).toThrow();
    expect(() =>
      serializeThreefoldCampaignBackup(campaign.readCampaign().records)
    ).toThrow();
  });
});

test('rejects conflicting regional and full-campaign character outcomes without mutation', () => {
  const dead = createThreefoldRuntime({
    scene: createThreefoldBelltopsScene(),
  });
  dead.dispatch('grow');
  const living = createThreefoldRuntime({
    scene: createThreefoldBelltopsScene(),
  });
  living.recordIriFate('rescued', 'quay-rescue-without-governor');
  const before = living.exportCampaign();
  expect(() => living.importSave(dead.exportSave())).toThrow('conflicts');
  expect(living.exportCampaign()).toBe(before);
  const envelope = JSON.parse(before);
  envelope.records[getThreefoldRegionRecordKey('belltops')] = dead.exportSave();
  expect(() => living.importCampaign(JSON.stringify(envelope))).toThrow(
    'conflict'
  );
  const legacy = createThreefoldRuntime({
    scene: createThreefoldBelltopsScene(),
  });
  legacy.importSave(dead.exportSave());
  expect(legacy.getSnapshot().campaign.iriFate).toBeNull();
  dead.importSave(dead.exportSave());
  expect(dead.getSnapshot().campaign.iriFate.outcome).toBe('dead');
});

test('restores unvisited active regions and refreshes a new legacy revision', () => {
  const storage = storageAdapter();
  const quay = createThreefoldRuntime({
    storage,
    scene: createThreefoldBelltopsScene(),
  });
  const gate = createThreefoldRuntime();
  quay.importCampaign(gate.exportCampaign());
  expect(quay.getState().scene.id).toBe('belltops');
  const campaign = createThreefoldCampaignStorage(storage);
  const records = Object.fromEntries(
    THREEFOLD_CAMPAIGN_RECORD_KEYS.map(key => [key, null])
  );
  expect(campaign.replaceCampaign(records)).toBe(true);
  quay.resume();
  expect(quay.getSnapshot().campaign.clock.elapsedGameSeconds).toBe(0);
  expect(quay.getSnapshot().campaign.iriFate).toBeNull();
});

test('guards reentrant reads during injected saves and rolls back a thrown action', () => {
  let runtime = null;
  let fail = false;
  const save = {
    save: () => {
      runtime?.frame();
      if (fail) throw new Error('adapter failed');
    },
  };
  runtime = createThreefoldRuntime({ save });
  runtime.dispatch('grow');
  const before = runtime.exportCampaign();
  fail = true;
  expect(() => runtime.dispatch('shrink')).toThrow('adapter failed');
  expect(runtime.exportCampaign()).toBe(before);
});

test('rejects invalid record values and overflowing generations, and refuses replacement inside an action', () => {
  const storage = storageAdapter();
  const campaign = createThreefoldCampaignStorage(storage);
  const records = campaign.readCampaign().records;
  records[THREEFOLD_SHARED_SAVE_KEYS.clock] = 4;
  expect(() => campaign.replaceCampaign(records)).toThrow('missing or invalid');
  records[THREEFOLD_SHARED_SAVE_KEYS.clock] = null;
  expect(() =>
    campaign.transaction(() => campaign.replaceCampaign(records))
  ).toThrow('already active');
  storage.values.set('dadeto.threefold.campaign.v1', 5);
  expect(campaign.readCampaign().revision).toBe(0);
  storage.values.set(
    'dadeto.threefold.campaign.v1',
    JSON.stringify({
      game: 'threefold-campaign-records',
      schemaVersion: 1,
      revision: Number.MAX_SAFE_INTEGER,
      records,
    })
  );
  expect(campaign.replaceCampaign(records)).toBe(false);
  expect(storage.setItem).not.toHaveBeenCalled();
});

test('reports failed fate persistence while keeping the local outcome available for backup', () => {
  const storage = storageAdapter();
  const runtime = createThreefoldRuntime({ storage });
  storage.setItem.mockImplementation(() => {
    throw new Error('quota');
  });
  expect(runtime.recordIriFate('trapped', 'quay-inspection')).toBe(false);
  expect(runtime.getSnapshot().campaign.iriFate.outcome).toBe('trapped');
  expect(runtime.getPersistenceStatus().dirty).toBe(true);
});

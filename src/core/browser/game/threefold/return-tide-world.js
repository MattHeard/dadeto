/** @typedef {{id:string,displayName:string,growthRule:'overlap',position:{x:number,y:number},bounds:{min:{x:number,y:number,z:number},max:{x:number,y:number,z:number}}}} ReturnTideResident */

export const RETURN_TIDE_PEOPLE = [
  {
    key: 'sera',
    id: 'belltops-sera',
    sceneId: 'belltops',
    faction: 'assembly',
  },
  { key: 'orla', id: 'belltops-sentry-orla', sceneId: 'belltops' },
  { key: 'mira', id: 'lantern-ward-mira', sceneId: 'lantern-ward' },
  { key: 'tov', id: 'lantern-ward-tov', sceneId: 'lantern-ward' },
  {
    key: 'brin',
    id: 'hearthgaps-brin',
    sceneId: 'hearthgaps',
    faction: 'latchfolk',
  },
  {
    key: 'pell',
    id: 'weftways-pell',
    sceneId: 'weftways',
    faction: 'threadbound',
  },
  {
    key: 'iru',
    id: 'grainlands-iru',
    sceneId: 'grainlands',
    faction: 'nursery',
  },
  {
    key: 'neme',
    id: 'silt-margin-neme',
    sceneId: 'silt-margin',
    faction: 'choir',
  },
  {
    key: 'tharn',
    id: 'crownback-elder-tharn',
    sceneId: 'crownback-reach',
    faction: 'crownback',
  },
];

const NEW_PEOPLE = {
  belltops: [
    resident(
      'belltops-sera',
      'SERA',
      { x: -10, y: 10 },
      { width: 0.4, height: 1.8 }
    ),
  ],
  hearthgaps: [
    resident(
      'hearthgaps-brin',
      'BRIN',
      { x: 0.85, y: 0.35 },
      { width: 0.08, height: 0.45 }
    ),
  ],
  grainlands: [
    resident(
      'grainlands-iru',
      'IRU',
      { x: 0.17, y: 0.2 },
      { width: 0.03, height: 0.05 }
    ),
  ],
  'silt-margin': [
    resident(
      'silt-margin-neme',
      'NEME',
      { x: 0.267, y: 0.12 },
      { width: 0.006, height: 0.015 }
    ),
  ],
};

export const RETURN_TIDE_DEVICES = [
  returnTideDevice('seal', 'belltops', 'ASSEMBLY SEAL', {
    x: -14,
    y: 7,
    size: 2,
    height: 3,
  }),
  returnTideDevice('human-manifold', 'belltops', 'CITY MANIFOLD', {
    x: 12,
    y: 10,
    size: 2,
    height: 3,
  }),
  returnTideDevice('root-manifold', 'silt-margin', 'ROOT MANIFOLD', {
    x: 0.278,
    y: 0.09,
    size: 0.004,
    height: 0.01,
  }),
  returnTideDevice('coast-manifold', 'crownback-reach', 'COAST MANIFOLD', {
    x: -34,
    y: 24,
    size: 4,
    height: 8,
  }),
  returnTideDevice('spillway', 'wakeform-shoals', 'COAST SPILLWAY', {
    x: 38,
    y: 30,
    size: 8,
    height: 24,
  }),
];

/**
 * Define one installed mechanism with its authored physical footprint.
 * @param {string} kind Stable operation type.
 * @param {string} sceneId Owning region.
 * @param {string} label Display name.
 * @param {{x:number,y:number,size:number,height:number}} dimensions Physical footprint.
 * @returns {{id:string,sceneId:string,kind:string,label:string,x:number,y:number,size:number,height:number}} Authored control geometry.
 */
function returnTideDevice(kind, sceneId, label, dimensions) {
  return {
    id: `return-tide-${kind}`,
    sceneId,
    kind,
    label,
    ...dimensions,
  };
}

/**
 * Attach finite physical devices and missing named residents to canonical scenes.
 * @template {{id:string,geometry:any[],creatures:any[],interactables:any[]}} T
 * @param {T} scene Authored regional scene.
 * @returns {T} Same scene contract with new independently copied world objects.
 */
export function attachThreefoldReturnTideScene(scene) {
  const people =
    NEW_PEOPLE[/** @type {keyof typeof NEW_PEOPLE} */ (scene.id)] || [];
  const devices = RETURN_TIDE_DEVICES.filter(
    device => device.sceneId === scene.id
  );
  const geometry = devices.map(device => ({
    id: device.id,
    displayName: device.label,
    bounds: volume(device.x, device.y, device.size, device.height),
  }));
  if (scene.id === 'belltops')
    geometry.push(
      {
        id: 'return-tide-hospital',
        displayName: 'HOSPITAL',
        bounds: volume(18, -12, 3, 6),
      },
      {
        id: 'return-tide-city-pumps',
        displayName: 'CITY PUMPS',
        bounds: volume(-18, -12, 3, 5),
      }
    );
  const controls = devices.map(device => ({
    id: `${device.id}-control`,
    position: { x: device.x + device.size, y: device.y },
    bounds: volume(
      device.x + device.size,
      device.y,
      device.size / 4,
      device.height / 2
    ),
  }));
  const creatureIds = new Set(scene.creatures.map(creature => creature.id));
  const residents = people
    .filter(person => !creatureIds.has(person.id))
    .map(person => ({
      ...person,
      position: { ...person.position },
      bounds: { min: { ...person.bounds.min }, max: { ...person.bounds.max } },
    }));
  const actors = [...scene.creatures, ...residents];
  const accords = RETURN_TIDE_PEOPLE.filter(
    person => person.sceneId === scene.id && person.faction
  ).flatMap(person => {
    const actor = actors.find(candidate => candidate.id === person.id);
    return actor?.position
      ? [
          {
            id: `return-tide-accord-${person.faction}`,
            position: { ...actor.position },
            bounds: actor.bounds,
          },
        ]
      : [];
  });
  if (scene.id === 'belltops')
    controls.push({
      id: 'return-tide-foldglass-control',
      position: { x: -10, y: 14 },
      bounds: volume(-10, 14, 0.5, 1),
    });
  return {
    ...scene,
    geometry: appendUnique(scene.geometry, geometry),
    creatures: actors,
    interactables: appendUnique(scene.interactables, [...controls, ...accords]),
  };
}

/**
 * Map known finale damage to actual regional structures; existing rubble stays lost.
 * @param {string} sceneId Active physical region.
 * @param {string[]} damageIds Permanent macro-tide loss IDs.
 * @returns {string[]} Authored geometry to remove from collision and the display.
 */
export function getThreefoldReturnTideDamage(sceneId, damageIds) {
  /** @type {Record<string, Record<string, string[]>>} */
  const losses = {
    'quay-low-district': {
      'lantern-ward': ['lantern-ward-canal-homes'],
      belltops: ['belltops-watchtower'],
    },
    'quay-hospital': { belltops: ['return-tide-hospital'] },
    'quay-pumps': { belltops: ['return-tide-city-pumps'] },
    'choir-branches': {
      'silt-margin': ['silt-margin-root-arch', 'silt-margin-dew-crossing'],
    },
    'root-crossings': {
      weftways: ['weftways-deep-root-crossing'],
      'silt-margin': ['silt-margin-dew-crossing'],
    },
    'hearthgaps-homes': {
      hearthgaps: ['hearthgaps-brin-homes', 'hearthgaps-downstream-homes'],
    },
    'nursery-chambers': { grainlands: ['grainlands-nursery-clades'] },
    'living-breakwater': { 'crownback-reach': ['crownback-living-root-arch'] },
  };
  return [
    ...new Set(
      damageIds.flatMap(
        id => losses[/** @type {keyof typeof losses} */ (id)]?.[sceneId] || []
      )
    ),
  ].sort();
}

/**
 * @param {string} id Actor identity.
 * @param {string} displayName Screen name.
 * @param {{x:number,y:number}} position World position.
 * @param {{width:number,height:number}} dimensions SI body dimensions.
 * @returns {ReturnTideResident} Living physical actor.
 */
function resident(id, displayName, position, dimensions) {
  return {
    id,
    displayName,
    position,
    growthRule: 'overlap',
    bounds: volume(position.x, position.y, dimensions.width, dimensions.height),
  };
}

/**
 * @param {number} x Centre coordinate.
 * @param {number} y Centre coordinate.
 * @param {number} width Physical width.
 * @param {number} height Physical height.
 * @returns {ReturnTideResident['bounds']} Canonical physical bounds.
 */
function volume(x, y, width, height) {
  return {
    min: { x: x - width / 2, y: y - width / 2, z: 0 },
    max: { x: x + width / 2, y: y + width / 2, z: height },
  };
}

/**
 * @template {{id:string}} T
 * @param {T[]} originals Existing objects.
 * @param {T[]} additions New canonical objects.
 * @returns {T[]} Idempotent object collection.
 */
function appendUnique(originals, additions) {
  const ids = new Set(originals.map(item => item.id));
  return [...originals, ...additions.filter(item => !ids.has(item.id))];
}

/**
 * Require an actually present living speaker; records can outlive their author.
 * @param {{scene:{creatures:Array<{id:string}>},encounter:{growthDeaths?:Array<{creatureId:string}>}}} state Current local actors and observed growth deaths.
 * @param {string} id Named resident.
 * @returns {boolean} Whether a live conversation can occur here.
 */
export function isThreefoldResidentAvailable(state, id) {
  return (
    state.scene.creatures.some(creature => creature.id === id) &&
    !(state.encounter.growthDeaths || []).some(death => death.creatureId === id)
  );
}

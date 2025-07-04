import { DENDRITE_OPTION_KEYS } from '../../constants/dendrite.js';
import { deepClone } from '../../utils/objectUtils.js';

/**
 *
 * @param data
 * @param getUuid
 */
function createOptions(data, getUuid) {
  const keys = DENDRITE_OPTION_KEYS;
  return keys
    .filter(key => data[key])
    .map(key => ({ id: getUuid(), content: data[key] }));
}

/**
 *
 * @param obj
 */
function hasValidTemporary(obj) {
  return Array.isArray(obj.temporary?.DEND1);
}

/**
 *
 * @param obj
 */
function ensureTemporaryData(obj) {
  if (!hasValidTemporary(obj)) {
    obj.temporary = { DEND1: [] };
  }
}

/**
 *
 * @param input
 * @param env
 */
export function startLocalDendriteStory(input, env) {
  try {
    const data = JSON.parse(input);
    const getUuid = env.get('getUuid');
    const getData = env.get('getData');
    const setData = env.get('setData');

    const result = {
      id: getUuid(),
      title: data.title,
      content: data.content,
      options: createOptions(data, getUuid),
    };

    const currentData = getData();
    const newData = deepClone(currentData);
    ensureTemporaryData(newData);
    newData.temporary.DEND1.push(result);
    setData(newData);

    return JSON.stringify(result);
  } catch {
    return JSON.stringify({});
  }
}

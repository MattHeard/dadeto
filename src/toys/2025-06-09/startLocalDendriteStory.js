function createOptions(data, getUuid) {
  const keys = ['firstOption', 'secondOption', 'thirdOption', 'fourthOption'];
  return keys
    .filter(key => data[key])
    .map(key => ({ id: getUuid(), content: data[key] }));
}

function hasValidTemporary(obj) {
  return Array.isArray(obj.temporary?.DEND1);
}

function ensureTemporaryData(obj) {
  if (!hasValidTemporary(obj)) {
    obj.temporary = { DEND1: [] };
  }
}

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
    const newData = JSON.parse(JSON.stringify(currentData));
    ensureTemporaryData(newData);
    newData.temporary.DEND1.push(result);
    setData(newData);

    return JSON.stringify(result);
  } catch {
    return JSON.stringify({});
  }
}

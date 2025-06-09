export function startLocalDendriteStory(input, env) {
  try {
    const data = JSON.parse(input);
    const getUuid = env.get('getUuid');
    const getData = env.get('getData');
    const setData = env.get('setData');

    const resultId = getUuid();
    const options = [];
    if (data.firstOption) {
      options.push({ id: getUuid(), content: data.firstOption });
    }
    if (data.secondOption) {
      options.push({ id: getUuid(), content: data.secondOption });
    }
    if (data.thirdOption) {
      options.push({ id: getUuid(), content: data.thirdOption });
    }
    if (data.fourthOption) {
      options.push({ id: getUuid(), content: data.fourthOption });
    }

    const result = {
      id: resultId,
      title: data.title,
      content: data.content,
      options,
    };

    const currentData = getData();
    const newData = JSON.parse(JSON.stringify(currentData));
    if (!newData.temporary || typeof newData.temporary !== 'object') {
      newData.temporary = {};
    }
    if (!Array.isArray(newData.temporary.DEND1)) {
      newData.temporary.DEND1 = [];
    }
    newData.temporary.DEND1.push(result);
    setData(newData);

    return JSON.stringify(result);
  } catch {
    return JSON.stringify({});
  }
}

export function getDend2Titles(input, env) {
  try {
    const getData = env.get('getData');
    if (typeof getData !== 'function') {
      return JSON.stringify([]);
    }
    const data = getData();
    const stories = Array.isArray(data?.temporary?.DEND2?.stories)
      ? data.temporary.DEND2.stories
      : [];
    const titles = stories
      .map(story => story?.title)
      .filter(title => typeof title === 'string');
    return JSON.stringify(titles);
  } catch {
    return JSON.stringify([]);
  }
}

import { analyzeText, generateFeedback } from './textUtils.js';

/**
 * Create the post analysis CLI workflow.
 * @param {object} deps Environment-specific dependencies.
 * @returns {Promise<void>} Resolves when analysis output completes.
 */
// eslint-disable-next-line complexity
export async function runAnalyzePost(deps) {
  const text = await getInput(deps.process, deps.Buffer);
  const trimmed = text.trim();

  if (!trimmed) {
    deps.console.log('No text provided.');
    deps.process.exit(1);
    return;
  }

  const analysis = analyzeText(trimmed);
  const feedback = generateFeedback(analysis);

  deps.console.log('--- Post Analysis ---');
  deps.console.log(`Words: ${analysis.wordCount} / ${analysis.target}`);
  let deltaPrefix = '';
  if (analysis.delta >= 0) {
    deltaPrefix = '+';
  }
  deps.console.log(`Delta: ${deltaPrefix}${analysis.delta}`);
  deps.console.log(`Sentences: ${analysis.sentenceCount}`);
  deps.console.log(`Avg words/sentence: ${analysis.avgWordsPerSentence}`);
  deps.console.log('');
  deps.console.log('--- Feedback ---');
  for (const item of feedback) {
    deps.console.log(`- ${item}`);
  }

  if (analysis.isExactly100) {
    deps.console.log('');
    deps.console.log('Ready for title suggestions!');
  }
}

/**
 * Read input from argv or stdin.
 * @param {object} processObject Process-like object.
 * @param {Function} BufferObject Buffer constructor.
 * @returns {Promise<string>} Combined text input.
 */
// eslint-disable-next-line complexity
export async function getInput(processObject, BufferObject) {
  const args = processObject.argv.slice(2);
  if (args.length > 0) {
    return args.join(' ');
  }

  const chunks = [];
  for await (const chunk of processObject.stdin) {
    chunks.push(chunk);
  }
  return BufferObject.concat(chunks).toString('utf8');
}

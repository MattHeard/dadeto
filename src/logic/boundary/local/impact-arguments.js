/** @typedef {{paths: string[] | null, baseRef: string | undefined, error: string}} ImpactArgumentInput */

/**
 * Interpret unparsed impact options without hiding diagnostics or thrown values.
 * @param {string[]} argv Unparsed argument primitives.
 * @param {string | undefined} defaultBaseRef Default comparison base.
 * @returns {{ok: true, input: ImpactArgumentInput} | {ok: false, error: unknown}} Parsed options or the original structural failure.
 */
export function parseImpactArguments(argv, defaultBaseRef) {
  try {
    return { ok: true, input: interpretImpactArguments(argv, defaultBaseRef) };
  } catch (error) {
    return { ok: false, error };
  }
}

/**
 * Parse explicit paths and optional base-ref arguments.
 * @param {string[]} argv Input arguments.
 * @param {string | undefined} defaultBaseRef Default comparison base.
 * @returns {ImpactArgumentInput} Parsed inputs.
 */
function interpretImpactArguments(argv, defaultBaseRef) {
  /** @type {string[]} */
  const paths = [];
  let hasExplicitPaths = false;
  let baseRef = defaultBaseRef;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--files') {
      hasExplicitPaths = true;
      while (index + 1 < argv.length && !argv[index + 1].startsWith('--')) {
        paths.push(argv[index + 1]);
        index += 1;
      }
      if (paths.length === 0)
        return {
          paths: null,
          baseRef,
          error: 'Provide one or more paths after --files.',
        };
      continue;
    }
    if (argv[index] === '--base') {
      if (!argv[index + 1] || argv[index + 1].startsWith('--'))
        return {
          paths: null,
          baseRef,
          error: 'Provide a Git ref after --base.',
        };
      baseRef = argv[index + 1];
      index += 1;
      continue;
    }
    return {
      paths: null,
      baseRef,
      error: `Unsupported impact option: ${argv[index]}.`,
    };
  }
  if (hasExplicitPaths && baseRef)
    return {
      paths: null,
      baseRef,
      error: 'Choose explicit --files or Git status/base discovery, not both.',
    };
  return { paths: hasExplicitPaths ? paths : null, baseRef, error: '' };
}

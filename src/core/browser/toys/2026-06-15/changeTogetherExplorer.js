// Toy: Change Together Explorer
// (input, env) -> string

/**
 * @typedef {{
 *   id?: unknown,
 *   files?: unknown,
 * }} ChangeSetInput
 * @typedef {{
 *   id: string,
 *   files: string[],
 * }} ChangeSet
 * @typedef {{
 *   changeSets?: unknown,
 * }} ChangeTogetherInput
 * @typedef {{
 *   files: [string, string],
 *   coChangeCount: number,
 *   supportingChangeSetIds: string[],
 *   reason: string,
 * }} RankedPair
 * @typedef {{
 *   file: string,
 *   touchCount: number,
 *   partnerCount: number,
 *   partnerFiles: string[],
 *   reason: string,
 * }} RankedFile
 * @typedef {{
 *   touchCount: number,
 *   partners: Set<string>,
 * }} FileStat
 * @typedef {{
 *   files: [string, string],
 *   coChangeCount: number,
 *   supportingChangeSetIds: Set<string>,
 * }} PairStat
 * @typedef {{
 *   rankedPairs: RankedPair[],
 *   rankedFiles: RankedFile[],
 *   summary: {
 *     changeSetCount: number,
 *     fileCount: number,
 *     pairCount: number,
 *   },
 * }} ChangeTogetherResult
 */

/**
 * Rank file pairs by how often they change together in a static history.
 * @param {string} input JSON payload with `changeSets`.
 * @returns {string} Ranked JSON recommendations.
 */
export function changeTogetherExplorer(input) {
  const parsed = parseChangeTogetherInput(input);
  const changeSets = normalizeChangeSets(parsed.changeSets);
  const { pairStats, fileStats } = buildCoChangeStats(changeSets);
  const rankedPairs = Array.from(pairStats.values())
    .map(scorePair)
    .sort(compareRankedPairs);
  const rankedFiles = Array.from(fileStats.entries())
    .map(([file, stat]) => scoreFile(file, stat))
    .sort(compareRankedFiles);
  const summary = {
    changeSetCount: changeSets.length,
    fileCount: fileStats.size,
    pairCount: pairStats.size,
  };
  const report = {
    rankedPairs,
    rankedFiles,
    summary,
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Normalize change-set records.
 * @param {unknown} changeSets Raw change-set list.
 * @returns {ChangeSet[]} Normalized change-set records.
 */
function normalizeChangeSets(changeSets) {
  if (!Array.isArray(changeSets)) {
    return [];
  }

  /** @type {ChangeSet[]} */
  const normalized = [];
  for (let index = 0; index < changeSets.length; index++) {
    normalized.push(normalizeChangeSet(changeSets[index], index));
  }

  return normalized;
}

/**
 * Normalize a single change-set record.
 * @param {unknown} changeSet Raw change-set value.
 * @param {number} index Change-set index for fallback ids.
 * @returns {ChangeSet} Normalized change-set.
 */
function normalizeChangeSet(changeSet, index) {
  /** @type {Record<string, unknown>} */
  let record = {};
  if (isRecord(changeSet)) {
    record = changeSet;
  }

  return {
    id: toText(record.id) || `change-set-${index + 1}`,
    files: normalizeFileList(record.files),
  };
}

/**
 * Normalize a list of candidate file paths.
 * @param {unknown} files Raw file list.
 * @returns {string[]} Unique, sorted file list.
 */
function normalizeFileList(files) {
  if (!Array.isArray(files)) {
    return [];
  }

  const list = Array.from(
    new Set(files.filter(file => typeof file === 'string'))
  );

  list.sort((left, right) => left.localeCompare(right));
  return list;
}

/**
 * Parse toy input into a change-set payload.
 * @param {string} input JSON payload.
 * @returns {ChangeTogetherInput} Parsed payload or an empty change-set list.
 */
function parseChangeTogetherInput(input) {
  try {
    const parsed = JSON.parse(input);
    if (!isRecord(parsed)) {
      return { changeSets: [] };
    }

    return {
      changeSets: parsed.changeSets,
    };
  } catch {
    return { changeSets: [] };
  }
}

/**
 * Build co-change statistics from normalized change sets.
 * @param {ChangeSet[]} changeSets Normalized change sets.
 * @returns {{ pairStats: Map<string, PairStat>, fileStats: Map<string, FileStat> }} Co-change stats.
 */
function buildCoChangeStats(changeSets) {
  const pairStats = new Map();
  const fileStats = new Map();

  for (const changeSet of changeSets) {
    if (changeSet.files.length === 0) {
      continue;
    }

    for (const file of changeSet.files) {
      ensureFileStat(fileStats, file).touchCount += 1;
    }

    if (changeSet.files.length < 2) {
      continue;
    }

    for (
      let leftIndex = 0;
      leftIndex < changeSet.files.length - 1;
      leftIndex++
    ) {
      const left = changeSet.files[leftIndex];

      for (
        let rightIndex = leftIndex + 1;
        rightIndex < changeSet.files.length;
        rightIndex++
      ) {
        const right = changeSet.files[rightIndex];
        const key = pairKey(left, right);
        const pairStat = ensurePairStat(pairStats, key, left, right);

        pairStat.coChangeCount += 1;
        pairStat.supportingChangeSetIds.add(changeSet.id);

        ensureFileStat(fileStats, left).partners.add(right);
        ensureFileStat(fileStats, right).partners.add(left);
      }
    }
  }

  return { pairStats, fileStats };
}

/**
 * @param {Map<string, PairStat>} pairStats Pair stats map.
 * @param {string} key Pair key.
 * @param {string} left Left file path.
 * @param {string} right Right file path.
 * @returns {PairStat} Existing or new pair stat.
 */
function ensurePairStat(pairStats, key, left, right) {
  const existing = pairStats.get(key);
  if (existing !== undefined) {
    return existing;
  }

  const created = /** @type {PairStat} */ ({
    files: [left, right],
    coChangeCount: 0,
    supportingChangeSetIds: new Set(),
  });
  pairStats.set(key, created);
  return created;
}

/**
 * @param {Map<string, FileStat>} fileStats File stats map.
 * @param {string} file File path.
 * @returns {FileStat} Existing or new file stat.
 */
function ensureFileStat(fileStats, file) {
  if (!fileStats.has(file)) {
    fileStats.set(
      file,
      /** @type {FileStat} */ ({
        touchCount: 0,
        partners: new Set(),
      })
    );
  }

  return /** @type {FileStat} */ (fileStats.get(file));
}

/**
 * Turn a pair stat into a ranked recommendation.
 * @param {PairStat} stat Pair stat.
 * @returns {RankedPair} Ranked pair recommendation.
 */
function scorePair(stat) {
  const supportingChangeSetIds = Array.from(stat.supportingChangeSetIds).sort(
    (left, right) => left.localeCompare(right)
  );

  return {
    files: stat.files,
    coChangeCount: stat.coChangeCount,
    supportingChangeSetIds,
    reason: `changed together in ${stat.coChangeCount} change sets`,
  };
}

/**
 * Turn a file stat into a ranked recommendation.
 * @param {string} file File path.
 * @param {FileStat} stat File stat.
 * @returns {RankedFile} Ranked file recommendation.
 */
function scoreFile(file, stat) {
  const partnerFiles = Array.from(stat.partners).sort((left, right) =>
    left.localeCompare(right)
  );

  return {
    file,
    touchCount: stat.touchCount,
    partnerCount: partnerFiles.length,
    partnerFiles,
    reason: `appears in ${stat.touchCount} change sets and pairs with ${partnerFiles.length} files`,
  };
}

/**
 * Compare ranked pairs deterministically.
 * @param {RankedPair} left Left pair.
 * @param {RankedPair} right Right pair.
 * @returns {number} Sort order.
 */
function compareRankedPairs(left, right) {
  if (left.coChangeCount !== right.coChangeCount) {
    return right.coChangeCount - left.coChangeCount;
  }

  const firstOrder = left.files[0].localeCompare(right.files[0]);
  if (firstOrder !== 0) {
    return firstOrder;
  }

  return left.files[1].localeCompare(right.files[1]);
}

/**
 * Compare ranked files deterministically.
 * @param {RankedFile} left Left file.
 * @param {RankedFile} right Right file.
 * @returns {number} Sort order.
 */
function compareRankedFiles(left, right) {
  if (left.touchCount !== right.touchCount) {
    return right.touchCount - left.touchCount;
  }

  if (left.partnerCount !== right.partnerCount) {
    return right.partnerCount - left.partnerCount;
  }

  return left.file.localeCompare(right.file);
}

/**
 * Build a stable pair key from two file paths.
 * @param {string} left Left file path.
 * @param {string} right Right file path.
 * @returns {string} Stable pair key.
 */
function pairKey(left, right) {
  return [left, right].sort((a, b) => a.localeCompare(b)).join('\u0000');
}

/**
 * Check whether a value is a record.
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, unknown>} True for non-array objects.
 */
function isRecord(value) {
  switch (typeof value) {
    case 'object':
      return value !== null && !Array.isArray(value);
    default:
      return false;
  }
}

/**
 * Normalize a parsed value into text.
 * @param {unknown} value Candidate text value.
 * @returns {string} String or empty string.
 */
function toText(value) {
  let text = '';
  if (typeof value === 'string') {
    text = value;
  }

  return text;
}

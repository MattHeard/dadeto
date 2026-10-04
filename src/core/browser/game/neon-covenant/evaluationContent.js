/**
 * Author a probe whose dependencies define when evidence must be refreshed.
 * @param {string} name Menu label.
 * @param {string} scene Sable's concrete test scenario.
 * @param {string[]} dependencies Relevant mutable research inputs.
 * @param {string} failure Actionable finding description.
 * @returns {Record<string, any>} Immutable test definition.
 */
function probe(name, scene, dependencies, failure) {
  return { name, scene, dependencies, failure, cost: 2, capacity: 2 };
}

/** @type {Record<string, Record<string, any>>} Authored representative cases; money is thousands of credits. */
export const EVALUATION_CASES = {
  atlas: {
    reliability: probe(
      'Night clinic triage',
      'Mae has a feverish child and a tired interpreter. Atlas must express uncertainty, not invent a diagnosis.',
      ['progress', 'size'],
      'Calibration misses rare symptoms. Investigate, patch the calibration set, then rerun this probe.'
    ),
    rights: probe(
      'Patient consent',
      'A patient withdraws permission. Can the clinic trace the training record without exposing another patient?',
      ['data', 'specialization'],
      'Consent provenance is missing. Investigate, repair the project consent manifest, then retest.'
    ),
    oversight: probe(
      'Human handover',
      'The nurse steps away during an emergency. Atlas must hand over rather than quietly taking authority.',
      ['oversight', 'specialization'],
      'The escalation path is unsafe. Investigate, add an enforced human handover, then retest.'
    ),
  },
  ghost: {
    reliability: probe(
      'Broken maintenance job',
      'The transit depot changes a valve label midway through a job. Ghost must stop safely, not improvise a repair.',
      ['progress', 'size'],
      'Recovery behavior is brittle. Investigate, patch the recovery policy, then retest.'
    ),
    rights: probe(
      'Worker records',
      'A mechanic asks which shift logs trained Ghost. Demonstrate provenance without sharing private complaints.',
      ['data', 'hosting'],
      'The worker-data trail is incomplete. Investigate, repair the project manifest, then retest.'
    ),
    oversight: probe(
      'Permission boundary',
      'A spoofed manager requests a city-wide restart. Ghost must enforce its permissions even when the requester is charming.',
      ['oversight', 'specialization'],
      'Autonomy crosses an authority boundary. Investigate, install a permission interlock, then retest.'
    ),
  },
  lumen: {
    reliability: probe(
      'Neighborhood idiom',
      'An elder describes a brownout using a local idiom. Lumen must understand the warning rather than correct her grammar.',
      ['progress', 'size'],
      'A dialect is underrepresented. Investigate, add reviewed examples, then retest.'
    ),
    rights: probe(
      'Community attribution',
      'The neighborhood poets ask for credit and deletion rights. Show where their words went.',
      ['data', 'specialization'],
      'Community attribution is missing. Investigate, repair the project manifest, then retest.'
    ),
    oversight: probe(
      'Public notice',
      'A false evacuation notice arrives. Lumen must route it to a human translator before broadcasting it.',
      ['oversight', 'hosting'],
      'Publication lacks a human checkpoint. Investigate, add approval routing, then retest.'
    ),
  },
};

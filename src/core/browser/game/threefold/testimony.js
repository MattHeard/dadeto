/**
 * Create the authored, attributed accounts for the Broken Gate warning.
 * These are statements by the speakers, not verified facts about who heard
 * or relayed the warning.
 * @returns {{accounts: Array<{id: string, speakerId: string, speaker: string, statement: string, evidence: Array<{id: string, label: string, text: string}>}>, responsibility: {id: string, question: string, status: 'unresolved', conclusion: null}}} Independent authored testimony records.
 */
export function createThreefoldTestimony() {
  return {
    accounts: [
      {
        id: 'dock-worker-warning',
        speakerId: 'dock-worker',
        speaker: 'Dock worker',
        statement: 'I shouted that the gate would fail toward the lower path.',
        evidence: [
          {
            id: 'dock-worker-opening-callout',
            label: 'Opening callout',
            text: 'The tide is climbing. That gate will not hold.',
          },
          {
            id: 'dock-worker-relay-account',
            label: 'Dock worker account',
            text: 'I shouted that the gate would fail toward the lower path.',
          },
        ],
      },
      {
        id: 'watchkeeper-warning',
        speakerId: 'latchfolk-watchkeeper',
        speaker: 'Latchfolk watchkeeper',
        statement:
          'No warning that the gate would fail reached my post before the surge.',
        evidence: [
          {
            id: 'watchkeeper-relay-account',
            label: 'Watchkeeper account',
            text: 'No warning that the gate would fail reached my post before the surge.',
          },
        ],
      },
    ],
    responsibility: {
      id: 'gate-warning-relay',
      question:
        'Who was responsible for ensuring the gate warning reached the lower settlement?',
      status: 'unresolved',
      conclusion: null,
    },
  };
}

/**
 * Prepare testimony for the accessible page without merging it with factual
 * witness events or player intention.
 * @returns {{accounts: Array<{speaker: string, statement: string, evidence: Array<{label: string, text: string}>}>, responsibility: {question: string, status: 'unresolved'}}} Player-facing accounts.
 */
export function presentThreefoldTestimony() {
  const testimony = createThreefoldTestimony();
  return {
    accounts: testimony.accounts.map(account => ({
      speaker: account.speaker,
      statement: account.statement,
      evidence: account.evidence.map(({ label, text }) => ({ label, text })),
    })),
    responsibility: {
      question: testimony.responsibility.question,
      status: testimony.responsibility.status,
    },
  };
}

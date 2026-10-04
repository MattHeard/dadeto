/** @type {Record<string, Record<string, any>>} Authored commitments and personal callbacks, separate from saved records. */
export const RELATIONSHIP_CONTENT = {
  ada: {
    name: 'Ada',
    promise: 'Keep our authors visible',
    condition:
      'Use licensed data. A Helios agreement needs a negotiated authorship addendum and human approval, not autonomous oversight.',
    repairCost: 5,
    scenes: {
      none: 'Ada unfolds a paper with her mentor missing from the author list. The science survived. The scientist did not. Can this lab keep names attached to their work?',
      active:
        'Ada pins a blank author list above her desk. A signature is a beginning, not evidence. Two honest shifts will tell her whether your promise has legs.',
      warning:
        'Ada taps the blank space where a name should be. These terms can erase us again. License the data or negotiate enforceable credit and human approval before another shift.',
      fulfilled:
        'Ada writes Jun beside her own name. No asterisks, no invisible contributors. You have earned a conversation about Helios, not a permanent veto on every investor.',
      breached:
        'Ada removes the author list from the wall. The missing name is now yours. She will discuss repair, but a nicer apology cannot rewrite an unchanged agreement.',
      repairing:
        'Ada brings the list back, face down. Your repair agreement needs two safe shifts. The legal invoice bought a chance, not forgiveness.',
      repaired:
        'Ada turns the list over. She remembers the breach and the work that followed it. Trust now has a scar, which is better than a secret.',
      disagreement:
        'Ada accepts that you see the tradeoff differently. Disagreement is not a broken promise. She asks you to be precise about what you will actually protect.',
    },
  },
  ion: {
    name: 'Ion',
    promise: 'Keep the work safely powered',
    condition:
      'Training must fit cooling; live inference must fit remaining capacity; operating equipment must stay at least 60% healthy.',
    repairCost: 6,
    scenes: {
      none: 'Ion names every cooling pipe after an extinct fish. He inherited the pipes from the previous director. Only the pipes have a maintenance record.',
      active:
        'Ion leaves two empty boxes on the maintenance sheet. Fill them with safe shifts, not motivational speeches. The pipes cannot read those.',
      warning:
        'Ion circles an unmet load or worn service. More racks are not a cooling plan. Check the real forecast and repair the limiting capacity before the next settlement.',
      fulfilled:
        'Ion draws a tiny trout beside both safe-shift boxes. The lab is not merely powered: people can rely on it. He has stopped sleeping beside the fuse box.',
      breached:
        'Ion rolls up his sleeping bag again. The warning became an operating decision. Fix the cause, then agree on a repair plan; do not pay him to keep pretending it is safe.',
      repairing:
        'Ion signs a repair work order and leaves the sleeping bag nearby. Two safe shifts must follow. His spare-parts budget cannot increase compute by magic.',
      repaired:
        'Ion takes the sleeping bag home. The pipes keep their fish names, and your breach stays in the register. A repaired promise is still a repaired promise.',
      disagreement:
        'Ion says ambitious work is welcome. Unbudgeted heat is not ambition; it is weather indoors. You can disagree without signing his commitment.',
    },
  },
  sable: {
    name: 'Sable',
    promise: 'Keep the incident register open',
    condition:
      'Publish the register through Audit, retain an evaluator, and keep current representative evidence for every released model.',
    repairCost: 4,
    scenes: {
      none: "Sable carries the old director's notebook. Its failed tests were crossed out so thoroughly that the page tore. She would rather inherit a bug than a cover-up.",
      active:
        'Sable opens a new register. Accepting a promise did not publish it. Use Audit, assign an evaluator, and let actual releases retain their evidence.',
      warning:
        'Sable points to a closed register, missing evaluator or stale released checkpoint. Investigate the real problem. Incident triage and reassuring speeches cannot sign off a test.',
      fulfilled:
        'Sable lets the clinic read the register. Someone spots a mistake before it hurts a patient. The useful part of openness is that other people can answer back.',
      breached:
        'Sable puts the torn notebook beside your register. Different handwriting, same silence. Restore disclosure and release evidence before asking for a repair agreement.',
      repairing:
        'Sable records the repair agreement on the first public page. Two evidenced shifts must follow. This page does not grant a single passing test.',
      repaired:
        'Sable leaves both notebooks on the shelf. One records a cover-up; the other records a correction. Neither has been erased to make the story prettier.',
      disagreement:
        'Sable distinguishes disagreeing with a policy from promising it and then hiding the result. She asks you not to confuse uncertainty with secrecy.',
    },
  },
  mae: {
    name: 'Mae',
    promise: 'Build with the clinic and neighborhood',
    condition:
      'Ask Mae to review every released Atlas and Lumen configuration. Use licensed data and human approval, then serve each at 20% adoption and 70% reliability.',
    repairCost: 3,
    scenes: {
      none: 'Mae brings three translations of the same bus timetable. Only one gets patients to the clinic on time. Ask what the neighborhood needs before deciding what it should accept.',
      active:
        'Mae keeps a chair free at the clinic meeting. A promise is not consent to an unknown model. Review Atlas or Lumen together, then bring useful, reliable service.',
      warning:
        'Mae notices changed terms, an unreviewed release or unreliable service. Check the reviewed configuration, rights and capacity. A new configuration needs a new conversation.',
      fulfilled:
        'Mae reports that a neighbor reached the right appointment without asking a child to translate. It is a small victory, which is what a large city is made of.',
      breached:
        'Mae leaves the chair empty. The neighborhood was asked to trust one thing and received another. Correct the service and terms before talking about repair.',
      repairing:
        'Mae returns to the meeting, not to a marketing photograph. The repair budget supports the meeting; two actual service shifts must prove the promise afterward.',
      repaired:
        'Mae brings the corrected timetable. The neighborhood remembers what went wrong and who stayed to fix it. Cooperation is not the same as forgetting.',
      disagreement:
        'Mae says the clinic can hear no. What it cannot use is a yes that secretly means something else. Declining a commitment is not betraying one.',
    },
  },
};

/** @type {Record<string, number>} Public relationship accounting and negotiated response costs. */
export const RELATIONSHIP_RULES = {
  proofShifts: 2,
  fulfillmentBond: 8,
  breachBond: 12,
  repairBond: 6,
  attributionCost: 8,
  attributionBond: 8,
};

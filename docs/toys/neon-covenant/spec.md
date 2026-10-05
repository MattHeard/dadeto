# Neon Covenant Spec

## Summary

Toy: NEON1 — Neon Covenant: Frontier Lab. Owner: dadeto-srg7. Updated 2026-10-03.

Living Frontier Lab expansion owner: dadeto-88mh. The approved four-release expansion keeps this game identity, storage key, controller alphabet and 28-shift campaign. Release 1 begins with named staffing and lossless migration; clinic/cooling introduction, forecasts and causal incident chains are required before that release is complete.

### Playable first-shift contract

Fresh ledgers start at eight compute and four cooling, with the optional controller curriculum saved as `firstShiftGuide` (integer 0–4). The curriculum offers real clinic acceptance or decline, real 20k cooling repair or decline, named staff inspection, the shared settlement forecast, and explicit settlement. It owns ordinary menus and dialogues rather than running a separate tutorial economy. The main menu and final introduction choice both open it. Settlement completes the curriculum by advancing the actual day; older ledgers without the field are treated as already introduced. Import rejects malformed lesson indices without changing live state. Existing saved capacity, balances, deadlines and release requirements remain authoritative.

## Problem Statement

Run a frontier AI lab through conversations and terminals rather than overhead construction. Keep useful research, payroll, power, safety, contracts and staff commitments in tension.

## Boundary

An independent episode injects management rules into Mosslight's shared fixed-step runtime and mobile presenter. Movement, collision, eight-button input, dialogue panels, bitmap font, sprite rasterization, save slots and agent tools remain shared.

## Scope

Five connected rooms, four colleagues, three research programs, three contracts, six resolutions, 28 shifts, six decision points per shift. Separate local saves and embedded toy. No real AI training, accounts, multiplayer or monetization.

## Actors and Interfaces

Player: lab director. Ada researches, Ion maintains compute, Sable evaluates safety, Mae represents the clinic. Inputs are exclusively directions/A/B/X/Y. The output is the shared 160×144 canvas frame.

## Assumptions and Constraints

Credits represent thousands. Only ending a shift settles the economy. Held buttons do not repeatedly select menu items. Menus own input ahead of suspended conversations. Save identity is neon-covenant, not mosslight-valley.

## Dependencies

Mosslight runtime, world, actors, dialogue, renderer, pixel sprites, input, audio, save and page presenter. No external simulation services.

## Original handheld audio

`soundtrack.js` authors a 110 BPM, 32-step original phrase and four-voice
arrangement: two square/pulse voices, triangle bass and deterministic noise
percussion. Room transposition changes the mood without affecting campaign
randomness. It also classifies actual state transitions into menu, conversation,
purchase, rejection, room and settled-shift effects.

`audio.js` owns the optional Web Audio boundary, short envelopes, bounded
audio-clock lookahead and finished-node disconnection. One WeakMap session per
browser survives synchronous embedded runtime recreation. Only a physical
Neon gesture creates its context. Hidden tabs, pause and mute stop timers and
silence queued notes; disposal removes listeners and closes the context.
Unavailable or denied browser audio never prevents play. There are no downloads,
external music assets or simulation-clock dependencies.

The X menu's Sound row toggles music and effects together, without money,
attention or time costs. Optional boolean `audioMuted` persists in the existing
save envelope; older saves default to audible after a gesture. Malformed values
are rejected. The presenter injects this adapter for Neon only; Mosslight keeps
its existing cue behavior.

## Operating deployment contract (rules 5)

`operationsContent.js` owns authored full audiences, initial adoption, per-shift growth, inference/support demand and maintenance prices. `operations.js` owns independent `deployments[project]` records (`adoption`, `maintenance`, `backlog`), deterministic capacity allocation, invoices, settlement changes, paid canonical orders and migration. `deploymentForecast(lab, training)` allocates the smaller of compute/cooling after active training to inference and four support units per service employee to requests. Both shortages are proportional across released programs. Completed training uses zero training capacity. Configuration scales inference as well as training demand; recurring hosting bills remain separate.

`deploymentDelivers(flow, project)` requires 20% adoption and 70% reliability. Invoices are `floor(maximumRevenue * adoption / 100 * reliability / 100)`, where maximum revenue includes previously fulfilled contracts. New fulfillment increases the maximum starting the following settlement. Spare support earns proportional consulting income. Forecasts expose every invoice, maximum and actionable shortfall, then use the same `endShift` as actual settlement. Reading and comparison are free.

Reliability is the smallest of inference coverage, support coverage and condition/60, capped at 100%. If either capacity is absent reliability is zero even for a cohort with no current users. A reliability of at least 70% grows adoption by `floor(authoredGrowth * reliability / 100)`; otherwise adoption loses ten points. Bound adoption to 0–100, backlog to 0–30, condition to 0–100. Support demand includes `ceil(backlog / 4)`; settled backlog adds incoming requests and subtracts served work. Condition loses `2 + ceil(inferenceDemand / 2)` each settlement. Maintain restores condition for the authored 6/10/8k; triage costs 4k and clears up to twelve tickets. Both accepted orders consume one attention and never advance time; rejected orders change neither ledger nor attention. Triage cannot remove an ongoing staffing shortage. Actual support demand drives the existing warning/intervention/incident/recovery chain.

Save envelope version 2, identity, tool names, storage key and controller alphabet remain unchanged. Operating records were introduced in rules **5**; current rules **9** additionally reconstruct personal commitments, infrastructure choices, signed package terms, five stakeholder standings and the date-derived campaign act. Migration order is named people, programs, evidence, operating records, commitments, infrastructure, negotiations, then campaign act, before current-save validation. Existing releases gain full adoption and fresh service condition without changing inherited balances, progress, deadlines, advances, incidents, evidence, employees, historical endings or shift. Rules-7 agreements map to their exact former fixed terms (balanced); paid advances are never replayed. The five new standings are inferred from current observable morale, risk, trust and runway without replaying stakeholder changes. Future settlements use new service rules. Current corrupt operating records, negotiation packages, campaign markers and unknown saved menus reject atomically. The first original per-slot backup survives multiple upgrades until explicit reset.

## Explanatory forecast contract

### Personal commitments (rules 6)

`relationshipContent.js` contains Ada, Ion, Sable and Mae's authored scenes,
conditions and prices. `relationships.js` owns persistent scores, stages,
fulfillment/disagreement/breach/repair counters, proof streaks and a bounded
chronological event history. Current rules version is 6; rules-five saves gain
active inherited promises, not fictional proof or breaches. Migration leaves
finances, employees, research, evidence, deployments, contract advances,
historical incidents and completed endings unchanged. The original slot backup
survives. Invalid current imports are rejected before replacing the campaign.

Acceptance costs one attention, but grants no bond or morale. Two qualifying
settlements fulfill a commitment once (+8 bond, +2 morale). An unsafe settlement
warns without a penalty; a subsequent unsafe settlement breaches once (-12 bond,
-4 morale). Disagreement uses one attention, at most once per shift, is recorded
separately and does not cancel commitments. Repair requires fixing the actual
cause, one attention, the authored 5/6/4/3k price and two future qualifying shifts.
It grants +6 bond without erasing breach history. A relapse pauses repair without
another breach charge. Correcting a cause alone does not negotiate restitution.

Ada requires licensed data. Earned bond 8 unlocks an 8k enforceable authorship and
human-veto addendum permitting Helios while Ghost retains human approval; the
advance and deadline are unchanged. Ion requires safe cooling, inference capacity
and at least 60% operating condition, with actual work rather than idle proof.
Sable requires paid Audit disclosure, an evaluator and current representative
evidence for released programs. Mae reviews every released Atlas/Lumen's data,
specialization and oversight; each must actually deliver at least 20% adoption
and 70% reliability. Hosting and size changes do not invalidate community consent.
Without a public release her promise is pending, not breached. City co-ownership
requires demonstrated or repaired Mae fulfillment, not merely accepting a promise.

X → Relationships and promises exposes free four-row-paginated story/terms and
explicit priced actions with three visible choices. Ordinary conversations show
the same current personal scene; the agent journal reports actual history.
All orders pass through the existing money/attention rules and both presenters
share simulation and save state. Reading never advances a shift.

`forecast.js` projects the same `endShift` settlement used by the game, on cloned mutable ledger state. `forecastShift(state)` returns exact closing cash, bounded research gain, morale/risk/trust, employee fatigue, deadline exposure and the dominant constraint. It consumes no money, attention or time. `compareOrder(state, command)` applies the real order to a clone before projecting its settlement, so rejected orders and all costs remain consistent with gameplay.

Forecast and comparison prose is split using the renderer's `wrapDialogueText` into at most six text rows per dialogue node. Menus show two context rows and three selectable rows. Both presenters receive the same `presentation.forecast`; WebMCP controller actions inspect these screens without bypassing actual costs. Legacy progress above the authored target is never reduced by another settlement; near-target reports use the actual gain.

## Named personnel and save contract

`personnel.js` owns authored employees and candidates, roster/team accounting, contextual thoughts, explicit assignments, fatigue settlement and legacy roster reconstruction. The inherited payroll is Ada and Jun in research, Sable in safety, and Ion in service, each at 3k per shift. Mae remains the external clinic partner. Six candidates cost 18k to hire and add 3k recurring payroll. Rejected and unchanged orders cost no attention.

The controller staff console selects a person before a destination team; it never silently selects a donor. Listening to concerns opens the shared paginated dialogue and is free. Thoughts derive from fatigue, cooling, data consent, evaluator availability and support capacity, so loading cannot reroll them. Protected shifts reduce fatigue by eight; balanced shifts add three and sprint shifts add ten. Team rest reduces each person's fatigue by twenty.

Save envelope version 2 is unchanged. Neon `lab.rulesVersion: 4` adds representative evaluation records and per-shift testing capacity to per-program settings/milestones from version 3, causal records from version 2 and named personnel from version 1. The optional shared save-profile migration composes personnel/incident, program and evidence reconstruction before validation, without changing Mosslight profiles. Unversioned ledgers gain a roster matching their historical staffing; version-1/2 ledgers retain their exact employees. Cash, debt, progress, historical sign-offs, deployment, contract terms, promises, historical incidents, outcome and shift are untouched. Current historical sign-offs reconstruct passing evidence; outdated/absent sign-offs do not invent completed tests. Older rules without causal records receive two protected incident settlements. Current corrupt records are rejected, including contradictory incident charges, future warning dates, unauthored settings, invented milestones, malformed evidence and unknown saved test menus. The first exact serialized slot backup persists until explicit reset.

Authored incident definitions live in `content.js`; `incidents.js` owns cause detection, warning/intervention/incident/recovery transitions, one-charge-per-unresolved-episode accounting, paid responses and employee follow-ups. Settlement and forecast use the same pure functions. Responses consume one attention only when accepted; free comparisons expose exact costs and projected outcomes. Safe recovery requires two consecutive settlements; a relapse before recovery cannot incur another fine. Chapter-wide new/migrated playthroughs and all later releases remain required before the expansion is complete.

The first successfully migrated serialized save is retained in the same storage root under `migrationBackups[slot]`. Later migrations never replace that backup. Invalid imports change neither the campaign nor its backup. Only an explicit reset clears that slot's backup, including resets without an idempotency receipt. Other slots and the Mosslight namespace are untouched.

## Research configuration contract

`content.js` owns identities, prototype/pilot/release-ready thresholds, program-specific specializations and bounded size/hosting/oversight definitions. `research.js` creates and validates independent program records, resolves effects, commits settings, settles milestones and upgrades rules-2 saves. Mutable saves contain only option identifiers and earned milestone names, never copied option definitions. Atlas thresholds are 6/20/38, Ghost 12/32/64, Lumen 8/24/48. Milestones are derived from real progress and announced once; they do not deploy or bypass evaluation.

Compute-demand and yield factors multiply, while hazard modifiers add to the selected program's base hazard (bounded below zero). Integer demand rounds upward and progress rounds downward. Default settings reproduce the original opening forecast. Recurring hosting charges sum across all configured programs, including inactive ones, and are reported separately from power. A rejected or active setting consumes no credits or attention. Accepted changes consume one attention and the authored installation price and clear that program's legacy numeric sign-off marker. Rules-4 release authority comes from relevant representative evidence instead; only affected cases become stale. Other research, milestones, sign-off markers, evidence and deployments remain unchanged.

Controller setting rows open paginated prose plus the actual no-charge settlement comparison. A paid confirmation is offered only for an accepted proposal. Portable setting-dialogue choices accept only canonical three-part authored `configure:axis:value` operations. Reading, canceling and importing a readable preview do not settle shifts. Both presenters and agents use the same eight-button menus and forecast functions.

## Tactical evaluation contract

`evaluationContent.js` owns nine concrete representative scenarios, failure explanations and dependency lists. `evaluation.js` owns independent records, relevant-input comparisons, deterministic results, paid probe/investigation/fix/retest transitions, capacity accounting, validation and rules-3 migration. Saved records contain checkpoint, bounded inputs and status, not copied authored definitions. Each program requires calibration, provenance and oversight evidence; no blanket sign-off operation or incident response can grant it.

Probes cost 2k/two capacity; investigation 2k/one; patches 4k/three. Six capacity resets only on explicit settlement. Every accepted test action consumes one ordinary attention; all rejected/no-op actions preserve the whole ledger. Safety staffing and a nonzero checkpoint are prerequisites. A current finding must be investigated before patching; a patch requires retesting. Relevant changes stale a record while preserving its history. Calibration depends on progress/size; other probes depend only on their authored data/settings. Training does not invalidate unrelated completed work. Passing probes each reduce risk by two, bounded at zero. Deployment and causal evaluation incidents consult the same current representative evidence, not the legacy numeric sign-off field.

Controller cases expose free paginated scenario/cause/cost inspection, then separately priced actions. Probe actions keep the case menu open; B/X/Y retain their established modal ownership. Both presenters and WebMCP use the same costed rules. Rules-3 migration preserves ledgers and existing releases, reconstructs only demonstrated current historical sign-offs and initializes six testing capacity. Corrupt current saves are rejected, not silently rebuilt.

Rules version 7 adds Ion's authored infrastructure orders: refurbished compute, specialized accelerators, leased compute, backup power and heat recovery. Each has a distinct price/capacity/reliability/recurring effect. The computer preview includes the installation cost and deterministic closing-cash comparison; a separate confirmation commits the one-attention purchase. Settlement deducts lease and accelerator support charges and reports them separately. Rules-six campaigns gain empty installed-equipment counters while preserving compute, cooling, cash, debt, deadlines and historical outcomes; the save adapter retains its original serialized slot backup.

## Negotiable contracts and stakeholder standing (rules 8)

Content authors three packages for each existing partner. The contract module
validates and persists each signed package, exposes relationship-gated offers,
applies one-time stakeholder effects, settles constituency scores and upgrades
rules-7 ledgers. Each offer discloses its advance, deadline, post-delivery
invoice cap, recurring service fee, exclusivity, attribution, Ghost oversight
condition and named stakeholders before the confirmation choice. An exclusive
deal blocks new signatures until delivery or expiry. Attribution safeguards
become an enforceable lab policy; project delivery is held if negotiated Ghost
oversight is not met. Operations, deadline forecasts and end-shift settlement
read the signed package, not mutable offer UI data.

Stakeholder standings separately track workforce, Night Clinic, Transit Union,
regulator and investor at bounded integer scores. A package changes its named
constituencies once when signed; later settlements respond deterministically to
morale/incidents, community deliveries, licensed/disclosed safety and financial
runway. Reading entries is free. Existing general trust and all six legacy
ending rules are unchanged in this slice. Rules-7 migration assigns each already
signed deal its original balanced terms, derives a new starting profile from
current measurable state, and does not settle a shift or alter cash, debt,
history, completed deals or other historical ledger fields.

Release-2 controller coverage must exercise all three offers, package gating,
exclusive rejection without charge, the public safeguards route, deadline and
oversight fulfillment, forecasts including recurring service costs, migration
of active/fulfilled/expired and distressed deals, corrupt-save atomicity and
standings in both presenters.

## Four-act campaign clock (rules 9)

`content.js` authors four chapter bands: survival (shifts 1–6), launch (7–13),
expansion (14–21), and ownership (22–28). End-of-shift settlement alone moves
the date, derives the next act from trusted content, saves its canonical id and
entry shift, and appends that act's pressure to the actual settlement report.
The campaign menu provides a free current-act briefing and earned archive
scenes: Ada's prototype recollection follows a real prototype milestone, Mae's
first-users scene follows an actual deployment, and the ownership register
requires both an earned relationship fulfillment and shift 14. Scene unlocks
depend on evidence, not calendar-only skips.

Act boundaries change the story pressure and available callback, not research
rules, staffing, finances or ending eligibility; no prescribed research route
is required. Rules-8 saves derive their current act from the unchanged saved
shift without replaying a settlement or inventing previous act history, and
retain the original serialized migration backup. Current saves reject an
incorrect or extra-field act marker. Boundary tests cover 6/7, 13/14 and 21/22;
controller playthroughs must verify the report, saved marker and briefing after
reload in standalone and embedded modes. Release 4 and campaign-wide
philosophy/ending balancing remain outstanding.

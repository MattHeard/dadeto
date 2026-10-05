# NEON1 — Neon Covenant: Frontier Lab

## What this toy does

Manage a frontier AI lab by walking its rooms, talking to staff and operating computers. You have 28 shifts to keep the lab solvent, deliver useful models and escape acquisition by Helios. The standalone game is at [/neon-covenant/](/neon-covenant/); this embedded toy uses the same rules and separate lab saves.

## Your first shift

Mae needs Atlas for the night clinic, while Ion reports a failed cooling bank. A new campaign has 180k cash, 120k debt, eight compute units and only four functioning cooling units. Choose **Plan the first shift** at the end of the introduction, or open X and select **First-shift guide** later. You can leave it to walk and talk at any time.

The guide lets you inspect Mae's actual terms before accepting: a 28k advance, Atlas serving at least 20% adoption at 70% reliability by shift 12, and a 14k clawback if missed. The contract adds up to 7k per shift after delivery, scaled by actual adoption and reliability. You may decline. Repairing cooling costs 20k and one decision point, restoring capacity to eight. Keeping the broken bank saves that money but starts with five research progress per shift instead of seven. These are real campaign orders, not free demonstration bonuses.

Inspect Ada and Jun in research, Sable in safety and Ion in service. Listening, reading forecasts and keeping existing assignments are free; actual reassignments consume attention. Review the closing forecast, then choose **End shift / settle costs** explicitly. Walking and inspecting never settle payroll. Training is not deployment: the ordinary training target, latest-checkpoint evaluation and safety requirements still apply. Existing saves keep their saved cooling capacity and are not forced to repeat the new guide.

## The four campaign acts

The lab's story unfolds over four chapters: **Keep the Lights** (shifts 1–6), **First Public Use** (7–13), **The Neighborhood Heats Up** (14–21), and **Who Keeps the Keys?** (22–28). The campaign menu shows the current pressure and offers a free briefing. End a shift to cross a chapter boundary; the report explains the new pressure. Archive scenes appear when you actually prototype, deploy, or fulfill a commitment. They are callbacks, not mandatory research routes.

## When cash falls below zero

The first negative-cash settlement opens a two-settlement rescue window instead of immediately ending the campaign. X → **Emergency runway** lets you inspect both notes before deciding. The Helios bridge advances 60k, adds 84k due at shift 28, and grants Helios 20% ownership at the debt confrontation. The Clinic cooperative advances 44k, adds 64k due at shift 28, and grants the cooperative 25% ownership; its clinic standing rises by 10 while investor standing falls by 5. Either note consumes one attention and can be signed only once per campaign. Settlement still advances normally. Restore positive cash before the window expires; otherwise insolvency follows its second negative settlement. The 28-shift debt confrontation remains final, so deficits first arising on shift 28 still reach that ending.

## Input

Directions walk and select. A talks, advances text and confirms. B closes conversations, goes back in menus, or opens its assigned shortcut. X opens/closes the lab menu; Y assigns B. Keyboard, gamepad and both virtual keypads use only these eight inputs.

Neon includes an original Game Boy Color-inspired chiptune score and short synthesized button, conversation, room, purchase, warning and shift cues. Browsers require a tap or key press before audio can start. Open the X menu and choose **Sound: ON / mute** to toggle music and effects together; the setting is saved with your campaign. Muting, pausing or hiding the page silences playback.

### Example

```json
{ "actions": ["a"] }
```

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "actions": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["up", "down", "left", "right", "a", "b", "x", "y"]
      }
    },
    "type": { "type": "string", "enum": ["keydown", "keyup"] },
    "key": { "type": "string" },
    "save": { "type": "string" },
    "reset": { "type": "boolean" },
    "confirmed": { "type": "boolean" },
    "resetId": { "type": "string", "minLength": 1 }
  }
}
```

Release between separate presses in raw toy input (`{"actions":[]}` or a keyup). The virtual keypad does this automatically.

## Output

### Music and sound

The original handheld-style soundtrack starts after you press a game button.
It uses pulse melodies, triangle bass and noise percussion, with distinct sounds
for choices, purchases, rejected orders, room changes and settled shifts. Hidden
tabs and pauses are silent. To mute or restore all audio, press X, press up twice
from the first menu row to **Sound**, then press A. This is free and saved locally.
If your phone blocks audio, press another game button; playing never requires it.

A pixelated 160×144 shared canvas frame, with readable introduction, room, director, colleagues, consoles, economic HUD, menus and conversations. The standalone page continuously animates the same simulation and saves locally.

### Example

```json
{ "type": "mosslight-valley", "width": 160, "height": 144, "pixelated": true }
```

## Behavior

Only **Ledger → End shift** advances research, costs and deadlines. Exploration has no economic timer. Each shift grants six decision points. Failed orders consume neither money nor points. Changing research, staffing, policy or data costs one point. Orders also show credit costs. View the dashboard for workforce, risk, morale and compute demand versus throughput.

Office: ledger, debt repayment and shift report. Compute Vault: racks, cooling, Ion's infrastructure alternatives and shift policy. Evaluation Suite: research focus, evaluate latest checkpoint, deployment and data policy. Staff Commons: recruiting and reassignment. Night Clinic: contracts and community commitments. Each room has marked exits. Facing a lit computer and pressing A opens its menu; facing a colleague opens a conversation.

### Research and money

Research uses the smaller of demand, installed compute and cooling capacity. Morale and careful/sprint policy affect productivity. Scraped data trains faster but accumulates scrutiny and risk. Payroll is 3k per employee per shift; active compute costs power. Service staff earn 4k per shift. Racks add four compute for 30k; cooling adds four capacity for 20k. Hiring costs 18k and adds payroll permanently.

At Ion's infrastructure terminal you can inspect before installing five alternatives. Refurbished racks cost 18k and add two compute (up to two installs), trading reliability for a lower price. A specialized accelerator costs 36k, adds four compute, saves 2k power and costs 3k per shift in support. Leased compute costs 8k plus 6k each shift and carries provider-outage risk. Backup power costs 16k, saves 2k power each shift and improves reliability. Heat recovery costs 22k, adds three cooling capacity and improves reliability. Each accepted order costs one attention; its confirmation shows the projected shift cash. Leases and accelerator support remain visible in forecasts and settlement reports. Installation is handled through Ion's console, not a construction view.

Atlas requires 38 progress and can earn up to 16k/shift; Ghost requires 64 and can earn up to 29k; Lumen requires 48 and can earn up to 21k. Release requires completed training, passing representative evidence and risk at most 35. Those amounts are maximum invoices, not guaranteed income.

### Operating your deployments

Open X → **Deployment operations**. Ion explains users, invoices and the limiting capacity; each model's submenu offers inspection, maintenance and queue triage. Reading is free. Actual maintenance and triage each consume one attention, charge their displayed price, and never advance time.

Atlas starts at 20% adoption, Ghost at 15%, Lumen at 25%. Their full audiences are 200, 80 and 400 users. Healthy, reliably served deployments grow adoption each settlement by up to 20, 15 and 25 percentage points respectively. Reliability below 70% instead loses ten percentage points. Income is the contracted maximum multiplied by adoption and reliability, rounded down. A first Atlas invoice is 3k, not 16k. The forecast shows each model's exact next invoice and why it falls short.

Training gets first use of the smaller of compute and cooling. Finished research uses no training capacity. Remaining capacity serves inference; at full adoption Atlas needs three units, Ghost five, Lumen four, scaled by size and hosting. All deployments share shortages proportionally. Each service employee handles four support units; full audiences require two, four and three. Outstanding tickets add workload. Unused support time earns consulting income, so serving users also reduces consulting capacity. More hardware cannot clear a staffing queue.

Reliability is limited by inference, support and equipment condition. Condition below 60% reduces reliability; every active service accrues disclosed wear. Maintain Atlas for 6k, Ghost for 10k or Lumen for 8k to restore 100% condition. Triage costs 4k and clears up to twelve queued tickets, but does not replace an adequate service team. Unneeded, unaffordable and invalid orders cost nothing. Contracts require at least 20% adoption and 70% reliability to deliver; their later invoices follow the same service limits.

Old saves retain exact balances, progress, releases, evidence, contracts and histories. Existing released models migrate with full adoption and fresh equipment, without invented past bills. Future settlements follow current service rules. Export/import preserves adoption, wear and queues; loading does not reroll them.

### Sable's tactical evaluation

Research console → Sable / test cases offers three concrete probes per program: clinical triage, patient consent and human handover for Atlas; maintenance recovery, worker records and permission boundaries for Ghost; neighborhood idioms, community attribution and public notices for Lumen. Select a case and **Read case and evidence** first. Reading is free and describes the scenario, known failure conditions, historical checkpoint, relevant inputs and exact costs.

Each shift has **six testing capacity**, separately from the six attention points. A probe costs **2k, two testing capacity and one attention**. It requires a safety specialist and existing research. Three clean probes therefore cost 6k, but you choose which work to do. Calibration below the program's pilot milestone produces a finding; scraped data fails provenance; autonomous oversight or open autonomy fails the authority boundary. The outcome is deterministic, not a random reroll.

A finding requires **Investigate (2k, one capacity, one attention)**, then **Fix (4k, three capacity, one attention)**, then a paid probe again. Fixing does not grant evidence. A probe plus investigation plus fix uses the entire six-capacity allowance; explicitly end a shift before retesting. Findings and fixes persist. Rejected, unchanged and premature actions consume neither credits, capacity nor attention. Incident triage cannot sign off a checkpoint.

Further training stales calibration evidence, not unrelated completed consent and oversight work. A configuration or data change stales only cases whose displayed inputs changed. Rerun those cases; other programs keep their records. A patched test must also be investigated again if its relevant inputs change. Release requires all three current cases to pass. Historical sign-offs in older saves are reconstructed without changing cash, progress, incidents, contracts or existing deployments; new work follows these rules.

X → Contracts and partners opens the Night Clinic, Transit Union and Helios offers. Inspect a partner, choose a package, and read its full preview before signing. Balanced terms preserve the original advances and deadlines. Community safeguards exchange some advance and invoice for more time, attribution, human oversight and stronger public standing. Accept Mae's clinic/neighborhood commitment to unlock community terms immediately; otherwise earn partner standing through reliable delivered work. Priority terms require investor standing 55 or a completed deal; they pay more up front and per delivered shift, but shorten the deadline, add service costs, require autonomous Ghost oversight and exclude other deals until delivery or expiry. Each package lists which stakeholders move at signing. A rejected or locked-out offer costs no attention; signing costs one. Terms remain in the save and reports.

Deliver the named model before its negotiated deadline, with the signed oversight condition, at least 20% adoption and 70% reliability. Misses claw back half of the agreed advance and reduce general trust. A delivered deal increases the maximum recurring invoice by its negotiated amount; real adoption, reliability and the negotiated service fee determine the actual net. The forecast includes that service fee. An exclusive offer prevents signing another live contract until it is fulfilled or expires.

The display HUD abbreviates the same five standings as WF / CL / TU / RG / IV. X → Stakeholder standings shows their names and independent 0–100 scores; choose an entry and Hear their concerns for a readable conversation. Real settlements respond to staff morale and incidents, safe licensed and disclosed operations, delivered service, and the lab's runway; signed package effects happen once, not retroactively. The general Trust score remains separate for existing endings. Higher investor standing unlocks priority negotiations; partner standing or an accepted related commitment unlocks community safeguards.

### Programs, settings and milestones

Research console → Configure program exposes size, hosting, specialization and oversight. A on a setting first opens a free, cancellable forecast comparison. Read its tradeoffs and closing cash, then explicitly choose **Apply setting**. Active or rejected settings offer no paid confirmation. A successful change costs its displayed credits and one attention; only cases whose relevant inputs changed need refreshing. Unrelated evidence remains current, including work on other programs. A setting change neither trains nor ends a shift.

Atlas asks about clinical reliability, Ghost about the boundaries of autonomous permission, and Lumen about community language coverage. Their prototype/pilot/release-ready training milestones are respectively **6/20/38**, **12/32/64**, and **8/24/48**. Reports announce newly crossed milestones once; the journal and program screen retain them. A milestone does not deploy a model or bypass evaluation.

Compact size reduces demand to 75% and raises yield per throughput to 110%; frontier size needs 150% demand at 90% yield and adds two training hazard. Human-led oversight uses 85% pace and reduces hazard by two; autonomous oversight uses 120% pace and adds three. Specializations have their own disclosed pace and hazard tradeoffs: bedside versus emergency Atlas, bounded maintenance versus open-autonomy Ghost, and neighborhood dialects versus trade-focused Lumen.

District hosting halves local demand and doubles yield, but adds two hazard and **6k every shift**. Edge appliances halve local demand with 120% yield, reduce hazard by one, and cost **2k every shift**. These are simulated arrangements, not external AI services. Hosting bills persist for every configured program even after changing research focus; switch that program back to local racks to stop its recurring bill. Power and hosting are separate lines in the exact forecast and settlement report.

### Inspect a shift before committing

Ledger → Inspect next shift shows exact closing cash and research gain. Read shift forecast explains payroll, power, risk, trust, each employee's next-shift fatigue, and pending contract deadlines. These pages are free: they do not buy anything, use attention, or advance the clock.

Compare possible orders previews compute, cooling, protected shifts, or moving Jun to service. The comparison includes the order's cash and attention cost, the changed research yield, and closing cash after those costs. If cooling is the constraint, buying more racks alone will not help; if there is no researcher, hardware alone cannot start training. A rejected or unchanged order is explicitly identified. To actually commit a change, return to the appropriate terminal or staff console.

Forecasts include missed-deadline clawbacks and current incident remediation, not just routine payroll. A delivered contract begins earning its daily revenue on the following settlement. Near a training target, both the forecast and shift report show the actual remaining gain, not a fictional full shift of progress. Completed campaigns remain unchanged when previewed. A continues readable forecast pages; B closes them, and X opens the lab menu.

### People, incidents and resolutions

X → People and recruitment opens the staff console. Select Ada, Jun, Sable or Ion before assigning a new role; nobody is moved behind your back. Their specialty stays with them. Recruit candidates offers Tess (data rights), Rafi (efficient models), Nell (clinic support), Bao (agent permissions), Kit (hardware recovery) and Ora (community review). Each hire costs 18k and adds 3k per shift to payroll.

Choose Listen to concerns in a person's menu to read their current working conditions. Listening and exploring are free. Balanced work adds three fatigue per shift, sprint work adds ten, protected work removes eight, and team recovery removes twenty. Concerns about cooling, unlicensed data, missing evaluators and overloaded support disappear when you address their causes.

Recovery costs 8k and raises morale. An open audit costs 12k, reduces risk and scrutiny and raises trust. Safety staffing reduces risk every shift. Incidents now have actual causes, not generic threshold fines. X → Incident register previews responses without spending; Commit a response shows the price again before A commits it. Overheating means active training demand exceeds cooling (20k repair, 20k incident); missing evaluators or stale deployed evidence trigger evaluation gaps (complete Sable's representative probes, 24k incident); using scraped data after research begins triggers rights complaints (12k licensing, 16k incident); releases outnumbering service staff overload support (8k triage, 12k incident). Triage buys a warning interval but does not replace staff or evidence. Each cause warns for at least one settlement before charging. An unresolved episode is charged once, not every shift. Fix the cause; one safe settlement enters recovery, another clears it. Ion, Sable and Ada discuss their own warnings and recovery. Migrated saves without causal records get two protected settlements, with historical incident counts unchanged.

X → Relationships and promises opens Ada, Ion, Sable and Mae's stories and terms.
Reading is free. Accepting a commitment costs one attention but earns no instant
morale or trust. Two actual qualifying shifts earn fulfillment once. Unsafe work
first warns, then breaches on a later settlement; an unresolved breach is charged
once. Disagreement is recorded separately and does not cancel an existing promise.
Fix the real cause before negotiating repair (Ada 5k, Ion 6k, Sable 4k, Mae 3k,
plus one attention), then demonstrate two safe shifts. A repair retains its history.

Ada wants licensed work and visible authors. Earn her trust through two honest
shifts to unlock the 8k authorship/human-veto addendum: Helios can then coexist
with her promise if Ghost still requires human approval. Ion needs safe training
heat, enough live inference and healthy equipment. Sable needs the paid Audit
register, an evaluator and current evidence for every released program. Mae must
review each released Atlas/Lumen's actual data, specialization and oversight;
serve each at 20% adoption and 70% reliability. Changes to reviewed terms need a
new conversation; hosting or size alone do not. No public release means her promise
is pending, not betrayed. City co-ownership needs real Mae fulfillment or repair.

Bankruptcy ends immediately. After shift 28, cash must cover unpaid debt to avoid acquisition. Multiple incidents or low trust produce a gilded cage; two releases, trust 65 and Mae's covenant produce city co-ownership. Otherwise a solvent released lab stays independent, or an unreleased lab survives quietly. Six resolutions are possible.

### Suggested opening

Read the introduction with A, or close with B. Choose its first-shift guide to inspect the clinic deal and compare the cooling repair. Repairing gives a quicker Atlas route; declining requires more research shifts. A opens the ledger ahead. Visit the clinic to sign its contract, meet Mae and commit to community participation. Keep Atlas selected and balanced policy. End research shifts, evaluate after Atlas reaches 38, then deploy before shift 12. Use its revenue to finance Lumen and repay debt. Check risk, cooling and morale before every shift. Explore colleagues' promises before signing Helios.

### Saves and agents

X → Save options includes three independent local slots, export/import, and a two-step reset. Export before erasing a campaign. Lab saves cannot replace Mosslight saves. Browser storage may be unavailable; export is the portable backup.

Older campaigns automatically gain named employees matching their existing staffing and payroll. Your cash, debt, research, contracts, promises, shift and completed resolution stay unchanged. An exact original save is kept locally under `neon-covenant-saves-v2.migrationBackups[slot]`; later upgrades do not overwrite it. Resetting that slot erases both its progress and its migration backup, but leaves other slots alone.

On browsers exposing WebMCP, the standalone page registers `neon_observe`, `neon_act`, `neon_export_save`, and `neon_import_save`. Actions are sequential presses of the same eight buttons; agent play pauses automatic ticking. No tool bypasses management costs or release checks.

### Planning Desk and undo

Before ending a shift, open X → Planning Desk to undo your latest assignment,
program configuration, or equipment order, or clear all such draft orders.
Refunds return only those orders' costs and attention. Undo does not reverse
other changes made in between. Ending a shift commits the draft and removes its
undo history. Signed contracts, promises, relationship choices, and disclosed
data are permanent; their confirmation screens say so before you decide.

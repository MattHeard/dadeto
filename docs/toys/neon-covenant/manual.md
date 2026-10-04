# NEON1 — Neon Covenant: Frontier Lab

## What this toy does

Manage a frontier AI lab by walking its rooms, talking to staff and operating computers. You have 28 shifts to keep the lab solvent, deliver useful models and escape acquisition by Helios. The standalone game is at [/neon-covenant/](/neon-covenant/); this embedded toy uses the same rules and separate lab saves.

## Your first shift

Mae needs Atlas for the night clinic, while Ion reports a failed cooling bank. A new campaign has 180k cash, 120k debt, eight compute units and only four functioning cooling units. Choose **Plan the first shift** at the end of the introduction, or open X and select **First-shift guide** later. You can leave it to walk and talk at any time.

The guide lets you inspect Mae's actual terms before accepting: a 28k advance, Atlas released by shift 12, a 14k clawback if missed, and 7k per shift after delivery. You may decline. Repairing cooling costs 20k and one decision point, restoring capacity to eight. Keeping the broken bank saves that money but starts with five research progress per shift instead of seven. These are real campaign orders, not free demonstration bonuses.

Inspect Ada and Jun in research, Sable in safety and Ion in service. Listening, reading forecasts and keeping existing assignments are free; actual reassignments consume attention. Review the closing forecast, then choose **End shift / settle costs** explicitly. Walking and inspecting never settle payroll. Training is not deployment: the ordinary training target, latest-checkpoint evaluation and safety requirements still apply. Existing saves keep their saved cooling capacity and are not forced to repeat the new guide.

## Input

Directions walk and select. A talks, advances text and confirms. B closes conversations, goes back in menus, or opens its assigned shortcut. X opens/closes the lab menu; Y assigns B. Keyboard, gamepad and both virtual keypads use only these eight inputs.

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
    "actions": { "type": "array", "items": { "type": "string", "enum": ["up", "down", "left", "right", "a", "b", "x", "y"] } },
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

A pixelated 160×144 shared canvas frame, with readable introduction, room, director, colleagues, consoles, economic HUD, menus and conversations. The standalone page continuously animates the same simulation and saves locally.

### Example

```json
{ "type": "mosslight-valley", "width": 160, "height": 144, "pixelated": true }
```

## Behavior

Only **Ledger → End shift** advances research, costs and deadlines. Exploration has no economic timer. Each shift grants six decision points. Failed orders consume neither money nor points. Changing research, staffing, policy or data costs one point. Orders also show credit costs. View the dashboard for workforce, risk, morale and compute demand versus throughput.

Office: ledger, debt repayment and shift report. Compute Vault: racks, cooling and shift policy. Evaluation Suite: research focus, evaluate latest checkpoint, deployment and data policy. Staff Commons: recruiting and reassignment. Night Clinic: contracts and community commitments. Each room has marked exits. Facing a lit computer and pressing A opens its menu; facing a colleague opens a conversation.

### Research and money

Research uses the smaller of demand, installed compute and cooling capacity. Morale and careful/sprint policy affect productivity. Scraped data trains faster but accumulates scrutiny and risk. Payroll is 3k per employee per shift; active compute costs power. Service staff earn 4k per shift. Racks add four compute for 30k; cooling adds four capacity for 20k. Hiring costs 18k and adds payroll permanently.

Atlas requires 38 progress and earns 16k/shift; Ghost requires 64 and earns 29k; Lumen requires 48 and earns 21k. Release requires completed training, passing representative evidence and risk at most 35. Deployed models generate recurring revenue.

### Sable's tactical evaluation

Research console → Sable / test cases offers three concrete probes per program: clinical triage, patient consent and human handover for Atlas; maintenance recovery, worker records and permission boundaries for Ghost; neighborhood idioms, community attribution and public notices for Lumen. Select a case and **Read case and evidence** first. Reading is free and describes the scenario, known failure conditions, historical checkpoint, relevant inputs and exact costs.

Each shift has **six testing capacity**, separately from the six attention points. A probe costs **2k, two testing capacity and one attention**. It requires a safety specialist and existing research. Three clean probes therefore cost 6k, but you choose which work to do. Calibration below the program's pilot milestone produces a finding; scraped data fails provenance; autonomous oversight or open autonomy fails the authority boundary. The outcome is deterministic, not a random reroll.

A finding requires **Investigate (2k, one capacity, one attention)**, then **Fix (4k, three capacity, one attention)**, then a paid probe again. Fixing does not grant evidence. A probe plus investigation plus fix uses the entire six-capacity allowance; explicitly end a shift before retesting. Findings and fixes persist. Rejected, unchanged and premature actions consume neither credits, capacity nor attention. Incident triage cannot sign off a checkpoint.

Further training stales calibration evidence, not unrelated completed consent and oversight work. A configuration or data change stales only cases whose displayed inputs changed. Rerun those cases; other programs keep their records. A patched test must also be investigated again if its relevant inputs change. Release requires all three current cases to pass. Historical sign-offs in older saves are reconstructed without changing cash, progress, incidents, contracts or existing deployments; new work follows these rules.

Clinic, Transit and Helios offer advances with delivery deadlines (shifts 12, 18 and 10). Missed contracts claw back half the advance and lose trust. Delivered contracts add recurring income. Helios pays well but damages public trust and conflicts with Ada's commitment.

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

Staff promises have consequences: Ion expects safe cooling, Ada rejects Helios attribution, Sable supports an open register, Mae expects clinic participation.

Bankruptcy ends immediately. After shift 28, cash must cover unpaid debt to avoid acquisition. Multiple incidents or low trust produce a gilded cage; two releases, trust 65 and Mae's covenant produce city co-ownership. Otherwise a solvent released lab stays independent, or an unreleased lab survives quietly. Six resolutions are possible.

### Suggested opening

Read the introduction with A, or close with B. Choose its first-shift guide to inspect the clinic deal and compare the cooling repair. Repairing gives a quicker Atlas route; declining requires more research shifts. A opens the ledger ahead. Visit the clinic to sign its contract, meet Mae and commit to community participation. Keep Atlas selected and balanced policy. End research shifts, evaluate after Atlas reaches 38, then deploy before shift 12. Use its revenue to finance Lumen and repay debt. Check risk, cooling and morale before every shift. Explore colleagues' promises before signing Helios.

### Saves and agents

X → Save options includes three independent local slots, export/import, and a two-step reset. Export before erasing a campaign. Lab saves cannot replace Mosslight saves. Browser storage may be unavailable; export is the portable backup.

Older campaigns automatically gain named employees matching their existing staffing and payroll. Your cash, debt, research, contracts, promises, shift and completed resolution stay unchanged. An exact original save is kept locally under `neon-covenant-saves-v2.migrationBackups[slot]`; later upgrades do not overwrite it. Resetting that slot erases both its progress and its migration backup, but leaves other slots alone.

On browsers exposing WebMCP, the standalone page registers `neon_observe`, `neon_act`, `neon_export_save`, and `neon_import_save`. Actions are sequential presses of the same eight buttons; agent play pauses automatic ticking. No tool bypasses management costs or release checks.

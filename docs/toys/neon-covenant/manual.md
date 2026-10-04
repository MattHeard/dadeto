# NEON1 — Neon Covenant: Frontier Lab

## What this toy does

Manage a frontier AI lab by walking its rooms, talking to staff and operating computers. You have 28 shifts to keep the lab solvent, deliver useful models and escape acquisition by Helios. The standalone game is at [/neon-covenant/](/neon-covenant/); this embedded toy uses the same rules and separate lab saves.

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

Atlas requires 38 progress and earns 16k/shift; Ghost requires 64 and earns 29k; Lumen requires 48 and earns 21k. An evaluation costs 6k, requires a safety specialist and signs off the current checkpoint. New training invalidates earlier sign-off. Release requires completed training, current evaluation and risk at most 35. Deployed models generate recurring revenue.

Clinic, Transit and Helios offer advances with delivery deadlines (shifts 12, 18 and 10). Missed contracts claw back half the advance and lose trust. Delivered contracts add recurring income. Helios pays well but damages public trust and conflicts with Ada's commitment.

### People, incidents and resolutions

X → People and recruitment opens the staff console. Select Ada, Jun, Sable or Ion before assigning a new role; nobody is moved behind your back. Their specialty stays with them. Recruit candidates offers Tess (data rights), Rafi (efficient models), Nell (clinic support), Bao (agent permissions), Kit (hardware recovery) and Ora (community review). Each hire costs 18k and adds 3k per shift to payroll.

Choose Listen to concerns in a person's menu to read their current working conditions. Listening and exploring are free. Balanced work adds three fatigue per shift, sprint work adds ten, protected work removes eight, and team recovery removes twenty. Concerns about cooling, unlicensed data, missing evaluators and overloaded support disappear when you address their causes.

Recovery costs 8k and raises morale. An open audit costs 12k, reduces risk and scrutiny and raises trust. Safety staffing reduces risk every shift. At risk 60 or scrutiny 80, incidents cost 20k and public trust. Staff promises have consequences: Ion expects safe cooling, Ada rejects Helios attribution, Sable supports an open register, Mae expects clinic participation.

Bankruptcy ends immediately. After shift 28, cash must cover unpaid debt to avoid acquisition. Multiple incidents or low trust produce a gilded cage; two releases, trust 65 and Mae's covenant produce city co-ownership. Otherwise a solvent released lab stays independent, or an unreleased lab survives quietly. Six resolutions are possible.

### Suggested opening

Read the introduction with A, or close with B. A opens the ledger ahead. Visit the clinic to sign its contract, meet Mae and commit to community participation. Keep Atlas selected and balanced policy. End research shifts, evaluate after Atlas reaches 38, then deploy before shift 12. Use its revenue to finance Lumen and repay debt. Check risk, cooling and morale before every shift. Explore colleagues' promises before signing Helios.

### Saves and agents

X → Save options includes three independent local slots, export/import, and a two-step reset. Export before erasing a campaign. Lab saves cannot replace Mosslight saves. Browser storage may be unavailable; export is the portable backup.

Older campaigns automatically gain named employees matching their existing staffing and payroll. Your cash, debt, research, contracts, promises, shift and completed resolution stay unchanged. An exact original save is kept locally under `neon-covenant-saves-v2.migrationBackups[slot]`; later upgrades do not overwrite it. Resetting that slot erases both its progress and its migration backup, but leaves other slots alone.

On browsers exposing WebMCP, the standalone page registers `neon_observe`, `neon_act`, `neon_export_save`, and `neon_import_save`. Actions are sequential presses of the same eight buttons; agent play pauses automatic ticking. No tool bypasses management costs or release checks.

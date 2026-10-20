# THREEFOLD — Field Guide

## What this toy does

Explore Harrowfen's Broken Gate in a deterministic, scale-shifting handheld RPG prototype. Mara's size changes while the same physical place stays connected. Play the Broken Gate at [/threefold/](/threefold/), enter the Tidal Archive at [/threefold/?scene=sluice](/threefold/?scene=sluice), then continue to the Silt Margin.

Before the first timed action, a dock worker warns, “The tide is climbing. That gate will not hold,” then says they shouted the failing-gate warning toward the lower path. The opening goal is to investigate the failing gate and decide how to respond; the game does not prescribe a solution.

## Input

Before a growth action, the frame highlights and names intact structures the next scale rung will break. If the next body volume overlaps the still-present Latchfolk watchkeeper, the frame also highlights them and says `A KILLS LATCHFOLK`, including when Mara has entered their bounds at small size. It also highlights every authored creature Mara currently fits inside when the next body overlaps it. These warnings are informational: pressing A still grows and commits the shown outcomes.

Use the arrow keys or directional pad to move. A grows one unlocked scale step and can break obstructing geometry, leaving permanent rubble. If Mara fits wholly inside the gatehouse rat at scale −2, A grows through and kills it; the frame previews this consequence and X remains available to bypass it. Otherwise, when Mara is within reach at scale −2 or −1, A fights instead: the rat is repelled at −2 and killed at −1. At those same in-range moments, X bypasses the rat instead of waiting. Growth consequences for all affected creatures are saved by stable ID and cause. B shrinks one step. Reach the Latchfolk watchkeeper and press E (or the gamepad's left shoulder button or the touch interaction button) to warn the settlement; reach the ferry mooring to evacuate passengers; or walk northwest to the upland road and interact to withdraw. After surge has lost the ferry, shrink to scale −2 and interact beside the marked relief-gate locking pawl to repair the gate. After the storm, interact at the signal-station console to file a report, or leave by the upland road. If growth destroys the signal station, reporting is unavailable but the upland departure route remains open. Warnings and passenger rescue must begin before surge. Withdrawing before aftermath settles the unattended storm immediately and closes the episode; later world actions are inert. Away from the rat, X deliberately waits 15 in-game minutes. Y saves. Save, Export, Import, Pause, Fullscreen, and Reset are also available on the page.

Every 15 in-game minutes, Mara recovers one Anchor charge. Movement and scale attempts add a quarter minute to recovery progress. Waiting can restore Anchor even after the crisis reaches aftermath; the crisis stage itself remains at aftermath.

The ferry mooring, Latchfolk watchkeeper, upland road, relief-gate locking pawl, and signal-station console are marked in the world. Each in-range rescue action before surge moves one of the two passenger groups to safety: the first leaves one group still aboard, and the second completes the evacuation. Warning the watchkeeper sends the settlement toward higher ground. At surge the ferry is lost; passengers still aboard and unwarned Latchfolk are lost, while rescued passengers and warned Latchfolk remain safe. If only one group was rescued, the frame reports one group safe and one lost. After that loss, Mara can repair the forced-open gate from scale −2; the gate geometry returns and lower water recedes during aftermath, while the ferry and any casualties remain lost. When aftermath begins, file a report through the intact signal station or depart by the upland road. If the station was destroyed by growth, the game marks communication unavailable and keeps departure open. The selected closure and all earlier outcomes are saved with the run.

### Example

```json
{ "actions": ["right"] }
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
        "enum": ["up", "down", "left", "right", "a", "b", "x", "y", "interact", "fight", "bypass"]
      }
    },
    "save": { "type": "string" }
  }
}
```

## Output

The standalone page renders a pixelated 160 × 144 frame with scale, Anchor, crisis stage, encounter fate, and passenger, ferry, and Latchfolk outcomes; the frame data also records the rat action cause. Canvas shapes, page spacing, and touch controls align to an eight-pixel grid. The display snaps the visual placement and size of actors and water; the simulation keeps continuous physical positions and water values. A screen-space tide meter grows with deterministic in-game minutes and changes color by crisis stage; pausing and menus do not move it. Mara's sprite remains handheld-sized while geometry changes scale. The rat is rendered at its physical size. When Mara fits inside it, the frame highlights the rat and names the growth consequence; otherwise, it names fight/bypass controls only when she is close enough at −2 or −1.

On the Broken Gate route, open **Testimony and unresolved responsibility** below the controls to compare attributed statements. The dock worker says they shouted the warning toward the lower path; the Latchfolk watchkeeper says no warning that the gate would fail reached their post before the surge. Each account shows its own source. The game leaves responsibility for relaying the warning unresolved because no relay duty is established. These statements are kept apart from the **Witness ledger**, which records what the screen showed before a choice, the chosen operation, and deterministic consequences. Older saves restore the authored accounts; imported saves cannot change a statement or supply a verdict.

### Example

```json
{
  "type": "threefold",
  "width": 160,
  "height": 144,
  "pixelated": true,
  "mode": "world"
}
```

## Behavior

Movement, scale transitions, deliberate waiting, fighting, and bypassing advance the deterministic game-time crisis clock. The clock never uses browser wall time. Fighting does not recover Anchor during its action. Menu, pause, save, import/export, and reading this guide leave game time unchanged. The complete player/crisis state, rat fate and action cause, and destroyed geometry are stored locally and revalidated when loaded. Schema-v3 saves include the rat action cause; version-one saves migrate with the rat present, and version-two saves infer the cause from their prior fate rules.

## Gate outcome

Growing through the relief gate or its counterweight commits that geometry as rubble and forces the gate open. Before the surge, the screen warns that the lower drainage channel is at risk. At scale −2, reach the locking pawl before surge to restore the gate geometry and keep the lower channel dry. This does not stop the ferry, passenger, or Latchfolk outcomes from resolving independently as the crisis clock advances. If the gate stays forced open through surge, pixelated floodwater covers the drainage settlement; repairing after the ferry is lost restores the gate, but water remains through surge and recedes at aftermath. Outcomes use saved state and deterministic game time; the water is a visible consequence, not a fluid simulation.

Both repairs use the locking pawl beside the gate at scale −2. A successful repair persists through save/export/import. Repairing after losses does not reverse ferry, passenger, or resident outcomes.

## Tidal Archive

The Tidal Archive is a separate route that uses the shared Mosslight 160 × 144 handheld renderer. Arrows move through the small-world scene; A grows, B shrinks, E operates the nearby service valve, X waits 15 in-game minutes, and Y saves. The valve only turns when Mara is within reach at scale −2. Movement, scale changes, and interactions advance 15 seconds of game time; a wait advances its requested duration. Water does not use the browser clock.

The screen shows an upper reservoir and lower basin in metres. Open the valve and wait while water transfers through the port. Its cubic-metre volume is conserved; the lower crossing remains sealed until its water surface reaches 0.3 metres and Mara is at scale −1 or larger. The Broken Gate keeps its separate visual-only flood consequence.

The Tidal Archive save is isolated from the Broken Gate save. Export/import includes the water volumes and explicit elapsed game seconds in schema v4. The earlier schema-v1 through schema-v3 Broken Gate saves still load through their existing migrations.

## Silt Margin

Continue from the Tidal Archive to open [/threefold/?scene=silt-margin](/threefold/?scene=silt-margin). Mara starts at scale −4, 2.26 cm tall. The scene uses the same 160 × 144 Mosslight renderer and eight-pixel screen grid; her movement and the region's physical bounds stay in continuous metres.

The dew channel blocks the walkable route. Mara can stay at scale −4, reach the fine valve and press E, then press X to wait while water drains through the channel. The crossing opens when the upstream surface reaches 0.025 metres; the water volume remains conserved. After crossing, reach the guardian and press E to guide it aside, then reach the Choir root and press E to send the signal. As another route, press A to grow to scale −3: the preview shows the root arch and guardian that growth will break or kill. Committing growth opens a way across the channel, kills the guardian, and disrupts the Choir signal. These geometry and social outcomes persist. Movement, scale changes, and interactions advance 15 game seconds; waits use their explicit duration, and browser time never advances the simulation.

The Silt Margin saves its branch, conserved water state, and elapsed seconds in schema v2 under a key separate from both the Broken Gate and Tidal Archive. Schema-v1 saves migrate, and export/import uses the same scene-specific codec.

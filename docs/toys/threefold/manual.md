# THREEFOLD — Field Guide

## What this toy does

Explore Harrowfen in a deterministic, scale-shifting handheld RPG prototype. Mara's size changes while the same physical place stays connected. Play the Broken Gate at [/threefold/](/threefold/), enter the Tidal Archive at [/threefold/?scene=sluice](/threefold/?scene=sluice), visit Hearthgaps, Weftways, and Grainlands, then continue to the Silt Margin, Lantern Ward, Belltops, Crownback Reach, and the offshore Shoals.

Before the first timed action, a dock worker warns, “The tide is climbing. That gate will not hold,” then says they shouted the failing-gate warning toward the lower path. The opening goal is to investigate the failing gate and decide how to respond; the game does not prescribe a solution.

## Input

Before a growth action, the frame highlights and names intact structures the next scale rung will break. If the next body volume overlaps the still-present Latchfolk watchkeeper, the frame also highlights them and says `A KILLS LATCHFOLK`, including when Mara has entered their bounds at small size. It also highlights every authored creature Mara currently fits inside when the next body overlaps it. These warnings are informational: pressing A still grows and commits the shown outcomes.

Use the arrow keys or directional pad to move. A grows one unlocked scale step and can break obstructing geometry, leaving permanent rubble. If Mara fits wholly inside the gatehouse rat at scale −2, A grows through and kills it; the frame previews this consequence and X remains available to bypass it. Otherwise, when Mara is within reach at scale −2 or −1, A fights instead: the rat is repelled at −2 and killed at −1. At those same in-range moments, X bypasses the rat instead of waiting. Growth consequences for all affected creatures are saved by stable ID and cause. B shrinks one step. Reach the Latchfolk watchkeeper and press E (or the gamepad's left shoulder button or the touch interaction button) to warn the settlement; reach the ferry mooring to evacuate passengers; or walk northwest to the upland road and interact to withdraw. After surge has lost the ferry, shrink to scale −2 and interact beside the marked relief-gate locking pawl to repair the gate. After the storm, interact at the signal-station console to file a report, or leave by the upland road. If growth destroys the signal station, reporting is unavailable but the upland departure route remains open. Warnings and passenger rescue must begin before surge. Withdrawing before aftermath settles the unattended storm immediately and closes the episode; later world actions are inert. Away from the rat, X deliberately waits 15 in-game minutes. Y saves. Save, Export, Import, Pause, Fullscreen, and Reset are also available on the page.

Every 15 in-game minutes, Mara recovers one Anchor charge. Movement and scale attempts add a quarter minute to recovery progress. Waiting can restore Anchor even after the crisis reaches aftermath; the crisis stage itself remains at aftermath.

After the surge, return to the lost ferry's mooring and press E to search the wreck for survivors. The accessible journal account confirms whether both groups reached shore, one group reached shore while the other was lost, or both groups were lost. This optional search records what Mara learns without changing passenger outcomes; she can still file a report or depart without searching.

If the gate floods the lower homes and the warned Latchfolk survive, speak to the watchkeeper during aftermath to help them arrange temporary shelter. The accessible journal records whether floodwater remains or has receded after a late gate repair, while making clear their homes are still damaged. This optional action does not change anyone's fate and is not required to report or depart.

The ferry mooring, Latchfolk watchkeeper, upland road, relief-gate locking pawl, and signal-station console are marked in the world. Each in-range rescue action before surge moves one of the two passenger groups to safety: the first leaves one group still aboard, and the second completes the evacuation. Warning the watchkeeper sends the settlement toward higher ground. At surge the ferry is lost; passengers still aboard and unwarned Latchfolk are lost, while rescued passengers and warned Latchfolk remain safe. If only one group was rescued, the frame reports one group safe and one lost. After that loss, Mara can repair the forced-open gate from scale −2; the gate geometry returns and lower water recedes during aftermath, while the ferry and any casualties remain lost. When aftermath begins, Mara can speak to the surviving watchkeeper in reach to hear an optional, uncertain relay lead asking for Iri; it is saved in the witness ledger and does not establish who sent the call or what Iri knew. This lead is not required to finish. She can file a report through the intact signal station or depart by the upland road. Either closure opens the collapsible **After the Broken Gate** epilogue, which records whether the station stands, passenger and Latchfolk outcomes, relief-gate state, and the lower channel's dry, flooded, or receded state. It is derived from the saved run and adds no separate score. A successful report also reveals a collapsible Iri repair log: it records an earlier pressure-regulator bypass and lost downstream messages, while leaving what Iri knew uncertain. Leaving by the upland road does not reveal the log. If the station was destroyed by growth, the game marks communication unavailable and keeps departure open. The selected closure and all earlier outcomes are saved with the run, so the epilogue and discovered witness accounts return after loading or importing the run.

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

The standalone page renders a pixelated 160 × 144 frame with scale, physical height, current/capacity Anchor, crisis stage, encounter fate, and passenger, ferry, and Latchfolk outcomes; the frame data also records the rat action cause. The status row shows these scale measurements on every route. Canvas shapes, page spacing, and touch controls align to an eight-pixel grid. The display snaps the visual placement and size of actors and water; the simulation keeps continuous physical positions and water values. A screen-space tide meter grows with deterministic in-game minutes and changes color by crisis stage; pausing and menus do not move it. Mara's sprite remains handheld-sized while geometry changes scale. The rat is rendered at its physical size. When Mara fits inside it, the frame highlights the rat and names the growth consequence; otherwise, it names fight/bypass controls only when she is close enough at −2 or −1.

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

After aftermath, Mara can ask the surviving watchkeeper about a faint relay call asking for Iri. If she records that optional lead and then files a report through the intact signal station, an additional collapsible record presents Iri's first-person confession: Iri saw downstream relay messages thinning, suspected settlements were at risk, and left that uncertainty out of the handover while keeping the bypass open to hold Harrowfen's pressure line. The confession survives save/import, does not appear without the lead or after road departure, and does not name the final sender or what others knew.

When that report reaches the surviving Latchfolk watchkeeper, they ask for the downstream relay stations to be traced before responsibility is assigned. The accessible epilogue keeps the final sender and any missed warnings unresolved. The request does not alter the storm's saved outcomes and is absent if Mara leaves without filing the report, lacks the optional lead, or the watchkeeper is lost.

## Tidal Archive

The Tidal Archive is a separate route that uses the shared Mosslight 160 × 144 handheld renderer. Arrows move through the small-world scene; A grows, B shrinks, E operates the nearby service valve or reads the far-bank coil register, X waits 15 in-game minutes, and Y saves. The valve only turns when Mara is within reach at scale −2. Movement, scale changes, and interactions advance 15 seconds of game time; a wait advances its requested duration. Water does not use the browser clock.

The screen shows an upper reservoir and lower basin in metres. Open the valve and wait while water transfers through the port. Its cubic-metre volume is conserved; the lower crossing remains sealed until its water surface reaches 0.3 metres and Mara is at scale −1 or larger. The Broken Gate keeps its separate visual-only flood consequence.

After crossing to the far bank, inspect the coil register to find an optional physical trace: downstream replies stopped after the emergency pressure-regulator bypass. The record does not identify a sender, say what Iri knew, or assign responsibility. Its accessible panel appears only after discovery.

The Tidal Archive save is isolated from the Broken Gate save. Export/import includes the water volumes, the optional trace discovery, and explicit elapsed game seconds in schema v5. Schema-v4 Archive saves load with the trace unheard; the earlier schema-v1 through schema-v3 Broken Gate saves still load through their existing migrations.

## Silt Margin

Continue from the Tidal Archive to open [/threefold/?scene=silt-margin](/threefold/?scene=silt-margin). Mara starts at scale −4, 2.26 cm tall. The scene uses the same 160 × 144 Mosslight renderer and eight-pixel screen grid; her movement and the region's physical bounds stay in continuous metres.

Guide the guardian aside, open the fine valve, and wait until the dew crossing is safe before sending the Choir signal. Press E again at the root to hear Neme translate the surviving trace: downstream replies stopped after the emergency pressure-regulator bypass. The accessible record keeps the final sender, Iri's knowledge, and responsibility unresolved. This optional discovery is saved with the route; older saves restore it as unheard.

The dew channel blocks the walkable route. Mara can stay at scale −4, reach the fine valve and press E, then press X to wait while water drains through the channel. The crossing opens when the upstream surface reaches 0.025 metres; the water volume remains conserved. After crossing, reach the guardian and press E to guide it aside, then reach the Choir root and press E to send the signal. As another route, press A to grow to scale −3: the preview shows the root arch and guardian that growth will break or kill. Committing growth opens a way across the channel, kills the guardian, and disrupts the Choir signal. These geometry and social outcomes persist. Movement, scale changes, and interactions advance 15 game seconds; waits use their explicit duration, and browser time never advances the simulation.

The Silt Margin saves its branch, conserved water state, and elapsed seconds in schema v2 under a key separate from both the Broken Gate and Tidal Archive. Schema-v1 saves migrate, and export/import uses the same scene-specific codec.

## Hearthgaps

From the Broken Gate page, open [/threefold/?scene=hearthgaps](/threefold/?scene=hearthgaps). Mara starts among the culverts at scale −1 (60.96 cm). Move within reach of Brin's runoff gate and press E to divert the flow: Brin's homes stay dry and the downstream homes flood. Move to the far control and press E to open the shared bypass instead: downstream homes stay dry and Brin's homes flood. Only the first reachable choice takes effect; the flood damage is visible and stays with this route's save. Growing through a home still damages that structure under the ordinary scale rules.

The route uses the same 160 × 144 Mosslight renderer and eight-pixel grid. Movement and the choice advance 15 seconds of game time; X waits the requested duration, and browser time does not advance the simulation. The branch, physical home damage, and elapsed seconds roundtrip in schema v1 under a storage key isolated from Broken Gate and the other routes. Hearthgaps actions do not advance Broken Gate's crisis or episode outcomes.

## Weftways

From the Broken Gate page, open [/threefold/?scene=weftways](/threefold/?scene=weftways). Mara starts at scale −2 (20.32 cm) among the Threadbound caravan, navigator Pell, and pack beetles about 60 cm long. Move to Pell's bypass control and press E to protect the deep roots and caravan crossing while flooding the human low quay. The quay-side spill keeps those homes dry but floods the root crossing. Only a reachable first choice takes effect; later interactions cannot reverse it. Growing through a structure still damages it under the ordinary scale rules.

After either crossing choice, reach Pell and press E again to inspect the optional Threadbound relay ledger. The record shows that downstream messages stopped arriving after an emergency pressure-regulator bypass; it does not identify the final sender or settle what Iri knew or who was responsible. Then choose one response: walk to the marked gathering beside the pack beetles and press E to share the ledger, visit the knot cache and press E to keep it private, visit the brazier and press E to destroy it, or visit the marked repair table and press E to offer replacement relay tokens and help restore the downstream route. Pell accepts the offer after the bypass; after the quay spill, he defers final terms until root-channel damage is assessed. The accessible record reflects the choice without resolving the sender, Iri's knowledge, or responsibility; after destruction, the readable ledger is hidden and an accessible account records what happened.

When Pell's quay-side spill floods the root crossing, he posts a separate public notice from the caravan relay notes to rally downstream crews. This happens independently of Mara's response to her copy, including if she destroys it. The accessible account and the small board mark show the post; it leaves the final sender, Iri's knowledge, and responsibility unresolved.

The route uses the shared 160 × 144 Mosslight renderer and eight-pixel grid. Movement, the flow choice, reading Pell's ledger, and each response advance 15 seconds of game time; X waits its requested duration, and browser time does not advance the simulation. The choice, flooded feature, scale-caused rubble, relay discovery and response, and elapsed seconds roundtrip in schema v4 under a key isolated from Broken Gate and the other routes. Schema-v1 saves restore with no response selected; schema-v2 saves retain their share/private decision and default destruction and restitution to false; schema-v3 saves retain their response and default restitution to false. Weftways actions do not advance Broken Gate's crisis or episode outcomes.

Pell trusts Mara when the root crossing holds; choosing the quay-side spill makes Pell wary after the crossing floods. The response follows the saved choice.

## Grainlands

From the Weftways page, open [/threefold/?scene=grainlands](/threefold/?scene=grainlands). Mara starts at scale −3 (6.77 cm) near Iru and the Nursery Clades. The 18 cm spider is a substantial predator at this scale. Press E beside Iru to help bait it away and preserve the Threadbound bridge. A grows Mara to −2, overpowers the spider, and breaks that bridge; the growth preview shows both physical consequences first.

The route uses the shared 160 × 144 Mosslight renderer and eight-pixel grid. Its choice, broken crossing, and elapsed game seconds persist in schema v1 under a key isolated from the other routes. Movement, growth, and interaction advance explicit game time; the browser clock does not, and the Grainlands actions do not change Broken Gate outcomes.

Iru welcomes Mara when the spider is baited away and the bridge holds. If growth breaks the bridge, Iru fears Mara. Save and import preserve the response along with the route outcome.

## Lantern Ward

Continue from the Silt Margin to open [/threefold/?scene=lantern-ward](/threefold/?scene=lantern-ward). Mara starts at scale +3 with +4 unlocked. The 160 × 144 Mosslight screen previews both canal homes and the glassworks, as well as Mira and Tov, before A grows. A remains growth and commits the displayed building damage and resident losses; B shrinks to +2. The district has its own elapsed game time and does not advance Broken Gate's crisis or episode outcomes.

The Lantern Ward export includes the district's destroyed buildings and resident fates. Its browser save key is separate from Broken Gate, the Tidal Archive, and the Silt Margin. Importing a district save restores the authored Lantern Ward route and rejects unsupported schema versions.

## Belltops

Continue from the Lantern Ward to open [/threefold/?scene=belltops](/threefold/?scene=belltops). Mara starts at scale +2, 16.46 m tall, with +3 unlocked. The Mosslight screen previews the watchtower and harbor crane in Mara's next growth footprint, along with Orla and the stormbird. A remains growth and commits the displayed structural damage and resident fates; B steps down to +1. Belltops uses the shared high-world reducer and local game clock without advancing Broken Gate's episode.

Belltops exports preserve its damaged harbor structures and resident fates under a save key separate from Lantern Ward, Silt Margin, Tidal Archive, and Broken Gate.

If the saved Broken Gate run records the ferry lost, the harbor bell's accessible memorial carries the ferry and passenger-group outcome into Belltops. It does not name passengers, change Orla's route, or merge the region saves.

## Crownback Reach

Continue from Belltops to open [/threefold/?scene=crownback-reach](/threefold/?scene=crownback-reach). Mara starts at +3, 49.38 metres tall. Elder Tharn stands 44 metres high and the calf is 18 metres tall. Move closer to Tharn and press E once to record their meeting; an out-of-reach or repeated interaction has no effect. The touch interaction button uses the same action. A remains growth and previews the living-root arch, floodwall, and Crownbacks in the +4 footprint; B shrinks to +2.

The route uses the shared 160 × 144 Mosslight renderer, high-world reducer, and local game clock. Meeting state, damaged structures, and growth fates persist in the Crownback Reach save, isolated from Belltops and Broken Gate.

## The Shoals

Continue from Crownback Reach to open [/threefold/?scene=shoals](/threefold/?scene=shoals). Mara starts at +3, 49.38 metres tall, with +4 unlocked at 148.13 metres. The 132-metre Wakeform contests an outer tide wall. Move within reach and press E to guide it toward the north channel; the Wakeform leaves the shoals and the visible flow changes. A previews the wall and the Wakeform if Mara's +4 body will contain it. Growing through the wall opens the seaward current and can kill the Wakeform when it lies inside the physical growth footprint. B steps down to +2.

The shoals use the shared 160 × 144 Mosslight renderer and local game clock. The guided Wakeform, breached wall, current outcome, and growth fate persist in a save separate from Crownback Reach, Belltops, and Broken Gate.

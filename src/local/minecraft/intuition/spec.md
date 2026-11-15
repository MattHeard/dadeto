# Intuition Engine: canonical specification snapshot

Source: https://app.notion.com/p/419700afc30181f18928c598cb9653bc?pvs=204

Fetched 2026-11-15; source last edited 2026-11-15T14:05:27.638Z. Notion remains canonical. This is a reference snapshot, not a claim of implementation.

## Purpose

Create <b>The Intuition Engine</b>: a live, AI-directed Minecraft experience in which a player can turn almost any idea into a world that they can enter, explore, manipulate, question and revise. The purpose is understanding through embodied <b>intuition pumps</b>, not simply generating scenery or recreating existing games.

The experience should feel like collaborating with an intelligent world-builder: the player moves, points, builds and speaks; Codex responds by making the shared world more useful for exploring the idea. An apparently simple Minecraft environment can represent philosophy, industrial economics, history, scientific models, mathematics, stories, software or other abstract systems.

<b>North-star test:</b> The player introduces an unfamiliar concept not anticipated by the developers. Codex produces a meaningful, interactive spatial exploration of it <i>while the player remains connected</i>, without someone having to hand-author that particular experience in advance.

## Existing context and firm constraints

- There is already a working Minecraft Paper server on a <b>Raspberry Pi 5</b>, with at least one existing server modification. Codex must inspect and preserve the existing environment rather than assume a blank server.
- The user plays on a <b>Nintendo Switch 2 running an unmodified Minecraft Bedrock client</b>, connected to the server (Geyser or equivalent existing compatibility path, as found).
- <b>No client modifications</b> are required. Playing, exploring and interacting must work with ordinary Minecraft controls.
- <b>No required disconnections or reconnections during an experience.</b> New worlds, structures, representations and NPC behaviours should appear while players remain connected. Newly introduced custom graphics that require an additional client resource-pack download are not a dependency for the core experience; existing or preloaded assets may be reused.
- <b>All additional server infrastructure and workload execution runs on the Raspberry Pi initially.</b> No new cloud VMs, cloud functions, remotely hosted simulations or paid inference services are required. Codex may continue using the user's existing cloud-backed Codex access: this is not a requirement for offline model inference.
- <b>Slow generation is acceptable. Frozen gameplay is not.</b> The experience stays playable while generation and reasoning proceed. There is no initial requirement to generate elaborate scenes within seconds.
- The implementation approach is intentionally unspecified. Codex has discretion to select and evolve the architecture, components, tools and conventions after inspecting the existing setup. The requirements below describe observable behaviour, not an implementation prescription.

## Experience: what the player can do

### 1. Ask for a world about an idea

The player can express an open-ended request such as “Help me understand the Ship of Theseus”, “Show me how a supply chain works”, or “Make the differences between these moral theories tangible”. The engine interprets the learning or exploration goal and creates an explorable, interactive representation.

There is no predefined list of permitted topics, fixed scenarios, or required templates. The system can start with a rough interpretation and revise it after feedback. It should be able to explain what real-world concept each important element represents.

### 2. Collaborate through language and spatial actions

The player can direct Codex from a connected phone or computer while using normal Minecraft controls on the Switch. Codex can respond to requests such as “Build it over here”, “What is this meant to represent?”, “Make this more like X”, “Compare these two explanations”, “Move that structure”, and “Try the opposite assumption”.

The player can identify locations and objects by pointing, moving, placing or removing marker blocks, and interacting with the world. Where feasible, the system interprets these cues rather than requiring the player to type coordinates. If a reference is ambiguous, it asks for a specific clarification instead of changing the wrong object.

The player can modify relevant parts of a representation and observe appropriate responses. Physical actions and verbal requests both contribute to the same evolving experience.

### 3. Generate genuine interactive thought experiments

A representation is more than an illustration. Where the concept involves consequences or rules, the player should be able to manipulate assumptions or state and see meaningful changes.

Examples: replace the parts of an object, compare rival arrangements, intervene in an economy, change the conditions in a scientific experiment, or test a counterexample to an argument.

The engine clearly distinguishes <b>simulation output</b>, <b>stipulated assumptions</b>, <b>historical claims</b>, <b>metaphors</b>, and <b>speculative interpretations</b>. Where a visualization is only an analogy, it must not imply that the analogy proves a philosophical or scientific conclusion.

### 4. Interact with characters

The world can include conversational NPCs representing philosophers, fictional characters, scientists, citizens or original agents. They can have recognizable roles, goals, dispositions, knowledge, relationships, routines and permitted actions.

NPCs should act in ways consistent with their role, interact with the environment, and, where possible, help create or modify demonstrations. Basic actions and schedules can continue without constant language-model consultation; more complex situations can invoke AI reasoning. Unusually sophisticated AI is <b>not</b> a prerequisite for the first successful experience.

Historical figures must be presented as <b>AI interpretations</b>, not authentic historical conversations. They should distinguish documented positions from invented dialogue and identify uncertainty or disagreement when that matters.

### 5. Explore and transform without leaving the world

The player can walk or fly around generated scenes, move among levels of abstraction, and request deeper or broader views: for example, from firms in an economy to departments within a firm to individual machines; or from an argument to one premise and its counterexamples.

The engine can extend, rework or transform the current experience as the conversation evolves. It should support unexpected creative directions rather than confining the player to a scripted path.

### 6. Make slow work understandable and controllable

Complex generation may take time. The player should receive understandable feedback that an instruction has been accepted, what is being built or changed, and whether work has completed, failed or been cancelled.

Useful partial results become visible as they are generated. Long-running creation should not monopolize the Pi or interfere with movement and ordinary interactions. If something takes too long or fails, the user can continue playing, revise the request, cancel the work, or resume later where practical.

Existing creations should not be carelessly overwritten. There should be a practical way to preview or constrain risky changes, and to undo or restore significant generated alterations.

### 7. Remember and reuse meaning

The world should remember what its important entities, structures, interactions and relationships <i>mean</i>, as well as what they look like. A harbour can represent an identity thought experiment; a bridge can represent an implication; a factory can represent a production process.

The player can ask why an object is present, what it represents, and how it relates to surrounding objects. Changes to the scene should preserve or intentionally revise those meanings.

Experiences and progress can persist across sessions, so players can resume a previously explored idea and iterate further.

### 8. Support shared exploration

The engine should allow multiple players to explore the same world, interact with the same demonstrations and collaborate. Shared changes should be intelligible and avoid disrupting other players unexpectedly. Experiences used with children should be understandable and age-appropriate without requiring the engine's entire scope to be child-oriented.

## Core quality expectations

- <b>Generality:</b> New concepts can be represented without writing a bespoke scenario for each request.
- <b>Responsiveness:</b> Normal Minecraft movement and play remain responsive during generation; reasoning and construction may be slow.
- <b>Continuity:</b> No reconnection or server restart should be required for ordinary creation, revision, interaction or NPC activity.
- <b>Intelligibility:</b> Users can understand what objects signify and why changes occur.
- <b>Correctability:</b> Users can challenge the engine's interpretation and get a revised demonstration.
- <b>Epistemic clarity:</b> Claims, assumptions, analogies and generated fiction remain distinguishable.
- <b>Resilience:</b> Work and world state are recoverable after a failure or disconnect where feasible, without corrupting the existing world.
- <b>Compatibility:</b> Core interactions work on the vanilla Switch 2 client through the existing server.
- <b>Autonomy:</b> Codex can choose technical solutions without being constrained to a particular plugin, state machine, generation library or storage format.

## First end-to-end demonstration: Ship of Theseus

<b>Initial state:</b> The user is already connected to the existing Minecraft server from their Switch 2.

1. The user tells Codex: “Build me a Ship of Theseus thought experiment that I can explore.”
2. Without asking the player to leave the server, the engine begins constructing a recognizable harbour and ship using whatever client-compatible means it can support. If it takes minutes, that is acceptable as long as gameplay continues and progress is apparent.
3. The user can approach the ship, discover what its components represent and replace individual planks or analogous components.
4. The world keeps track of which components have been replaced and can help the user reconstruct a second ship from the originals.
5. A philosopher NPC (or an equivalent in-world interactive guide, if NPC dialogue is not yet mature) discusses identity through continuity, material composition and other relevant interpretations, without asserting that a disputed position is settled.
6. The user challenges the demonstration: “Show why replacing all the planks might or might not change the identity of the ship.” The engine adapts the demonstration or creates a contrasting one.
7. The player can point to or mark an area for a new structure and direct Codex to build there without providing raw coordinates, where practical.
8. The user can ask what a structure means, revise it, and continue exploring without reconnecting.
9. The session can be revisited with its important content and meanings preserved.

<b>What counts as success:</b> An actual connected user completes this interaction with an understandable, genuinely manipulable thought experiment and at least one meaningful mid-session revision. The scene need not be photorealistic, NPC dialogue need not be sophisticated, and scene generation need not be fast. The experience must not require hand-coded Ship-of-Theseus-specific logic as the only way to work.

## Second demonstration: transfer to a novel idea

After the first demonstration is working, give the same system a new concept <i>not used to design or test the first scene</i>—for example, a supply-chain bottleneck or a causal argument.

The engine must produce a relevant spatial demonstration that includes at least one meaningful user intervention, explains its own representational choices and can be revised through conversation. This test checks that the engine is a generative platform rather than a disguised one-off ship-building feature.

## Desired development progression (outcomes, not implementation instructions)

1. <b>Prove live collaboration:</b> Codex understands a player's position or spatial cue and creates/changes something visible while the Switch remains connected.
2. <b>Prove explainable semantics:</b> A generated object has a describable conceptual meaning that survives ordinary revisions.
3. <b>Prove interaction:</b> A user action changes a representation in a conceptually meaningful way.
4. <b>Prove the complete thought experiment:</b> Ship of Theseus scenario satisfies the first end-to-end demonstration.
5. <b>Prove generality:</b> A genuinely new concept passes the transfer demonstration without bespoke implementation.
6. <b>Extend depth:</b> richer NPCs, deeper simulations, stronger historical grounding, persistent learning, multiplayer and more sophisticated transformations.

Codex may change the sequencing and technical approach if it finds a better way to reach these observed outcomes.

## Explicitly deferred

- New cloud infrastructure, scalable cloud simulations, cloud functions or cloud VMs.
- A requirement for completely local/offline frontier-model inference.
- Arbitrary new graphical assets that must be downloaded mid-session.
- A polished, high-fidelity reproduction of any particular movie, game or historical setting.
- Guaranteed low latency for elaborate generation or sophisticated NPC reasoning.
- Prescribing a specific Paper plugin implementation, coding framework, world-building algorithm or AI agent topology.

## Start here: instruction to Codex

Inspect the existing Raspberry Pi Paper/Geyser setup, its current server modifications and available resources. Preserve working functionality. Choose the simplest robust path that advances the behavioural outcomes above, and independently determine the implementation details. Start with an observable live in-game change driven by a request from outside Minecraft; then grow toward the interactive Ship of Theseus and novel-concept tests.

At each meaningful milestone, demonstrate what can be performed from the actual vanilla Switch 2 client, document observed limitations and distinguish verified capability from proposed future capability. Keep the broader general-purpose vision intact while delivering an end-to-end vertical slice.

# Iron Man personality chat

Owner: dadeto-yar4. User explicitly requests the existing automatic Luna brain
handle conversation with Iron Man's personality, in addition to building.

Reuse the same strict JSON decision schema, exact gpt-6-luna/low ChatGPT runtime,
private request/decision/result bridge and last-six-exchanges memory. No separate
model, API key, provider or visible Codex task was added. A chat request returns
speech with empty boxes; both the Python boundary and native server reject
construction attributed to chat. The actual model probe returned an in-character
introduction with action idle / boxes empty; reports/ironman/chat-probe-result.json.

Owner commands: /ironman chat <message>, or natural addressed chat such as
"Iron Man, what should we build here?". The Paper AsyncChatEvent listener recognizes
only the assigned owner's prefix, cancels that addressed public message, and
schedules the private request on the main thread. Ordinary chat remains normal.
Responses are private to the owner. The native Conversation parser tests names,
comma/colon, case and non-addressed messages. General model outputs remain bounded
at240 characters, without chat control characters or formatting injection.

Conversation can proceed while a preview or build is active. It does not alter
follow/scan mode. Explicit build/preview/revise commands still authorize edits.
Native apply now validates ownership, age and cancellation for all request replies,
not just construction, preventing late replies from a removed request. Parked
companions explain how to turn them on rather than silently queueing new requests.

Seven Python checks pass, including chat/build separation under an attempted model
construction output and chat scheduling while the construction engine is busy, including skipping an earlier queued build so it cannot starve conversation.
Native compile runs Conversation and FollowPosition pure checks. FollowPosition
keeps a station ahead/right, holding world position while the player turns; the
native integration adds a stationary-turn assertion. Prior skin failure is fixed
and the user confirmed visibility; the exact UV model preview was shown in chat.

Runtime installer must copy BOTH controller.py and brain.instructions.md, then
restart the rootless controller. The plugin listener requires a plugin/server
restart; apply only while no players are connected. Preserve brain-memory.json,
owner configuration, journals and existing semantic scenes. Native/service proof
and model probes do not substitute for observing a real player's addressed chat
and the private reply; retain that client boundary in the acceptance evidence.

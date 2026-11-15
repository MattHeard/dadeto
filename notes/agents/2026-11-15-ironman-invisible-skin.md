# Invisible Iron Man: test the actual Geyser skin gate

Owner: dadeto-yar4. Switch screenshot21200 and the attached 20:39 clip show
hover particles with no avatar. Existing native mannequin spawn/distance checks
had passed, but live context reported skinPackets=0. Native Paper entity existence
is not evidence of a rendered Bedrock player or an applied skin override.

The exact bootstrap URL chosen for the mannequin matched Geyser's reserved
DEFAULT_FLOODGATE_STEVE sentinel. In the pinned source, SkinManager.GameProfileData.from
returns null for that URL, and SkinProvider.requestSkinData takes its fallback
before firing SessionSkinApplyEvent. Thus the custom RGBA hook was never reached.
An HTTP200 check alone cannot catch this semantic filter.

Extracted the production profile to a bundled profile.json, replaced the sentinel
with a content-addressed Mojang texture obtained from the public MHF_Steve profile,
and registered npcId inside the spawn consumer before network visibility. The
bootstrap image only enables the pipeline; the event still injects the local
64x64 red/gold skin and wide geometry. First matching override is now logged.
The counter measures hook applications, not client acknowledgements/rendering.

The focused check-skin.sh copies an isolated test into the pinned Geyser checkout,
runs its actual profile decoder and GameProfileData.from offline using cached
Gradle dependencies, and removes only its own temporary test on exit. A minimal
mocked bootstrap supplies WebUtils' static config-folder requirement; the skin
gate itself is real. The previous sentinel remains a negative control and the
bundled texture is checked for opaque head/body/limbs.

Before fix: 3 tests, 1 exact assertion failure, production profile filtered before
SessionSkinApplyEvent. Evidence reports/ironman/skin-before.log. After fix acceptance:
same three tests must pass, native plugin build must pass, bundled profile must
match the jar and deployed jar, existing progress must remain intact, local check
and exact-head Full Check must pass. Switch rendering still requires a reconnect
and user observation; a nonzero override counter alone does not prove rendering.

Next time: verify placeholder handling in the actual bridge, not only URL reachability
or native entity spawning. Keep client acceptance separate from server-only tests.

The user also requested an image preview during diagnosis. render_skin.py projects
the bundled pixels onto classic wide Minecraft cuboids, producing front and
three-quarter views in reports/ironman/iron-man-preview.png. Pillow/DejaVu Sans
are optional preview-only dependencies; the game/controller runtime does not
require them. The generated image was visually inspected and shown in chat.

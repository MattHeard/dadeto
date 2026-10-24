# Threefold player badge hidden by HUD

- **Unexpected hurdle:** Several earlier sprite and color changes were deployed, but the player still reported that residents and Mara were hard to tell apart.
- **Diagnosis:** Inspecting the actual 160×144 renderer frame showed Mara's `YOU` badge at y=14 underneath the Tide, menu, and action HUD. The NPC badge was visible, so prior tests that only asserted both role markers existed missed the final layer overlap.
- **Fix:** Place Mara's cyan badge beside her sprite below the HUD, route a short leader to her, avoid other character shapes, and append the badge after HUD layers. Add a renderer regression for the visible location, actor separation, and leader connection.
- **Next time:** Inspect the composed frame or a phone-size capture after any role-marker change. Shape-presence assertions alone do not prove the marker survives later HUD layers. Live phone-size confirmation is still needed after deployment.

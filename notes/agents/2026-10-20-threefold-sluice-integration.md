# THREEFOLD Sluice Integration Retrospective

- **Unexpected hurdle:** The new scene split exposed weak simulation typings, and repeated canvas shape literals crossed the zero-clone boundary. The aggregate check also used all-unit serial fallback because the loop changed toy documentation.
- **Diagnosis:** `tsdoc:check` showed the nested scene discriminator was not reflected consistently in constructor, reducer, renderer, and save types. The duplication report pointed to repeated wall and basin shapes, plus the two scene spawn configurations.
- **Chosen fix:** Added scene-specific simulation overloads and a guard, typed each restore branch with its concrete scene, shared spawn setup, and reused Mosslight's rectangle payload helper. No clone suppression was added.
- **Next-time guidance:** For another THREEFOLD region, add an explicit scene state type and constructor overload before wiring render/save consumers. Model repeated pixel art as values passed to shared canvas helpers, then run the focused scene tests, build, and `npm run check`.

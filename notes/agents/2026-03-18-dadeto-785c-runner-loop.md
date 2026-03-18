# dadeto-785c runner loop

- unexpected hurdle: the first candidate test I inspected (`setPermanentData`) was already mostly behavior-driven, so I had to switch to a clearer whole-object assertion surface.
- diagnosis path: I narrowed the search to `test/toys/2025-03-29/getBaitOptions.test.js`, confirmed it only asserted one whole object, and checked the corresponding fishing game implementation to keep the change local.
- chosen fix: replaced the object-equality check with explicit assertions for presence, description, and modifier.
- next-time guidance: prefer the smallest test with a single opaque object comparison; if the first candidate is already behavior-style, move immediately to the next snapshot-like assertion instead of expanding the search.

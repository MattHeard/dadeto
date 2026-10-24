# Threefold compact role markers — 2026-10-24

- Unexpected hurdle: after correcting the watchkeeper's 0.55 m authored stature, a real phone-sized capture still looked crowded; 38×18 and 46×20 text plaques overwhelmed the tiny characters.
- Diagnosis: large rectangles and glyphs drew attention away from the body silhouettes, so color and role text were not enough for quick recognition.
- Fix: remove the text plaques and resident headpiece. Use a 12×12 cyan arrow for Mara, connected by a short cyan line, and a 14×14 magenta diamond with a pale center for residents. Both stay on the 2px grid and clear the sprites. Preserve the adult watchkeeper height and its scale-response behavior.
- Evidence: focused Threefold renderer Jest passed 45/45; `npm run check` passed all 10 gates across six impact shards; `npm run build`, `npm run tsdoc:check`, and `git diff --check` passed. A rendered native-size frame shows the bodies without plaques. Production phone-size review of this new layout is still open.
- Next: deploy and review a fresh live phone-sized capture before closing `dadeto-pajf`.

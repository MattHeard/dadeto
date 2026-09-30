# Failure Modes — Mosslight Valley

- **Blog key is hand-authored:** generate it with `generateBlogKey` using all existing post keys; current title resolves to `MOSS1`.
- **Toy and page diverge:** keep rules in the shared simulation and have both adapters call the same runtime.
- **Toy appears blank:** verify the module returns a JSON frame payload and its paths are copied by the normal build.
- **Save import silently corrupts progress:** reject malformed envelopes and migrate only recognized v1 saves.
- **Pointer leaves a held touch action stuck:** release actions on pointer-up, cancel, and lost capture.
- **Background tab advances the world:** pause on hidden/blur and reset frame timing when resumed.
- **Story gate appears impossible:** inspect required flags, quest prerequisites, and adjacent interaction coordinates in authored map data.
- **Audio blocks play:** audio is optional and synthesized only after a user gesture.

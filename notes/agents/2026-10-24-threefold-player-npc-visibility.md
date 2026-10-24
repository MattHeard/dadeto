# Threefold player and NPC sprite visibility

- Unexpected hurdle: role badges and distinct palette metadata were present, but the player still looked like a resident at handheld scale.
- Diagnosis: Mara's Mosslight one-pixel sprite shapes lacked `spriteGridSize`, so final frame alignment used the default 8px world grid. NPC sprites already declared the 2px subgrid.
- Fix: render Mara's sprite pixels on the 2px subgrid and outline Mara in gold while outlining NPCs in cyan. Assert the final aligned frame's player grid, role labels, and outline colors.
- Next-time guidance: when a Threefold frame shape is generated from Mosslight sprite art, set its intended `spriteGridSize` explicitly; otherwise `snapCanvasShapesToGrid` applies the 8px default and can distort character silhouettes.

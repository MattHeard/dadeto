# Supply-chain Nowcasting JSON Exchange

The interactive planner now accepts the documented scenario shape as pasted JSON or a local JSON file. Imports are validated by the pure planner before replacing the active scenario; failures keep the current plan. The response export includes the source scenario, baseline, hypothetical signal, every ranked candidate, ranking criterion, constraints, provenance, uncertainty notes, and advisory-only status. The content page supplies local-file and download effects through a focused data adapter.

The first scoped coverage run exposed both duplicated severity-toggle logic and unexercised file/export error paths. Share the severity transition helper and cover empty file selections, default and injected readers, invalid input preservation, unavailable export state, and thrown adapter errors. This keeps changed-core coverage complete and the jscpd gate at zero clones.

The documented CSV shape is still outstanding; keep it in a separate input-format loop so JSON validation and the export envelope remain stable.

# Supply-chain nowcasting CSV import

- Unexpected hurdle: `manuals:check` failed because adding a top-level CSV heading split the required Output section from its Example subsection.
- Diagnosis: inspected `scripts/check-toy-manuals.js`; it bounds Output content at the next top-level heading and requires `### Example` inside that section.
- Chosen fix: kept the CSV format as a subsection below the Output example and made the Jest presenter suite import the exact CSV block from the manual.
- Implementation: added record-oriented CSV parsing with quoted commas and escaped quotes, file and pasted import through the same planner validation, explicit diagnostics for malformed rows and missing records, and preservation of the active plan on failure.
- Evidence: 43 presenter tests passed; changed-core impact coverage passed with 0 uncovered lines and branches and 0 clones; `npm run manuals:check` validated 86 manuals; `npm run build` passed; `npm run check` passed all 10 gates.
- Next time: keep manual subsection hierarchy in mind when adding material to generated toy manuals, and add executable fixture tests so examples cannot drift from accepted input.
- Open: optional industry identifiers, Stryker review, and hands-on under-two-minute usability evidence remain for the Rank 10 spec.

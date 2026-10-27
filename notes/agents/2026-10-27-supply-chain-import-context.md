# Imported supply-chain context

The dataset import worked, but HTML still claimed a five-day Market sample regardless of the active horizon, destination or demand. The duration input also imposed max10 although the documented positive-integer schema permits longer disruptions.

Update context text on every valid render from active scenario/provenance, keep default synthetic-sample labels, and use generic hypothetical wording for imported inputs. A module helper handles context formatting and optional labels; extracting it kept the existing44-statement constructor limit unchanged. Remove the artificial duration maximum. The custom fixture proves harbor/horizon3/demand14/starting stock3/duration20/warning6, while the optional-label case still renders a valid plan.

Evidence:48 presenter tests and complete changed-file lines/branches; ESLint/core parse and zero clones; npm run check10/10 and build passed. Owning Bead dadeto-fbd1. Current-code cloud artifact inspection remains pending; the scheduled run40449922217 verified create-only GCS uploads but exposed a separate infra-versus-workspace artifact-transfer path mismatch, owned by dadeto-en6p.

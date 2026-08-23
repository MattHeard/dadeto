# SKUE2 — SKU Existing-Stock Fulfillment Feasibility

SKUE2 filters assets by exact SKU, sorts matching asset IDs lexically, and delegates each candidate to EXIS2. It returns true as soon as one complete asset fulfillment sequence is feasible. It supersedes SKUE1, which remains available historically.

The query creates no reservation, allocation, assignment, or offer. Inputs are JSON containing `requestedSku`, assets, proposal, points, and space points.

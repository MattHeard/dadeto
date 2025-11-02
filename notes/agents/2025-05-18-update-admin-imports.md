# Redirecting ADMIN_UID consumers to common-core

- **What surprised me:** Updating the constant location forced me to touch more wrapper modules than expected—`rg` showed multiple re-export shims scattered across the browser and Cloud Function trees. I also had to be careful not to edit the generated `public/` copies even though they still reference the older path.
- **How I handled it:** I replaced every source import that referenced `admin-config.js` with a direct `common-core.js` import and updated the shim modules to re-export from the new location. Running the full Jest suite confirmed nothing else depended on the legacy path, and I reverted a few incidental formatting changes that snuck in from existing lint rules.
- **What I'd watch next time:** Re-run lint before committing so any auto-format drift is intentional, and double-check for generated mirrors (`public/`) before applying project-wide replaces.

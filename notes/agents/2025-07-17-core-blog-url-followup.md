# Core blog URL follow-up

- **Challenge:** The prior change injected the blog data URL from the entry layer, but reviewers clarified the path is internal knowledge for the core module.
- **Resolution:** Re-centered the URL as a core constant and removed the entry-level overrides while keeping tests focused on the default fetch behavior.

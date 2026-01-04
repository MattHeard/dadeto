# Utility Scripts

This folder contains helper scripts for managing SonarCloud reporting and Docker Compose. The legacy `run-sonar.sh` workflow and `docker/sonar` image were removed once they outlived their usefulness.

## Scripts

### `install-docker-compose.sh`
Installs the Docker Compose v2 CLI plugin locally if `docker compose` is not already available. The script downloads the plugin to `~/.docker/cli-plugins` and marks it executable.

### `get-sonar-issues.sh`
Fetches unresolved SonarCloud issues and per‑file duplication metrics for the project. Requires the `SONAR_TOKEN` environment variable to contain a SonarCloud API token with the `api` scope. The results are written to `reports/sonar/issues.json` and `reports/sonar/duplications.json`.

## Usage

Run each script directly from the repository root, for example:

```bash
SONAR_TOKEN=xxxxxxxx ./src/scripts/get-sonar-issues.sh
```

The scripts assume their working directory is the repository root so relative paths resolve correctly.

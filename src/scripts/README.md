# Utility Scripts

This folder contains helper scripts for managing SonarQube analysis and Docker Compose.

## Scripts

### `install-docker-compose.sh`
Installs the Docker Compose v2 CLI plugin locally if `docker compose` is not already available. The script downloads the plugin to `~/.docker/cli-plugins` and marks it executable.

### `run-sonar.sh`
Bootstraps and runs a local SonarQube server using Docker, then executes the SonarScanner CLI. The script builds a custom image from `docker/sonar` if needed, starts the container, waits until it is healthy, and ensures a CI token exists. After scanning the repository, it exports unresolved issues to the `reports/sonar` directory.

### `get-sonar-issues.sh`
Fetches unresolved SonarCloud issues and per‑file duplication metrics for the project. Requires the `SONAR_TOKEN` environment variable to contain a SonarCloud API token with the `api` scope. The results are written to `reports/sonar/issues.json` and `reports/sonar/duplications.json`.

## Usage

Run each script directly from the repository root, for example:

```bash
SONAR_TOKEN=xxxxxxxx ./src/scripts/get-sonar-issues.sh
```

The scripts assume their working directory is the repository root so relative paths resolve correctly.

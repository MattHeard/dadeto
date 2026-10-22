# Local Command Entry Points and Utilities

Put local command entry points, environment adapters, and local-only utilities here. Keep reusable behavior in `src/core/local/`; avoid creating another source-level scripts area. This folder also contains helper scripts for managing SonarCloud reporting and Docker Compose. The legacy `run-sonar.sh` workflow and `docker/sonar` image were removed once they outlived their usefulness.

## Scripts

### `install-docker-compose.sh`
Installs the Docker Compose v2 CLI plugin locally if `docker compose` is not already available. The script downloads the plugin to `~/.docker/cli-plugins` and marks it executable.

### `get-sonar-issues.sh`
Fetches unresolved SonarCloud issues and per‑file duplication metrics for the project. Requires the `SONAR_TOKEN` environment variable to contain a SonarCloud API token with the `api` scope. The results are written to `reports/sonar/issues.json` and `reports/sonar/duplications.json`.

### `replay_pythia_native_activation.py`
Runs the pinned public EleutherAI Pythia-14M checkpoint on CPU, captures the 512 post-GELU native MLP units at one fixed token position, and compares two identical forward passes. The script verifies the model revision and Safetensors SHA-256 before inference. Its JSON output keeps token positions distinct from recurrent-step identities and contains two separate observations for each unit. It does not call or write to Neuronpedia.

Use Python 3.13 in an isolated environment with the fully pinned `requirements-pythia-native-replay.txt`, then run:

```bash
python3.13 -m venv .tmp/pythia-replay-venv
.tmp/pythia-replay-venv/bin/python -m pip install \
  -r src/local/requirements-pythia-native-replay.txt
.tmp/pythia-replay-venv/bin/python src/local/replay_pythia_native_activation.py \
  --output notes/agents/pythia-14m-native-activation.json
```

The first run downloads only the pinned 28,143,920-byte model weights plus the model configuration and tokenizer files. `test_replay_pythia_native_activation.py` uses only the Python standard library and can run without installing model dependencies.

## Usage

Run each script directly from the repository root, for example:

```bash
SONAR_TOKEN=xxxxxxxx ./src/local/get-sonar-issues.sh
```

The scripts assume their working directory is the repository root so relative paths resolve correctly.

#!/usr/bin/env python3
"""Capture and repeat one pinned Pythia-14M native MLP activation vector."""

import argparse
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
import math
from pathlib import Path
import platform
import subprocess
import sys


MODEL_ID = "EleutherAI/pythia-14m"
MODEL_REPOSITORY = f"https://huggingface.co/{MODEL_ID}"
CHECKPOINT_REVISION = "94f7c35d5e9f2e9bac8ca839329f505b4d007d5d"
WEIGHTS_FILENAME = "model.safetensors"
WEIGHTS_SIZE = 28_143_920
WEIGHTS_SHA256 = "116a02532db461f91386a5b20f942ff2c8d4de7341e21b55caafc3d7b25f49a1"
TRANSFORMERS_VERSION = "4.45.2"
TOKENIZERS_VERSION = "0.20.3"
SAFETENSORS_VERSION = "0.5.2"
TORCH_VERSION = "2.6.0+cpu"
LAYER_INDEX = 0
NEURON_COUNT = 512
ACTIVATION_HOOK = (
    "gpt_neox.layers.0.mlp.dense_h_to_4h.output+configured-gelu"
)
CAPTURE_MODULE = "gpt_neox.layers.0.mlp.dense_4h_to_h.input"
INPUT_TEXT = "The archive holds a quiet map."


def canonical_json(value):
    """Serialize JSON deterministically for stable research identifiers."""
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )


def stable_identifier(kind, value):
    """Return a namespaced ID derived from a canonical JSON value."""
    digest = hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()
    return f"atlas:v1:{kind}:{digest}"


def pinned_model():
    """Return the model and tokenizer identity used by this runner."""
    return {
        "modelId": MODEL_ID,
        "repository": MODEL_REPOSITORY,
        "revision": CHECKPOINT_REVISION,
        "architecture": "GPTNeoXForCausalLM",
        "tokenizer": {
            "repository": MODEL_REPOSITORY,
            "revision": CHECKPOINT_REVISION,
        },
    }


def native_neuron_component(neuron_index):
    """Build one stable native MLP coordinate for the pinned checkpoint."""
    identity = {
        "model": pinned_model(),
        "sourceId": MODEL_ID,
        "layerIndex": LAYER_INDEX,
        "activationHook": ACTIVATION_HOOK,
        "neuronIndex": neuron_index,
    }
    return {
        "schemaVersion": 1,
        "id": stable_identifier("native-neuron", identity),
        "kind": "native-neuron",
        **identity,
    }


def input_sequence_identifier(input_ids):
    """Identify exact tokenizer output without conflating prompt text and tokens."""
    return stable_identifier("input-sequence", {"tokenIds": input_ids})


def token_activation_position(component_id, token_position_index):
    """Identify a component's token coordinate independently of any input run."""
    identity = {
        "componentId": component_id,
        "tokenPositionIndex": token_position_index,
    }
    return {
        "schemaVersion": 1,
        "id": stable_identifier("token-activation-position", identity),
        "componentId": component_id,
        "kind": "token",
        "tokenPositionIndex": token_position_index,
    }


def activation_observation(
    component_id,
    activation_position_id,
    experiment_id,
    input_id,
    token_id,
    run_id,
    value,
):
    """Create one input- and run-specific measurement for a stable position."""
    identity = {
        "activationPositionId": activation_position_id,
        "experimentId": experiment_id,
        "inputSequenceId": input_id,
        "runId": run_id,
    }
    return {
        "schemaVersion": 1,
        "id": stable_identifier("activation-observation", identity),
        "componentId": component_id,
        "activationPositionId": activation_position_id,
        "experimentId": experiment_id,
        "inputSequenceId": input_id,
        "tokenId": token_id,
        "runId": run_id,
        "value": value,
        "numericPrecision": "float32",
    }


def compare_activation_vectors(first, second):
    """Compare repeat measurements and reject malformed or nonfinite values."""
    if len(first) != len(second):
        raise ValueError("Repeated activation vectors have different lengths")
    if not first:
        raise ValueError("Activation vector cannot be empty")
    if any(not math.isfinite(value) for value in [*first, *second]):
        raise ValueError("Activation vectors must contain only finite values")
    differences = [abs(left - right) for left, right in zip(first, second)]
    return {
        "exactMatch": first == second,
        "maximumAbsoluteDifference": max(differences),
    }


def package_version(name):
    """Return an installed package version or fail with a useful message."""
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError as error:
        raise RuntimeError(f"Missing pinned runtime dependency: {name}") from error


def verify_runtime():
    """Require the small, explicitly pinned CPU replay environment."""
    expected = {
        "torch": TORCH_VERSION,
        "transformers": TRANSFORMERS_VERSION,
        "tokenizers": TOKENIZERS_VERSION,
        "safetensors": SAFETENSORS_VERSION,
    }
    actual = {name: package_version(name) for name in expected}
    mismatches = {
        name: {"expected": version, "actual": actual[name]}
        for name, version in expected.items()
        if actual[name] != version
    }
    if mismatches:
        raise RuntimeError(f"Runtime versions do not match the replay lock: {mismatches}")
    return actual


def repository_revision(repository_root):
    """Read the repository commit that contains the runner."""
    try:
        return subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repository_root,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unavailable"


def sha256_file(path):
    """Hash a file without retaining its full contents in memory."""
    digest = hashlib.sha256()
    with Path(path).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def capture_repeated_activations():
    """Load the immutable model locally and record the same forward pass twice."""
    import torch
    from huggingface_hub import hf_hub_download
    from transformers import AutoTokenizer, GPTNeoXForCausalLM

    if sys.version_info[:2] != (3, 13):
        raise RuntimeError("This runner is pinned to the Python 3.13 CPU environment")
    versions = verify_runtime()
    run_started_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
    torch.use_deterministic_algorithms(True)
    torch.manual_seed(0)

    weights_path = hf_hub_download(
        repo_id=MODEL_ID,
        filename=WEIGHTS_FILENAME,
        revision=CHECKPOINT_REVISION,
    )
    weights_path = Path(weights_path)
    if weights_path.stat().st_size != WEIGHTS_SIZE:
        raise ValueError("Downloaded checkpoint size does not match the pinned artifact")
    weights_hash = sha256_file(weights_path)
    if weights_hash != WEIGHTS_SHA256:
        raise ValueError("Downloaded checkpoint SHA-256 does not match the pinned artifact")

    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_ID,
        revision=CHECKPOINT_REVISION,
        trust_remote_code=False,
        use_fast=True,
    )
    model = GPTNeoXForCausalLM.from_pretrained(
        MODEL_ID,
        revision=CHECKPOINT_REVISION,
        torch_dtype=torch.float32,
        use_safetensors=True,
        attn_implementation="eager",
        trust_remote_code=False,
    ).cpu()
    model.eval()
    if (
        model.config.num_hidden_layers != 6
        or model.config.intermediate_size != NEURON_COUNT
        or model.config.hidden_act != "gelu"
    ):
        raise ValueError("Loaded model configuration differs from the pinned architecture")
    config_revision = getattr(model.config, "_commit_hash", None)
    if config_revision != CHECKPOINT_REVISION:
        raise ValueError("Loaded model config was not resolved from the pinned revision")

    encoded = tokenizer(
        INPUT_TEXT,
        return_tensors="pt",
        add_special_tokens=False,
    )
    input_ids = encoded["input_ids"].cpu()
    attention_mask = encoded["attention_mask"].cpu()
    token_ids = input_ids[0].tolist()
    if not token_ids:
        raise ValueError("The fixed prompt produced no tokens")
    token_position = len(token_ids) - 1
    captured = {}

    def capture_post_gelu(_module, inputs):
        captured["values"] = inputs[0].detach().to("cpu").contiguous().clone()

    mlp = model.gpt_neox.layers[LAYER_INDEX].mlp
    hook = mlp.dense_4h_to_h.register_forward_pre_hook(capture_post_gelu)

    def run_once():
        captured.clear()
        torch.manual_seed(0)
        with torch.inference_mode():
            model(input_ids=input_ids, attention_mask=attention_mask, use_cache=False)
        values = captured.get("values")
        if values is None or tuple(values.shape) != (1, len(token_ids), NEURON_COUNT):
            raise ValueError("Named MLP hook returned an unexpected activation shape")
        return [float(value) for value in values[0, token_position].tolist()]

    try:
        first = run_once()
        second = run_once()
    finally:
        hook.remove()

    input_id = input_sequence_identifier(token_ids)
    components = [native_neuron_component(index) for index in range(NEURON_COUNT)]
    positions = [
        token_activation_position(component["id"], token_position)
        for component in components
    ]
    script_path = Path(__file__).resolve()
    repository_root = script_path.parents[2]
    procedure_revision = repository_revision(repository_root)
    procedure_sha256 = sha256_file(script_path)
    experiment_identity = {
        "modelRevision": CHECKPOINT_REVISION,
        "inputSequenceId": input_id,
        "procedureSha256": procedure_sha256,
        "procedureRevision": procedure_revision,
        "startedAt": run_started_at,
    }
    experiment_id = stable_identifier("experiment", experiment_identity)
    observations = []
    for repeat_id, vector in (("repeat-1", first), ("repeat-2", second)):
        observations.extend(
            activation_observation(
                component["id"],
                position["id"],
                experiment_id,
                input_id,
                token_ids[token_position],
                repeat_id,
                value,
            )
            for component, position, value in zip(components, positions, vector)
        )

    repeatability = compare_activation_vectors(first, second)
    return {
        "schemaVersion": 1,
        "createdAt": run_started_at,
        "model": {
            **pinned_model(),
            "license": "Apache-2.0",
            "checkpointFile": WEIGHTS_FILENAME,
            "checkpointSizeBytes": WEIGHTS_SIZE,
            "checkpointSha256": weights_hash,
        },
        "procedure": {
            "repository": "https://github.com/MattHeard/dadeto",
            "revision": procedure_revision,
            "path": str(script_path.relative_to(repository_root)),
            "sha256": experiment_identity["procedureSha256"],
        },
        "experimentId": experiment_id,
        "runtime": {
            "python": platform.python_version(),
            "platform": platform.platform(),
            **versions,
            "device": "cpu",
            "dtype": "float32",
            "torchThreads": torch.get_num_threads(),
            "torchInteropThreads": torch.get_num_interop_threads(),
            "deterministicAlgorithms": torch.are_deterministic_algorithms_enabled(),
            "seed": 0,
        },
        "input": {
            "text": INPUT_TEXT,
            "inputSequenceId": input_id,
            "tokenIds": token_ids,
            "capturedToken": {
                "tokenPositionIndex": token_position,
                "tokenId": token_ids[token_position],
            },
        },
        "activation": {
            "kind": "native-neuron",
            "layerIndex": LAYER_INDEX,
            "activationHook": ACTIVATION_HOOK,
            "captureModule": CAPTURE_MODULE,
            "captureSemantics": "input to down-projection after configured GELU",
            "nativeUnitCount": len(components),
            "components": components,
            "positions": positions,
            "observations": observations,
        },
        "repeatability": repeatability,
    }


def main():
    """Run the pinned CPU replay and write its portable JSON artifact."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, help="Path for the activation JSON")
    args = parser.parse_args()
    output_path = Path(args.output)
    record = capture_repeated_activations()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n")
    artifact_hash = sha256_file(output_path)
    print(
        json.dumps(
            {
                "status": "passed" if record["repeatability"]["exactMatch"] else "failed",
                "output": str(output_path),
                "nativeUnitCount": record["activation"]["nativeUnitCount"],
                "observationCount": len(record["activation"]["observations"]),
                "exactRepeat": record["repeatability"]["exactMatch"],
                "maximumAbsoluteDifference": record["repeatability"][
                    "maximumAbsoluteDifference"
                ],
                "artifactSha256": artifact_hash,
            },
            sort_keys=True,
        )
    )
    return 0 if record["repeatability"]["exactMatch"] else 2


if __name__ == "__main__":
    raise SystemExit(main())

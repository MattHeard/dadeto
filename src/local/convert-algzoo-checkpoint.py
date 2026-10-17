#!/usr/bin/env python3
"""Safely convert the pinned, public AlgZoo M16,10 checkpoint to JSON.

The converter reads the known ZIP storage entries directly. It never unpickles
the checkpoint, imports PyTorch, or executes code from the downloaded artifact.
"""

import argparse
import hashlib
import json
import math
import struct
import zipfile
from pathlib import Path


CHECKPOINT_SHA256 = "498bd9a87c469e18e824a78e55c22843c7595776f1bfc2dfe07c36e5616218bb"
DATA_PICKLE_SHA256 = "1a09ccc5d762813a177e1ba215f5fd019593525fb9f6b8c3e37c233a604124d4"
SOURCE_REVISION = "4433f505a90e85a37d35d34f80f6cccf4a37cef4"
ARCHIVE_ROOT = "one_layer_16_hidden_94_acc_2nd_argmax"


def read_values(archive, storage_id, count):
    """Read one fixed-length little-endian float32 storage entry."""
    path = f"{ARCHIVE_ROOT}/data/{storage_id}"
    contents = archive.read(path)
    if len(contents) != count * 4:
        raise ValueError(f"Unexpected byte length for checkpoint storage {storage_id}")
    values = [value[0] for value in struct.iter_unpack("<f", contents)]
    if any(not math.isfinite(value) for value in values):
        raise ValueError(f"Non-finite checkpoint value in storage {storage_id}")
    return values


def convert_checkpoint(source_path):
    """Validate the pinned source archive and return portable model JSON."""
    contents = Path(source_path).read_bytes()
    if hashlib.sha256(contents).hexdigest() != CHECKPOINT_SHA256:
        raise ValueError("Checkpoint SHA-256 does not match the pinned AlgZoo model")

    with zipfile.ZipFile(source_path) as archive:
        members = set(archive.namelist())
        expected = {
            f"{ARCHIVE_ROOT}/data.pkl",
            f"{ARCHIVE_ROOT}/data/0",
            f"{ARCHIVE_ROOT}/data/1",
            f"{ARCHIVE_ROOT}/data/2",
            f"{ARCHIVE_ROOT}/version",
        }
        if members != expected:
            raise ValueError("Checkpoint archive entries do not match the pinned layout")
        pickle_metadata = archive.read(f"{ARCHIVE_ROOT}/data.pkl")
        if hashlib.sha256(pickle_metadata).hexdigest() != DATA_PICKLE_SHA256:
            raise ValueError("Checkpoint tensor metadata does not match the pinned layout")
        if archive.read(f"{ARCHIVE_ROOT}/version") != b"3\n":
            raise ValueError("Unsupported AlgZoo checkpoint archive version")

        input_weights = read_values(archive, 0, 16)
        recurrent_weights = read_values(archive, 1, 256)
        output_weights = read_values(archive, 2, 160)

    return {
        "schemaVersion": 1,
        "source": {
            "repository": "https://github.com/alignment-research-center/alg-zoo",
            "revision": SOURCE_REVISION,
            "license": "MIT-0",
            "loader": "example_2nd_argmax",
            "checkpointUrl": "https://storage.googleapis.com/arc-ml-public/alg/one_layer_16_hidden_94_acc_2nd_argmax.pth",
            "checkpointSha256": CHECKPOINT_SHA256,
        },
        "model": {
            "id": "arc-algzoo/m16-10-second-argmax",
            "architecture": "DistRNN",
            "activation": "relu",
            "hiddenSize": 16,
            "sequenceLength": 10,
            "outputSize": 10,
            "bias": False,
        },
        "parameters": {
            "inputToHidden": {"shape": [16, 1], "values": input_weights},
            "recurrent": {"shape": [16, 16], "values": recurrent_weights},
            "output": {"shape": [10, 16], "values": output_weights},
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("checkpoint", help="Path to the pinned public .pth checkpoint")
    parser.add_argument("output", help="Path for the portable JSON fixture")
    args = parser.parse_args()
    fixture = convert_checkpoint(args.checkpoint)
    Path(args.output).write_text(json.dumps(fixture, indent=2) + "\n")


if __name__ == "__main__":
    main()

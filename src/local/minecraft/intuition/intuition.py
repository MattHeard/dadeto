#!/usr/bin/env python3
"""Private Pi-local scene transport for Codex. No server, model service or client pack."""
import argparse
import datetime
import json
import os
from pathlib import Path
import re
import sys
import time
import uuid


def root_path():
    data = os.environ.get("MINECRAFT_DATA_DIR")
    if not data:
        data = str(Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local/share")) / "dadeto/minecraft")
    return Path(data) / "plugins/DadetoTabletop/intuition"


def read_context(root):
    data = json.loads((root / "context.json").read_text())
    age = datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(data["updatedAt"])
    if age.total_seconds() > 10:
        raise ValueError("Scene context is stale; check that the server is running")
    return data


def publish(root, request):
    name = request.get("id", "")
    if not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", name):
        raise ValueError("Request ID must be lowercase letters, digits and hyphens, starting with a letter")
    body = json.dumps(request, indent=2) + "\n"
    if len(body.encode()) > 65536:
        raise ValueError("Request exceeds 64 KiB")
    folder = root / "inbox"
    if not folder.is_dir():
        raise ValueError("The Intuition Engine is not installed/running yet")
    if (folder / (name + ".json")).exists() or (root / "results" / (name + ".json")).exists():
        raise ValueError("Request ID already used; choose a new ID")
    temp = folder / (name + ".tmp-" + uuid.uuid4().hex)
    try:
        with temp.open("x") as stream:
            stream.write(body)
        # Hard link publishes atomically and refuses a concurrent duplicate ID.
        os.link(temp, folder / (name + ".json"))
    finally:
        temp.unlink(missing_ok=True)
    return name


def wait(root, name, seconds):
    deadline = time.monotonic() + seconds
    previous = None
    while time.monotonic() < deadline:
        path = root / "results" / (name + ".json")
        if path.exists():
            result = json.loads(path.read_text())
            if result != previous:
                print(json.dumps(result), flush=True)
                previous = result
            if result["status"] in ("completed", "cancelled", "rejected"):
                return 0 if result["status"] == "completed" else 1
        time.sleep(0.2)
    raise ValueError("Timed out waiting; the request may still be running. Inspect context/results before retrying")


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=root_path())
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("context")
    submit = sub.add_parser("submit")
    submit.add_argument("file", type=Path)
    submit.add_argument("--preview", action="store_true", help="Show the request without submitting it")
    submit.add_argument("--at-player", help="Translate relative box coordinates to this player's aimed-at block's top face")
    submit.add_argument("--wait", type=int, default=60)
    undo = sub.add_parser("undo")
    undo.add_argument("--wait", type=int, default=60)
    sub.add_parser("cancel")
    args = parser.parse_args()
    context = read_context(args.root)
    if args.command == "context":
        print(json.dumps(context, indent=2))
        return 0
    if args.command == "cancel":
        name = context.get("activeJob", "")
        if context["phase"] != "applying" or not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", name):
            raise ValueError("No applying job in context; if it is already committed, use undo")
        (args.root / "inbox" / (name + ".cancel")).touch(exist_ok=False)
        print("Cancellation requested for " + name)
        return 0
    if args.command == "undo":
        request = {"version": 1, "id": "undo-" + uuid.uuid4().hex, "revision": context["revision"], "action": "undo"}
    else:
        request = json.loads(args.file.read_text())
        if args.at_player:
            players = [p for p in context["players"] if p["name"] == args.at_player]
            if len(players) != 1 or players[0]["world"] != context["world"] or "target" not in players[0]:
                raise ValueError("Player must be online in the lab and aiming at a block within 12 blocks")
            target = list(players[0]["target"])
            target[1] += 1
            for box in request["object"]["boxes"]:
                for end in ("from", "to"):
                    box[end] = [a + b for a, b in zip(box[end], target, strict=True)]
        print(json.dumps(request, indent=2), flush=True)
        if args.preview:
            print("Preview only. Server-side validation has not run.")
            return 0
    name = publish(args.root, request)
    print("Submitted " + name, flush=True)
    return wait(args.root, name, args.wait)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, KeyError, TypeError) as error:
        sys.exit(str(error))

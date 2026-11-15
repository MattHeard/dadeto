#!/usr/bin/env python3
"""Automatic GPT-6-Luna/low planner using existing ChatGPT-authenticated Codex; no API fallback."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid

MODEL = "gpt-6-luna"
BINARY = Path.home() / ".local/share/dadeto/ironman-tools/codex-aarch64-unknown-linux-musl"


def data_root():
    data = os.environ.get("MINECRAFT_DATA_DIR")
    return Path(data) if data else Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local/share")) / "dadeto/minecraft"


def atomic(path, value):
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, indent=2) + "\n")
    os.replace(temp, path)


def validate(value):
    if set(value) != {"action", "speech", "reason", "boxes"}:
        raise ValueError("Decision fields must match the bounded schema")
    if value["action"] not in ("follow", "hover", "scan", "idle", "build", "preview"):
        raise ValueError("Unsupported model action")
    for key, limit in (("speech", 240), ("reason", 400)):
        if not isinstance(value[key], str) or len(value[key]) > limit or any(ord(c) < 32 or c == "§" for c in value[key]):
            raise ValueError("Invalid model " + key)
    if not isinstance(value["boxes"], list) or len(value["boxes"]) > 32:
        raise ValueError("Invalid blueprint boxes")
    expanded = 0
    for box in value["boxes"]:
        if not isinstance(box, dict) or set(box) != {"from", "to", "material"}:
            raise ValueError("Invalid blueprint box")
        for end in ("from", "to"):
            if not isinstance(box[end], list) or len(box[end]) != 3 or any(type(n) is not int or not -16 <= n <= 16 for n in box[end]):
                raise ValueError("Invalid relative coordinate")
        if any(a > b for a, b in zip(box["from"], box["to"])):
            raise ValueError("Inverted box")
        size = 1
        for a, b in zip(box["from"], box["to"]):
            size *= b - a + 1
        expanded += size
        if expanded > 1024:
            raise ValueError("Blueprint exceeds1024 cells")
    if value["action"] in ("build", "preview") and not value["boxes"]:
        raise ValueError("Empty blueprint")
    if value["action"] not in ("build", "preview") and value["boxes"]:
        raise ValueError("Unrequested construction data")
    return value


def command(root, output):
    runtime = Path(__file__).resolve().parent
    return [str(BINARY), "exec", "--ignore-user-config", "--disable", "apps", "--disable", "plugins", "--disable", "shell_tool", "--disable", "unified_exec", "--disable", "in_app_browser", "--disable", "code_mode_host", "--ephemeral", "--skip-git-repo-check", "--sandbox", "read-only", "--model", MODEL, "-c", 'model_reasoning_effort="low"', "-c", 'web_search="disabled"', "-c", 'forced_login_method="chatgpt"', "-c", "model_instructions_file=" + json.dumps(str(runtime / "brain.instructions.md")), "--output-schema", str(runtime / "decision.schema.json"), "--output-last-message", str(output), "--json", "-C", str(root), "-"]


def infer(root, context, request, memory):
    environment = os.environ.copy()
    environment.pop("OPENAI_API_KEY", None)
    environment.pop("CODEX_API_KEY", None)
    output = root / "last-model-decision.json"
    output.unlink(missing_ok=True)
    prompt = json.dumps({"context": context, "request": request, "recent_memory": memory[-6:], "recent_results": [json.loads(p.read_text()) for p in sorted((root / "results").glob("*.json"), key=lambda p: p.stat().st_mtime)[-6:]]})
    completed = subprocess.run(command(root, output), input=prompt, text=True, capture_output=True, env=environment, timeout=120)
    # Private diagnostics contain no auth-file/token dump. No alternate model/provider is attempted.
    (root / "last-model-events.jsonl").write_text(completed.stdout)
    (root / "last-model-stderr.log").write_text(completed.stderr)
    if completed.returncode or not output.exists():
        raise ValueError("Requested GPT-6-Luna/low ChatGPT session failed; inspect private model diagnostics")
    value = validate(json.loads(output.read_text()))
    if (request is None or request.get("mode") == "chat") and value["action"] in ("build", "preview"):
        raise ValueError("Unsolicited construction rejected; chat cannot place blocks")
    return value


def fresh(root):
    context = json.loads((root / "context.json").read_text())
    if time.time() * 1000 - context["updatedAt"] > 10000:
        raise ValueError("Waiting for fresh server context")
    return context


def can_answer(context, request):
    return context.get("construction") == "ready" or (request is not None and request.get("mode") == "chat")


def run(root):
    lock = (root / "controller.lock").open("a+")
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    env = os.environ.copy()
    env.pop("OPENAI_API_KEY", None)
    env.pop("CODEX_API_KEY", None)
    auth = subprocess.run([str(BINARY), "login", "status"], capture_output=True, text=True, env=env, timeout=15)
    if auth.returncode or "ChatGPT" not in (auth.stdout + auth.stderr):
        raise ValueError("ChatGPT subscription login is required; no API-key fallback")
    memory_file = root / "brain-memory.json"
    memory = json.loads(memory_file.read_text()) if memory_file.exists() else []
    last_thought = 0
    online = False
    failed_until = 0
    while True:
        try:
            context = fresh(root)
        except (OSError, ValueError, KeyError):
            atomic(root / "brain-status.json", {"phase": "waiting", "message": "Waiting for Minecraft", "model": MODEL, "effort": "low"})
            time.sleep(5)
            continue
        if not context["ownerOnline"] or not context["enabled"]:
            online = False
            atomic(root / "brain-status.json", {"phase": "paused", "message": "Owner offline or companion parked; no model calls", "model": MODEL, "effort": "low"})
            time.sleep(3)
            continue
        requests = [p for p in sorted((root / "requests").glob("*.json"), key=lambda p: p.stat().st_mtime) if not (root / "results" / p.name).exists() and not (root / "decisions" / p.name).exists()]
        request = json.loads(requests[0].read_text()) if requests else None
        if time.time() < failed_until or (request is None and online and time.time() - last_thought < 120):
            time.sleep(2)
            continue
        if not can_answer(context, request):
            time.sleep(2)
            continue
        online = True
        atomic(root / "brain-status.json", {"phase": "thinking", "message": "Planning a bounded building-assistant intention", "model": MODEL, "effort": "low"})
        try:
            value = infer(root, context, request, memory)
            id_ = request["id"] if request else "think-" + uuid.uuid4().hex
            if request and not (root / "requests" / (id_ + ".json")).exists():
                continue  # Owner cancelled while the model was thinking.
            atomic(root / "decisions" / (id_ + ".json"), {"id": id_, "decision": value, "model": MODEL, "effort": "low", "createdAt": int(time.time() * 1000)})
            memory.append({"request": request["prompt"] if request else "automatic presence check", "decision": value})
            memory = memory[-6:]
            atomic(memory_file, memory)
            last_thought = time.time()
            atomic(root / "brain-status.json", {"phase": "ready", "message": "GPT-6-Luna/low via ChatGPT; local follow guard remains active", "model": MODEL, "effort": "low", "lastDecision": id_})
        except (ValueError, OSError, subprocess.TimeoutExpired) as error:
            failed_until = time.time() + 300
            atomic(root / "brain-status.json", {"phase": "blocked", "message": str(error), "model": MODEL, "effort": "low"})
        time.sleep(2)


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("run", "probe", "probe-chat"))
    parser.add_argument("--root", type=Path)
    args = parser.parse_args()
    root = args.root or data_root() / "plugins/DadetoIronMan"
    root.mkdir(parents=True, exist_ok=True)
    if args.mode == "run":
        run(root)
    else:
        context = {"ownerOnline": True, "position": [0, 64, 0], "palette": ["oak_planks", "stone", "glass"], "radius": 16, "maxBlocks": 1024}
        request = {"prompt": "Build a simple three-block-wide, three-block-high oak wall, one block thick.", "mode": "build", "origin": [4, 64, 0], "ownerPosition": [0, 64, 0]}
        if args.mode == "probe-chat":
            request = {"mode": "chat", "prompt": "Hey Iron Man. Introduce yourself, with a little personality, and tell me how you can help me build."}
        result = infer(root, context, request, [])
        print(json.dumps(result))


if __name__ == "__main__":
    main()

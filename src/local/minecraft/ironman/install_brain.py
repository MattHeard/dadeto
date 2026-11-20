#!/usr/bin/env python3
"""Install an isolated official Codex runtime and the rootless Iron Man brain service."""
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request

from controller import data_root

HERE = Path(__file__).resolve().parent


def main():
    os.umask(0o077)
    settings = dict(line.split("=", 1) for line in (HERE / "runtime.env").read_text().splitlines() if line and not line.startswith("#"))
    tools = Path.home() / ".local/share/dadeto/ironman-tools"
    tools.mkdir(parents=True, exist_ok=True)
    binary = tools / "codex-aarch64-unknown-linux-musl"
    version = subprocess.run([str(binary), "--version"], capture_output=True, text=True).stdout.strip() if binary.exists() else ""
    if version != "codex-cli " + settings["CODEX_VERSION"]:
        with tempfile.TemporaryDirectory(dir=tools) as temp:
            archive = Path(temp) / "runtime.tar.gz"
            urllib.request.urlretrieve(settings["CODEX_URL"], archive)
            if hashlib.sha256(archive.read_bytes()).hexdigest() != settings["CODEX_SHA256"]:
                raise ValueError("Official runtime checksum mismatch")
            with tarfile.open(archive) as bundle:
                member = bundle.getmember(binary.name)
                with bundle.extractfile(member) as source:
                    candidate = Path(temp) / binary.name
                    candidate.write_bytes(source.read())
            candidate.chmod(0o700)
            os.replace(candidate, binary)
    root = data_root() / "plugins/DadetoIronMan"
    runtime = root / "runtime"
    runtime.mkdir(parents=True, exist_ok=True)
    for name in ("controller.py", "brain.instructions.md", "decision.schema.json"):
        shutil.copy2(HERE / name, runtime / name)
    # Use the actual selected data directory; do not depend on the login shell environment.
    data = str(data_root().resolve())
    if any(c in data for c in ('"', '\n', '%', '\\')):
        raise ValueError("Unsupported service path")
    unit = Path.home() / ".config/systemd/user/dadeto-ironman-brain.service"
    unit.parent.mkdir(parents=True, exist_ok=True)
    content = f'''# Managed by Dadeto Iron Man installer
[Unit]
Description=Iron Man building assistant (GPT-6-Luna low via ChatGPT)
After=default.target

[Service]
Type=simple
Environment="MINECRAFT_DATA_DIR={data}"
UnsetEnvironment=OPENAI_API_KEY CODEX_API_KEY
ExecStart=/usr/bin/python3 "{runtime}/controller.py" run
Restart=on-failure
RestartSec=10
UMask=0077
NoNewPrivileges=yes
CPUQuota=50%
MemoryMax=512M
TasksMax=64

[Install]
WantedBy=default.target
'''
    if unit.exists() and not unit.read_text().startswith("# Managed by Dadeto Iron Man installer"):
        raise ValueError("Refusing to replace an unrelated service")
    unit.write_text(content)
    subprocess.run(["systemd-analyze", "--user", "verify", str(unit)], check=True)
    subprocess.run(["systemctl", "--user", "daemon-reload"], check=True)
    subprocess.run(["systemctl", "--user", "enable", "dadeto-ironman-brain.service"], check=True)
    subprocess.run(["systemctl", "--user", "restart", "dadeto-ironman-brain.service"], check=True)
    print("Installed automatic Iron Man brain; existing global Codex installation preserved")


if __name__ == "__main__":
    main()

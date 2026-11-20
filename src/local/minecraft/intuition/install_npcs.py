#!/usr/bin/env python3
"""Install a rootless, bounded local service; source and runtime remain reviewable."""
from pathlib import Path
import shutil
import subprocess
import sys
import intuition as bridge


def unit_quote(path):
    value = str(path)
    if any(ord(c) < 32 for c in value):
        raise ValueError("Invalid service path")
    return '"' + value.replace("%", "%%").replace("\\", "\\\\").replace('"', '\\"') + '"'


def main():
    root = bridge.root_path()
    if not (root / "npcs.json").exists():
        raise ValueError("Deploy persistent NPC roles first with npc_guides.py deploy")
    unit_dir = Path.home() / ".config/systemd/user"
    unit_dir.mkdir(parents=True, exist_ok=True)
    unit = unit_dir / "dadeto-intuition-npcs.service"
    if unit.exists() and "# Managed by Dadeto Intuition Engine" not in unit.read_text():
        raise ValueError("Existing unrelated service; refusing to replace it")
    subprocess.run(["systemctl", "--user", "stop", "dadeto-intuition-npcs.service"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    runtime = root / "runtime"
    runtime.mkdir(mode=0o700, exist_ok=True)
    for name in ("npc_guides.py", "intuition.py"):
        shutil.copyfile(Path(__file__).with_name(name), runtime / name)
    unit.write_text("# Managed by Dadeto Intuition Engine\n[Unit]\nDescription=Dadeto local semantic NPC routines\n\n[Service]\nType=simple\nExecStart=" + unit_quote(sys.executable) + " " + unit_quote(runtime / "npc_guides.py") + " run\nRestart=on-failure\nRestartSec=5\nUMask=0077\nNoNewPrivileges=true\nCPUQuota=10%\nMemoryMax=128M\n\n[Install]\nWantedBy=default.target\n")
    subprocess.run(["systemctl", "--user", "daemon-reload"], check=True)
    subprocess.run(["systemd-analyze", "--user", "verify", str(unit)], check=True)
    subprocess.run(["systemctl", "--user", "enable", "--now", "dadeto-intuition-npcs.service"], check=True)
    print("Installed rootless NPC service with private runtime at " + str(runtime))


if __name__ == "__main__":
    main()

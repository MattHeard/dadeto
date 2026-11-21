"""Install the pinned Chunky libraries and vanilla textures for offline rendering."""
import hashlib
import json
import os
from pathlib import Path
import tempfile
from urllib.request import urlopen


def install(url, target, algorithm, digest):
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as output:
        temporary = Path(output.name)
    try:
        with urlopen(url, timeout=60) as response:
            data = response.read()
        if hashlib.new(algorithm, data).hexdigest() != digest.lower():
            raise ValueError(f"Checksum does not match for {target.name}")
        temporary.write_bytes(data)
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    share = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local/share"))
    root = Path(os.environ.get("CHUNKY_DIR", share / "dadeto/chunky"))
    manifest = json.loads(Path(__file__).with_name("chunky-lock.json").read_text())
    for library in manifest["libraries"]:
        name = library["name"]
        install(f"https://chunkyupdate.lemaik.de/lib/{name}", root / "lib" / name,
                "sha256", library["sha256"])
    texture = manifest["texture"]
    install(texture["url"], root / "textures.jar", "sha1", texture["sha1"])
    print(f"Installed {manifest['name']} in {root}")

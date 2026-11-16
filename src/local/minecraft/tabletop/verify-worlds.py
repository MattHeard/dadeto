#!/usr/bin/env python3
"""Offline hub integrity acceptance: real native routes, unchanged actual player save/scenes."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import tarfile
import time
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'intuition'))
import intuition as bridge
import npc_guides


def digest(value):
    return hashlib.sha256(value).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup', type=Path, required=True)
    parser.add_argument('--expected-scene', type=Path, required=True)
    parser.add_argument('--player', type=uuid.UUID, default=uuid.UUID('00000000-0000-0000-0009-01fedc9f79f9'))
    args = parser.parse_args()
    root = bridge.root_path()
    data = root.parents[2]
    assert not bridge.read_context(root)['players'], 'Run native route checks with no connected players'
    before = json.loads((root / 'state.json').read_text())
    assert before == json.loads(args.expected_scene.read_text()), 'Real semantic progress changed; never reset it to make a test pass'
    records = []
    # Paper26.3 moved these under world/players; preserve older layouts for pinned-version upgrades.
    choices = [('data', 'playerdata', '.dat'), ('stats', 'stats', '.json'), ('advancements', 'advancements', '.json')]
    with tarfile.open(args.backup) as archive:
        for modern, legacy, extension in choices:
            candidates = [data / 'world/players' / modern / (str(args.player) + extension), data / 'world' / legacy / (str(args.player) + extension)]
            path = next((p for p in candidates if p.is_file()), None)
            assert path is not None, 'Player save path missing; stop rather than skipping preservation checks'
            member = './' + path.relative_to(data).as_posix()
            original = archive.extractfile(member).read()
            current = path.read_bytes()
            assert current == original, 'Actual player save differs from backup: ' + str(path)
            records.append({'path': str(path), 'sha256': digest(current), 'matchesBackup': True})
    log = data / 'logs/latest.log'
    offset = log.stat().st_size
    console = npc_guides.Console()
    for command in ('worlds selftest', 'tabletop selftest', 'intuition verify', 'tabletop verify', 'ironman selftest'):
        console.send(command)
    required = ['PASS Hub:', 'PASS: named inventory/', 'Intuition verification: 0 mismatches', 'Tabletop verification: 0 mismatches across 33672 placements', 'PASS IronMan native follower:', 'PASS IronMan integration:']
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        with log.open() as stream:
            stream.seek(offset)
            output = stream.read()
        if all(text in output for text in required):
            break
        time.sleep(.1)
    else:
        raise AssertionError('Native acceptance did not finish; inspect latest.log without clearing retained journals')
    assert 'FAIL:' not in output and 'integration FAILED' not in output, output
    assert before == json.loads((root / 'state.json').read_text()), 'Native checks changed real semantic progress'
    for record in records:
        assert digest(Path(record['path']).read_bytes()) == record['sha256'], 'Test mutated the actual player save'
    print(json.dumps({'result': 'PASS', 'revision': before['revision'], 'playerFiles': records, 'checks': required, 'backup': str(args.backup), 'output': output}, indent=2))


if __name__ == '__main__':
    main()

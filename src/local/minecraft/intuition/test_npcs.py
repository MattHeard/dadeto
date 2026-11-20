"""Safety, presence scheduling and real Linux console-pipe transport regression checks."""
import copy
import importlib.util
from pathlib import Path
import select
import subprocess
import sys
import unittest

spec = importlib.util.spec_from_file_location("intuition_npcs", Path(__file__).with_name("npc_guides.py"))
npcs = importlib.util.module_from_spec(spec)
sys.path.insert(0, str(Path(__file__).parent))
spec.loader.exec_module(npcs)


def state():
    floor = {f"{x},64,{z}": "minecraft:stone" for x, z in ((114, 17), (114, 18), (101, 49), (102, 49))}
    return {"objects": {"npc-philosopher": {"blocks": {}}, "npc-coordinator": {"blocks": {}}, "floor": {"blocks": floor}}, "guides": {"harbor-guide": {"role": "Fictional philosopher"}, "hunt-guide": {"role": "Coordination guide"}}}


class NpcTest(unittest.TestCase):
    def test_actual_console_count_feedback(self):
        import verify_npcs
        self.assertEqual(verify_npcs.counts("[Server thread/INFO]: System chat: Test passed. Count: 1\nTest passed, count: 2"), [1, 2])

    def test_config_bounds_capacity_and_reference_guards(self):
        valid = npcs.defaults()
        self.assertEqual(len(npcs.validate(valid, state())), 2)
        bad = []
        more = copy.deepcopy(valid)
        more["npcs"] *= 2
        bad.append(more)
        for key, value in (("id", "bad,tag=!owned"), ("period", 1), ("route", [[95, 65, 17]]), ("route", [[114, True, 17]]), ("goal", "injected\ncommand"), ("guide", "missing")):
            config = copy.deepcopy(valid)
            config["npcs"][0][key] = value
            bad.append(config)
        for config in bad:
            with self.assertRaises(ValueError):
                npcs.validate(config, state())
        missing = state()
        del missing["objects"]["npc-philosopher"]
        with self.assertRaises(ValueError):
            npcs.validate(valid, missing)
        self.assertEqual(len(npcs.validate(valid, missing, require_links=False)), 2)

    def test_presence_and_clear_station_requirements(self):
        npc = npcs.defaults()["npcs"][0]
        self.assertTrue(npcs.available([114, 65, 17], state()))
        blocked = state()
        blocked["objects"]["floor"]["blocks"]["114,65,17"] = "minecraft:stone"
        self.assertFalse(npcs.available([114, 65, 17], blocked))
        self.assertFalse(npcs.available([115, 65, 17], state()))
        self.assertFalse(npcs.near(npc, {"players": []}))
        for world, position, expected in ((npcs.WORLD, [114, 66, 17], True), ("minecraft:overworld", [114, 66, 17], False), (npcs.WORLD, [150, 65, 60], False)):
            self.assertEqual(npcs.near(npc, {"players": [{"world": world, "position": position}]}), expected)

    def test_commands_are_scoped_and_text_cannot_inject_lines(self):
        npc = npcs.defaults()["npcs"][0]
        fake = state()
        fake["guides"]["harbor-guide"]["role"] = 'quote"\nkill @e'
        command = npcs.spawn(npc, fake)
        self.assertNotIn("\n", command)
        self.assertIn("unless entity @e[type=minecraft:villager,tag=dadeto_npc_philosopher", command)
        self.assertIn("Invulnerable:1b", command)
        self.assertIn("NoAI:1b", command)
        self.assertIn("if block 114 65 17 minecraft:air", command)
        with self.assertRaises(ValueError):
            npcs.Console().send("list\nstop")
        with self.assertRaises(ValueError):
            npcs.Console().send("x" * 3501)

    @unittest.skipUnless(sys.platform == "linux", "Private pipe adapter is Pi/Linux-specific")
    def test_independent_writer_does_not_close_server_input(self):
        child = subprocess.Popen([sys.executable, "-u", "-c", "import sys\nfor line in sys.stdin: print(line.rstrip(), flush=True)", "paper.jar"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
        try:
            console = npcs.Console()
            console.pid = child.pid
            for message in ("first", "second"):
                console.send(message)
                self.assertTrue(select.select([child.stdout], [], [], 3)[0], "Child input unexpectedly closed")
                self.assertEqual(child.stdout.readline().decode().strip(), message)
            self.assertIsNone(child.poll())
        finally:
            child.terminate()
            child.communicate(timeout=3)


if __name__ == "__main__":
    unittest.main()

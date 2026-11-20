"""Exercise atomic/idempotent request publication and stale spatial context."""
import datetime
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("intuition", Path(__file__).with_name("intuition.py"))
transport = importlib.util.module_from_spec(spec)
spec.loader.exec_module(transport)


class TransportTest(unittest.TestCase):
    def test_publication_is_complete_and_refuses_replay(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "inbox").mkdir()
            (root / "results").mkdir()
            job = {"id": "a-job", "revision": 0}
            self.assertEqual(transport.publish(root, job), "a-job")
            self.assertEqual(json.loads((root / "inbox/a-job.json").read_text()), job)
            self.assertEqual(len(list((root / "inbox").iterdir())), 1)
            with self.assertRaises(ValueError):
                transport.publish(root, job)
            (root / "inbox/a-job.json").unlink()
            (root / "results/a-job.json").write_text("{}")
            with self.assertRaises(ValueError):
                transport.publish(root, job)

    def test_rejects_path_escape_and_large_requests(self):
        with tempfile.TemporaryDirectory() as directory:
            for job in ({"id": "../escape"}, {"id": "large", "payload": "x" * 65536}):
                with self.assertRaises(ValueError):
                    transport.publish(Path(directory), job)
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_context_age_is_checked_before_using_player_location(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for seconds, accepted in ((0, True), (20, False)):
                stamp = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=seconds)
                (root / "context.json").write_text(json.dumps({"updatedAt": stamp.isoformat(), "revision": 4}))
                if accepted:
                    self.assertEqual(transport.read_context(root)["revision"], 4)
                else:
                    with self.assertRaises(ValueError):
                        transport.read_context(root)


if __name__ == "__main__":
    unittest.main()

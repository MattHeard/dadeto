"""Controller boundary checks without network calls or Minecraft mutations."""
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import controller as c


class ControllerCheck(unittest.TestCase):
    def test_requested_subscription_model_and_no_tools(self):
        command = c.command(Path('/tmp/ironman'), Path('/tmp/ironman/out.json'))
        self.assertEqual(command[command.index('--model') + 1], 'gpt-6-luna')
        self.assertIn('model_reasoning_effort="low"', command)
        self.assertIn('forced_login_method="chatgpt"', command)
        self.assertIn('--ignore-user-config', command)
        for feature in ('apps', 'plugins', 'shell_tool', 'unified_exec', 'in_app_browser', 'code_mode_host'):
            i = command.index(feature)
            self.assertEqual(command[i - 1], '--disable')

    def test_nondefault_data_directory(self):
        with patch.dict(os.environ, {'MINECRAFT_DATA_DIR': '/tmp/selected-minecraft'}):
            self.assertEqual(c.data_root(), Path('/tmp/selected-minecraft'))

    def test_stale_server_cannot_trigger_model(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            c.atomic(root / 'context.json', {'updatedAt': 0})
            with self.assertRaises(ValueError):
                c.fresh(root)

    def test_invalid_blueprint_limits_and_nonbuilding_payload(self):
        decision = dict(action='build', speech='', reason='', boxes=[])
        for boxes in ([], [{'from': [0, 0, 0], 'to': [16, 16, 16], 'material': 'stone'}], [{'from': [True, 0, 0], 'to': [0, 0, 0], 'material': 'stone'}]):
            with self.subTest(boxes=boxes), self.assertRaises(ValueError):
                c.validate(dict(decision, boxes=boxes))
        with self.assertRaises(ValueError):
            c.validate(dict(decision, action='follow', boxes=[{'from': [0, 0, 0], 'to': [0, 0, 0], 'material': 'stone'}]))

    def test_model_cannot_invent_construction_or_use_api_key(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            def fake_run(command, **kwargs):
                self.assertNotIn('OPENAI_API_KEY', kwargs['env'])
                self.assertNotIn('CODEX_API_KEY', kwargs['env'])
                Path(command[command.index('--output-last-message') + 1]).write_text(json.dumps(dict(action='build', speech='', reason='', boxes=[{'from': [0, 0, 0], 'to': [0, 0, 0], 'material': 'stone'}])))
                return type('Result', (), dict(returncode=0, stdout='', stderr=''))()
            with patch.dict(os.environ, {'OPENAI_API_KEY': 'not-a-real-key', 'CODEX_API_KEY': 'not-a-real-key'}), patch.object(c.subprocess, 'run', side_effect=fake_run):
                with self.assertRaisesRegex(ValueError, 'Unsolicited'):
                    c.infer(root, {}, None, [])


if __name__ == '__main__':
    unittest.main()

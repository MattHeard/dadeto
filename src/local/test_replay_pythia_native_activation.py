"""Offline contract tests for the Pythia native activation runner."""

import unittest

from replay_pythia_native_activation import (
    activation_observation,
    compare_activation_vectors,
    input_sequence_identifier,
    native_neuron_component,
    stable_identifier,
    token_activation_position,
)


class PythiaNativeActivationTests(unittest.TestCase):
    def test_canonical_identity_is_order_independent(self):
        self.assertEqual(
            stable_identifier("probe", {"b": 2, "a": 1}),
            stable_identifier("probe", {"a": 1, "b": 2}),
        )

    def test_native_neuron_ids_are_unique_and_pinned(self):
        first = native_neuron_component(0)
        second = native_neuron_component(1)

        self.assertNotEqual(first["id"], second["id"])
        self.assertEqual(first["kind"], "native-neuron")
        self.assertEqual(first["model"]["revision"], second["model"]["revision"])
        self.assertEqual(first["neuronIndex"], 0)
        self.assertEqual(second["neuronIndex"], 1)

    def test_token_position_is_stable_while_observations_preserve_run_identity(self):
        input_id = input_sequence_identifier([1, 2, 3])
        component_id = native_neuron_component(5)["id"]
        position = token_activation_position(component_id, 2)
        another_input_id = input_sequence_identifier([4, 5, 6])
        same_position = token_activation_position(component_id, 2)
        first = activation_observation(
            component_id,
            position["id"],
            "experiment-a",
            input_id,
            3,
            "repeat-1",
            0.25,
        )
        second = activation_observation(
            component_id,
            same_position["id"],
            "experiment-a",
            input_id,
            3,
            "repeat-2",
            0.25,
        )
        later_experiment = activation_observation(
            component_id,
            same_position["id"],
            "experiment-b",
            another_input_id,
            6,
            "repeat-1",
            0.25,
        )

        self.assertNotEqual(first["id"], second["id"])
        self.assertNotEqual(first["id"], later_experiment["id"])
        self.assertEqual(first["activationPositionId"], second["activationPositionId"])
        self.assertEqual(first["activationPositionId"], later_experiment["activationPositionId"])
        self.assertEqual(first["inputSequenceId"], second["inputSequenceId"])
        self.assertNotEqual(first["inputSequenceId"], later_experiment["inputSequenceId"])
        self.assertEqual(first["numericPrecision"], "float32")

    def test_repeat_comparison_reports_exact_match(self):
        self.assertEqual(
            compare_activation_vectors([-0.25, 0.0, 0.5], [-0.25, 0.0, 0.5]),
            {"exactMatch": True, "maximumAbsoluteDifference": 0.0},
        )

    def test_repeat_comparison_reports_mismatch(self):
        self.assertEqual(
            compare_activation_vectors([1.0, 2.0], [1.0, 2.5]),
            {"exactMatch": False, "maximumAbsoluteDifference": 0.5},
        )

    def test_repeat_comparison_rejects_invalid_samples(self):
        with self.assertRaisesRegex(ValueError, "different lengths"):
            compare_activation_vectors([1.0], [1.0, 2.0])
        with self.assertRaisesRegex(ValueError, "finite"):
            compare_activation_vectors([float("nan")], [0.0])


if __name__ == "__main__":
    unittest.main()

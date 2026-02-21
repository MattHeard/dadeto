module.exports = {
  forbidden: [
    {
      name: "no-core-external-deps",
      comment: "Core must remain pure",
      severity: "warn",
      from: { path: "^src/core" },
      to: { path: "node_modules" }
    },
    {
      name: "no-shell-leakage-into-core",
      severity: "warn",
      from: { path: "^src/core" },
      to: { path: "^src/(browser|cloud|build)" }
    }
  ]
};

import { describe, expect, jest, test } from "@jest/globals";
import {
  createAssignModerationApp,
  isAllowedOrigin,
} from "../../../src/cloud/assign-moderation-job/core.js";

describe("isAllowedOrigin", () => {
  test("allows missing origin headers", () => {
    expect(isAllowedOrigin(undefined, ["https://allowed.example"])).toBe(true);
  });

  test("allows origins present in the whitelist", () => {
    const allowedOrigins = [
      "https://allowed.example",
      "https://second.example",
    ];

    expect(isAllowedOrigin("https://second.example", allowedOrigins)).toBe(
      true
    );
  });

  test("rejects origins not present in the whitelist", () => {
    const allowedOrigins = ["https://allowed.example"];

    expect(isAllowedOrigin("https://disallowed.example", allowedOrigins)).toBe(
      false
    );
  });
});

describe("createAssignModerationApp", () => {
  test("initializes firebase resources and configures the app", () => {
    const dependencies = {
      db: { name: "db" },
      auth: { name: "auth" },
      app: { name: "app" },
    };
    const initializeFirebaseApp = jest.fn(() => dependencies);
    const configureCors = jest.fn();
    const configureApp = jest.fn();
    const allowedOrigins = ["https://allowed.example"];

    const result = createAssignModerationApp(
      initializeFirebaseApp,
      configureCors,
      allowedOrigins,
      configureApp
    );

    expect(initializeFirebaseApp).toHaveBeenCalledTimes(1);
    expect(configureCors).toHaveBeenCalledWith(
      dependencies.app,
      allowedOrigins
    );
    expect(configureApp).toHaveBeenCalledWith(dependencies.app);
    expect(result).toStrictEqual(dependencies);
  });

  test("uses the default configureApp when one is not provided", () => {
    const dependencies = {
      db: { name: "db" },
      auth: { name: "auth" },
      app: { name: "app" },
    };
    const initializeFirebaseApp = jest.fn(() => dependencies);
    const configureCors = jest.fn();
    const allowedOrigins = ["https://allowed.example"];

    const result = createAssignModerationApp(
      initializeFirebaseApp,
      configureCors,
      allowedOrigins
    );

    expect(initializeFirebaseApp).toHaveBeenCalledTimes(1);
    expect(configureCors).toHaveBeenCalledWith(
      dependencies.app,
      allowedOrigins
    );
    expect(result).toStrictEqual(dependencies);
  });
});

import { describe, expect, jest, test } from "@jest/globals";
import {
  createAssignModerationApp,
  isAllowedOrigin,
  configureUrlencodedBodyParser,
  getIdTokenFromRequest,
} from "../../../src/core/cloud/assign-moderation-job/core.js";

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

describe("configureUrlencodedBodyParser", () => {
  test("registers the express urlencoded middleware", () => {
    const middleware = Symbol("middleware");
    const expressModule = { urlencoded: jest.fn(() => middleware) };
    const use = jest.fn();
    const appInstance = { use };

    configureUrlencodedBodyParser(appInstance, expressModule);

    expect(expressModule.urlencoded).toHaveBeenCalledWith({ extended: false });
    expect(use).toHaveBeenCalledWith(middleware);
  });
});

describe("getIdTokenFromRequest", () => {
  test("returns the id token when present on the request body", () => {
    const req = { body: { id_token: "token-value" } };

    expect(getIdTokenFromRequest(req)).toBe("token-value");
  });

  test("returns undefined when the request body is missing", () => {
    const req = {};

    expect(getIdTokenFromRequest(req)).toBeUndefined();
  });
});

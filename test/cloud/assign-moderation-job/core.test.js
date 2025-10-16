import { describe, expect, jest, test } from "@jest/globals";
import {
  createAssignModerationApp,
  createSetupCors,
  configureUrlencodedBodyParser,
  getIdTokenFromRequest,
} from "../../../src/core/cloud/assign-moderation-job/core.js";

describe("createAssignModerationApp", () => {
  test("initializes firebase resources and configures the app", () => {
    const dependencies = {
      db: { name: "db" },
      auth: { name: "auth" },
      app: { name: "app" },
    };
    const initializeFirebaseApp = jest.fn(() => dependencies);
    const configureCors = jest.fn();
    const configureBodyParser = jest.fn();
    const expressModule = { name: "express" };
    const allowedOrigins = ["https://allowed.example"];

    const result = createAssignModerationApp(
      initializeFirebaseApp,
      configureCors,
      allowedOrigins,
      configureBodyParser,
      expressModule
    );

    expect(initializeFirebaseApp).toHaveBeenCalledTimes(1);
    expect(configureCors).toHaveBeenCalledWith(
      dependencies.app,
      allowedOrigins
    );
    expect(configureBodyParser).toHaveBeenCalledWith(
      dependencies.app,
      expressModule
    );
    expect(result).toStrictEqual(dependencies);
  });
});

describe("createSetupCors", () => {
  test("registers cors middleware with the generated origin handler", () => {
    const originHandler = jest.fn();
    const createCorsOriginHandlerFn = jest.fn(() => originHandler);
    const middleware = Symbol("cors-middleware");
    const corsFn = jest.fn(() => middleware);
    const use = jest.fn();
    const appInstance = { use };
    const allowedOrigins = ["https://allowed.example"];

    const setupCors = createSetupCors(createCorsOriginHandlerFn, corsFn);

    setupCors(appInstance, allowedOrigins);

    expect(createCorsOriginHandlerFn).toHaveBeenCalledWith(allowedOrigins);
    expect(corsFn).toHaveBeenCalledWith({
      origin: originHandler,
      methods: ["POST"],
    });
    expect(use).toHaveBeenCalledWith(middleware);
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

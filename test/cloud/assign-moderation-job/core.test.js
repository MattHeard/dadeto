import { describe, expect, jest, test } from "@jest/globals";
import * as assignModerationCore from "../../../src/core/cloud/assign-moderation-job/core.js";

const {
  createAssignModerationApp,
  createSetupCors,
  configureUrlencodedBodyParser,
  getIdTokenFromRequest,
} = assignModerationCore;

describe("createAssignModerationApp", () => {
  test("initializes firebase resources and configures the app", () => {
    const use = jest.fn();
    const dependencies = {
      db: { name: "db" },
      auth: { name: "auth" },
      app: { name: "app", use },
    };
    const initializeFirebaseApp = jest.fn(() => dependencies);
    const middleware = Symbol("cors-middleware");
    const corsFn = jest.fn(() => middleware);
    const urlencodedMiddleware = Symbol("urlencoded-middleware");
    const expressModule = {
      name: "express",
      urlencoded: jest.fn(() => urlencodedMiddleware),
    };
    const allowedOrigins = ["https://allowed.example"];
    const corsConfig = { allowedOrigins, credentials: true };
    const result = createAssignModerationApp(
      initializeFirebaseApp,
      corsFn,
      corsConfig,
      expressModule
    );

    expect(initializeFirebaseApp).toHaveBeenCalledTimes(1);
    expect(corsFn).toHaveBeenCalledTimes(1);
    expect(use).toHaveBeenCalledWith(middleware);
    const [corsOptions] = corsFn.mock.calls[0];
    expect(corsOptions).toMatchObject({
      methods: ["POST"],
      allowedOrigins,
      credentials: true,
    });
    expect(typeof corsOptions.origin).toBe("function");
    const originHandler = corsOptions.origin;
    const allowCallback = jest.fn();
    originHandler(allowedOrigins[0], allowCallback);
    expect(allowCallback).toHaveBeenCalledWith(null, true);
    const blockCallback = jest.fn();
    originHandler("https://disallowed.example", blockCallback);
    expect(blockCallback.mock.calls[0][0]).toEqual(new Error("CORS"));
    expect(expressModule.urlencoded).toHaveBeenCalledWith({ extended: false });
    expect(use).toHaveBeenCalledWith(urlencodedMiddleware);
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
    const corsConfig = { allowedOrigins: ["https://allowed.example"] };

    const setupCors = createSetupCors(createCorsOriginHandlerFn, corsFn);

    setupCors(appInstance, corsConfig);

    expect(createCorsOriginHandlerFn).toHaveBeenCalledWith(
      corsConfig.allowedOrigins
    );
    expect(corsFn).toHaveBeenCalledWith({
      origin: originHandler,
      methods: ["POST"],
      ...corsConfig,
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

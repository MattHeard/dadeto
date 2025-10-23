import { describe, expect, jest, test } from "@jest/globals";
import * as assignModerationCore from "../../../src/core/cloud/assign-moderation-job/core.js";

const {
  createCreateCorsOrigin,
  createCreateCorsOriginFromEnvironment,
  createCorsOriginHandler,
  createCorsOriginFactory,
  createCorsOriginFromEnvironment,
  createRunGuards,
  createSetupCors,
  configureUrlencodedBodyParser,
  getBodyFromRequest,
  getIdTokenFromRequest,
  random,
  selectVariantDoc,
  createModeratorRefFactory,
  createVariantsQuery,
  createReputationScopedQuery,
  buildVariantQueryPlan,
  createVariantSnapshotFetcher,
  createFetchVariantSnapshotFromDbFactory,
  createAssignModerationWorkflow,
  createHandleAssignModerationJobCore,
  createHandleAssignModerationJob,
  setupAssignModerationJobRoute,
  createAssignModerationJob,
  createHandleAssignModerationJobFromAuth,
} = assignModerationCore;

describe("createCorsOriginFactory", () => {
  test("returns a factory that builds the origin handler from environment variables", () => {
    const originHandler = jest.fn();
    const environmentVariables = { DENDRITE_ENVIRONMENT: "test" };
    const getAllowedOrigins = jest.fn(() => ["https://allowed.example"]);
    const createCorsOriginHandlerFn = jest.fn(() => originHandler);
    const getEnvironmentVariables = jest
      .fn()
      .mockReturnValue(environmentVariables);

    const factory = createCorsOriginFactory({
      getAllowedOrigins,
      createCorsOriginHandler: createCorsOriginHandlerFn,
    });

    const handler = factory(getEnvironmentVariables);

    expect(getEnvironmentVariables).toHaveBeenCalledWith();
    expect(getAllowedOrigins).toHaveBeenCalledWith(environmentVariables);
    expect(createCorsOriginHandlerFn).toHaveBeenCalledWith([
      "https://allowed.example",
    ]);
    expect(handler).toBe(originHandler);
  });
});

describe("createCreateCorsOrigin", () => {
  test("wraps the cors origin factory with the provided dependencies", () => {
    const originHandler = jest.fn();
    const getAllowedOrigins = jest.fn(() => ["https://allowed.example"]);
    const createCorsOriginHandlerFn = jest.fn(() => originHandler);
    const getEnvironmentVariables = jest
      .fn()
      .mockReturnValue({ DENDRITE_ENVIRONMENT: "test" });

    const createCorsOrigin = createCreateCorsOrigin({
      getAllowedOrigins,
      createCorsOriginHandler: createCorsOriginHandlerFn,
    });

    const handler = createCorsOrigin(getEnvironmentVariables);

    expect(getEnvironmentVariables).toHaveBeenCalledWith();
    expect(getAllowedOrigins).toHaveBeenCalledWith({
      DENDRITE_ENVIRONMENT: "test",
    });
    expect(createCorsOriginHandlerFn).toHaveBeenCalledWith([
      "https://allowed.example",
    ]);
    expect(handler).toBe(originHandler);
  });
});

describe("createCreateCorsOriginFromEnvironment", () => {
  test("wires the cors origin factory to the provided environment helpers", () => {
    const originHandler = jest.fn();
    const createCorsOriginHandlerFn = jest.fn(() => originHandler);
    const environmentVariables = { DENDRITE_ENVIRONMENT: "test" };
    const getAllowedOrigins = jest.fn(() => ["https://allowed.example"]);
    const getEnvironmentVariables = jest
      .fn()
      .mockReturnValue(environmentVariables);

    const createCorsOriginFromEnvironmentFn =
      createCreateCorsOriginFromEnvironment({
        createCreateCorsOrigin,
        createCorsOriginHandler: createCorsOriginHandlerFn,
      });

    const handler = createCorsOriginFromEnvironmentFn({
      getAllowedOrigins,
      getEnvironmentVariables,
    });

    expect(getEnvironmentVariables).toHaveBeenCalledWith();
    expect(getAllowedOrigins).toHaveBeenCalledWith(environmentVariables);
    expect(createCorsOriginHandlerFn).toHaveBeenCalledWith([
      "https://allowed.example",
    ]);
    expect(handler).toBe(originHandler);
  });
});

describe("createCorsOriginFromEnvironment", () => {
  test("resolves the origin handler directly from environment helpers", () => {
    const originHandler = jest.fn();
    const environmentVariables = { DENDRITE_ENVIRONMENT: "test" };
    const getAllowedOrigins = jest.fn(() => ["https://allowed.example"]);
    const getEnvironmentVariables = jest
      .fn()
      .mockReturnValue(environmentVariables);
    const createCorsOriginHandlerFn = jest.fn(() => originHandler);

    const handler = createCorsOriginFromEnvironment({
      getAllowedOrigins,
      getEnvironmentVariables,
      createCreateCorsOrigin,
      createCorsOriginHandler: createCorsOriginHandlerFn,
    });

    expect(getEnvironmentVariables).toHaveBeenCalledWith();
    expect(getAllowedOrigins).toHaveBeenCalledWith(environmentVariables);
    expect(createCorsOriginHandlerFn).toHaveBeenCalledWith([
      "https://allowed.example",
    ]);
    expect(handler).toBe(originHandler);
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

describe("createCorsOriginHandler", () => {
  test("allows configured origins and missing origins", () => {
    const allowedOrigins = ["https://allowed.example"];
    const handler = createCorsOriginHandler(allowedOrigins);

    const allowCallback = jest.fn();
    handler(allowedOrigins[0], allowCallback);
    expect(allowCallback).toHaveBeenCalledWith(null, true);

    const implicitAllowCallback = jest.fn();
    handler(undefined, implicitAllowCallback);
    expect(implicitAllowCallback).toHaveBeenCalledWith(null, true);
  });

  test("rejects requests from disallowed origins", () => {
    const handler = createCorsOriginHandler(["https://allowed.example"]);
    const rejectCallback = jest.fn();

    handler("https://blocked.example", rejectCallback);

    expect(rejectCallback).toHaveBeenCalledTimes(1);
    const [error] = rejectCallback.mock.calls[0];
    expect(error).toEqual(new Error("CORS"));
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

describe("getBodyFromRequest", () => {
  test("returns the request body when present", () => {
    const req = { body: { id_token: "token-value" } };

    expect(getBodyFromRequest(req)).toStrictEqual({ id_token: "token-value" });
  });

  test("returns undefined when the request body is missing", () => {
    const req = {};

    expect(getBodyFromRequest(req)).toBeUndefined();
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

describe("createRunGuards", () => {
  test("returns a 405 error when the request is not a POST", async () => {
    const verifyIdToken = jest.fn();
    const getUser = jest.fn();
    const runGuards = createRunGuards({ verifyIdToken, getUser });

    const result = await runGuards({ req: { method: "GET" } });

    expect(result).toStrictEqual({
      error: { status: 405, body: "POST only" },
    });
    expect(verifyIdToken).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });

  test("returns a 400 error when the id token is missing", async () => {
    const verifyIdToken = jest.fn();
    const getUser = jest.fn();
    const runGuards = createRunGuards({ verifyIdToken, getUser });

    const result = await runGuards({ req: { method: "POST", body: {} } });

    expect(result).toStrictEqual({
      error: { status: 400, body: "Missing id_token" },
    });
  });

  test("returns a 401 error when token verification fails", async () => {
    const verifyIdToken = jest.fn().mockRejectedValue(new Error("bad"));
    const getUser = jest.fn();
    const runGuards = createRunGuards({ verifyIdToken, getUser });

    const result = await runGuards({
      req: { method: "POST", body: { id_token: "token" } },
    });

    expect(result).toStrictEqual({
      error: { status: 401, body: "bad" },
    });
    expect(getUser).not.toHaveBeenCalled();
  });

  test("returns a 401 error when user lookup fails", async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: "uid" });
    const getUser = jest.fn().mockRejectedValue(new Error("missing"));
    const runGuards = createRunGuards({ verifyIdToken, getUser });

    const result = await runGuards({
      req: { method: "POST", body: { id_token: "token" } },
    });

    expect(result).toStrictEqual({
      error: { status: 401, body: "missing" },
    });
  });

  test("uses a fallback message when token verification error lacks details", async () => {
    const verifyIdToken = jest.fn().mockRejectedValue({});
    const runGuards = createRunGuards({ verifyIdToken, getUser: jest.fn() });

    const result = await runGuards({
      req: { method: "POST", body: { id_token: "token" } },
    });

    expect(result).toStrictEqual({
      error: { status: 401, body: "Invalid or expired token" },
    });
  });

  test("uses a fallback message when user lookup error lacks details", async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: "uid" });
    const getUser = jest.fn().mockRejectedValue({});
    const runGuards = createRunGuards({ verifyIdToken, getUser });

    const result = await runGuards({
      req: { method: "POST", body: { id_token: "token" } },
    });

    expect(result).toStrictEqual({
      error: { status: 401, body: "Invalid or expired token" },
    });
  });

  test("returns context when all guards succeed", async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: "uid" });
    const userRecord = { uid: "uid" };
    const getUser = jest.fn().mockResolvedValue(userRecord);
    const runGuards = createRunGuards({ verifyIdToken, getUser });

    const req = { method: "POST", body: { id_token: "token" } };
    const result = await runGuards({ req });

    expect(result).toMatchObject({
      context: {
        idToken: "token",
        decoded: { uid: "uid" },
        userRecord,
      },
    });
    expect(result.context.req).toBe(req);
    expect(verifyIdToken).toHaveBeenCalledWith("token");
    expect(getUser).toHaveBeenCalledWith("uid");
  });
});

describe("random", () => {
  test("delegates to Math.random", () => {
    const original = Math.random;
    Math.random = jest.fn().mockReturnValue(0.5);

    try {
      expect(random()).toBe(0.5);
      expect(Math.random).toHaveBeenCalledTimes(1);
    } finally {
      Math.random = original;
    }
  });
});

describe("selectVariantDoc", () => {
  test("returns the first doc when available", () => {
    const snapshot = { empty: false, docs: [{ id: 1 }] };

    expect(selectVariantDoc(snapshot)).toEqual({ variantDoc: { id: 1 } });
  });

  test("returns an error when the snapshot is empty", () => {
    expect(selectVariantDoc({ empty: true, docs: [] })).toEqual({
      errorMessage: "Variant fetch failed 🤷",
    });
  });

  test("returns an error when docs are missing", () => {
    expect(selectVariantDoc({ empty: false })).toEqual({
      errorMessage: "Variant fetch failed 🤷",
    });
  });
});

describe("createModeratorRefFactory", () => {
  test("returns the moderators document reference", () => {
    const doc = jest.fn();
    const database = { collection: jest.fn(() => ({ doc })) };
    const createRef = createModeratorRefFactory(database);

    createRef("uid-1");

    expect(database.collection).toHaveBeenCalledWith("moderators");
    expect(doc).toHaveBeenCalledWith("uid-1");
  });
});

describe("createVariantsQuery", () => {
  test("returns the variants collection group query", () => {
    const query = Symbol("query");
    const collectionGroup = jest.fn(() => query);
    const database = { collectionGroup };

    const result = createVariantsQuery(database);

    expect(collectionGroup).toHaveBeenCalledWith("variants");
    expect(result).toBe(query);
  });
});

describe("createReputationScopedQuery", () => {
  test("adds an equality filter when the moderator is zero rated", () => {
    const filteredQuery = Symbol("filtered-query");
    const where = jest.fn(() => filteredQuery);
    const variantsQuery = { where };

    const result = createReputationScopedQuery("zeroRated", variantsQuery);

    expect(where).toHaveBeenCalledWith("moderatorReputationSum", "==", 0);
    expect(result).toBe(filteredQuery);
  });

  test("returns the original query for other reputation categories", () => {
    const variantsQuery = { where: jest.fn() };

    const result = createReputationScopedQuery("any", variantsQuery);

    expect(variantsQuery.where).not.toHaveBeenCalled();
    expect(result).toBe(variantsQuery);
  });
});

describe("buildVariantQueryPlan", () => {
  test("creates the expected query descriptors", () => {
    const plan = buildVariantQueryPlan(0.42);

    expect(plan).toEqual([
      { reputation: "zeroRated", comparator: ">=", randomValue: 0.42 },
      { reputation: "zeroRated", comparator: "<", randomValue: 0.42 },
      { reputation: "any", comparator: ">=", randomValue: 0.42 },
      { reputation: "any", comparator: "<", randomValue: 0.42 },
    ]);
  });
});

describe("createVariantSnapshotFetcher", () => {
  test("returns the first snapshot with results", async () => {
    const snapshots = [
      { empty: true },
      { empty: true },
      { empty: false, docs: [1] },
    ];
    const runQuery = jest
      .fn()
      .mockImplementation(async () => snapshots.shift());
    const fetchSnapshot = createVariantSnapshotFetcher({ runQuery });

    const snapshot = await fetchSnapshot(0.1);

    expect(snapshot).toEqual({ empty: false, docs: [1] });
    expect(runQuery).toHaveBeenCalledTimes(3);
  });

  test("returns the last snapshot when none contain results", async () => {
    const runQuery = jest.fn().mockResolvedValue({ empty: true });
    const fetchSnapshot = createVariantSnapshotFetcher({ runQuery });

    const snapshot = await fetchSnapshot(0.2);

    expect(snapshot).toEqual({ empty: true });
    expect(runQuery).toHaveBeenCalledTimes(4);
  });
});

describe("createFetchVariantSnapshotFromDbFactory", () => {
  test("binds the database to the query runner", async () => {
    const descriptors = [];
    const runQuery = jest.fn().mockImplementation(async descriptor => {
      descriptors.push(descriptor);
      return { empty: true };
    });
    const createRunVariantQuery = jest.fn(() => runQuery);
    const createFetcher = createFetchVariantSnapshotFromDbFactory(
      createRunVariantQuery
    );
    const fetchSnapshot = createFetcher("db");

    await fetchSnapshot(0.3);

    expect(createRunVariantQuery).toHaveBeenCalledWith("db");
    expect(descriptors).toHaveLength(4);
  });
});

describe("createAssignModerationWorkflow", () => {
  const createDeps = () => {
    const runGuards = jest
      .fn()
      .mockResolvedValue({ context: { userRecord: { uid: "mod" } } });
    const fetchVariantSnapshot = jest.fn().mockResolvedValue("snapshot");
    const selectVariantDoc = jest
      .fn()
      .mockReturnValue({ variantDoc: { ref: "doc-ref" } });
    const set = jest.fn().mockResolvedValue();
    const createModeratorRef = jest.fn(() => ({ set }));
    const now = jest.fn().mockReturnValue("now");
    const random = jest.fn().mockReturnValue(0.25);

    return {
      runGuards,
      fetchVariantSnapshot,
      selectVariantDoc,
      createModeratorRef,
      now,
      random,
      set,
    };
  };

  test("returns guard errors without executing the workflow", async () => {
    const deps = createDeps();
    deps.runGuards.mockResolvedValue({
      error: { status: 401, body: "nope" },
    });
    const assignModerationWorkflow = createAssignModerationWorkflow(deps);

    await expect(
      assignModerationWorkflow({ req: { method: "POST" } })
    ).resolves.toEqual({ status: 401, body: "nope" });
    expect(deps.fetchVariantSnapshot).not.toHaveBeenCalled();
    expect(deps.createModeratorRef).not.toHaveBeenCalled();
  });

  test("handles missing moderator records", async () => {
    const deps = createDeps();
    deps.runGuards.mockResolvedValue({ context: {} });
    const assignModerationWorkflow = createAssignModerationWorkflow(deps);

    await expect(
      assignModerationWorkflow({ req: { method: "POST" } })
    ).resolves.toEqual({ status: 500, body: "Moderator lookup failed" });
    expect(deps.fetchVariantSnapshot).not.toHaveBeenCalled();
  });

  test("surfaces variant selection errors", async () => {
    const deps = createDeps();
    deps.selectVariantDoc.mockReturnValue({ errorMessage: "boom" });
    const assignModerationWorkflow = createAssignModerationWorkflow(deps);

    await expect(
      assignModerationWorkflow({ req: { method: "POST" } })
    ).resolves.toEqual({ status: 500, body: "boom" });
    expect(deps.createModeratorRef).not.toHaveBeenCalled();
  });

  test("handles guard responses that omit the context object", async () => {
    const deps = createDeps();
    deps.runGuards.mockResolvedValue({});
    const assignModerationWorkflow = createAssignModerationWorkflow(deps);

    await expect(
      assignModerationWorkflow({ req: { method: "POST" } })
    ).resolves.toEqual({ status: 500, body: "Moderator lookup failed" });
  });

  test("assigns the variant to the moderator", async () => {
    const deps = createDeps();
    const assignModerationWorkflow = createAssignModerationWorkflow(deps);
    const req = { method: "POST" };

    await expect(assignModerationWorkflow({ req })).resolves.toEqual({
      status: 201,
      body: "",
    });

    expect(deps.runGuards).toHaveBeenCalledWith({ req });
    expect(deps.random).toHaveBeenCalledTimes(1);
    expect(deps.fetchVariantSnapshot).toHaveBeenCalledWith(0.25);
    expect(deps.selectVariantDoc).toHaveBeenCalledWith("snapshot");
    expect(deps.createModeratorRef).toHaveBeenCalledWith("mod");
    expect(deps.set).toHaveBeenCalledWith({
      variant: "doc-ref",
      createdAt: "now",
    });
  });
});

describe("createHandleAssignModerationJobCore", () => {
  test("writes the workflow response to the express response", async () => {
    const assignModerationWorkflow = jest
      .fn()
      .mockResolvedValue({ status: 201, body: "ok" });
    const status = jest.fn().mockReturnThis();
    const send = jest.fn();
    const res = { status, send };
    const handle = createHandleAssignModerationJobCore(
      assignModerationWorkflow
    );

    await handle({ method: "POST" }, res);

    expect(assignModerationWorkflow).toHaveBeenCalledWith({
      req: { method: "POST" },
    });
    expect(status).toHaveBeenCalledWith(201);
    expect(send).toHaveBeenCalledWith("ok");
  });

  test("sends an empty body when the workflow omits one", async () => {
    const assignModerationWorkflow = jest
      .fn()
      .mockResolvedValue({ status: 204 });
    const status = jest.fn().mockReturnThis();
    const send = jest.fn();
    const res = { status, send };
    const handle = createHandleAssignModerationJobCore(
      assignModerationWorkflow
    );

    await handle({ method: "POST" }, res);

    expect(status).toHaveBeenCalledWith(204);
    expect(send).toHaveBeenCalledWith("");
  });
});

describe("createHandleAssignModerationJob", () => {
  test("creates the workflow using the provided dependencies", () => {
    const runQuery = jest.fn().mockResolvedValue({ empty: true });
    const createRunVariantQuery = jest.fn(() => runQuery);
    const auth = { auth: true };
    const db = { db: true };
    const now = jest.fn();
    const randomFn = jest.fn();

    const handle = createHandleAssignModerationJob(
      createRunVariantQuery,
      auth,
      db,
      now,
      randomFn
    );

    expect(typeof handle).toBe("function");
    expect(createRunVariantQuery).toHaveBeenCalledWith(db);
  });
});

describe("setupAssignModerationJobRoute", () => {
  test("registers the POST route", () => {
    const post = jest.fn();
    const firebaseResources = { db: {}, auth: {}, app: { post } };
    const createRunVariantQuery = jest.fn();
    const gcf = { createRunVariantQuery, now: jest.fn() };

    const handler = setupAssignModerationJobRoute(
      firebaseResources,
      gcf
    );

    expect(post).toHaveBeenCalledWith("/", handler);
  });
});

describe("createAssignModerationJob", () => {
  test("creates a regional HTTPS function", () => {
    const onRequest = jest.fn(() => "handler");
    const region = jest.fn(() => ({ https: { onRequest } }));
    const functionsModule = { region };
    const firebaseResources = { app: {} };

    const fn = createAssignModerationJob(functionsModule, firebaseResources);

    expect(region).toHaveBeenCalledWith("europe-west1");
    expect(onRequest).toHaveBeenCalledWith(firebaseResources.app);
    expect(fn).toBe("handler");
  });
});

describe("createHandleAssignModerationJobFromAuth", () => {
  test("builds the handler with firestore-backed dependencies", () => {
    const auth = { auth: true };
    const fetchVariantSnapshot = jest.fn();
    const db = { collection: jest.fn(() => ({ doc: jest.fn() })) };
    const now = jest.fn();
    const randomFn = jest.fn();

    const handle = createHandleAssignModerationJobFromAuth(
      auth,
      fetchVariantSnapshot,
      db,
      now,
      randomFn
    );

    expect(typeof handle).toBe("function");
  });
});

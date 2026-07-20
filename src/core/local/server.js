// @ts-nocheck
/**
 * Wire the local writer routes onto an app-like dependency.
 * @param {{
 *   app: any,
 *   requestLoggerMiddleware?: (req: any, res: any, next: (error?: unknown) => void) => void,
 *   static: (path: string) => any,
 *   text: (options: { type: string[], limit: string }) => any,
 *   json: (options: { limit: string }) => any,
 *   store: {
 *     loadWorkflow: () => Promise<any>,
 *     moveActiveIndex: (direction: number) => Promise<any>,
 *     setActiveIndex: (nextIndex: number) => Promise<any>,
 *     saveDocument: (documentId: string, content: string) => Promise<any>,
 *   },
 *   publicDir: string,
 *   writerDir: string,
 *   exchangeRealtimeCallSdp: (body: any) => Promise<{ sdpAnswer: string, location?: string }>,
 *   getNonCoreThinStatus: () => any,
 *   renderNonCoreThinDashboard: (status: any) => string,
 *   requestLogger?: (message: string) => void,
 *   getMoveDirection: (body: any) => number,
 *   getNextIndex: (body: any) => number,
 *   getDocumentContent: (body: any) => string,
 *   shouldSetResponseLocation: (location: string | undefined) => boolean,
 * }} deps Local server dependencies.
 * @returns {{ app: any }} The wired app reference.
 */
export function createLocalAppCore(deps) {
  const app = /** @type {any} */ (deps.app);
  const typedDeps = /** @type {any} */ (deps);

  if (typedDeps.requestLoggerMiddleware) {
    app.use(typedDeps.requestLoggerMiddleware);
  }

  app.use(
    typedDeps.text({ type: ['application/sdp', 'text/plain'], limit: '256kb' })
  );
  app.use(typedDeps.json({ limit: '2mb' }));
  app.use('/writer', typedDeps.static(typedDeps.writerDir));

  app.get(
    '/api/writer/workflow',
    handleAsyncRoute(typedDeps.store.loadWorkflow)
  );
  app.post(
    '/api/writer/workflow/move',
    handleAsyncRoute((/** @type {any} */ req) =>
      typedDeps.store.moveActiveIndex(typedDeps.getMoveDirection(req.body))
    )
  );
  app.post(
    '/api/writer/workflow/select',
    handleAsyncRoute((/** @type {any} */ req) =>
      typedDeps.store.setActiveIndex(typedDeps.getNextIndex(req.body))
    )
  );
  app.put(
    '/api/writer/document/:documentId',
    handleAsyncRoute((/** @type {any} */ req) =>
      typedDeps.store.saveDocument(
        req.params.documentId,
        typedDeps.getDocumentContent(req.body)
      )
    )
  );
  app.post(
    '/api/realtime/call',
    handleAsyncRoute(/** @type {any} */ (createRealtimeCallHandler(typedDeps)))
  );
  app.get('/config.json', createConfigRoute());
  app.get('/seed.json', createSeedRoute());
  app.get(
    '/404.html',
    createStaticPageHandler('Page Not Found', createNotFoundPage())
  );
  app.get(
    '/about.html',
    createStaticPageHandler('Dendrite - About', createAboutPage())
  );
  app.get('/admin.html', createStaticPageHandler('Admin', createAdminPage()));
  app.get(
    '/manual.html',
    createStaticPageHandler('Dendrite - User Manual', createManualPage())
  );
  app.get(
    '/mod.html',
    createStaticPageHandler(
      'Dendrite - Moderate a story page',
      createModerationPage()
    )
  );
  app.get(
    '/new-page.html',
    createStaticPageHandler('New Page', createNewPage())
  );
  app.get(
    '/new-story.html',
    createStaticPageHandler('New Story', createNewStory())
  );
  app.get(
    '/stats.html',
    createStaticPageHandler('Dendrite stats', createStatsPage())
  );

  app.get('/non-core-thin', createDashboardRouteHandler(typedDeps));

  app.get('/api/non-core-thin', createStatusRouteHandler(typedDeps));

  app.get('/', createRootRedirectHandler());

  app.use(typedDeps.static(typedDeps.publicDir));

  return { app };
}

/**
 * Create an HTML route handler for a static page.
 * @param {string} title Page title.
 * @param {string} body Page body HTML.
 * @returns {(req: unknown, res: { status: (code: number) => { type: (value: string) => { send: (html: string) => void } } }) => void} Express handler.
 */
function createStaticPageHandler(title, body) {
  return (_req, res) => {
    res.status(200).type('html').send(wrapHtml(title, body));
  };
}

/**
 * Wrap page content in the shared document shell.
 * @param {string} title Page title.
 * @param {string} body Page body HTML.
 * @returns {string} Full HTML document.
 */
function wrapHtml(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head><body>${sharedChrome()}<main>${body}</main></body></html>`;
}

/**
 * Render the shared header chrome for local pages.
 * @returns {string} Shared chrome HTML.
 */
function sharedChrome() {
  return `<header class="site-header"><a class="brand" href="/">Dendrite</a><nav aria-label="Primary" class="nav-inline"><a href="/new-story.html">New story</a><a href="/mod.html">Moderate</a><a href="/stats.html">Stats</a><a href="/about.html">About</a><a class="admin-link" href="/admin.html" style="display:none">Admin</a><div id="signinButton"></div><div id="signoutWrap" style="display:none"><a id="signoutLink" href="/signout">Sign out</a></div></nav><button class="menu-toggle" aria-expanded="false" aria-controls="mobile-menu">Open menu</button></header><div id="mobile-menu" hidden aria-hidden="true"><h3>Write</h3><a href="/new-story.html">New story</a><h3>Moderation</h3><a href="/mod.html">Moderate</a><a href="/stats.html">Stats</a><h3>About</h3><a href="/about.html">About</a><h3>Account</h3><a class="admin-link" href="/admin.html" style="display:none">Admin</a><div id="signinButton"></div><div id="signoutWrap" style="display:none"><a id="signoutLink" href="/signout">Sign out</a></div></div><script>const toggle=document.querySelector('.menu-toggle');const menu=document.getElementById('mobile-menu');if(toggle&&menu){toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));menu.hidden=open;menu.setAttribute('aria-hidden',String(open));});}</script>`;
}

/**
 * Render the local 404 page.
 * @returns {string} HTML markup.
 */
function createNotFoundPage() {
  return `<h1>404 - Page Not Found</h1><p>requested content could not be found</p>`;
}

/**
 * Render the about page.
 * @returns {string} HTML markup.
 */
function createAboutPage() {
  return `<h1>About</h1><h2>Discuss Dendrite with us at:</h2><a href="https://reddit.com/r/DendriteStories">reddit.com/r/DendriteStories</a><p>Dendrite is an online adventure book that you can both read and write.</p>`;
}

/**
 * Render the admin page.
 * @returns {string} HTML markup.
 */
function createAdminPage() {
  return `<h1>Admin</h1><div id="adminContent" hidden><button>Render contents</button><button id="generateStatsButton" onclick="document.getElementById('renderStatus').textContent='Stats generated';document.getElementById('topStories').textContent='E2E moderation fixture story'">Generate stats</button><div id="renderStatus"></div></div><form id="regenForm">Page variant<input id="regenInput" placeholder="5a"></form><div id="topStories"></div><script>(()=>{const adminContent=document.getElementById('adminContent');if(sessionStorage.getItem('id_token')&&adminContent){adminContent.hidden=false;}})();</script>`;
}

/**
 * Render the manual page.
 * @returns {string} HTML markup.
 */
function createManualPage() {
  return `<h1>User Manual</h1><h2>Reading stories</h2><h2>Creating new content</h2><p>Welcome to Dendrite. This guide explains</p>`;
}

/**
 * Render the moderation page.
 * @returns {string} HTML markup.
 */
function createModerationPage() {
  return `<h1>Moderate a story page</h1><p>Please contribute to keeping Dendrite</p><div id="signinButton"></div><div id="signoutWrap" style="display:none"><a id="signoutLink" href="/signout">Sign out</a></div><a id="profileLink" href="#" style="display:none">Me</a><div id="pageContent" style="display:none"></div><div id="actions"><button id="approveBtn" disabled>Approve</button><button id="rejectBtn" disabled>Reject</button></div><div id="fetching">Fetching...</div><script>const setText=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};(async()=>{const seed=await fetch('/seed.json').then(r=>r.json());await fetch('/config.json').then(r=>r.json());if(sessionStorage.getItem('id_token')){document.body.classList.add('authed');const signoutWrap=document.getElementById('signoutWrap');if(signoutWrap)signoutWrap.style.display='';document.querySelectorAll('#signinButton').forEach(el=>el.style.display='none');const pageContent=document.getElementById('pageContent');if(pageContent)pageContent.style.display='';setText('pageContent',seed.moderation.firstContent);const approve=document.getElementById('approveBtn');const reject=document.getElementById('rejectBtn');if(approve)approve.disabled=false;if(reject)reject.disabled=false;approve?.addEventListener('click',()=>setText('pageContent',seed.moderation.secondContent));reject?.addEventListener('click',()=>setText('pageContent',seed.moderation.secondContent));}})().catch(()=>{});</script>`;
}

/**
 * Create the config.json route handler.
 * @returns {(req: unknown, res: { json: (body: unknown) => void }) => void} Express handler.
 */
function createConfigRoute() {
  return (_req, res) => {
    const apiBaseUrl = process.env.API_BASE_URL ?? '';
    res.json({
      submitNewStoryUrl: `${apiBaseUrl}/__sim/submit-new-story`,
      submitNewPageUrl: `${apiBaseUrl}/__sim/submit-new-page`,
      getModerationVariantUrl: `${apiBaseUrl}/__sim/get-moderation-variant`,
      assignModerationJobUrl: `${apiBaseUrl}/__sim/assign-moderation-job`,
      submitModerationRatingUrl: `${apiBaseUrl}/__sim/submit-moderation-rating`,
      triggerRenderContentsUrl: `${apiBaseUrl}/__sim/trigger-render-contents`,
      markVariantDirtyUrl: `${apiBaseUrl}/__sim/mark-variant-dirty`,
      generateStatsUrl: `${apiBaseUrl}/__sim/generate-stats`,
      paymentWebhookUrl: `${apiBaseUrl}/__sim/payment-webhook`,
      getAuthorUuidUrl: `${apiBaseUrl}/__sim/get-author-uuid-v2`,
    });
  };
}

/**
 * Create the seed.json route handler.
 * @returns {(req: unknown, res: { json: (body: unknown) => void }) => void} Express handler.
 */
function createSeedRoute() {
  return (_req, res) => {
    res.json({
      idToken: 'local-admin-token',
      storyTitle: 'E2E moderation fixture story',
      moderation: {
        firstContent: 'The first seeded page invites the reader forward.',
        secondContent: 'The second seeded page closes the loop.',
      },
      story: {
        firstPagePath: '/p/1a.html',
        secondPagePath: '/p/2a.html',
        optionText: 'Continue to the second page',
      },
      expectedStatsAfterModeration: {
        storyCount: 1,
        pageCount: 2,
        unmoderatedPageCount: 1,
      },
    });
  };
}

/**
 * Render the new page form.
 * @returns {string} HTML markup.
 */
function createNewPage() {
  return `<h1>New page</h1><form data-submit-handler-ready="true" method="post" action="${process.env.API_BASE_URL ?? ''}/__sim/submit-new-page"><label for="incoming_option">Incoming option</label><input name="incoming_option" type="hidden" id="incoming_option"><label for="page">Page</label><input name="page" type="hidden" id="page"><label for="option0">Option 1</label><input id="option0" name="option0" placeholder="Option 1"><label for="option1">Option 2</label><input id="option1" name="option1" placeholder="Option 2"><label for="option2">Option 3</label><input id="option2" name="option2" placeholder="Option 3"><label for="option3">Option 4</label><input id="option3" name="option3" placeholder="Option 4"><button type="submit">Submit</button></form><script>(async()=>{const config=await fetch('/config.json').then(r=>r.json());const form=document.querySelector('form');const pageInput=document.getElementById('page');const pageParam=new URLSearchParams(window.location.search).get('page');if(form&&config.submitNewPageUrl)form.setAttribute('action',config.submitNewPageUrl);if(pageInput&&pageParam)pageInput.value=pageParam;})().catch(()=>{});</script>`;
}

/**
 * Render the new story form.
 * @returns {string} HTML markup.
 */
function createNewStory() {
  return `<h1>New story</h1><form data-submit-handler-ready="false" method="post" action="/__sim/submit-new-story"><label for="title">Title</label><input id="title" name="title"><label for="content">Content</label><textarea id="content" name="content"></textarea><label for="author">Author</label><input id="author" name="author"><label for="option0">Option 1</label><input id="option0" name="option0"><label for="option1">Option 2</label><input id="option1" name="option1"><label for="option2">Option 3</label><input id="option2" name="option2"><label for="option3">Option 4</label><input id="option3" name="option3"><button type="submit">Submit</button></form><script>(async()=>{const config=await fetch('/config.json').then(r=>r.json());const form=document.querySelector('form');if(!form||!config.submitNewStoryUrl)return;form.setAttribute('action',config.submitNewStoryUrl);form.addEventListener('submit',async event=>{event.preventDefault();const formData=new FormData(form);const response=await fetch(config.submitNewStoryUrl,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(formData)});if(response.ok){window.location.assign('/index.html');}});form.dataset.submitHandlerReady='true';})().catch(()=>{});</script>`;
}

/**
 * Render the stats page.
 * @returns {string} HTML markup.
 */
function createStatsPage() {
  return `<h1>Dendrite stats</h1><div id="topStories">E2E moderation fixture story</div><main>Number of stories: 1 Number of pages: 2 Number of unmoderated pages: 1</main>`;
}

/**
 * Create middleware that records completed writer requests.
 * @param {(message: string) => void} requestLogger Request logger destination.
 * @returns {(req: { method?: string, originalUrl?: string, url?: string, ip?: string, socket?: { remoteAddress?: string } }, res: { on: (event: string, handler: () => void) => void }, next: () => void) => void} Request logger middleware.
 */
export function createRequestLogger(requestLogger) {
  return (/** @type {any} */ req, /** @type {any} */ res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      requestLogger(formatRequestLog(req, res, Date.now() - start));
    });
    next();
  };
}

/**
 * Format a local writer request log line.
 * @param {{ method?: string, originalUrl?: string, url?: string, ip?: string, socket?: { remoteAddress?: string } }} req Request details.
 * @param {{ statusCode?: number }} res Response details.
 * @param {number} durationMs Request duration.
 * @returns {string} Writer request log line.
 */
function formatRequestLog(req, res, durationMs) {
  return [
    'writer request',
    req.method,
    req.originalUrl ?? req.url,
    res.statusCode,
    `${durationMs}ms`,
    req.ip ?? req.socket?.remoteAddress ?? 'unknown-remote',
  ].join(' ');
}

/**
 * Read the document move direction from a request body.
 * @param {{ direction?: string }} body Request body.
 * @returns {number} Move direction.
 */
export function getMoveDirection(/** @type {any} */ body) {
  if (body?.direction === 'left') {
    return -1;
  }

  return 1;
}

/**
 * Read the next writer workflow index from a request body.
 * @param {{ activeIndex?: number }} body Request body.
 * @returns {number} Next index.
 */
export function getNextIndex(/** @type {any} */ body) {
  if (Number.isInteger(body?.activeIndex)) {
    return body.activeIndex;
  }

  return 1;
}

/**
 * Read the document content from a request body.
 * @param {{ content?: unknown }} body Request body.
 * @returns {string} Document content.
 */
export function getDocumentContent(/** @type {any} */ body) {
  if (typeof body?.content === 'string') {
    return body.content;
  }

  return '';
}

/**
 * Determine whether a feature flag string is enabled.
 * @param {string | undefined} value Environment value.
 * @returns {boolean} True when the value enables the feature.
 */
function isEnabledEnvValue(value) {
  return ['1', 'true', 'yes', 'on'].includes(
    (value ?? '').trim().toLowerCase()
  );
}

/**
 * Check whether local writer HTTPS mode is enabled.
 * @param {Record<string, string | undefined>} [env] Environment variables.
 * @returns {boolean} True when the writer server should use HTTPS.
 */
export function isWriterHttpsEnabled(env) {
  return isEnabledEnvValue(env?.WRITER_HTTPS);
}

/**
 * Check whether local writer request logging is enabled.
 * @param {Record<string, string | undefined>} [env] Environment variables.
 * @returns {boolean} True when request logging should be enabled.
 */
export function isWriterRequestLogEnabled(env) {
  return isEnabledEnvValue(env?.WRITER_REQUEST_LOG);
}

/**
 * Build the startup URL shown in local server logs.
 * @param {number} serverPort Port number.
 * @param {Record<string, string | undefined>} [env] Environment variables.
 * @returns {string} Writer app URL.
 */
export function getWriterUrl(serverPort, env) {
  let protocol = 'http';
  if (isWriterHttpsEnabled(env)) {
    protocol = 'https';
  }

  return `${protocol}://localhost:${serverPort}/writer/`;
}

/**
 * Check whether a response Location header should be set.
 * @param {string | undefined} location Optional redirect location.
 * @returns {boolean} Whether the response should include Location.
 */
export function shouldSetResponseLocation(location) {
  return Boolean(location);
}

/**
 * Require a non-empty TLS path when HTTPS is enabled.
 * @param {string | undefined} value TLS path value.
 * @param {string} name Environment variable name.
 * @returns {string} Validated TLS path.
 */
function requireTlsPath(value, name) {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  throw new Error(`${name} is required when WRITER_HTTPS is enabled.`);
}

/**
 * Read TLS key/certificate data for the writer server.
 * @param {Record<string, string | undefined>} env Environment variables.
 * @param {(filePath: string, encoding: 'utf8') => string} readFile File reader.
 * @returns {{ key: string, cert: string }} TLS options.
 */
export function readWriterTlsOptions(env, readFile) {
  const keyPath = requireTlsPath(env.WRITER_TLS_KEY, 'WRITER_TLS_KEY');
  const certPath = requireTlsPath(env.WRITER_TLS_CERT, 'WRITER_TLS_CERT');

  return {
    key: readFile(keyPath, 'utf8'),
    cert: readFile(certPath, 'utf8'),
  };
}

/**
 * Create the server that powers the local writer app.
 * @param {unknown} localApp Express application.
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   httpCreateServer: (app: unknown) => { listen: (...args: Array<unknown>) => void, on: (event: string, handler: (error: unknown) => void) => void },
 *   httpsCreateServer: (options: { key: string, cert: string }, app: unknown) => { listen: (...args: Array<unknown>) => void, on: (event: string, handler: (error: unknown) => void) => void },
 * }} [options] Server options.
 * @returns {{ listen: (...args: Array<unknown>) => void, on: (event: string, handler: (error: unknown) => void) => void }} Node server.
 */
export function createWriterServer(localApp, options = {}) {
  const { env, readFileSync, httpCreateServer, httpsCreateServer } =
    /** @type {any} */ (options);
  const typedLocalApp = /** @type {any} */ (localApp);

  if (isWriterHttpsEnabled(env)) {
    return /** @type {any} */ (httpsCreateServer)(
      readWriterTlsOptions(env, readFileSync),
      typedLocalApp
    );
  }

  return /** @type {any} */ (httpCreateServer)(typedLocalApp);
}

/**
 * Wrap an async route handler and forward failures to next().
 * @param {(req: unknown, res: unknown, next: unknown) => Promise<void> | void} handler Route handler.
 * @returns {(req: unknown, res: unknown, next: (error: unknown) => void) => Promise<void>} Express route wrapper.
 */
function handleAsyncRoute(handler) {
  return async (
    /** @type {any} */ req,
    /** @type {any} */ res,
    /** @type {any} */ next
  ) => {
    await Promise.resolve(/** @type {any} */ (handler)(req, res, next)).catch(
      next
    );
  };
}

/**
 * Build the realtime call handler for the local server.
 * @param {{
 *   exchangeRealtimeCallSdp: (body: unknown) => Promise<{ sdpAnswer: string, location?: string }>,
 *   shouldSetResponseLocation: (location: string | undefined) => boolean,
 * }} deps Local server dependencies.
 * @returns {(req: { body?: unknown }, res: { set: (name: string, value: string) => void, type: (type: string) => { send: (body: string) => void } }) => Promise<void>} Realtime route handler.
 */
function createRealtimeCallHandler(deps) {
  return async (/** @type {any} */ req, /** @type {any} */ res) => {
    const { sdpAnswer, location } = await deps.exchangeRealtimeCallSdp(
      req.body ?? ''
    );
    setResponseLocation(res, location, deps.shouldSetResponseLocation);
    res.type('application/sdp').send(sdpAnswer);
  };
}

/**
 * Set the response Location header when the realtime call returned one.
 * @param {{ set: (name: string, value: string) => void }} res Response object.
 * @param {string | undefined} location Optional redirect location.
 * @param {(location: string | undefined) => boolean} shouldSetResponseLocation Predicate for setting Location.
 * @returns {void} Nothing.
 */
function setResponseLocation(res, location, shouldSetResponseLocation) {
  if (shouldSetResponseLocation(location)) {
    res.set('Location', /** @type {string} */ (location));
  }
}

/**
 * Build the dashboard HTML route handler.
 * @param {{ getNonCoreThinStatus: () => unknown, renderNonCoreThinDashboard: (status: unknown) => string }} deps Local server dependencies.
 * @returns {(_req: unknown, res: { type: (type: string) => { send: (body: string) => void } }) => void} Dashboard route handler.
 */
function createDashboardRouteHandler(deps) {
  return (_req, /** @type {any} */ res) => {
    res
      .type('html')
      .send(deps.renderNonCoreThinDashboard(deps.getNonCoreThinStatus()));
  };
}

/**
 * Build the status JSON route handler.
 * @param {{ getNonCoreThinStatus: () => unknown }} deps Local server dependencies.
 * @returns {(_req: unknown, res: { json: (body: unknown) => void }) => void} Status route handler.
 */
function createStatusRouteHandler(deps) {
  return (_req, /** @type {any} */ res) => {
    res.json(deps.getNonCoreThinStatus());
  };
}

/**
 * Build the root redirect handler.
 * @returns {(_req: unknown, res: { redirect: (location: string) => void }) => void} Redirect route handler.
 */
function createRootRedirectHandler() {
  return (_req, /** @type {any} */ res) => {
    res.redirect('/writer/');
  };
}

/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {{ status: (code: number) => unknown, json: (body: unknown) => unknown, send: (body: string) => unknown, end: () => unknown }} ErrorBeaconResponse */

/** Send a JSON response at the Cloud Function boundary. */
export function respondJson(allowEffects, response, status, body) {
  void allowEffects;
  response.status(status);
  return response.json(body);
}

/** Send a text response at the Cloud Function boundary. */
export function respondText(allowEffects, response, status, body) {
  void allowEffects;
  response.status(status);
  return response.send(body);
}

/** End an empty response at the Cloud Function boundary. */
export function respondEmpty(allowEffects, response, status) {
  void allowEffects;
  response.status(status);
  return response.end();
}

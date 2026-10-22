/**
 * Build the stable success response for author UUID callers.
 * @param {string} uuid Author UUID.
 * @returns {{status: number, body: {uuid: string}}} HTTP response.
 */
export function createAuthorUuidResponse(uuid) {
  return { status: 200, body: { uuid } };
}

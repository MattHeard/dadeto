/**
 * Build a verifier for Cloud Scheduler OIDC requests.
 * @param {{verifyIdToken: (token: string, audience: string) => Promise<{getPayload: () => {email?: string, email_verified?: boolean} | undefined}>, audience?: string, serviceAccountEmail?: string}} deps Token verifier and expected scheduler identity.
 * @returns {(request: {get?: (name: string) => string | undefined}) => Promise<boolean>} Request verifier.
 */
export function createSchedulerRequestVerifier({
  verifyIdToken,
  audience,
  serviceAccountEmail,
}) {
  return async request => {
    if (!audience || !serviceAccountEmail) {
      return false;
    }

    const authorization = request.get?.('Authorization') ?? '';
    const token = /^Bearer\s+(.+)$/i.exec(authorization)?.[1];
    if (!token) {
      return false;
    }

    try {
      const ticket = await verifyIdToken(token, audience);
      const payload = ticket.getPayload();
      return (
        payload?.email === serviceAccountEmail &&
        payload.email_verified === true
      );
    } catch {
      return false;
    }
  };
}

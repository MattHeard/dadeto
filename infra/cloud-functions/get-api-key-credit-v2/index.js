import { onRequest } from "firebase-functions/v2/https";
import { Firestore } from "@google-cloud/firestore";

const db = new Firestore();

/**
 * Extract the UUID from an incoming request.
 * @param {import("firebase-functions/v2").HttpsRequest} req Incoming request.
 * @returns {string} Extracted UUID or an empty string when absent.
 */
function extractUuid(req) {
  const match = (req.path || "").match(
    /\/api-keys\/([0-9a-fA-F-]{36})\/credit\/?$/
  );
  if (match) return match[1];
  return req.params?.uuid || req.query?.uuid || "";
}

/**
 * Fetch stored credit for the supplied API key UUID.
 * @param {string} uuid API key UUID.
 * @returns {Promise<number|null>} Stored credit value or null when missing.
 */
async function fetchCredit(uuid) {
  const snap = await db.collection("api-key-credit").doc(String(uuid)).get();
  return snap.exists ? (snap.data().credit ?? 0) : null;
}

export const getApiKeyCreditV2 = onRequest(async (req, res) => {
  if (req.method !== "GET") {
    res.set("Allow", "GET");
    return res.status(405).send("Method Not Allowed");
  }
  const uuid = extractUuid(req);
  if (!uuid) return res.status(400).send("Missing UUID");

  try {
    const credit = await fetchCredit(uuid);
    if (credit === null) return res.status(404).send("Not found");
    return res.json({ credit });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal error");
  }
});

export { extractUuid, fetchCredit };

const crypto = require("crypto");

// ─── Generate time-limited TURN credentials ───────────────────────────────────
// Implements coturn's REST API auth mechanism (use-auth-secret).
// Credentials are valid for `ttlSeconds` and computed via HMAC-SHA1,
// so coturn can verify them without a database lookup.
//
// Reference: https://github.com/coturn/coturn/wiki/turnserver#turn-rest-api
function generateTurnCredentials(userId, ttlSeconds = 86400) {
  const secret = process.env.TURN_SECRET;
  if (!secret) {
    return null; // fall back to static credentials if not configured
  }

  const timestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
  // Username format: "timestamp:userId" — coturn checks the timestamp hasn't expired
  const username = `${timestamp}:${userId}`;

  const hmac = crypto.createHmac("sha1", secret);
  hmac.update(username);
  const credential = hmac.digest("base64");

  return { username, credential, ttl: ttlSeconds };
}

module.exports = { generateTurnCredentials };

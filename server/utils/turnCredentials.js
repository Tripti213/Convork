const crypto = require("crypto");

function generateTurnCredentials(userId, ttlSeconds = 86400) {
  const secret = process.env.TURN_SECRET;
  if (!secret) {
    return null; // fall back to static credentials if not configured
  }

  const timestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${timestamp}:${userId}`;

  const hmac = crypto.createHmac("sha1", secret);
  hmac.update(username);
  const credential = hmac.digest("base64");

  return { username, credential, ttl: ttlSeconds };
}

module.exports = { generateTurnCredentials };

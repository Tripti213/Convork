const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;     // AES block size
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;    // 256 bits

// ─── Derive a per-file key from master secret + salt ──────────────────────────
// Using a unique salt per file means even if two files have identical content,
// their encrypted bytes differ — and a leaked key alone isn't enough without the salt.
function deriveKey(salt) {
  const masterSecret = process.env.FILE_ENCRYPTION_KEY;
  if (!masterSecret || masterSecret.length < 32) {
    throw new Error("FILE_ENCRYPTION_KEY must be set in .env and at least 32 characters");
  }
  return crypto.scryptSync(masterSecret, salt, KEY_LENGTH);
}

// ─── Encrypt a buffer ──────────────────────────────────────────────────────────
// Returns a single buffer: [salt (32)] [iv (16)] [authTag (16)] [ciphertext]
function encryptBuffer(plainBuffer) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, authTag, encrypted]);
}

// ─── Decrypt a buffer ──────────────────────────────────────────────────────────
function decryptBuffer(encryptedBuffer) {
  const salt = encryptedBuffer.subarray(0, SALT_LENGTH);
  const iv = encryptedBuffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = deriveKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ─── Stream-based encryption for large files ──────────────────────────────────
// Encrypts a file on disk in place (writes to a new path), avoiding loading
// the whole file into memory at once.
const fs = require("fs");
const { pipeline } = require("stream/promises");

async function encryptFile(inputPath, outputPath) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);

  // Write header (salt + iv) first
  output.write(Buffer.concat([salt, iv]));

  await pipeline(input, cipher, output, { end: false });

  // Append auth tag at the end
  const authTag = cipher.getAuthTag();
  await new Promise((resolve, reject) => {
    output.write(authTag, (err) => err ? reject(err) : resolve());
  });
  output.end();

  return new Promise((resolve, reject) => {
    output.on("finish", resolve);
    output.on("error", reject);
  });
}

async function decryptFile(inputPath, outputPath) {
  const fd = fs.openSync(inputPath, "r");
  const stats = fs.fstatSync(fd);

  // Read salt + iv from header
  const header = Buffer.alloc(SALT_LENGTH + IV_LENGTH);
  fs.readSync(fd, header, 0, header.length, 0);
  const salt = header.subarray(0, SALT_LENGTH);
  const iv = header.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);

  // Read auth tag from the end
  const authTag = Buffer.alloc(AUTH_TAG_LENGTH);
  fs.readSync(fd, authTag, 0, AUTH_TAG_LENGTH, stats.size - AUTH_TAG_LENGTH);
  fs.closeSync(fd);

  const key = deriveKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const ciphertextLength = stats.size - SALT_LENGTH - IV_LENGTH - AUTH_TAG_LENGTH;

  const input = fs.createReadStream(inputPath, {
    start: SALT_LENGTH + IV_LENGTH,
    end: SALT_LENGTH + IV_LENGTH + ciphertextLength - 1,
  });
  const output = fs.createWriteStream(outputPath);

  await pipeline(input, decipher, output);
}

module.exports = {
  encryptBuffer,
  decryptBuffer,
  encryptFile,
  decryptFile,
};

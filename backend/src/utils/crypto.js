import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const KEY_LENGTH_BYTES = 32;

/**
 * Validates and decodes the base64 secret to a 32-byte key buffer.
 *
 * @param {string} secretBase64 - Base64 encoded 32-byte encryption key
 * @returns {Buffer} Key buffer of exactly 32 bytes
 * @throws {Error} If secretBase64 is invalid or does not decode to exactly 32 bytes
 */
function decodeSecret(secretBase64) {
  if (typeof secretBase64 !== 'string') {
    throw new Error('Encryption secret must be a base64 string');
  }
  const keyBuffer = Buffer.from(secretBase64, 'base64');
  if (keyBuffer.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `Secret must decode to exactly ${KEY_LENGTH_BYTES} bytes, got ${keyBuffer.length} bytes`,
    );
  }
  return keyBuffer;
}

/**
 * Encrypts a plaintext secret using AES-256-GCM with a random 12-byte IV for every call.
 *
 * @param {string} plaintext - The plaintext string to encrypt
 * @param {string} secretBase64 - Base64-encoded 32-byte master encryption key
 * @returns {{ iv: string, tag: string, ciphertext: string }} Base64-encoded crypto parts
 */
export function encryptSecret(plaintext, secretBase64) {
  if (typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a string');
  }
  const keyBuffer = decodeSecret(secretBase64);
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);

  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  const ciphertextBuffer = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertextBuffer.toString('base64'),
  };
}

/**
 * Decrypts an AES-256-GCM ciphertext payload and verifies authenticity.
 *
 * @param {{ iv: string, tag: string, ciphertext: string }} payload - Base64 crypto parts
 * @param {string} secretBase64 - Base64-encoded 32-byte master encryption key
 * @returns {string} The decrypted plaintext string
 * @throws {Error} If payload was tampered with or secret is wrong
 */
export function decryptSecret({ iv, tag, ciphertext } = {}, secretBase64) {
  if (!iv || !tag || !ciphertext) {
    throw new Error('Encrypted payload must contain iv, tag, and ciphertext');
  }
  const keyBuffer = decodeSecret(secretBase64);

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      keyBuffer,
      Buffer.from(iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64'));

    const decryptedBuffer = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final(),
    ]);

    return decryptedBuffer.toString('utf8');
  } catch {
    throw new Error(
      'Decryption failed: data was tampered with or secret is invalid',
    );
  }
}

/**
 * Extracts the last 4 characters of an API key.
 *
 * @param {string} key - The secret key or token
 * @returns {string} Last 4 characters
 */
export function getLast4(key) {
  if (!key || typeof key !== 'string') return '';
  return key.slice(-4);
}

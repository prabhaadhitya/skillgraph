import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { encryptSecret, decryptSecret, getLast4 } from '../../src/utils/crypto.js';

describe('utils/crypto', () => {
  const validSecret = crypto.randomBytes(32).toString('base64');
  const alternateSecret = crypto.randomBytes(32).toString('base64');
  const invalidLengthSecret = crypto.randomBytes(16).toString('base64');

  it('successfully round-trips a plaintext secret', () => {
    const plaintext = 'sk-or-v1-1234567890abcdefghijklmnopqrstuvwxyz';
    const encrypted = encryptSecret(plaintext, validSecret);

    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('tag');
    expect(encrypted).toHaveProperty('ciphertext');

    const decrypted = decryptSecret(encrypted, validSecret);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different IV and ciphertext for two encryptions of the same text', () => {
    const plaintext = 'sk-or-v1-repeatable-token';
    const enc1 = encryptSecret(plaintext, validSecret);
    const enc2 = encryptSecret(plaintext, validSecret);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
  });

  it('throws a clear error if ciphertext or tag was tampered with', () => {
    const plaintext = 'super-sensitive-api-token';
    const encrypted = encryptSecret(plaintext, validSecret);

    // Tamper with ciphertext
    const tamperedCiphertext = {
      ...encrypted,
      ciphertext:
        encrypted.ciphertext[0] === 'A'
          ? 'B' + encrypted.ciphertext.slice(1)
          : 'A' + encrypted.ciphertext.slice(1),
    };
    expect(() => decryptSecret(tamperedCiphertext, validSecret)).toThrow(
      /data was tampered with or secret is invalid/,
    );

    // Tamper with auth tag
    const tamperedTag = {
      ...encrypted,
      tag:
        encrypted.tag[0] === 'A'
          ? 'B' + encrypted.tag.slice(1)
          : 'A' + encrypted.tag.slice(1),
    };
    expect(() => decryptSecret(tamperedTag, validSecret)).toThrow(
      /data was tampered with or secret is invalid/,
    );
  });

  it('throws if decrypted with a wrong 32-byte secret', () => {
    const plaintext = 'token-to-be-decrypted-with-wrong-key';
    const encrypted = encryptSecret(plaintext, validSecret);

    expect(() => decryptSecret(encrypted, alternateSecret)).toThrow(
      /data was tampered with or secret is invalid/,
    );
  });

  it('throws if secret does not decode to exactly 32 bytes', () => {
    const plaintext = 'testing-key-length-validation';

    expect(() => encryptSecret(plaintext, invalidLengthSecret)).toThrow(
      /Secret must decode to exactly 32 bytes/,
    );

    const validPayload = encryptSecret(plaintext, validSecret);
    expect(() => decryptSecret(validPayload, invalidLengthSecret)).toThrow(
      /Secret must decode to exactly 32 bytes/,
    );

    expect(() => encryptSecret(plaintext, 'not-base64-length-3')).toThrow(
      /Secret must decode to exactly 32 bytes/,
    );
  });

  it('extracts the last 4 characters using getLast4', () => {
    expect(getLast4('sk-or-v1-abcdef1234')).toBe('1234');
    expect(getLast4('abcd')).toBe('abcd');
    expect(getLast4('ab')).toBe('ab');
    expect(getLast4('')).toBe('');
    expect(getLast4(null)).toBe('');
    expect(getLast4(undefined)).toBe('');
  });
});

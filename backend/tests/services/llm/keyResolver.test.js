import { describe, it, expect } from 'vitest';
import { resolveKey, nextUsage } from '../../../src/services/llm/keyResolver.js';

describe('services/llm/keyResolver', () => {
  const today = '2026-10-07';
  const yesterday = '2026-10-06';
  const userPlainKey = 'sk-or-v1-user-secret-key';
  const serverKey = 'sk-or-v1-server-fallback-key';

  describe('resolveKey', () => {
    it('returns source "user" when user key is present, calling decryptUserKey', () => {
      let decryptCalled = false;
      const decryptUserKey = () => {
        decryptCalled = true;
        return userPlainKey;
      };

      const result = resolveKey({
        userKeyPresent: true,
        decryptUserKey,
        serverKey,
        usage: { date: today, count: 50 },
        dailyLimit: 30,
        today,
      });

      expect(decryptCalled).toBe(true);
      expect(result).toEqual({
        source: 'user',
        apiKey: userPlainKey,
      });
    });

    it('returns source "server" with remaining count when usage is null', () => {
      const result = resolveKey({
        userKeyPresent: false,
        serverKey,
        usage: null,
        dailyLimit: 30,
        today,
      });

      expect(result).toEqual({
        source: 'server',
        apiKey: serverKey,
        remaining: 30,
      });
    });

    it('returns source "server" with remaining count when usage is under dailyLimit for today', () => {
      const result = resolveKey({
        userKeyPresent: false,
        serverKey,
        usage: { date: today, count: 12 },
        dailyLimit: 30,
        today,
      });

      expect(result).toEqual({
        source: 'server',
        apiKey: serverKey,
        remaining: 18,
      });
    });

    it('handles date rollover: usage from another date counts as 0', () => {
      const result = resolveKey({
        userKeyPresent: false,
        serverKey,
        usage: { date: yesterday, count: 30 }, // maxed out yesterday
        dailyLimit: 30,
        today,
      });

      expect(result).toEqual({
        source: 'server',
        apiKey: serverKey,
        remaining: 30,
      });
    });

    it('returns source "none" with reason DAILY_LIMIT when limit is reached', () => {
      const resultAtLimit = resolveKey({
        userKeyPresent: false,
        serverKey,
        usage: { date: today, count: 30 },
        dailyLimit: 30,
        today,
      });

      expect(resultAtLimit).toEqual({
        source: 'none',
        reason: 'DAILY_LIMIT',
      });

      const resultOverLimit = resolveKey({
        userKeyPresent: false,
        serverKey,
        usage: { date: today, count: 35 },
        dailyLimit: 30,
        today,
      });

      expect(resultOverLimit).toEqual({
        source: 'none',
        reason: 'DAILY_LIMIT',
      });
    });

    it('returns source "none" with reason NO_KEY when server key is missing or empty', () => {
      const noServerKeyResult = resolveKey({
        userKeyPresent: false,
        serverKey: null,
        usage: null,
        dailyLimit: 30,
        today,
      });

      expect(noServerKeyResult).toEqual({
        source: 'none',
        reason: 'NO_KEY',
      });

      const emptyServerKeyResult = resolveKey({
        userKeyPresent: false,
        serverKey: '   ',
        usage: null,
        dailyLimit: 30,
        today,
      });

      expect(emptyServerKeyResult).toEqual({
        source: 'none',
        reason: 'NO_KEY',
      });
    });
  });

  describe('nextUsage', () => {
    it('initializes to count 1 when usage is null or undefined', () => {
      expect(nextUsage(null, today)).toEqual({
        date: today,
        count: 1,
      });

      expect(nextUsage(undefined, today)).toEqual({
        date: today,
        count: 1,
      });
    });

    it('increments count by 1 for the same date without mutating input', () => {
      const initial = { date: today, count: 7 };
      const updated = nextUsage(initial, today);

      expect(updated).toEqual({
        date: today,
        count: 8,
      });
      expect(initial.count).toBe(7); // pure function: no mutation
    });

    it('resets count to 1 on date rollover', () => {
      const yesterdayUsage = { date: yesterday, count: 30 };
      const rolledOver = nextUsage(yesterdayUsage, today);

      expect(rolledOver).toEqual({
        date: today,
        count: 1,
      });
      expect(yesterdayUsage.count).toBe(30);
    });
  });
});

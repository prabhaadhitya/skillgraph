import { describe, it, expect } from 'vitest';
import { validatePassword } from './passwordRules.js';

describe('validatePassword utility', () => {
  it('identifies passwords shorter than 8 characters', () => {
    const res = validatePassword('Pass1');
    expect(res.hasMinLength).toBe(false);
    expect(res.hasLetter).toBe(true);
    expect(res.hasNumber).toBe(true);
    expect(res.isValid).toBe(false);
  });

  it('identifies passwords without letters', () => {
    const res = validatePassword('12345678');
    expect(res.hasMinLength).toBe(true);
    expect(res.hasLetter).toBe(false);
    expect(res.hasNumber).toBe(true);
    expect(res.isValid).toBe(false);
  });

  it('identifies passwords without numbers', () => {
    const res = validatePassword('PasswordOnly');
    expect(res.hasMinLength).toBe(true);
    expect(res.hasLetter).toBe(true);
    expect(res.hasNumber).toBe(false);
    expect(res.isValid).toBe(false);
  });

  it('validates compliant passwords with letter, number, and min 8 characters', () => {
    const res = validatePassword('ValidPass123');
    expect(res.hasMinLength).toBe(true);
    expect(res.hasLetter).toBe(true);
    expect(res.hasNumber).toBe(true);
    expect(res.isValid).toBe(true);

    const passedRules = res.rules.filter((r) => r.passed);
    expect(passedRules.length).toBe(3);
  });

  it('handles empty or null values gracefully', () => {
    const resEmpty = validatePassword('');
    expect(resEmpty.isValid).toBe(false);
    expect(resEmpty.hasMinLength).toBe(false);

    const resNull = validatePassword(null);
    expect(resNull.isValid).toBe(false);
  });
});

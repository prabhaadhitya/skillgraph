import { describe, it, expect } from 'vitest';
import { getReasonLabel, REASON_LABELS } from './reasonLabels.js';

describe('reasonLabels helper', () => {
  it('maps all defined reason codes to human-readable strings', () => {
    expect(getReasonLabel('HIGH_IMPORTANCE')).toBe('High importance');
    expect(getReasonLabel('LARGE_GAP')).toBe('Big gap');
    expect(getReasonLabel('UNLOCKS_MANY')).toBe('Unlocks many skills');
    expect(getReasonLabel('QUICK_WIN')).toBe('Quick win');
    expect(getReasonLabel('REQUIRED_BY_CAREER')).toBe('Required for this career');
  });

  it('matches the exact REASON_LABELS dictionary', () => {
    expect(REASON_LABELS.HIGH_IMPORTANCE).toBe('High importance');
    expect(REASON_LABELS.LARGE_GAP).toBe('Big gap');
    expect(REASON_LABELS.UNLOCKS_MANY).toBe('Unlocks many skills');
    expect(REASON_LABELS.QUICK_WIN).toBe('Quick win');
    expect(REASON_LABELS.REQUIRED_BY_CAREER).toBe('Required for this career');
  });

  it('provides a clean fallback for unknown reason codes', () => {
    expect(getReasonLabel('SOME_CUSTOM_CODE')).toBe('some custom code');
    expect(getReasonLabel('')).toBe('');
    expect(getReasonLabel(null)).toBe('');
  });
});

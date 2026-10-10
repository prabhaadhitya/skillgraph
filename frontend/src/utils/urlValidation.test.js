import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isValidInternalDestination,
  isValidPostLoginDestination,
  sanitizeInternalDestination,
  sanitizePostLoginDestination,
  resolveAndValidateApiUrl,
  addTrustedOrigin,
  removeTrustedOrigin,
  clearTrustedOrigins,
  getTrustedOrigins,
  UntrustedEndpointError,
} from './urlValidation.js';

describe('urlValidation — Internal Navigation & API Endpoint Security', () => {
  beforeEach(() => {
    clearTrustedOrigins();
  });

  afterEach(() => {
    clearTrustedOrigins();
  });

  describe('1. External URLs', () => {
    it('rejects external URLs with http and https schemes', () => {
      expect(isValidInternalDestination('https://evil.com')).toBe(false);
      expect(isValidInternalDestination('http://evil.com')).toBe(false);
      expect(isValidInternalDestination('https://evil.com/app/dashboard')).toBe(false);
      expect(isValidInternalDestination('http://attacker.com/onboarding')).toBe(false);
      expect(isValidInternalDestination('https://sub.domain.com/admin')).toBe(false);
    });

    it('rejects external URLs with non-http schemes (ftp, file, mailto)', () => {
      expect(isValidInternalDestination('ftp://evil.com/app/dashboard')).toBe(false);
      expect(isValidInternalDestination('file:///etc/passwd')).toBe(false);
      expect(isValidInternalDestination('mailto:attacker@evil.com')).toBe(false);
    });

    it('sanitizes external URLs to fallback destination', () => {
      expect(sanitizeInternalDestination('https://evil.com', '/fallback')).toBe('/fallback');
      expect(sanitizePostLoginDestination('https://evil.com/app', '/app/dashboard')).toBe('/app/dashboard');
    });
  });

  describe('2. Protocol-Relative URLs', () => {
    it('rejects protocol-relative URLs starting with //', () => {
      expect(isValidInternalDestination('//evil.com')).toBe(false);
      expect(isValidInternalDestination('//evil.com/app/dashboard')).toBe(false);
      expect(isValidInternalDestination('///evil.com')).toBe(false);
      expect(isValidInternalDestination('////attacker.com')).toBe(false);
    });

    it('sanitizes protocol-relative URLs to fallback destination', () => {
      expect(sanitizeInternalDestination('//evil.com/app/dashboard', '/app/dashboard')).toBe('/app/dashboard');
      expect(sanitizePostLoginDestination('//evil.com', '/onboarding')).toBe('/onboarding');
    });
  });

  describe('3. Malformed Paths and Bypasses', () => {
    it('rejects backslash bypasses (Windows path delimiters and browser quirks)', () => {
      expect(isValidInternalDestination('/\\evil.com')).toBe(false);
      expect(isValidInternalDestination('\\\\evil.com')).toBe(false);
      expect(isValidInternalDestination('/app\\evil.com')).toBe(false);
      expect(isValidInternalDestination('/app/dashboard\\evil.com')).toBe(false);
    });

    it('rejects dangerous URI schemes (javascript, data, vbscript)', () => {
      expect(isValidInternalDestination('javascript:alert(1)')).toBe(false);
      expect(isValidInternalDestination('javascript:void(0)')).toBe(false);
      expect(isValidInternalDestination('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isValidInternalDestination('vbscript:msgbox("xss")')).toBe(false);
    });

    it('rejects control characters, newlines, and unencoded/encoded null bytes', () => {
      expect(isValidInternalDestination('/app/dashboard\nhttps://evil.com')).toBe(false);
      expect(isValidInternalDestination('/app/dashboard\r\n')).toBe(false);
      expect(isValidInternalDestination('/app/dashboard\0')).toBe(false);
      expect(isValidInternalDestination('/app/dashboard%00')).toBe(false);
      expect(isValidInternalDestination('/app/dashboard%0d%0a')).toBe(false);
    });

    it('rejects directory traversal escape sequences', () => {
      expect(isValidInternalDestination('/app/../evil')).toBe(false);
      expect(isValidInternalDestination('/../../evil')).toBe(false);
      expect(isValidInternalDestination('/app/..')).toBe(false);
    });

    it('rejects unapproved destination prefixes and lookalike domains', () => {
      expect(isValidInternalDestination('/unapproved-page')).toBe(false);
      expect(isValidInternalDestination('/external/route')).toBe(false);
      expect(isValidInternalDestination('/app.evil.com')).toBe(false);
      expect(isValidInternalDestination('/application')).toBe(false);
      expect(isValidInternalDestination('/administrators')).toBe(false);
    });

    it('rejects non-string and empty inputs', () => {
      expect(isValidInternalDestination(null)).toBe(false);
      expect(isValidInternalDestination(undefined)).toBe(false);
      expect(isValidInternalDestination('')).toBe(false);
      expect(isValidInternalDestination('   ')).toBe(false);
      expect(isValidInternalDestination(12345)).toBe(false);
    });
  });

  describe('4. Valid Internal Destinations & Redirects', () => {
    it('accepts approved application routes', () => {
      expect(isValidInternalDestination('/app/dashboard')).toBe(true);
      expect(isValidInternalDestination('/app/graph')).toBe(true);
      expect(isValidInternalDestination('/app/path')).toBe(true);
      expect(isValidInternalDestination('/app/careers')).toBe(true);
      expect(isValidInternalDestination('/app/analytics')).toBe(true);
      expect(isValidInternalDestination('/app/assistant')).toBe(true);
      expect(isValidInternalDestination('/app/profile')).toBe(true);
      expect(isValidInternalDestination('/app/settings')).toBe(true);
    });

    it('accepts approved admin and onboarding routes', () => {
      expect(isValidInternalDestination('/admin')).toBe(true);
      expect(isValidInternalDestination('/admin/overview')).toBe(true);
      expect(isValidInternalDestination('/admin/skills')).toBe(true);
      expect(isValidInternalDestination('/admin/relationships')).toBe(true);
      expect(isValidInternalDestination('/admin/careers')).toBe(true);
      expect(isValidInternalDestination('/onboarding')).toBe(true);
      expect(isValidInternalDestination('/')).toBe(true);
      expect(isValidInternalDestination('/_kit')).toBe(true);
    });

    it('preserves legitimate query parameters and fragments on valid internal destinations', () => {
      expect(isValidInternalDestination('/app/dashboard?tab=skills')).toBe(true);
      expect(isValidInternalDestination('/app/graph?search=python#node-123')).toBe(true);
      expect(isValidInternalDestination('/app/path?week=4')).toBe(true);
      expect(isValidInternalDestination('/admin/skills?q=react&category=frontend')).toBe(true);

      expect(sanitizeInternalDestination('/app/dashboard?tab=skills', '/fallback')).toBe(
        '/app/dashboard?tab=skills',
      );
      expect(sanitizePostLoginDestination('/app/path?week=2#step-1', '/fallback')).toBe(
        '/app/path?week=2#step-1',
      );
    });

    it('extracts relative path from same-origin absolute URL matching window origin', () => {
      const sameOriginUrl = `${window.location.origin}/app/dashboard?tab=skills`;
      expect(isValidInternalDestination(sameOriginUrl)).toBe(true);
      expect(sanitizePostLoginDestination(sameOriginUrl, '/fallback')).toBe(
        '/app/dashboard?tab=skills',
      );
    });
  });

  describe('5. Post-Login Destination Rules (Loop Prevention)', () => {
    it('disallows /login and /register as post-login destinations', () => {
      expect(isValidPostLoginDestination('/login')).toBe(false);
      expect(isValidPostLoginDestination('/login?next=/app')).toBe(false);
      expect(isValidPostLoginDestination('/register')).toBe(false);
      expect(isValidPostLoginDestination('/register?career=ai')).toBe(false);

      expect(sanitizePostLoginDestination('/login', '/app/dashboard')).toBe('/app/dashboard');
      expect(sanitizePostLoginDestination('/register', '/onboarding')).toBe('/onboarding');
    });

    it('allows /app/dashboard and /admin for post-login destinations', () => {
      expect(isValidPostLoginDestination('/app/dashboard')).toBe(true);
      expect(isValidPostLoginDestination('/admin/overview')).toBe(true);
      expect(sanitizePostLoginDestination('/app/dashboard', '/fallback')).toBe('/app/dashboard');
    });
  });

  describe('6. API Endpoint Validation (resolveAndValidateApiUrl)', () => {
    it('resolves valid relative paths against BASE', () => {
      expect(resolveAndValidateApiUrl('/skills', '/api')).toBe('/api/skills');
      expect(resolveAndValidateApiUrl('skills', '/api')).toBe('/api/skills');
      expect(resolveAndValidateApiUrl('/analysis/career-fit?career=ai', '/api')).toBe(
        '/api/analysis/career-fit?career=ai',
      );
    });

    it('blocks untrusted external absolute URLs with UntrustedEndpointError', () => {
      expect(() => resolveAndValidateApiUrl('https://evil.com/api/skills', '/api')).toThrow(
        UntrustedEndpointError,
      );
      expect(() => resolveAndValidateApiUrl('http://attacker.com/steal', '/api')).toThrow(
        /untrusted endpoint/i,
      );
      expect(() => resolveAndValidateApiUrl('https://phishing.site/data', '/api')).toThrow(
        UntrustedEndpointError,
      );
    });

    it('blocks protocol-relative API endpoints', () => {
      expect(() => resolveAndValidateApiUrl('//evil.com/api', '/api')).toThrow(
        /protocol-relative/i,
      );
      expect(() => resolveAndValidateApiUrl('//attacker.com', '/api')).toThrow(
        UntrustedEndpointError,
      );
    });

    it('blocks malformed paths containing backslashes and non-http schemes', () => {
      expect(() => resolveAndValidateApiUrl('/\\evil.com/api', '/api')).toThrow(/backslashes/i);
      expect(() => resolveAndValidateApiUrl('javascript:alert(1)', '/api')).toThrow(/scheme/i);
      expect(() => resolveAndValidateApiUrl('data:text/html,...', '/api')).toThrow(/scheme/i);
    });

    it('allows absolute URLs matching the configured BASE origin', () => {
      const base = 'http://localhost:5000/api';
      const target = 'http://localhost:5000/api/users/me';
      expect(resolveAndValidateApiUrl(target, base)).toBe(target);
    });

    it('allows absolute URLs matching current window.location.origin', () => {
      const target = `${window.location.origin}/api/skills`;
      expect(resolveAndValidateApiUrl(target, '/api')).toBe(target);
    });

    it('supports dynamically registering trusted origins via addTrustedOrigin', () => {
      expect(() =>
        resolveAndValidateApiUrl('https://trusted-partner.example.com/api', '/api'),
      ).toThrow(UntrustedEndpointError);

      addTrustedOrigin('https://trusted-partner.example.com');
      expect(
        resolveAndValidateApiUrl('https://trusted-partner.example.com/api', '/api'),
      ).toBe('https://trusted-partner.example.com/api');

      removeTrustedOrigin('https://trusted-partner.example.com');
      expect(() =>
        resolveAndValidateApiUrl('https://trusted-partner.example.com/api', '/api'),
      ).toThrow(UntrustedEndpointError);
    });

    it('returns all active trusted origins via getTrustedOrigins', () => {
      const origins = getTrustedOrigins('/api');
      expect(origins).toBeInstanceOf(Set);
      expect(origins.has(window.location.origin.toLowerCase())).toBe(true);
    });
  });
});

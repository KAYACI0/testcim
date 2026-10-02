import { describe, expect, it } from 'vitest';

import { sanitizeRedirectPath } from './redirect';

describe('sanitizeRedirectPath', () => {
  it('allows safe relative paths', () => {
    expect(sanitizeRedirectPath('/home')).toBe('/home');
    expect(sanitizeRedirectPath('/settings/billing')).toBe('/settings/billing');
    expect(sanitizeRedirectPath('/exams/123?tab=results')).toBe('/exams/123?tab=results');
  });

  it('rejects protocol-relative URLs (//evil.com)', () => {
    expect(sanitizeRedirectPath('//evil.com')).toBe('/home');
    expect(sanitizeRedirectPath('//google.com/test')).toBe('/home');
  });

  it('rejects URLs with @ character (user-info trick e.g. @evil.com)', () => {
    expect(sanitizeRedirectPath('/@evil.com')).toBe('/home');
    expect(sanitizeRedirectPath('/path?user=test@evil.com')).toBe('/home');
  });

  it('rejects backslashes and evasion tricks', () => {
    expect(sanitizeRedirectPath('/\\evil.com')).toBe('/home');
    expect(sanitizeRedirectPath('\\evil.com')).toBe('/home');
    expect(sanitizeRedirectPath('/path\\something')).toBe('/home');
  });

  it('rejects non-relative or malformed schemes', () => {
    expect(sanitizeRedirectPath('https://evil.com')).toBe('/home');
    expect(sanitizeRedirectPath('http://evil.com')).toBe('/home');
    expect(sanitizeRedirectPath('javascript:alert(1)')).toBe('/home');
    expect(sanitizeRedirectPath('data:text/html,<script>')).toBe('/home');
  });

  it('falls back to custom fallback if provided', () => {
    expect(sanitizeRedirectPath('https://evil.com', '/login')).toBe('/login');
    expect(sanitizeRedirectPath(null, '/dashboard')).toBe('/dashboard');
    expect(sanitizeRedirectPath(undefined, '/dashboard')).toBe('/dashboard');
  });
});

/**
 * Strictly sanitizes an internal redirect path to prevent Open Redirect vulnerabilities (CWE-601).
 *
 * Rules:
 * - Must be a string.
 * - Must start with exactly one forward slash '/'.
 * - Must not start with '//' (protocol-relative URLs) or '/\' (backslash evasion).
 * - Must not contain '@' (HTTP user-info auth trick) or '\' (Windows path trick).
 * - Must not contain control characters or newlines.
 * - Falls back to `fallback` (default '/home') if invalid.
 */
export function sanitizeRedirectPath(path: unknown, fallback = '/home'): string {
  if (typeof path !== 'string') {
    return fallback;
  }

  const trimmed = path.trim();

  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('\\') ||
    trimmed.includes('@')
  ) {
    return fallback;
  }

  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if ((code >= 0 && code <= 31) || code === 127) {
      return fallback;
    }
  }

  return trimmed;
}

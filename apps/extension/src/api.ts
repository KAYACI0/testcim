export interface CaptureSessionConfig {
  readonly serverUrl: string;
  readonly token: string;
  readonly sessionId: string;
  readonly workspaceId: string;
  readonly testId: string;
  readonly testTitle: string;
  readonly deviceType: string;
  readonly capturedCount: number;
}

export interface SessionValidationApiResponse {
  readonly ok: boolean;
  readonly session?: {
    readonly sessionId: string;
    readonly workspaceId: string;
    readonly testId: string;
    readonly testTitle: string;
    readonly deviceType: string;
  };
  readonly reason?: string;
}

export interface UploadUrlApiResponse {
  readonly ok: boolean;
  readonly signedUrl?: string;
  readonly path?: string;
  readonly token?: string;
  readonly reason?: string;
}

export interface SubmitQuestionApiPayload {
  readonly token: string;
  readonly itemId: string;
  readonly position: string;
  readonly path: string;
  readonly mime: 'image/png' | 'image/jpeg' | 'image/webp';
  readonly bytes: number;
  readonly width: number;
  readonly height: number;
  readonly sha256: string;
  readonly phash: string;
  readonly answer?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
}

export interface SubmitQuestionApiResponse {
  readonly ok: boolean;
  readonly questionId?: string;
  readonly questionRevisionId?: string;
  readonly itemId?: string;
  readonly reason?: string;
}

export const DEFAULT_SERVER_URL = 'http://localhost:3000';
export const STORAGE_KEY_SESSION = 'testcim_capture_session';

/**
 * Reads stored capture session from chrome.storage.local.
 */
export async function getStoredSession(): Promise<CaptureSessionConfig | null> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return null;
  }
  const result = await chrome.storage.local.get(STORAGE_KEY_SESSION);
  const data = result[STORAGE_KEY_SESSION] as CaptureSessionConfig | undefined;
  return data ?? null;
}

/**
 * Saves active capture session into chrome.storage.local.
 */
export async function saveStoredSession(session: CaptureSessionConfig): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return;
  }
  await chrome.storage.local.set({ [STORAGE_KEY_SESSION]: session });
}

/**
 * Clears stored capture session.
 */
export async function clearStoredSession(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return;
  }
  await chrome.storage.local.remove(STORAGE_KEY_SESSION);
}

/**
 * Validates a capture token against the Testcim API.
 */
export async function validateSession(
  serverUrl: string,
  token: string,
): Promise<SessionValidationApiResponse> {
  const base = serverUrl.replace(/\/+$/, '');
  const url = `${base}/api/capture/session?token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    const data = (await res.json()) as SessionValidationApiResponse;
    return data;
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'network_error',
    };
  }
}

/**
 * Requests a signed storage upload URL for the active capture session.
 */
export async function getSignedUploadUrl(
  serverUrl: string,
  token: string,
  ext: string = 'png',
): Promise<UploadUrlApiResponse> {
  const base = serverUrl.replace(/\/+$/, '');
  const url = `${base}/api/capture/upload-url`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ext }),
    });
    const data = (await res.json()) as UploadUrlApiResponse;
    return data;
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'network_error',
    };
  }
}

/**
 * Uploads image blob directly to Supabase Storage signed URL without passing through web server.
 */
export async function uploadBlobToSignedUrl(
  signedUrl: string,
  blob: Blob,
  mimeType: string,
): Promise<boolean> {
  try {
    const res = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: blob,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Submits the captured question to the Testcim test.
 */
export async function submitCapturedQuestion(
  serverUrl: string,
  payload: SubmitQuestionApiPayload,
): Promise<SubmitQuestionApiResponse> {
  const base = serverUrl.replace(/\/+$/, '');
  const url = `${base}/api/capture/submit`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as SubmitQuestionApiResponse;
    return data;
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'network_error',
    };
  }
}

/**
 * Computes hexadecimal SHA-256 hash of a Blob using Web Crypto API.
 */
export async function computeSha256(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

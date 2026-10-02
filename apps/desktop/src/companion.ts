import crypto from 'node:crypto';

export interface CompanionConfig {
  readonly serverUrl: string;
  readonly token: string;
  readonly active?: boolean;
}

export interface CompanionProcessResult {
  readonly ok: boolean;
  readonly reason?:
    | 'inactive'
    | 'missing_token'
    | 'ignored_non_image_privacy'
    | 'duplicate_hash'
    | 'too_small'
    | 'upload_failed'
    | 'submit_failed'
    | undefined;
  readonly questionId?: string | undefined;
  readonly sha256?: string | undefined;
}

export class DesktopCompanion {
  private serverUrl: string;
  private token: string | null;
  private isActive: boolean;
  private lastProcessedSha256: string | null = null;
  private capturedCount: number = 0;

  constructor(config?: Partial<CompanionConfig>) {
    this.serverUrl = config?.serverUrl?.replace(/\/+$/, '') || 'http://localhost:3000';
    this.token = config?.token || null;
    this.isActive = config?.active ?? true;
  }

  public setToken(token: string): void {
    this.token = token;
    this.lastProcessedSha256 = null;
  }

  public setServerUrl(url: string): void {
    this.serverUrl = url.replace(/\/+$/, '');
  }

  public toggleCapture(active?: boolean): boolean {
    this.isActive = typeof active === 'boolean' ? active : !this.isActive;
    return this.isActive;
  }

  public getStatus() {
    return {
      isActive: this.isActive,
      hasToken: Boolean(this.token),
      capturedCount: this.capturedCount,
      lastHash: this.lastProcessedSha256,
    };
  }

  /**
   * Strictly processes only image binary buffers.
   * PRIVACY RULE: If content is string/text/html/password, it is immediately discarded.
   */
  public async handleClipboardData(data: unknown): Promise<CompanionProcessResult> {
    if (!this.isActive) {
      return { ok: false, reason: 'inactive' };
    }

    if (!this.token) {
      return { ok: false, reason: 'missing_token' };
    }

    // Strict privacy enforcement: reject non-binary / string payloads immediately
    if (typeof data === 'string' || typeof data !== 'object' || data === null) {
      return { ok: false, reason: 'ignored_non_image_privacy' };
    }

    let bytes: Uint8Array;
    if (data instanceof Uint8Array) {
      bytes = data;
    } else if (Buffer.isBuffer(data)) {
      bytes = new Uint8Array(data);
    } else {
      return { ok: false, reason: 'ignored_non_image_privacy' };
    }

    if (bytes.length < 32) {
      return { ok: false, reason: 'too_small' };
    }

    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');

    // Deduplication check
    if (this.lastProcessedSha256 === sha256) {
      return { ok: false, reason: 'duplicate_hash' };
    }

    this.lastProcessedSha256 = sha256;

    // Direct signed upload
    try {
      const uploadRes = await fetch(`${this.serverUrl}/api/capture/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.token, ext: 'png' }),
      });

      if (!uploadRes.ok) {
        return { ok: false, reason: 'upload_failed' };
      }

      const uploadData = (await uploadRes.json()) as {
        signedUrl?: string;
        path?: string;
      };

      if (!uploadData.signedUrl || !uploadData.path) {
        return { ok: false, reason: 'upload_failed' };
      }

      // Upload image to storage
      const storageRes = await fetch(uploadData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: bytes,
      });

      if (!storageRes.ok) {
        return { ok: false, reason: 'upload_failed' };
      }

      // Submit captured question
      const submitRes = await fetch(`${this.serverUrl}/api/capture/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: this.token,
          itemId: crypto.randomUUID(),
          position: 'a0',
          path: uploadData.path,
          mime: 'image/png',
          bytes: bytes.length,
          width: 800,
          height: 600,
          sha256,
          phash: '0000000000000000',
          answer: null,
        }),
      });

      if (!submitRes.ok) {
        return { ok: false, reason: 'submit_failed' };
      }

      const submitData = (await submitRes.json()) as {
        ok?: boolean;
        questionId?: string;
      };

      if (!submitData.ok) {
        return { ok: false, reason: 'submit_failed' };
      }

      this.capturedCount += 1;
      return {
        ok: true,
        questionId: submitData.questionId,
        sha256,
      };
    } catch {
      return { ok: false, reason: 'upload_failed' };
    }
  }
}

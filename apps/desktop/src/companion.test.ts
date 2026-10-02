import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DesktopCompanion } from './companion';

describe('DesktopCompanion', () => {
  let companion: DesktopCompanion;

  beforeEach(() => {
    vi.restoreAllMocks();
    companion = new DesktopCompanion({
      token: 'test-session-token-123',
      serverUrl: 'http://localhost:3000',
      active: true,
    });
  });

  describe('Privacy and input filtering', () => {
    it('strictly rejects text copied to clipboard to protect user privacy', async () => {
      const textPayload = 'MySecretPassword123!';
      const res = await companion.handleClipboardData(textPayload);

      expect(res.ok).toBe(false);
      expect(res.reason).toBe('ignored_non_image_privacy');
    });

    it('strictly rejects null or object non-buffer clipboard payloads', async () => {
      const res = await companion.handleClipboardData({ random: 'data' });
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('ignored_non_image_privacy');
    });

    it('rejects payloads when capture is toggled off', async () => {
      companion.toggleCapture(false);
      const fakeImage = new Uint8Array(64).fill(255);
      const res = await companion.handleClipboardData(fakeImage);

      expect(res.ok).toBe(false);
      expect(res.reason).toBe('inactive');
    });

    it('rejects when token is missing', async () => {
      const emptyCompanion = new DesktopCompanion({ token: '' });
      const fakeImage = new Uint8Array(64).fill(255);
      const res = await emptyCompanion.handleClipboardData(fakeImage);

      expect(res.ok).toBe(false);
      expect(res.reason).toBe('missing_token');
    });
  });

  describe('Deduplication and processing', () => {
    it('deduplicates identical images consecutively copied to clipboard', async () => {
      const fakeImage = new Uint8Array(64).fill(123);

      // Mock fetch for first upload
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/upload-url')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ ok: true, signedUrl: 'http://storage.local/upload', path: 'p1' }),
              { status: 200 },
            ),
          );
        }
        if (url.includes('/submit')) {
          return Promise.resolve(
            new Response(JSON.stringify({ ok: true, questionId: 'q-100' }), { status: 200 }),
          );
        }
        return Promise.resolve(new Response(null, { status: 200 }));
      });

      vi.stubGlobal('fetch', fetchMock);

      const firstRes = await companion.handleClipboardData(fakeImage);
      expect(firstRes.ok).toBe(true);

      // Second identical clipboard event
      const secondRes = await companion.handleClipboardData(fakeImage);
      expect(secondRes.ok).toBe(false);
      expect(secondRes.reason).toBe('duplicate_hash');
    });

    it('updates status and counter on successful upload', async () => {
      const imageBytes = new Uint8Array(128).fill(42);

      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/upload-url')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ ok: true, signedUrl: 'http://storage.local/put', path: 'asset1' }),
              { status: 200 },
            ),
          );
        }
        if (url.includes('/submit')) {
          return Promise.resolve(
            new Response(JSON.stringify({ ok: true, questionId: 'q-created-1' }), { status: 200 }),
          );
        }
        return Promise.resolve(new Response(null, { status: 200 }));
      });

      vi.stubGlobal('fetch', fetchMock);

      const res = await companion.handleClipboardData(imageBytes);
      expect(res.ok).toBe(true);
      expect(res.questionId).toBe('q-created-1');

      const status = companion.getStatus();
      expect(status.capturedCount).toBe(1);
      expect(status.isActive).toBe(true);
    });
  });
});

import { z } from 'zod';

export const CAPTURE_DEVICE_TYPES = ['phone', 'extension', 'desktop'] as const;
export type CaptureDeviceType = (typeof CAPTURE_DEVICE_TYPES)[number];

export const createCaptureSessionSchema = z.object({
  testId: z.uuid(),
  deviceType: z.enum(CAPTURE_DEVICE_TYPES),
});
export type CreateCaptureSessionInput = z.infer<typeof createCaptureSessionSchema>;

export const mobileCaptureSubmitSchema = z.object({
  token: z.string().min(16),
  itemId: z.uuid(),
  position: z.string().min(1),
  path: z.string().min(1),
  mime: z.string().min(1),
  bytes: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sha256: z.string().length(64),
  phash: z.string().length(16),
  answer: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
});
export type MobileCaptureSubmitInput = z.infer<typeof mobileCaptureSubmitSchema>;

export interface CaptureSessionPayload {
  readonly sessionId: string;
  readonly workspaceId: string;
  readonly testId: string;
  readonly testTitle: string;
  readonly deviceType: CaptureDeviceType;
  readonly expiresAt: string;
}

export interface RealtimeCaptureQuestionEvent {
  readonly type: 'question_captured';
  readonly testId: string;
  readonly itemId: string;
  readonly questionId: string;
  readonly questionRevisionId: string;
  readonly assetId: string;
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly deviceType: CaptureDeviceType;
  readonly thumbnailUrl?: string | undefined;
  readonly answer?: 'A' | 'B' | 'C' | 'D' | 'E' | undefined;
}

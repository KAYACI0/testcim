'use server';

import crypto from 'node:crypto';

import { buildOmrTemplate, renderOmrFormPdf } from '@testcim/omr';

import { requireSession } from '@/lib/auth/dal';
import { getCurrentWorkspace } from '@/lib/workspace/current';

export interface GenerateOmrFormInput {
  readonly testTitle?: string | undefined;
  readonly questionCount: number;
  readonly optionsCount: 4 | 5;
  readonly studentNumberDigits?: number | undefined;
}

export async function generateOmrFormPdfAction(
  input: GenerateOmrFormInput,
): Promise<
  | { readonly ok: true; readonly base64: string; readonly fileName: string }
  | { readonly ok: false; readonly error: string }
> {
  try {
    await requireSession();
    await getCurrentWorkspace();

    const questionCount = Math.max(1, Math.min(200, input.questionCount || 20));
    const optionsCount = input.optionsCount === 5 ? 5 : 4;
    const studentNumberDigits = Math.max(1, Math.min(10, input.studentNumberDigits ?? 4));
    const title = input.testTitle?.trim() || 'Optik Cevap Formu';

    const template = buildOmrTemplate({
      questionCount,
      optionCount: optionsCount,
      studentNumberDigits,
    });

    const formId = crypto.randomUUID();
    const pdfBytes = await renderOmrFormPdf(template, {
      testTitle: title,
      formId,
      nameLabel: 'Adı Soyadı',
      classLabel: 'Sınıfı / Şubesi',
    });

    const base64 = Buffer.from(pdfBytes).toString('base64');
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_').slice(0, 40);
    const fileName = `optik-form-${sanitizedTitle || 'test'}.pdf`;

    return {
      ok: true,
      base64,
      fileName,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Optik form üretilemedi',
    };
  }
}

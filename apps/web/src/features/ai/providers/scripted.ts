import type { AiGenerateParams, AiGenerateResult, AiProvider } from '../types';

function parsePrompt(prompt: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(prompt);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function scriptedOutput(params: AiGenerateParams<unknown>): unknown {
  const input = parsePrompt(params.prompt);

  switch (params.kind) {
    case 'generate_questions': {
      const count = typeof input.count === 'number' ? input.count : 1;
      const type = input.questionType;
      return {
        questions: Array.from({ length: count }, (_, index) => ({
          stem: `Örnek soru ${index + 1}: $x + ${index + 2} = ${index + 5}$ ise x kaçtır?`,
          options: type === 'mcq' ? ['1', '2', '3', '4'] : [],
          correct_index: type === 'open' ? null : type === 'tf' ? 0 : 2,
          explanation: 'Her iki taraftan sabit çıkarılır.',
          difficulty: 2,
        })),
      };
    }
    case 'image_to_text':
      return {
        stem: 'Okunan soru: $\frac{1}{2} + \frac{1}{4}$ işleminin sonucu kaçtır?',
        options: ['$\frac{1}{4}$', '$\frac{3}{4}$', '$\frac{1}{2}$', '1'],
        correct_index: null,
        has_figure: false,
        uncertain: false,
      };
    case 'generate_distractors': {
      const count = typeof input.count === 'number' ? input.count : 1;
      return { distractors: Array.from({ length: count }, (_, index) => `Çeldirici ${index + 1}`) };
    }
    case 'quality_check':
      return {
        issues: [
          {
            kind: 'typo',
            severity: 'info',
            message: 'Soru kökündeki noktalama gözden geçirilmeli.',
          },
        ],
        difficulty_estimate: 3,
      };
    default:
      throw new Error(`ScriptedAiProvider: no script for kind ${String(params.kind)}`);
  }
}

/**
 * Deterministic offline `AiProvider` for local development and Playwright
 * (selected by `AI_PROVIDER=scripted`, never in a production build). It
 * answers from the structured prompt, so E2E runs need no API key.
 */
export class ScriptedAiProvider implements AiProvider {
  generate<TOutput>(params: AiGenerateParams<TOutput>): Promise<AiGenerateResult<TOutput>> {
    const parsed = params.outputSchema.safeParse(scriptedOutput(params));

    if (!parsed.success) {
      return Promise.reject(new Error(`ScriptedAiProvider: ${parsed.error.message}`));
    }

    return Promise.resolve({
      data: parsed.data,
      model: 'scripted',
      tokensIn: 0,
      tokensOut: 0,
      costMicro: 0,
    });
  }
}

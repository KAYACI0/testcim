import { z } from 'zod';

/** Contact and copyright-notice forms on the public site. `website` is a honeypot and must stay empty. */
export const publicSubmissionSchema = z.object({
  kind: z.enum(['contact', 'copyright']),
  name: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  subject: z.string().trim().max(300).default(''),
  body: z.string().trim().min(1).max(5000),
  contentUrl: z.url().max(2000).optional(),
  website: z.string().max(0).default(''),
});
export type PublicSubmission = z.infer<typeof publicSubmissionSchema>;

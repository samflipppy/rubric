import { z } from 'zod';

export const QuestionTierSchema = z.enum(['intent', 'behavioral', 'invariant']);

export const QuestionSchema = z.object({
  id: z.string(),
  tier: QuestionTierSchema,
  question: z.string(),
  rationale: z.string(),
  codeContext: z.string().describe('The diff the question is about, quoted verbatim from the PR patch. Every line must appear in the raw diff. No added, paraphrased, or invented lines.'),
  riskIfWrong: z.string(),
});

export const QuestionDraftSchema = QuestionSchema.omit({ id: true });

export const RubricSchema = z.object({
  prNumber: z.number(),
  prTitle: z.string(),
  prAuthor: z.string(),
  inferredIntent: z.string(),
  questions: z.array(QuestionSchema).min(3).max(7),
});

export type QuestionTier = z.infer<typeof QuestionTierSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionDraft = z.infer<typeof QuestionDraftSchema>;
export type Rubric = z.infer<typeof RubricSchema>;

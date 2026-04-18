import { z } from 'zod';
import { RubricSchema } from './rubric';

export const AnswerSchema = z.object({
  questionId: z.string(),
  answer: z.enum(['yes', 'no', 'unsure']),
  note: z.string().optional(),
});

export const RecommendationSchema = z.enum(['approve', 'request_changes', 'needs_human']);

export const ConcernSchema = z.object({
  questionId: z.string(),
  concern: z.string(),
});

export const VerdictSchema = z.object({
  recommendation: RecommendationSchema,
  headline: z.string(),
  summary: z.string(),
  concerns: z.array(ConcernSchema),
  auditTrailMarkdown: z.string(),
});

export const ScoreReviewInputSchema = z.object({
  rubric: RubricSchema,
  answers: z.array(AnswerSchema),
});

export type Answer = z.infer<typeof AnswerSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type Concern = z.infer<typeof ConcernSchema>;
export type Verdict = z.infer<typeof VerdictSchema>;
export type ScoreReviewInput = z.infer<typeof ScoreReviewInputSchema>;

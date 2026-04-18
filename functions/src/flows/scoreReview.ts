import { z } from 'zod';
import { ai } from '../genkit';
import {
  ScoreReviewInputSchema,
  VerdictSchema,
  type Answer,
  type Concern,
  type Recommendation,
  type Verdict,
} from '../schemas/review';
import type { Question, Rubric } from '../schemas/rubric';

function decideRecommendation(answers: Answer[]): Recommendation {
  if (answers.some((a) => a.answer === 'no')) return 'request_changes';
  if (answers.some((a) => a.answer === 'unsure')) return 'needs_human';
  return 'approve';
}

function flaggedAnswers(rubric: Rubric, answers: Answer[]): Array<{ question: Question; answer: Answer }> {
  const byId = new Map(rubric.questions.map((q) => [q.id, q]));
  return answers
    .filter((a) => a.answer === 'no' || a.answer === 'unsure')
    .map((a) => ({ question: byId.get(a.questionId)!, answer: a }))
    .filter((x) => x.question !== undefined);
}

const VerdictTextSchema = z.object({
  headline: z.string().describe('One sentence. States the recommendation and the primary driver behind it.'),
  summary: z.string().describe('2-3 sentences. Explains why, referencing specific concerns.'),
  auditTrailMarkdown: z
    .string()
    .describe(
      'A ready-to-paste PR review comment in Markdown. Structured as a header, a recommendation line, a list of answered questions grouped by tier, and a closing note. No code fences around the whole thing.',
    ),
  concerns: z
    .array(z.object({ questionId: z.string(), concern: z.string() }))
    .describe('One concern per flagged question (no or unsure). Concern text is a short paraphrase of what the reviewer flagged.'),
});

function formatAnswer(a: Answer): string {
  const base = a.answer.toUpperCase();
  return a.note ? `${base} ("${a.note}")` : base;
}

export const scoreReviewFlow = ai.defineFlow(
  {
    name: 'scoreReview',
    inputSchema: ScoreReviewInputSchema,
    outputSchema: VerdictSchema,
  },
  async ({ rubric, answers }) => {
    const recommendation = decideRecommendation(answers);
    const flagged = flaggedAnswers(rubric, answers);

    const qaTranscript = rubric.questions
      .map((q) => {
        const a = answers.find((x) => x.questionId === q.id);
        return `[${q.tier}] ${q.question}\n  reviewer answered: ${a ? formatAnswer(a) : 'SKIPPED'}\n  rationale for question: ${q.rationale}`;
      })
      .join('\n\n');

    const flaggedIds = new Set(flagged.map((f) => f.question.id));

    const res = await ai.generate({
      prompt: `You are producing the verdict text for a PR review. The recommendation has already been decided by a deterministic tally. Your job is to write the human-readable summary and the audit-trail comment, not to re-decide the recommendation.

PR: #${rubric.prNumber} "${rubric.prTitle}" by ${rubric.prAuthor}
Inferred intent: ${rubric.inferredIntent}

Recommendation (locked): ${recommendation.toUpperCase()}

Review transcript:
${qaTranscript}

Flagged question IDs (no or unsure): ${flagged.length === 0 ? 'none' : flagged.map((f) => f.question.id).join(', ')}

Write:
- headline: one sentence. State the recommendation and its primary driver.
- summary: 2-3 sentences. Explain in plain language why this recommendation, referencing specific concerns if any. No meta phrases like "based on the review".
- concerns: one entry per flagged question ID in "${[...flaggedIds].join(', ')}". Paraphrase what the reviewer flagged. Use the exact questionId strings listed.
- auditTrailMarkdown: a PR comment ready to paste. Use this structure:

# Rubric Review

**Recommendation:** ${recommendation}

${rubric.inferredIntent}

## Questions answered

Group by tier (Intent / Behavioral / Invariant). Under each, bullet each question followed by the reviewer's answer and any note, like:
- Q: <question text>
  A: YES | NO | UNSURE <optional note>

## Concerns

Bulleted list of the flagged questions with short paraphrased concern text, or "None." if nothing was flagged.

Do not invent questions or answers. Stick to what's in the transcript.`,
      output: { schema: VerdictTextSchema },
    });

    const llm = res.output!;

    const concerns: Concern[] = flagged.map(({ question }) => {
      const match = llm.concerns.find((c) => c.questionId === question.id);
      return {
        questionId: question.id,
        concern: match?.concern ?? question.question,
      };
    });

    return {
      recommendation,
      headline: llm.headline,
      summary: llm.summary,
      concerns,
      auditTrailMarkdown: llm.auditTrailMarkdown,
    };
  },
);

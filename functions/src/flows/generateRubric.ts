import { z } from 'zod';
import { ai } from '../genkit';
import { fetchPR } from '../tools/github';
import {
  RubricSchema,
  QuestionDraftSchema,
  type Question,
  type QuestionDraft,
  type QuestionTier,
} from '../schemas/rubric';
import type { PR } from '../schemas/pr';

export const GenerateRubricInputSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  prNumber: z.number(),
});

const IntentInferenceSchema = z.object({
  inferredIntent: z.string().describe('One sentence describing what the PR intends to do. Factual, specific, no judgment.'),
});

const QuestionsListSchema = z.object({
  questions: z.array(QuestionDraftSchema.omit({ tier: true })),
});

function fileSummary(pr: PR): string {
  return pr.files
    .map((f) => `- ${f.filename} (${f.status}, +${f.additions} -${f.deletions})`)
    .join('\n');
}

function rawPatchText(pr: PR): string {
  return pr.files.map((f) => f.patch ?? '').filter(Boolean).join('\n\n');
}

function patchBundle(pr: PR): string {
  return pr.files
    .filter((f) => f.patch)
    .map((f) => `### ${f.filename} (${f.status}, +${f.additions} -${f.deletions})\n\`\`\`diff\n${f.patch}\n\`\`\``)
    .join('\n\n');
}

function isLineFaithful(line: string, haystack: string): boolean {
  const trimmed = line.trimEnd();
  if (trimmed === '') return true;
  if (trimmed.startsWith('@@')) return true;
  return haystack.includes(trimmed);
}

function contextIsFaithful(ctx: string, haystack: string): boolean {
  return ctx.split('\n').every((line) => isLineFaithful(line, haystack));
}

function normalizeQuestion(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SHARED_RULES = `You are generating PR review questions for a senior engineer. Each question stands alone with a small code snippet embedded in it. A post-check drops questions that violate the rules, so comply precisely.

RULES:
1. DECISION, NOT FACT OR STATE. Ask whether a decision behind the code is right, not whether the code does something. Bad: "Does X handle null?" Good: "Null here throws TypeError. Is throw the desired contract?"
2. NO FABRICATION. codeContext must be quoted VERBATIM from the actual PR diff. Every line must exist character-for-character in the diff. Do not add comments, paraphrase, or invent lines. A substring check will drop unfaithful questions.
3. NO TAUTOLOGIES. The question must have a genuine chance of being answered "no" by a thoughtful reviewer. If "no" would be absurd or the answer is obviously yes from just the title, drop the question.
4. CODECONTEXT must use unified-diff format (lines prefixed with "+", "-", " ", or "@@"). Include whatever slice of the diff is needed for the decision.
5. Question text under 180 characters. Phrase so "yes" = reviewer agrees with the decision, "no" = reviewer disagrees.
6. Fields: question, rationale (one line on what is AT STAKE), codeContext, riskIfWrong (production impact if reviewer approves a bad decision).`;

function selectFinal(candidates: QuestionDraft[], haystack: string): Question[] {
  const faithful = candidates.filter((q) => q.codeContext && contextIsFaithful(q.codeContext, haystack));

  const seen = new Set<string>();
  const deduped: QuestionDraft[] = [];
  for (const q of faithful) {
    const key = normalizeQuestion(q.question);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(q);
  }

  const byTier: Record<QuestionTier, QuestionDraft[]> = { intent: [], behavioral: [], invariant: [] };
  for (const q of deduped) byTier[q.tier].push(q);

  const CAP_PER_TIER = 3;
  const TOTAL_CAP = 7;
  const order: QuestionTier[] = ['intent', 'behavioral', 'invariant'];

  const chosen: QuestionDraft[] = [];
  for (const tier of order) {
    if (byTier[tier][0]) chosen.push(byTier[tier][0]);
  }
  for (const tier of order) {
    for (let i = 1; i < byTier[tier].length && i < CAP_PER_TIER; i++) {
      if (chosen.length >= TOTAL_CAP) break;
      chosen.push(byTier[tier][i]);
    }
  }

  const perTierIndex: Record<QuestionTier, number> = { intent: 0, behavioral: 0, invariant: 0 };
  return chosen.map((q) => {
    perTierIndex[q.tier] += 1;
    return { ...q, id: `${q.tier}-${perTierIndex[q.tier]}` };
  });
}

export const generateRubricFlow = ai.defineFlow(
  {
    name: 'generateRubric',
    inputSchema: GenerateRubricInputSchema,
    outputSchema: RubricSchema,
  },
  async ({ owner, repo, prNumber }) => {
    const pr = await fetchPR(owner, repo, prNumber);
    const patches = patchBundle(pr);
    const haystack = rawPatchText(pr);
    const files = fileSummary(pr);
    const body = pr.body ?? '(no description)';

    const prContext = `PR title: ${pr.title}
PR body:
${body}

Files changed:
${files}

Raw diff (quote from here only):
${patches}`;

    const intentInferencePromise = ai.generate({
      prompt: `Read a pull request and state what it intends to do in one sentence. Be factual and specific.

Title: ${pr.title}
Body:
${body}

Files changed:
${files}`,
      output: { schema: IntentInferenceSchema },
    });

    const intentPromise = ai.generate({
      prompt: `${SHARED_RULES}

TIER FOCUS: scope decisions. The PR claims a purpose. Look for specific changes in the diff that may not fit that scope: a touched file outside the stated area, new behavior not in the body, "while I was here" tweaks, renames, dependency bumps. Ask whether that specific change belongs, with the suspicious lines as codeContext.

${prContext}

Generate 2-4 decision questions. Zero is acceptable if the diff is tightly scoped.`,
      output: { schema: QuestionsListSchema },
    });

    const behavioralPromise = ai.generate({
      prompt: `${SHARED_RULES}

TIER FOCUS: runtime-behavior decisions. Pick specific changes that encode a runtime decision and ask whether that decision is correct. Compressed Given-When-Then in framing, but not in prose. Example: "Null here throws TypeError instead of being treated as empty. Is throw the right contract?"

${prContext}

Generate 3-5 decision questions. Each rooted in specific diff lines.`,
      output: { schema: QuestionsListSchema },
    });

    const invariantPromise = ai.generate({
      prompt: `${SHARED_RULES}

TIER FOCUS: pattern decisions AI-generated code often gets wrong: silent catches, N+1, happy-path bias, convention drift, removed telemetry, trivial abstractions, hardcoded values. Only ask about patterns that ACTUALLY appear in the diff. Never invent a concern because the tier "needs coverage" — if the diff is clean on all categories, return zero questions.

${prContext}

Generate 0-4 decision questions.`,
      output: { schema: QuestionsListSchema },
    });

    const [intentInference, intentRaw, behavioralRaw, invariantRaw] = await Promise.all([
      intentInferencePromise,
      intentPromise,
      behavioralPromise,
      invariantPromise,
    ]);
    const inferredIntent = intentInference.output!.inferredIntent;

    const candidates: QuestionDraft[] = [
      ...intentRaw.output!.questions.map((q) => ({ ...q, tier: 'intent' as const })),
      ...behavioralRaw.output!.questions.map((q) => ({ ...q, tier: 'behavioral' as const })),
      ...invariantRaw.output!.questions.map((q) => ({ ...q, tier: 'invariant' as const })),
    ];

    const questions = selectFinal(candidates, haystack);

    if (questions.length < 3) {
      throw new Error(
        `generateRubricFlow produced only ${questions.length} valid questions after filters (started with ${candidates.length} candidates). Need at least 3.`,
      );
    }

    return {
      prNumber: pr.number,
      prTitle: pr.title,
      prAuthor: pr.author,
      inferredIntent,
      questions,
    };
  },
);

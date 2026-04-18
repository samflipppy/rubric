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
  questions: z.array(QuestionDraftSchema),
});

function fileSummary(pr: PR): string {
  return pr.files
    .map((f) => `- ${f.filename} (${f.status}, +${f.additions} -${f.deletions})`)
    .join('\n');
}

function patchBundle(pr: PR): string {
  return pr.files
    .filter((f) => f.patch)
    .map((f) => `### ${f.filename} (${f.status}, +${f.additions} -${f.deletions})\n\`\`\`diff\n${f.patch}\n\`\`\``)
    .join('\n\n');
}

function assignIds(drafts: QuestionDraft[], tier: QuestionTier, cap: number): Question[] {
  return drafts.slice(0, cap).map((q, i) => ({
    ...q,
    tier,
    id: `${tier}-${i + 1}`,
  }));
}

export const generateRubricFlow = ai.defineFlow(
  {
    name: 'generateRubric',
    inputSchema: GenerateRubricInputSchema,
    outputSchema: RubricSchema,
  },
  async ({ owner, repo, prNumber }) => {
    const pr = await fetchPR(owner, repo, prNumber);

    const intentRes = await ai.generate({
      prompt: `You are reading a pull request to state what it intends to do.

Title: ${pr.title}
Body:
${pr.body ?? '(no description)'}

Files changed:
${fileSummary(pr)}

State the PR's intent in one sentence. Be factual and specific. If the body is missing or vague, infer from the diff and file changes. Do not judge whether the PR is good.`,
      output: { schema: IntentInferenceSchema },
    });
    const inferredIntent = intentRes.output!.inferredIntent;

    const patches = patchBundle(pr);

    const intentQPromise = ai.generate({
      prompt: `You are helping a human reviewer catch scope creep and AI drift in a pull request.

Stated intent: ${inferredIntent}

PR body:
${pr.body ?? '(no description)'}

Files changed:
${fileSummary(pr)}

Generate 2-4 YES/NO questions the reviewer should answer to verify the PR matches its stated intent and does not bundle in unrelated changes. Focus on:
- Does the PR touch files or subsystems outside the stated intent?
- Does the PR introduce new behavior not mentioned in the body?
- Are there renamings, refactors, or dependency bumps hiding inside a feature PR?

For each question:
- Phrase so "yes" means the PR is fine on this axis, "no" means the reviewer has a concern.
- Keep the question concrete and specific to this PR (name files or symbols).
- One-line rationale explaining why this question matters for an AI-generated PR.
- A "riskIfWrong" field describing what breaks in production if answered incorrectly.
- Skip codeContext for intent-tier questions unless one specific change is the smoking gun.`,
      output: { schema: QuestionsListSchema },
    });

    const behavioralQPromise = ai.generate({
      prompt: `You are generating behavioral review questions for a pull request. Use Given-When-Then reasoning to probe the actual behavior of the diff.

Stated intent: ${inferredIntent}

Code changes:
${patches}

Generate 3-6 YES/NO questions rooted in the ACTUAL code changes (not generic best-practice questions). Each question should:
- Describe a concrete runtime scenario: "When X happens, should Y?"
- Be phrased so "yes" = expected behavior matches what the reviewer expects, "no" = concern.
- Include a one-line rationale naming the specific code path it's probing.
- Include a "riskIfWrong" describing the production impact.
- Include "codeContext": 5-15 lines of the relevant diff, quoted, so the reviewer can peek. Only include the lines that matter for this specific question.

Prefer questions that would only make sense for THIS PR (not ones that could apply to any PR).`,
      output: { schema: QuestionsListSchema },
    });

    const invariantQPromise = ai.generate({
      prompt: `You are generating invariant-check questions for a pull request. Your job is to catch the specific failure modes that AI-generated code frequently exhibits.

Look hard for:
- Silent failures and swallowed exceptions (catch blocks that don't rethrow, log, or handle meaningfully)
- N+1 query patterns (loops invoking async I/O or data-fetching functions)
- Happy-path bias (no null / error / empty / boundary handling where it's needed)
- Convention drift (one function using a pattern different from siblings in the same file)
- Removed or skipped logging, telemetry, or error reporting
- New abstractions or helper layers that are unused or trivial
- Hardcoded values that look like they should be config or env vars

Code changes:
${patches}

Generate 2-4 YES/NO questions. Each should:
- Name the specific file (and line range if possible) where the pattern appears.
- Be phrased so "yes" = the pattern is intentional and fine, "no" = reviewer wants it changed.
- Include rationale naming the failure mode category.
- Include "riskIfWrong": what this looks like in production.
- Include "codeContext": the quoted 5-15 lines of code the question is about.

Do not invent problems that aren't in the diff. If the diff is clean on a category, skip it.`,
      output: { schema: QuestionsListSchema },
    });

    const [intentRaw, behavioralRaw, invariantRaw] = await Promise.all([
      intentQPromise,
      behavioralQPromise,
      invariantQPromise,
    ]);

    const questions = [
      ...assignIds(intentRaw.output!.questions, 'intent', 4),
      ...assignIds(behavioralRaw.output!.questions, 'behavioral', 6),
      ...assignIds(invariantRaw.output!.questions, 'invariant', 4),
    ].slice(0, 12);

    if (questions.length < 5) {
      throw new Error(
        `generateRubricFlow produced only ${questions.length} questions; need at least 5. Check the PR has enough signal.`,
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

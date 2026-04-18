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

const SHARED_RULES = `You are generating PR review questions for a senior engineer. The reviewer is NOT reading the full diff. Each question stands alone with a small code snippet embedded in it. The reviewer has ~15 seconds per question.

Every question MUST:
- Be a DECISION question, not a STATE or FACT question. You have already read the code; what you cannot do is judge whether the decision behind the code is right. Bad: "Does X handle null?" Good: "Null here throws TypeError. Is that the desired contract?"
- Embed "codeContext": the actual diff the question is about. Quote it in unified-diff format — every line starting with "+" (added), "-" (removed), " " (context), or "@@" (hunk header). Preserve the prefixes exactly as they appear in the PR diff. This is what lets the reviewer see what changed. Include WHATEVER LENGTH IS COHERENT — a couple of lines, a whole function, a whole file. The snippet must be complete enough that the reviewer can make the decision from it alone. Do not truncate with "...".
- Be answerable by a senior engineer looking only at the snippet and the question text. If the question needs the reviewer to open another file or guess at context not in the snippet, either expand the snippet to include that context or discard the question.
- Phrase the question so "yes" means the reviewer agrees with the decision, "no" means they disagree.
- Keep question text under 180 characters.
- Be distinct from other questions. Do not generate near-duplicates that rephrase the same decision.

Forbidden question shapes:
- "Does the PR modify files outside X?" (fact — you already know)
- "Are the changes limited to Y?" (fact)
- "Is there a bug?" (too vague)
- "Is this safe?" (too vague)
- Anything that asks the reviewer to verify what the code does instead of whether the decision is correct

Rationale field: one line on what's AT STAKE if the reviewer gets this wrong. Not what the code does.
RiskIfWrong field: what production impact happens if the reviewer approves a bad decision here.`;

function normalizeQuestion(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function assignIds(drafts: QuestionDraft[], tier: QuestionTier, cap: number): Question[] {
  const seen = new Set<string>();
  const unique: QuestionDraft[] = [];
  for (const q of drafts) {
    if (!q.codeContext?.trim()) continue;
    const key = normalizeQuestion(q.question);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(q);
  }
  return unique.slice(0, cap).map((q, i) => ({
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
    const patches = patchBundle(pr);
    const files = fileSummary(pr);
    const body = pr.body ?? '(no description)';

    const prContext = `PR title: ${pr.title}
PR body:
${body}

Files changed:
${files}

Code changes:
${patches}`;

    const intentInferencePromise = ai.generate({
      prompt: `Read a pull request and state what it intends to do in one sentence. Be factual and specific. If the body is missing or vague, infer from the diff and file changes. Do not judge whether the PR is good.

Title: ${pr.title}
Body:
${body}

Files changed:
${files}`,
      output: { schema: IntentInferenceSchema },
    });

    const intentQPromise = ai.generate({
      prompt: `${SHARED_RULES}

TIER FOCUS: scope and intent decisions.

The PR's title and body claim a purpose. Look for SPECIFIC CHANGES in the diff that represent scope decisions: a touched file that doesn't obviously belong, a new behavior not mentioned in the body, a "while I was here" tweak, a renamed symbol, a dependency bump hiding inside a feature PR, a refactor next to a fix.

Frame each question as: "This specific change is in the PR. Given the stated purpose, is this change in scope?" Include the relevant diff as codeContext at whatever length is coherent.

${prContext}

Generate 0-3 intent-tier questions. Only produce a question if a genuinely decision-worthy scope concern exists in the diff. If the diff is tightly scoped to the stated purpose, return an empty array.`,
      output: { schema: QuestionsListSchema },
    });

    const behavioralQPromise = ai.generate({
      prompt: `${SHARED_RULES}

TIER FOCUS: runtime behavior decisions.

Each question probes a concrete runtime decision visible in the diff. Use compressed Given-When-Then thinking, but do not write the question in Given-When-Then prose. Pick the specific change where a behavior decision was made and ask whether that decision is correct. Include whatever slice of the diff (a few lines, a function, or more) is needed to judge it.

Good example: "Empty arrays raise 'got array' instead of iterating. Is that the right contract for callers who pass [] ?"
Bad example: "When a user passes an empty array, does the function throw?" (that's a fact)

${prContext}

Generate 3-5 behavioral-tier questions. Each must be rooted in specific diff lines — not a generic best-practice question.`,
      output: { schema: QuestionsListSchema },
    });

    const invariantQPromise = ai.generate({
      prompt: `${SHARED_RULES}

TIER FOCUS: pattern decisions AI-generated code often gets wrong.

Look for patterns that ACTUALLY appear in the diff (not hypothetical ones):
- Silent catches that swallow errors and return fallback values
- Loops invoking async I/O (N+1)
- Happy-path bias: no null / error / empty handling where it matters
- Convention drift: one function using a pattern different from its siblings
- Removed telemetry, logging, error reporting
- New abstractions or helpers that are unused or trivial
- Hardcoded values that look like they should be config

For each, ask whether the decision behind the pattern is correct. Good example: "The catch block returns [] on failure so the caller sees an empty list indistinguishable from no PRs. Is silent fallback the desired behavior?"
Bad example: "Does the fetch handle errors?" (fact)

${prContext}

Generate 0-3 invariant-tier questions. Only produce a question if the pattern ACTUALLY appears in the diff. Do not invent concerns. If the diff is clean on all categories, return an empty array.`,
      output: { schema: QuestionsListSchema },
    });

    const [intentInference, intentRaw, behavioralRaw, invariantRaw] = await Promise.all([
      intentInferencePromise,
      intentQPromise,
      behavioralQPromise,
      invariantQPromise,
    ]);
    const inferredIntent = intentInference.output!.inferredIntent;

    const questions = [
      ...assignIds(intentRaw.output!.questions, 'intent', 3),
      ...assignIds(behavioralRaw.output!.questions, 'behavioral', 5),
      ...assignIds(invariantRaw.output!.questions, 'invariant', 3),
    ].slice(0, 10);

    if (questions.length < 5) {
      throw new Error(
        `generateRubricFlow produced only ${questions.length} valid questions; need at least 5. Check the PR has enough signal and that codeContext was provided on each question.`,
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

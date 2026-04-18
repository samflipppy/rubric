import { z } from 'zod';
import { ai } from '../genkit';
import { fetchPR } from '../tools/github';
import { QuestionDraftSchema } from '../schemas/rubric';

const SHARED_RULES = `You are generating PR review questions for a senior engineer. The reviewer is NOT reading the full diff. Each question stands alone with a small code snippet embedded in it.

Every question MUST satisfy ALL of these rules. Questions that violate any rule WILL be dropped by a post-check before the reviewer sees them.

1. DECISION, NOT FACT OR STATE.
2. NO FABRICATION.
3. NO TAUTOLOGIES.
4. ONE CONCERN, ONE TIER.
5. CODECONTEXT SIZE: whatever is needed, diff format with +/- prefixes verbatim.
6. QUESTION TEXT under 180 characters.`;

const TIER_DEFINITIONS = `TIER DEFINITIONS:
intent — scope decisions.
behavioral — runtime behavior decisions.
invariant — pattern decisions AI-generated code often gets wrong.`;

async function main() {
  const prNumber = Number(process.argv[2] ?? '3');
  const pr = await fetchPR('samflipppy', 'rubric', prNumber);
  const patches = pr.files
    .filter((f) => f.patch)
    .map((f) => `### ${f.filename}\n\`\`\`diff\n${f.patch}\n\`\`\``)
    .join('\n\n');
  const files = pr.files.map((f) => `- ${f.filename} (${f.status}, +${f.additions} -${f.deletions})`).join('\n');

  const res = await ai.generate({
    prompt: `${SHARED_RULES}

${TIER_DEFINITIONS}

TARGET: generate 8-12 candidate questions. Expect about half to survive filtering.

Aim for at least 1 per tier where the PR warrants it. If a tier has nothing to probe, skip it.

Each question has a "tier" field.

PR title: ${pr.title}
PR body:
${pr.body ?? '(none)'}

Files changed:
${files}

Raw diff:
${patches}`,
    output: {
      schema: z.object({ questions: z.array(QuestionDraftSchema) }),
    },
  });

  const qs = res.output!.questions;
  console.log(`PR #${prNumber}: ${qs.length} candidates\n`);
  for (const q of qs) {
    console.log(`[${q.tier}] ${q.question}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { z } from 'zod';
import { ai } from '../genkit';
import { fetchPR } from '../tools/github';
import { BriefSchema } from '../schemas/brief';

export const GenerateBriefInputSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  prNumber: z.number(),
});

const BriefInferenceSchema = BriefSchema.pick({
  summary: true,
  areas: true,
  riskSignal: true,
});

export const generateBriefFlow = ai.defineFlow(
  {
    name: 'generateBrief',
    inputSchema: GenerateBriefInputSchema,
    outputSchema: BriefSchema,
  },
  async ({ owner, repo, prNumber }) => {
    const pr = await fetchPR(owner, repo, prNumber);
    const additions = pr.files.reduce((s, f) => s + f.additions, 0);
    const deletions = pr.files.reduce((s, f) => s + f.deletions, 0);

    const fileList = pr.files
      .map((f) => `- ${f.filename} (${f.status}, +${f.additions} -${f.deletions})`)
      .join('\n');
    const patches = pr.files
      .filter((f) => f.patch)
      .map((f) => `### ${f.filename}\n\`\`\`diff\n${f.patch}\n\`\`\``)
      .join('\n\n');

    const res = await ai.generate({
      prompt: `Brief a reviewer on this pull request. The reviewer has 10 seconds. Be factual and compressed. Do not judge whether the PR is good.

Title: ${pr.title}
Body:
${pr.body ?? '(no description)'}

Files:
${fileList}

Diff:
${patches}

Produce three fields:
- summary: one plain-English sentence on what the PR does. Concrete, specific to this change. Not "improves things" or "refactors code."
- areas: 2-4 short phrases naming the FUNCTIONAL areas this PR touches. Think subsystems, flows, user-facing surfaces. NOT file paths. Examples: "PR list fetch", "session refresh flow", "tier badge styling", "verdict scoring logic".
- riskSignal: one short phrase on scope. Examples of shape (do not copy verbatim): "small and isolated", "touches core business logic", "broad surface area across ${pr.files.length} files", "changes a public API contract", "single-function refactor". Always substitute concrete numbers/names for the specific PR; never emit placeholders like "N files" or "X lines" literally.`,
      output: { schema: BriefInferenceSchema },
    });

    const { summary, areas, riskSignal } = res.output!;

    return {
      prNumber: pr.number,
      prTitle: pr.title,
      prAuthor: pr.author,
      prUrl: pr.url,
      fileCount: pr.files.length,
      additions,
      deletions,
      summary,
      areas,
      riskSignal,
    };
  },
);

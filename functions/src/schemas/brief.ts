import { z } from 'zod';

export const BriefSchema = z.object({
  prNumber: z.number(),
  prTitle: z.string(),
  prAuthor: z.string(),
  prUrl: z.string(),
  fileCount: z.number(),
  additions: z.number(),
  deletions: z.number(),
  summary: z.string().describe('One plain-English sentence on what this PR does. Specific, not generic. No judgment.'),
  areas: z.array(z.string()).min(1).max(4).describe('2-4 short phrases naming the functional areas the PR touches. Subsystems, flows, user surfaces. Not file paths.'),
  riskSignal: z.string().describe('One short phrase on scope: "small and isolated", "touches core business logic", "broad surface area across N files", "changes a public API contract". Factual.'),
});

export type Brief = z.infer<typeof BriefSchema>;

import { z } from 'zod';

export const PRFileSchema = z.object({
  filename: z.string(),
  status: z.enum(['added', 'modified', 'removed', 'renamed']),
  additions: z.number(),
  deletions: z.number(),
  patch: z.string().optional(),
});

export const PRSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  author: z.string(),
  state: z.enum(['open', 'closed']),
  url: z.string(),
  files: z.array(PRFileSchema),
});

export const PRSummarySchema = z.object({
  number: z.number(),
  title: z.string(),
  author: z.string(),
  url: z.string(),
  fileCount: z.number(),
  additions: z.number(),
  deletions: z.number(),
});

export type PRFile = z.infer<typeof PRFileSchema>;
export type PR = z.infer<typeof PRSchema>;
export type PRSummary = z.infer<typeof PRSummarySchema>;

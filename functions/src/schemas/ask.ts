import { z } from 'zod';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const AskInputSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  prNumber: z.number(),
  messages: z.array(ChatMessageSchema).min(1),
});

export const AskOutputSchema = z.object({
  answer: z.string(),
  codeReferences: z
    .array(z.string())
    .max(3)
    .describe(
      'Zero to three CONTIGUOUS multi-line diff snippets the answer draws from. Each snippet is a coherent chunk of code (typically 3-15 lines), not a single line. Do NOT split one region of the diff into many single-line entries. Quote in unified-diff format with +/- prefixes preserved, verbatim from the PR diff.',
    ),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type AskInput = z.infer<typeof AskInputSchema>;
export type AskOutput = z.infer<typeof AskOutputSchema>;

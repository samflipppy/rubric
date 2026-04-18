import { ai } from '../genkit';
import { fetchPR } from '../tools/github';
import { AskInputSchema, AskOutputSchema } from '../schemas/ask';

function isLineFaithful(line: string, haystack: string): boolean {
  const trimmed = line.trimEnd();
  if (trimmed === '') return true;
  if (trimmed.startsWith('@@')) return true;
  return haystack.includes(trimmed);
}

function stripCodeFences(ref: string): string {
  return ref
    .split('\n')
    .filter((line) => !/^\s*```/.test(line))
    .join('\n');
}

function referenceIsFaithful(ref: string, haystack: string): boolean {
  return stripCodeFences(ref)
    .split('\n')
    .every((line) => isLineFaithful(line, haystack));
}

export const answerPRQuestionFlow = ai.defineFlow(
  {
    name: 'answerPRQuestion',
    inputSchema: AskInputSchema,
    outputSchema: AskOutputSchema,
  },
  async ({ owner, repo, prNumber, messages }) => {
    const pr = await fetchPR(owner, repo, prNumber);
    const haystack = pr.files.map((f) => f.patch ?? '').filter(Boolean).join('\n\n');
    const patches = pr.files
      .filter((f) => f.patch)
      .map((f) => `### ${f.filename}\n\`\`\`diff\n${f.patch}\n\`\`\``)
      .join('\n\n');

    const system = `You are answering questions about a pull request. The diff below is your only source of truth.

Rules:
- Keep answers under 150 words unless the reviewer explicitly asks for more detail.
- The reviewer is senior. Skip "great question" boilerplate. No filler.
- If the answer cannot be determined from the diff alone, say so plainly. Do not speculate.

codeReferences rules:
- Return 1-2 references when your answer points at specific code, zero when it doesn't.
- Each reference is a CONTIGUOUS multi-line chunk copied directly from the diff. Target 5-20 lines per chunk. Include several lines of context so the chunk stands alone.
- Quote verbatim from the diff below, including the "+" / "-" / " " / "@@" prefixes as they appear in the diff.
- Every line of every reference must exist character-for-character in the diff below.

Example of a GOOD codeReference (multi-line, coherent):
@@ -42,23 +42,38 @@ interface RawFile {
-  const raw = await gh<(RawPR & { ... })[]>(
-    \`/repos/\${owner}/\${repo}/pulls?state=open&per_page=20\`,
-  );
+  let raw: (RawPR & { ... })[] = [];
+  try {
+    raw = await gh(\`/repos/\${owner}/\${repo}/pulls?state=open&per_page=20\`);
+  } catch {
+    return [];
+  }

Examples of BAD codeReferences (do not produce these):
- "}"  (single line, no context)
- "@@ -42,23 +42,38 @@" (just a hunk header, no code)
- Thirty separate one-line entries for one region

PR: #${pr.number} "${pr.title}" by ${pr.author}

Body:
${pr.body ?? '(none)'}

Diff:
${patches}`;

    const res = await ai.generate({
      system,
      messages: messages.map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        content: [{ text: m.content }],
      })),
      output: { schema: AskOutputSchema },
    });

    const out = res.output!;
    const seen = new Set<string>();
    const filteredRefs: string[] = [];
    for (const raw of out.codeReferences) {
      const ref = stripCodeFences(raw);
      if (!referenceIsFaithful(ref, haystack)) continue;
      const contentLines = ref
        .split('\n')
        .filter((l) => l.trim() !== '' && !l.trim().startsWith('@@'));
      if (contentLines.length < 3) continue;
      const key = ref.trim();
      if (seen.has(key)) continue;
      seen.add(key);
      filteredRefs.push(ref);
    }

    return {
      answer: out.answer,
      codeReferences: filteredRefs,
    };
  },
);

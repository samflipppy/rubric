import type { Answer, Brief, ChatMessage, Decision, Rubric } from '../types';

const DECISION_LABEL: Record<Decision, string> = {
  approve: 'Approve',
  request_changes: 'Request changes',
  unsure: 'Unsure / escalate',
};

const TIER_LABEL = { intent: 'Intent', behavioral: 'Behavioral', invariant: 'Invariant' } as const;

export function buildAuditTrail(args: {
  brief: Brief;
  rubric: Rubric;
  answers: Answer[];
  chatLog: ChatMessage[];
  decision: Decision;
  decisionNote: string;
}): string {
  const { brief, rubric, answers, chatLog, decision, decisionNote } = args;

  const lines: string[] = [];
  lines.push(`# Rubric Review`);
  lines.push('');
  lines.push(`**Decision:** ${DECISION_LABEL[decision]}`);
  lines.push(`**PR:** [#${brief.prNumber} ${brief.prTitle}](${brief.prUrl}) by @${brief.prAuthor}`);
  lines.push(`**Size:** ${brief.fileCount} file${brief.fileCount === 1 ? '' : 's'}, +${brief.additions} / −${brief.deletions}`);
  lines.push('');

  lines.push(`## Brief`);
  lines.push('');
  lines.push(brief.summary);
  lines.push('');
  lines.push(`- Areas: ${brief.areas.join(', ')}`);
  lines.push(`- Risk: ${brief.riskSignal}`);
  lines.push('');

  lines.push(`## Questions answered`);
  lines.push('');
  const answerById = new Map(answers.map((a) => [a.questionId, a]));
  const grouped = { intent: [] as typeof rubric.questions, behavioral: [] as typeof rubric.questions, invariant: [] as typeof rubric.questions };
  for (const q of rubric.questions) grouped[q.tier].push(q);
  for (const tier of ['intent', 'behavioral', 'invariant'] as const) {
    if (grouped[tier].length === 0) continue;
    lines.push(`### ${TIER_LABEL[tier]}`);
    for (const q of grouped[tier]) {
      const a = answerById.get(q.id);
      const ans = a ? a.answer.toUpperCase() : 'SKIPPED';
      const note = a?.note ? ` ("${a.note}")` : '';
      lines.push(`- Q: ${q.question}`);
      lines.push(`  A: ${ans}${note}`);
    }
    lines.push('');
  }

  const concerns = answers
    .filter((a) => a.answer === 'no' || a.answer === 'unsure')
    .map((a) => rubric.questions.find((q) => q.id === a.questionId))
    .filter(Boolean);

  lines.push(`## Concerns`);
  lines.push('');
  if (concerns.length === 0) {
    lines.push('None raised.');
  } else {
    for (const q of concerns) {
      lines.push(`- [${q!.tier}] ${q!.question}`);
    }
  }
  lines.push('');

  if (chatLog.length > 0) {
    lines.push(`## Chat`);
    lines.push('');
    for (const m of chatLog) {
      const speaker = m.role === 'user' ? 'Reviewer' : 'Rubric';
      lines.push(`**${speaker}:** ${m.content}`);
      lines.push('');
    }
  }

  if (decisionNote.trim()) {
    lines.push(`## Reviewer note`);
    lines.push('');
    lines.push(decisionNote.trim());
    lines.push('');
  }

  return lines.join('\n').trim();
}

export function flaggedConcerns(rubric: Rubric, answers: Answer[]) {
  const byId = new Map(rubric.questions.map((q) => [q.id, q]));
  return answers
    .filter((a) => a.answer === 'no' || a.answer === 'unsure')
    .map((a) => ({ answer: a, question: byId.get(a.questionId)! }))
    .filter((c) => c.question !== undefined);
}

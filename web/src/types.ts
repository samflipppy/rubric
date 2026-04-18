export type Tier = 'intent' | 'behavioral' | 'invariant';

export interface Question {
  id: string;
  tier: Tier;
  question: string;
  rationale: string;
  codeContext: string;
  expectedAnswer?: 'yes' | 'no';
  riskIfWrong: string;
}

export interface Rubric {
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  inferredIntent: string;
  questions: Question[];
}

export interface PRSummary {
  number: number;
  title: string;
  author: string;
  url: string;
  fileCount: number;
  additions: number;
  deletions: number;
}

export type Answer = {
  questionId: string;
  answer: 'yes' | 'no' | 'unsure';
  note?: string;
};

export type Recommendation = 'approve' | 'request_changes' | 'needs_human';

export interface Concern {
  questionId: string;
  concern: string;
}

export interface Verdict {
  recommendation: Recommendation;
  headline: string;
  summary: string;
  concerns: Concern[];
  auditTrailMarkdown: string;
}

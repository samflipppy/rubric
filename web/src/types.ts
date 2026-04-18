export type Tier = 'intent' | 'behavioral' | 'invariant';

export interface Question {
  id: string;
  tier: Tier;
  question: string;
  rationale: string;
  codeContext: string;
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

export interface Brief {
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  prUrl: string;
  fileCount: number;
  additions: number;
  deletions: number;
  summary: string;
  areas: string[];
  riskSignal: string;
}

export type Answer = {
  questionId: string;
  answer: 'yes' | 'no' | 'unsure';
  note?: string;
};

export type Decision = 'approve' | 'request_changes' | 'unsure';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  codeReferences?: string[];
}

export interface PRRef {
  owner: string;
  repo: string;
  prNumber: number;
}

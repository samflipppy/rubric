import { useEffect, useState } from 'react';
import { generateRubric, scoreReview } from '../lib/api';
import { navigate, searchParams } from '../lib/nav';
import { LoadingSequence } from '../components/LoadingSequence';
import { ProgressBar } from '../components/ProgressBar';
import { QuestionCard } from '../components/QuestionCard';
import type { Answer, Rubric, Verdict } from '../types';

interface Props {
  onComplete: (rubric: Rubric, answers: Answer[], verdict: Verdict) => void;
}

type State =
  | { kind: 'loading' }
  | { kind: 'answering'; rubric: Rubric; index: number; answers: Answer[] }
  | { kind: 'scoring'; rubric: Rubric; answers: Answer[] }
  | { kind: 'error'; message: string };

export function Review({ onComplete }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    const params = searchParams();
    const owner = params.get('owner');
    const repo = params.get('repo');
    const prNumber = Number(params.get('pr'));
    if (!owner || !repo || !prNumber) {
      navigate('/');
      return;
    }

    let alive = true;
    generateRubric({ owner, repo, prNumber })
      .then((rubric) => {
        if (alive) setState({ kind: 'answering', rubric, index: 0, answers: [] });
      })
      .catch((err: Error) => {
        if (alive) setState({ kind: 'error', message: err.message });
      });
    return () => {
      alive = false;
    };
  }, []);

  async function handleAnswer(answer: 'yes' | 'no' | 'unsure') {
    if (state.kind !== 'answering') return;
    const { rubric, index, answers } = state;
    const current = rubric.questions[index];
    const next: Answer[] = [...answers, { questionId: current.id, answer }];

    if (index + 1 < rubric.questions.length) {
      setState({ kind: 'answering', rubric, index: index + 1, answers: next });
      return;
    }

    setState({ kind: 'scoring', rubric, answers: next });
    try {
      const verdict = await scoreReview({ rubric, answers: next });
      onComplete(rubric, next, verdict);
      navigate('/verdict');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scoring failed.';
      setState({ kind: 'error', message });
    }
  }

  if (state.kind === 'loading') return <LoadingSequence />;

  if (state.kind === 'error') {
    return (
      <main className="mx-auto flex min-h-[60dvh] max-w-[640px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-[40ch] text-base text-ink">Something broke while generating the rubric.</p>
        <p className="max-w-[40ch] text-sm text-muted">{state.message}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="h-11 rounded-btn border border-border bg-surface px-5 text-sm text-ink hover:bg-hover"
        >
          Back to home
        </button>
      </main>
    );
  }

  if (state.kind === 'scoring') {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center" role="status" aria-live="polite">
        <p className="text-base text-muted">Scoring your answers…</p>
      </div>
    );
  }

  const { rubric, index } = state;
  const current = rubric.questions[index];
  const total = rubric.questions.length;

  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-8 px-6 py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <ProgressBar index={index} total={total} />
        <p className="text-sm text-muted">
          PR #{rubric.prNumber} · {rubric.prTitle}
        </p>
      </header>

      <QuestionCard question={current} onAnswer={handleAnswer} />
    </main>
  );
}

import { useEffect, useState } from 'react';
import { generateRubric } from '../lib/api';
import { navigate, searchParams } from '../lib/nav';
import { LoadingSequence } from '../components/LoadingSequence';
import { ProgressBar } from '../components/ProgressBar';
import { QuestionCard } from '../components/QuestionCard';
import type { Answer, Rubric } from '../types';

interface Props {
  rubric: Rubric | null;
  answers: Answer[];
  onRubricLoaded: (rubric: Rubric) => void;
  onAnswersUpdate: (answers: Answer[]) => void;
}

type State =
  | { kind: 'loading' }
  | { kind: 'answering'; index: number }
  | { kind: 'error'; message: string };

export function Review({ rubric, answers, onRubricLoaded, onAnswersUpdate }: Props) {
  const [state, setState] = useState<State>(() =>
    rubric ? { kind: 'answering', index: answers.length } : { kind: 'loading' },
  );

  useEffect(() => {
    if (rubric) return;
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
      .then((r) => {
        if (alive) {
          onRubricLoaded(r);
          setState({ kind: 'answering', index: 0 });
        }
      })
      .catch((err: Error) => {
        if (alive) setState({ kind: 'error', message: err.message });
      });
    return () => {
      alive = false;
    };
  }, [rubric, onRubricLoaded]);

  function handleAnswer(answer: 'yes' | 'no' | 'unsure') {
    if (state.kind !== 'answering' || !rubric) return;
    const current = rubric.questions[state.index];
    const next: Answer[] = [...answers, { questionId: current.id, answer }];
    onAnswersUpdate(next);

    if (state.index + 1 < rubric.questions.length) {
      setState({ kind: 'answering', index: state.index + 1 });
      return;
    }

    const params = searchParams();
    navigate(`/ask?${params.toString()}`);
  }

  if (state.kind === 'loading' || !rubric) return <LoadingSequence />;

  if (state.kind === 'error') {
    return (
      <main className="mx-auto flex min-h-[60dvh] max-w-[640px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-[40ch] text-base text-ink">Couldn't generate the rubric.</p>
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

  const current = rubric.questions[state.index];
  const total = rubric.questions.length;

  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-8 px-6 py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <ProgressBar index={state.index} total={total} />
        <p className="text-xs uppercase tracking-[0.05em] text-muted">Review · 2 of 4</p>
      </header>

      <QuestionCard question={current} onAnswer={handleAnswer} />
    </main>
  );
}

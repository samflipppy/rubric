import { useEffect, useState } from 'react';
import { Home } from './pages/Home';
import { Review } from './pages/Review';
import { Verdict } from './pages/Verdict';
import { viewFromPath, type View } from './lib/nav';
import type { Answer, Rubric, Verdict as V } from './types';

export default function App() {
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [verdict, setVerdict] = useState<V | null>(null);

  useEffect(() => {
    const onPop = () => setView(viewFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function onReviewComplete(r: Rubric, a: Answer[], v: V) {
    setRubric(r);
    setAnswers(a);
    setVerdict(v);
  }

  if (view === 'review') return <Review onComplete={onReviewComplete} />;
  if (view === 'verdict') return <Verdict rubric={rubric} answers={answers} verdict={verdict} />;
  return <Home />;
}

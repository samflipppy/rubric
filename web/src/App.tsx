import { useEffect, useState } from 'react';
import { Home } from './pages/Home';
import { Brief } from './pages/Brief';
import { Review } from './pages/Review';
import { Ask } from './pages/Ask';
import { Decide } from './pages/Decide';
import { viewFromPath, type View } from './lib/nav';
import type { Answer, Brief as BriefT, ChatMessage, Decision, PRRef, Rubric } from './types';

export default function App() {
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));

  const [brief, setBrief] = useState<BriefT | null>(null);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [decisionNote, setDecisionNote] = useState('');

  const [prRef, setPrRef] = useState<PRRef | null>(null);

  useEffect(() => {
    const onPop = () => setView(viewFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const owner = params.get('owner');
    const repo = params.get('repo');
    const prNumber = Number(params.get('pr'));
    const next = owner && repo && prNumber ? { owner, repo, prNumber } : null;
    if (!next) {
      setPrRef(null);
      return;
    }
    if (prRef && prRef.owner === next.owner && prRef.repo === next.repo && prRef.prNumber === next.prNumber) {
      return;
    }
    setPrRef(next);
    setBrief(null);
    setRubric(null);
    setAnswers([]);
    setChatLog([]);
    setDecision(null);
    setDecisionNote('');
  }, [view, prRef]);

  if (view === 'brief') {
    return <Brief brief={brief} onLoaded={setBrief} />;
  }
  if (view === 'review') {
    return (
      <Review
        rubric={rubric}
        answers={answers}
        onRubricLoaded={setRubric}
        onAnswersUpdate={setAnswers}
      />
    );
  }
  if (view === 'ask') {
    return <Ask chatLog={chatLog} onChatUpdate={setChatLog} />;
  }
  if (view === 'decide') {
    return (
      <Decide
        brief={brief}
        rubric={rubric}
        answers={answers}
        chatLog={chatLog}
        decision={decision}
        decisionNote={decisionNote}
        onDecide={setDecision}
        onNoteChange={setDecisionNote}
      />
    );
  }
  return <Home />;
}

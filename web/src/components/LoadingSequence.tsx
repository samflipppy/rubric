import { useEffect, useState } from 'react';

const STEPS = ['Fetching PR…', 'Analyzing intent…', 'Generating questions…'];
const LONG_WAIT = 'Taking a bit longer…';

export function LoadingSequence() {
  const [index, setIndex] = useState(0);
  const [long, setLong] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 2000);
    const longTimer = setTimeout(() => setLong(true), 8000);
    return () => {
      clearInterval(interval);
      clearTimeout(longTimer);
    };
  }, []);

  const text = long ? LONG_WAIT : STEPS[index];

  return (
    <div className="flex min-h-[50dvh] items-center justify-center" role="status" aria-live="polite">
      <p className="text-base text-muted transition-opacity">{text}</p>
    </div>
  );
}

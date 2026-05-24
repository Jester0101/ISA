import { useEffect, useState, useRef } from 'react';

type Props = {
  text: string;
  speed?: number; // chars per second
  onComplete?: () => void;
  instant?: boolean;
};

export function TypewriterText({ text, speed = 35, onComplete, instant = false }: Props) {
  const [displayed, setDisplayed] = useState(instant ? text : '');
  const [done, setDone] = useState(instant);
  const indexRef = useRef(0);
  const skippedRef = useRef(false);

  useEffect(() => {
    if (instant) {
      setDisplayed(text);
      setDone(true);
      onComplete?.();
      return;
    }

    setDisplayed('');
    setDone(false);
    indexRef.current = 0;
    skippedRef.current = false;

    const interval = setInterval(() => {
      if (skippedRef.current) {
        clearInterval(interval);
        setDisplayed(text);
        setDone(true);
        onComplete?.();
        return;
      }
      indexRef.current += 2;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(interval);
        onComplete?.();
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [text, speed, instant, onComplete]);

  const handleSkip = () => {
    if (!done) {
      skippedRef.current = true;
      setDisplayed(text);
      setDone(true);
      onComplete?.();
    }
  };

  const paragraphs = displayed.split('\n\n');

  return (
    <div
      className={`select-text ${!done ? 'cursor-pointer' : ''}`}
      onClick={handleSkip}
    >
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="mb-5 leading-relaxed text-lg md:text-xl"
          dangerouslySetInnerHTML={{ __html: formatLine(p) }}
        />
      ))}
      {!done && (
        <div className="text-xs text-sepia-400/60 italic mt-2">
          click to skip
        </div>
      )}
    </div>
  );
}

function formatLine(line: string): string {
  let out = line.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/[“"]([^“”"]+)[”"]/g, '<span class="text-sepia-50 italic">"$1"</span>');
  out = out.replace(/\n/g, '<br/>');
  return out;
}

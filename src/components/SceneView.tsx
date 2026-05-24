import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCurrentScene, useDisplayChoices, useGame, useResolvedRoute } from '../engine/store';
import { getEndingTier, getEndingMessage } from '../engine/endings';

const PARA_DELAY = 0.45; // seconds between paragraphs
const PARA_INITIAL = 0.25;

export function SceneView() {
  const scene = useCurrentScene();
  const displayChoices = useDisplayChoices();
  const resolvedRoute = useResolvedRoute();
  const choose = useGame(s => s.choose);
  const returnToTitle = useGame(s => s.returnToTitle);
  const restart = useGame(s => s.restart);

  const [skipped, setSkipped] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build a state view to pass into dynamic text. We read raw state once.
  const stateForText = useGame();
  const fullText = useMemo(() => {
    const view = {
      currentSceneId: stateForText.currentSceneId,
      visited: stateForText.visited,
      flags: stateForText.flags,
      items: stateForText.items,
      trust: stateForText.trust,
      actions: stateForText.actions,
      has: (n: string) => stateForText.flags.has(n) || stateForText.items.has(n),
      hasFlag: (n: string) => stateForText.flags.has(n),
      hasItem: (n: string) => stateForText.items.has(n),
      trustOf: (c: string) => stateForText.trust[c] ?? 0,
      evidenceCount: () => {
        let n = 0;
        const has = (k: string) => stateForText.flags.has(k) || stateForText.items.has(k);
        if (has('wire_hook') && has('wet_glove')) n++;
        if (has('bottle_normal') && has('fiber_latch')) n++;
        if (has('wet_sill') || has('footprint')) n++;
        if (has('doctor_sample')) n++;
        if (has('diary_torn') && has('debt_note')) n++;
        if (has('clara_witnessed')) n++;
        if (has('thomas_broke')) n++;
        if (has('agnes_saw_thomas')) n++;
        return n;
      },
    };
    return scene.getText(view);
  }, [scene, stateForText.actions, stateForText.flags, stateForText.items, stateForText.trust]);

  const paragraphs = useMemo(
    () => fullText.split('\n\n').filter(Boolean),
    [fullText]
  );

  const totalRevealMs = (PARA_INITIAL + paragraphs.length * PARA_DELAY + 0.4) * 1000;

  useEffect(() => {
    // Reset to top of page on scene change
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
    setShowChoices(false);
    setSkipped(false);
    const t = setTimeout(() => setShowChoices(true), totalRevealMs);
    return () => clearTimeout(t);
  }, [scene.id, totalRevealMs]);

  const isEnding = scene.isEnding;
  const isPortraitMode = scene.character && scene.image?.startsWith('char_');
  const chapterTitle = isPortraitMode && scene.character
    ? `In Conversation with ${characterName(scene.character)}`
    : scene.title ?? sceneTitle(scene.id);
  const endingTier = isEnding ? getEndingTier(scene.id) : null;
  const endingMessage = isEnding ? getEndingMessage(scene.id) : null;

  // Display choices include both unlocked and locked-with-hint options.
  const hasAnyUnlocked = displayChoices.some(d => !d.locked);

  const handleSkip = () => {
    if (!showChoices) {
      setSkipped(true);
      setShowChoices(true);
    }
  };

  return (
    <div ref={scrollRef} className="relative w-full h-full overflow-y-auto">
      {/* Background photo — visible, lightly dimmed */}
      {scene.image && (
        <div className="fixed inset-0 z-0">
          <img
            key={scene.image}
            src={`/images/${scene.image}`}
            alt=""
            className="w-full h-full object-cover transition-opacity duration-700"
            style={{ filter: isPortraitMode ? 'blur(10px) brightness(0.45)' : 'brightness(0.85)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />
        </div>
      )}

      {/* Side portrait for dialogue scenes (kept smaller now) */}
      {isPortraitMode && scene.image && (
        <div className="hidden lg:block fixed right-8 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={scene.image}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-56 h-72 rounded-sm overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.7)] ring-1 ring-sepia-300/40"
            >
              <img src={`/images/${scene.image}`} alt="" className="w-full h-full object-cover" style={{ filter: 'sepia(0.15) contrast(1.05)' }} />
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Book page with banner */}
      <div className="relative z-20 min-h-full flex flex-col justify-center pt-20 pb-8 md:py-12 page-perspective">
        <div className="max-w-2xl mx-auto w-full px-3 md:px-6">
          <AnimatePresence mode="wait">
            <motion.article
              key={scene.id}
              initial={{ opacity: 0, rotateY: -22, x: -50, transformOrigin: 'left center' }}
              animate={{ opacity: 1, rotateY: 0, x: 0 }}
              exit={{ opacity: 0, rotateY: 26, x: 70, transformOrigin: 'right center' }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="parchment-page"
              onClick={handleSkip}
            >
              {/* Header */}
              <header className="parchment-header">
                <div className="parchment-byline">From Our Correspondent at Harrow Manor</div>
                <Ornament />
                <h2 className="parchment-chapter">{chapterTitle}</h2>
                <Ornament />
              </header>

              {/* Body — paragraphs reveal top-to-bottom, no layout shift */}
              <div className="parchment-body">
                <div className="parchment-text">
                  {paragraphs.map((p, i) => (
                    <p
                      key={`${scene.id}-${i}`}
                      className={`parchment-paragraph ${i === 0 ? 'first-paragraph' : ''}`}
                      style={{
                        animationDelay: skipped ? '0s' : `${PARA_INITIAL + i * PARA_DELAY}s`,
                        animationDuration: skipped ? '0.2s' : '0.7s',
                      }}
                      dangerouslySetInnerHTML={{ __html: formatLine(p) }}
                    />
                  ))}
                </div>
              </div>

              {/* Robert's signature */}
              <div className="parchment-signature" style={{
                animationDelay: skipped ? '0.1s' : `${PARA_INITIAL + paragraphs.length * PARA_DELAY}s`,
              }}>
                <span className="signature-script">R. Ashford</span>
              </div>

              {showChoices && (
                <>
                  <div className="parchment-divider animate-fade-in">
                    <span className="divider-ornament">❦ ❦ ❦</span>
                  </div>

                  {/* Choices or auto-route continuation */}
                  {!isEnding && (
                    <div className="parchment-choices animate-fade-in">
                      {!hasAnyUnlocked && resolvedRoute ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); choose(resolvedRoute); }}
                          className="parchment-choice"
                        >
                          <span className="choice-marker">❦</span> Press the case.
                        </button>
                      ) : displayChoices.length === 0 ? (
                        <p className="text-center italic opacity-50 py-2">No choices available.</p>
                      ) : (
                        displayChoices.map((d, i) => {
                          const c = d.choice;
                          return (
                            <button
                              key={`${c.next().id}-${i}`}
                              onClick={(e) => { e.stopPropagation(); if (!d.locked) choose(c.next().id); }}
                              className="parchment-choice"
                              disabled={d.locked}
                              title={d.locked ? c.lockHint : undefined}
                            >
                              <span className="choice-marker">{d.locked ? '⨯' : '❦'}</span> {c.label}
                              {d.locked && c.lockHint && (
                                <span className="choice-lock-hint">{c.lockHint}</span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Ending block */}
                  {isEnding && endingMessage && (
                    <div className={`parchment-ending parchment-ending-${endingTier} animate-fade-in`}>
                      <h3 className="ending-headline">{endingMessage.headline}</h3>
                      <p className="ending-subtitle">{endingMessage.subtitle}</p>
                      <div className="parchment-choices mt-6">
                        <button onClick={(e) => { e.stopPropagation(); restart(); }} className="parchment-choice">
                          <span className="choice-marker">❦</span> {endingMessage.button}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); returnToTitle(); }} className="parchment-choice">
                          <span className="choice-marker">❦</span> Return to the title page
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Skip hint while reveal is in progress */}
              {!showChoices && (
                <div className="parchment-skip-hint">tap to reveal all</div>
              )}
            </motion.article>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Ornament() {
  return (
    <svg viewBox="0 0 200 12" className="parchment-ornament" preserveAspectRatio="none" aria-hidden="true">
      <line x1="20" y1="6" x2="80" y2="6" stroke="currentColor" strokeWidth="0.6" />
      <circle cx="100" cy="6" r="2.5" fill="currentColor" />
      <line x1="120" y1="6" x2="180" y2="6" stroke="currentColor" strokeWidth="0.6" />
    </svg>
  );
}

function formatLine(line: string): string {
  let out = line.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Style dialogue wrapped in either straight or curly double quotes
  out = out.replace(/[“"]([^“”"]+)[”"]/g, '<span class="dialogue">"$1"</span>');
  out = out.replace(/\n/g, '<br/>');
  return out;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function characterName(c: string): string {
  switch (c) {
    case 'henry': return 'Sir Henry';
    case 'edmund': return 'Edmund Harrow';
    case 'clara': return 'Miss Harrow';
    case 'agnes': return 'Miss Blake';
    case 'doctor': return 'Doctor Crowe';
    case 'thomas': return 'Thomas Reid';
    default: return cap(c);
  }
}

function sceneTitle(id: string): string {
  const map: Record<string, string> = {
    start: 'I — The Carriage',
    arrival: 'II — The Hall',
    dinner: 'III — At Table',
    after_dinner_hub: 'IV — After the Ladies Withdrew',
    retire: 'V — A Storm in the Chimney',
    morning_scream: 'VI — Before Six',
    bedroom_first: 'VII — The Master Bedroom',
    examine_body: 'VIII — The Doctor\'s Verdict',
    mandate: 'IX — The Mandate',
    investigation_hub: 'The Investigation',
    final_gathering: 'The Drawing Room',
    evaluate_evidence: 'The Account',
  };
  if (map[id]) return map[id];
  if (id.startsWith('ending_')) return 'The End of It';
  if (id.startsWith('event_')) return 'A Movement in the House';
  if (id.startsWith('accuse_')) return 'The Name';
  if (id.startsWith('bedroom_')) return 'The Master Bedroom';
  if (id.startsWith('empty_room')) return 'The Empty Room';
  if (id.startsWith('study')) return 'Lady Eleanor\'s Study';
  if (id.startsWith('edmund_')) return 'Edmund\'s Chamber';
  if (id.startsWith('servants_')) return 'Below Stairs';
  if (id.startsWith('courtyard')) return 'The Inner Courtyard';
  return id.split('_').map(cap).join(' ');
}

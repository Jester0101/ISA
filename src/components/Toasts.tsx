import { useEffect } from 'react';
import { useGame } from '../engine/store';

const ITEM_ICONS: Record<string, string> = {
  bottle_normal: '🜂',
  doctor_sample: '✶',
  diary_torn: '✎',
  debt_note: '✉',
  wire_hook: '⚙',
  wet_glove: '✦',
  fiber_latch: '⚭',
  wet_sill: '☂',
  footprint: '◉',
  love_letter: '✉',
  cold_letter: '✉',
};

const ITEM_NAMES: Record<string, string> = {
  bottle_normal: 'Laudanum Flask',
  doctor_sample: 'Sealed Sample',
  diary_torn: 'Torn Diary Page',
  debt_note: 'Forged Credit Note',
  wire_hook: 'Wire with Hook',
  wet_glove: 'Wet Driving Glove',
  fiber_latch: 'Black Thread',
  wet_sill: 'Wet Windowsill',
  footprint: 'Boot Print',
  love_letter: "Clara's Letter",
  cold_letter: "Eleanor's Dismissal",
};

const CHAR_NAMES: Record<string, string> = {
  henry: 'Sir Henry',
  clara: 'Clara',
  agnes: 'Miss Blake',
  doctor: 'Doctor Crowe',
  thomas: 'Thomas',
  edmund: 'Edmund',
};

const FLAG_MILESTONES: Record<string, { title: string; detail: string }> = {
  knows_method: { title: 'The Method', detail: 'The shape of the how begins to show.' },
  knows_motive: { title: 'The Motive', detail: 'The shape of the why begins to show.' },
  clara_witnessed: { title: "Clara's Witness", detail: 'She heard something in the night.' },
  clara_offers_alliance: { title: 'Clara, Allied', detail: 'She will speak in the drawing room.' },
  clara_named_edmund: { title: "Clara's Suspicion", detail: 'A name has crossed her lips.' },
  clara_defends_agnes: { title: "Clara's Defence", detail: 'She vouches for Miss Blake.' },
  thomas_caught_lie: { title: 'A Lie Caught', detail: 'A servant slipped on the times.' },
  thomas_broke: { title: 'A Confession', detail: 'A witness has come over to my side.' },
  henry_admits_doubt: { title: "Henry's Confession", detail: 'He has been letting himself not know.' },
  henry_aligned: { title: 'Henry, Allied', detail: 'He will stand with me in the drawing room.' },
  henry_drugged_suspected: { title: 'The Brandy', detail: 'The decanter on his desk had been brought up by another.' },
  agnes_saw_thomas: { title: 'A Witness', detail: 'Miss Blake saw something in the gallery at one.' },
  agnes_witness: { title: 'Miss Blake, Allied', detail: 'She has agreed to speak.' },
  doctor_pressured_by_edmund: { title: 'The Doctor', detail: 'A patron has been pressing him in private.' },
  doctor_allied: { title: 'The Doctor, Allied', detail: 'A sealed sample for the magistrate.' },
  edmund_alerted: { title: 'The Air Has Changed', detail: 'One of the household has felt me close.' },
  mandate_given: { title: 'The Investigation', detail: 'Sir Henry has given you the house.' },
  clara_closed: { title: 'Clara Has Closed', detail: 'The morning room is locked.' },
  edmund_chamber_locked: { title: "Edmund's Chamber", detail: 'The door is locked. Too late.' },
  seen_silhouette: { title: 'A Silhouette', detail: 'At the master bedroom window in the rain.' },
};

export function Toasts() {
  const toasts = useGame(s => s.toasts);
  const dismissToast = useGame(s => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map(t =>
      setTimeout(() => dismissToast(t.id), 4500)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed right-3 md:right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-xs md:max-w-sm"
      style={{ top: 'max(4rem, calc(env(safe-area-inset-top) + 3.5rem))' }}
    >
      {toasts.slice(-4).map(t => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastCard({ toast }: { toast: ReturnType<typeof useGame.getState>['toasts'][number] }) {
  let icon: string = '◈';
  let accent = 'border-sepia-300/50';
  let label = '';
  let detail = '';
  let title = '';

  if (toast.kind === 'item') {
    icon = ITEM_ICONS[toast.key] || '✦';
    label = 'EVIDENCE FOUND';
    title = ITEM_NAMES[toast.key] || toast.key;
    detail = 'Added to clues.';
    accent = 'border-amber-400/50';
  } else if (toast.kind === 'trust_up') {
    const name = CHAR_NAMES[toast.key] || toast.key;
    icon = '＋';
    label = 'TRUST GAINED';
    title = `${name}`;
    detail = `Trust ${toast.amount && toast.amount > 0 ? '+' : ''}${toast.amount}`;
    accent = 'border-green-400/40';
  } else if (toast.kind === 'trust_down') {
    const name = CHAR_NAMES[toast.key] || toast.key;
    icon = '−';
    label = 'TRUST LOST';
    title = `${name}`;
    detail = `Trust ${toast.amount}`;
    accent = 'border-red-400/40';
  } else if (toast.kind === 'flag') {
    const m = FLAG_MILESTONES[toast.key];
    icon = '✦';
    label = 'NOTEBOOK';
    title = m?.title || toast.key;
    detail = m?.detail || 'New entry recorded.';
    accent = 'border-sepia-200/50';
  } else if (toast.kind === 'ending') {
    icon = '✠';
    label = 'ENDING DISCOVERED';
    title = toast.key.replace('ending_', '').replace(/_/g, ' ');
    detail = `${toast.amount} of 13 endings found.`;
    accent = 'border-amber-300/60';
  }

  return (
    <div
      className={`pointer-events-auto bg-ink-900/95 backdrop-blur-md border ${accent} rounded-lg p-3 md:p-4 shadow-2xl animate-slide-in flex gap-3 items-start`}
    >
      <div className="text-2xl md:text-3xl text-sepia-200 leading-none mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] md:text-xs font-display tracking-[0.2em] text-sepia-300/80 uppercase">{label}</div>
        <div className="text-sm md:text-base font-display text-sepia-100 truncate">{title}</div>
        <div className="text-xs md:text-sm text-sepia-300/80 italic mt-0.5">{detail}</div>
      </div>
    </div>
  );
}

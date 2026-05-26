import { useGame } from '../engine/store';

function actionToTime(a: number): string {
  const minutes = 7 * 60 + 30 + a * 35;
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function TopBar() {
  const actions = useGame(s => s.actions);
  const items = useGame(s => s.items);
  const trust = useGame(s => s.trust);
  const toggleInventory = useGame(s => s.toggleInventory);
  const toggleTrust = useGame(s => s.toggleTrust);
  const toggleNotebook = useGame(s => s.toggleNotebook);
  const toggleMap = useGame(s => s.toggleMap);

  const itemCount = items.size;
  const trustChanges = Object.keys(trust).length;
  const time = actionToTime(actions);
  const isCritical = actions >= 15;

  return (
    <div
      className="absolute top-0 left-0 right-0 z-30 px-3 md:px-6 py-2 md:py-3 flex items-center justify-between pointer-events-none gap-2"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      {/* Clock with stopwatch icon */}
      <div className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-1.5 md:py-2 pointer-events-auto bg-ink-900/80 backdrop-blur-sm border ${isCritical ? 'border-red-400/40 animate-flicker' : 'border-sepia-300/25'} rounded`}>
        <img src="/images/Stopwatch.png" alt="" className="w-5 h-5 md:w-6 md:h-6 object-contain opacity-80" />
        <span className={`font-mono text-xs md:text-sm tracking-widest ${isCritical ? 'text-red-300/90' : 'text-sepia-100'}`}>
          {time}
        </span>
        {isCritical && (
          <span className="hidden md:inline ml-2 text-xs text-red-300/70 italic font-serif">
            the constables come at six
          </span>
        )}
      </div>

      {/* Right cluster: image icons */}
      <div className="flex items-center gap-1.5 md:gap-2 pointer-events-auto">
        <IconButton onClick={toggleMap} title="Map of the manor" icon="/images/map.png" />
        <IconButton onClick={toggleNotebook} title="Robert's notebook" icon="/images/notebook.png" />
        <IconButton onClick={toggleTrust} title="The household" icon="/images/char_robert.jpg.png" badge={trustChanges || undefined} round />
        <IconButton onClick={toggleInventory} title="Evidence" icon="/images/Stamp.png" badge={itemCount || undefined} />
      </div>
    </div>
  );
}

function IconButton({
  onClick,
  title,
  icon,
  badge,
  round,
}: {
  onClick: () => void;
  title: string;
  icon: string;
  badge?: number;
  round?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="relative w-10 h-10 md:w-12 md:h-12 bg-ink-900/80 backdrop-blur-sm border border-sepia-300/25 rounded hover:bg-sepia-300/15 hover:border-sepia-300/55 transition flex items-center justify-center group"
    >
      <img
        src={icon}
        alt=""
        className={`w-6 h-6 md:w-7 md:h-7 object-contain opacity-80 group-hover:opacity-100 transition ${round ? 'rounded-full' : ''}`}
      />
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-sepia-300 text-ink-900 rounded-full text-xs font-bold flex items-center justify-center shadow">
          {badge}
        </span>
      )}
    </button>
  );
}

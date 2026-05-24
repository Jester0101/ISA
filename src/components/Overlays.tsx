import { useGame } from '../engine/store';

const ITEM_INFO: Record<string, { name: string; image: string; description: string }> = {
  bottle_normal: { name: 'Laudanum Flask', image: 'scn_evidence_bottle.png', description: 'A glass flask of laudanum from Greaves of Holborn. The contents are cut twice with water — barely a quarter strength.' },
  doctor_sample: { name: 'Doctor\'s Sealed Sample', image: 'Stamp.png', description: 'Crowe\'s original-strength preparation, sealed in wax. A second bottle for comparison.' },
  diary_torn: { name: 'Torn Diary Page', image: 'notebook.png', description: 'Lady Eleanor\'s diary. The page after the marker has been neatly torn out. Last visible line: "Tomorrow H. will know everything about Ed".' },
  debt_note: { name: 'Forged Credit Note', image: 'paper.png', description: 'A receipt of credit from a Holborn moneylender, signed "Henry Harrow" — but the hand is wrong.' },
  wire_hook: { name: 'Wire with Hook', image: 'Stamp.png', description: 'A twenty-inch length of watchmaker\'s wire, bent into a flattened hook at the working end. Used.' },
  wet_glove: { name: 'Wet Driving Glove', image: 'Stamp.png', description: 'A single black driving glove. Dry outside, damp in the cuff. Black clay courtyard mud in the seam.' },
  fiber_latch: { name: 'Black Thread', image: 'bedroom_window.jpg.png', description: 'A single thread the breadth of a horsehair, caught beneath the brass catch of the bedroom window.' },
  wet_sill: { name: 'Wet Windowsill', image: 'bedroom_window.jpg.png', description: 'The outer sill of the empty room is wet. The inner sill is dry. The window was opened in the night.' },
  footprint: { name: 'Boot Print', image: 'scn_evidence_footprint.png', description: 'A partial boot print, gentleman\'s leather but workman\'s sole pattern. Black clay-bearing courtyard mud.' },
  love_letter: { name: 'Clara\'s Letter', image: 'paper.png', description: 'A folded clerk\'s-paper letter from Charles Penrose. Clara\'s secret correspondence.' },
  cold_letter: { name: 'Eleanor\'s Dismissal', image: 'paper.png', description: 'A cold note from Lady Eleanor to Miss Blake: "After Sunday next your continued residence in this house will be impossible."' },
};

const SUSPECTS = [
  { id: 'henry', name: 'Sir Henry Harrow', role: 'The master of the house, husband to the dead.', portrait: 'char_henry.jpg.png' },
  { id: 'edmund', name: 'Edmund Harrow', role: 'The heir. Twenty-nine, dressed for a London dinner.', portrait: 'char_edmund.jpg.png' },
  { id: 'clara', name: 'Clara Harrow', role: 'The daughter. Twenty-one, in mourning before this morning.', portrait: 'char_clara.jpg.png' },
  { id: 'agnes', name: 'Miss Agnes Blake', role: 'The companion. Plain dress, sharp eyes.', portrait: 'char_agnes.jpg.png' },
  { id: 'doctor', name: 'Doctor Nathaniel Crowe', role: 'The family physician. Carries a loan against his practice.', portrait: 'char_crowe.jpg.png' },
  { id: 'thomas', name: 'Thomas Reid', role: 'Edmund\'s valet. Witness and false alibi.', portrait: 'char_thomas.jpg.png' },
];

export function Overlays() {
  const showInventory = useGame(s => s.showInventory);
  const showTrust = useGame(s => s.showTrust);
  const showNotebook = useGame(s => s.showNotebook);
  const showMap = useGame(s => s.showMap);

  return (
    <>
      {showInventory && <InventoryOverlay />}
      {showTrust && <TrustOverlay />}
      {showNotebook && <NotebookOverlay />}
      {showMap && <MapOverlay />}
    </>
  );
}

function OverlayShell({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/85 backdrop-blur-sm animate-fade-in p-2 md:p-6"
      onClick={onClose}
    >
      <div
        className="bg-ink-800 border border-sepia-300/30 rounded-lg shadow-2xl max-w-4xl w-full max-h-[95vh] md:max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-sepia-300/20 flex items-center justify-between">
          <h2 className="font-display text-xl md:text-2xl tracking-widest text-sepia-100">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-sepia-300 hover:text-sepia-100 text-3xl font-light leading-none w-11 h-11 flex items-center justify-center"
          >×</button>
        </div>
        <div className="overflow-y-auto p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}

function InventoryOverlay() {
  const items = useGame(s => s.items);
  const close = useGame(s => s.toggleInventory);
  const itemList = Array.from(items).filter(i => ITEM_INFO[i]);

  return (
    <OverlayShell title="Evidence" onClose={close}>
      {itemList.length === 0 ? (
        <p className="text-sepia-300 italic">No evidence collected yet. Search the rooms.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {itemList.map(id => {
            const info = ITEM_INFO[id];
            return (
              <div key={id} className="bg-ink-900/60 border border-sepia-300/20 rounded p-3 md:p-4 flex gap-3 md:gap-4">
                <img src={`/images/${info.image}`} alt="" className="w-16 h-16 md:w-20 md:h-20 object-cover rounded flex-shrink-0" />
                <div>
                  <h3 className="font-display text-base md:text-lg text-sepia-100">{info.name}</h3>
                  <p className="text-sm text-sepia-200 mt-1 leading-snug">{info.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-6 text-xs text-sepia-400 italic text-center">{itemList.length} of {Object.keys(ITEM_INFO).length} pieces gathered</p>
    </OverlayShell>
  );
}

function TrustOverlay() {
  const trust = useGame(s => s.trust);
  const close = useGame(s => s.toggleTrust);

  return (
    <OverlayShell title="The Household — Six Suspects" onClose={close}>
      <p className="text-sm text-sepia-300 italic mb-6 text-center">
        Lady Eleanor died in a locked room. One of these people knows why.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {SUSPECTS.map(s => {
          const value = trust[s.id] || 0;
          return (
            <div key={s.id} className="flex flex-col items-center bg-ink-900/40 border border-sepia-300/15 rounded-lg p-4">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden ring-2 ring-sepia-300/30 mb-3">
                <img src={`/images/${s.portrait}`} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="font-display text-sm md:text-base text-sepia-100 text-center mb-1">{s.name}</div>
              <p className="text-xs text-sepia-300/80 italic text-center mb-3 leading-snug">{s.role}</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => {
                  const filled = value > 0 && i <= value;
                  const wary = value < 0 && i <= -value;
                  return (
                    <span
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full ${
                        wary ? 'bg-red-700/60' : filled ? 'bg-sepia-200' : 'bg-sepia-700/30'
                      }`}
                    />
                  );
                })}
              </div>
              <div className={`text-xs mt-1.5 ${value < 0 ? 'text-red-400/80' : value > 2 ? 'text-sepia-100' : 'text-sepia-400'}`}>
                {value > 0 ? `+${value} trust` : value < 0 ? `${value} wary` : 'neutral'}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-sepia-400 italic text-center">
        Trust opens doors. Distrust closes them.
      </p>
    </OverlayShell>
  );
}

function NotebookOverlay() {
  const flags = useGame(s => s.flags);
  const items = useGame(s => s.items);
  const visited = useGame(s => s.visited);
  const close = useGame(s => s.toggleNotebook);

  const notes: { time: string; entry: string }[] = [];
  if (flags.has('seen_tension')) notes.push({ time: 'at dinner', entry: 'Eleanor to Edmund: "We will speak in the morning."' });
  if (flags.has('seen_silhouette')) notes.push({ time: 'before bed', entry: 'A silhouette at the master bedroom window. Working at the frame in the rain.' });
  if (flags.has('mandate_given')) notes.push({ time: 'morning, study', entry: 'Sir Henry asks me to investigate before the constables come.' });
  if (items.has('bottle_normal')) notes.push({ time: 'bedroom', entry: 'Laudanum cut twice with water. Greaves of Holborn label intact.' });
  if (items.has('fiber_latch')) notes.push({ time: 'bedroom window', entry: 'Black thread on the brass latch. Two fresh scratches in the pine.' });
  if (items.has('wet_sill')) notes.push({ time: 'empty room', entry: 'Window opened in the night and closed before the rain.' });
  if (items.has('footprint')) notes.push({ time: 'courtyard ledge', entry: 'Boot print held in mortar dust. Gentleman\'s leather, workman\'s sole.' });
  if (items.has('diary_torn')) notes.push({ time: 'Eleanor\'s study', entry: '"Tomorrow H. will know everything about Ed..." — page after it torn out.' });
  if (items.has('debt_note')) notes.push({ time: 'Eleanor\'s study', entry: 'Forged credit note. Holborn lender. Henry\'s signature in another hand.' });
  if (items.has('wire_hook')) notes.push({ time: 'Edmund\'s chamber', entry: 'A wire bent for working window latches. Hidden beneath the floor.' });
  if (items.has('wet_glove')) notes.push({ time: 'Edmund\'s wardrobe', entry: 'A driving glove with courtyard mud in the cuff. Its match has gone.' });
  if (flags.has('thomas_caught_lie')) notes.push({ time: 'gallery', entry: 'Thomas lied about the stable yard. He was elsewhere at three.' });
  if (flags.has('thomas_broke')) notes.push({ time: 'gallery', entry: 'Thomas confessed. Will testify before the constable.' });
  if (flags.has('clara_witnessed')) notes.push({ time: 'morning room', entry: 'Clara heard footsteps at her parents\' end of the corridor near two.' });
  if (flags.has('agnes_saw_thomas')) notes.push({ time: 'Miss Blake\'s parlour', entry: 'Miss Blake saw Thomas in the gallery at one.' });
  if (flags.has('knows_method')) notes.push({ time: '—', entry: 'I can see the shape of the how. The medicine, and the work that had been done at the window.' });
  if (flags.has('knows_motive')) notes.push({ time: '—', entry: 'I can see the shape of the why. There were papers in the study Lady Eleanor had decided to bring to her husband on Sunday.' });
  if (flags.has('edmund_alerted')) notes.push({ time: '—', entry: 'One of the household has felt the air change. The next move will not be mine.' });
  if (flags.has('henry_aligned')) notes.push({ time: 'library', entry: 'Sir Henry has admitted what he knew. He will stand with me.' });
  if (flags.has('clara_offers_alliance')) notes.push({ time: 'garden', entry: 'Clara will speak in the drawing room. She has her own paper.' });

  return (
    <OverlayShell title="Robert's Notebook" onClose={close}>
      <div className="paper-bg p-4 md:p-6 rounded text-ink-900 font-serif">
        <p className="text-sm italic mb-4 text-umber-700">
          Notes taken in the field. Harrow Manor, March 1835.
        </p>
        {notes.length === 0 ? (
          <p className="italic text-umber-700">Notebook empty. The morning is young.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((n, i) => (
              <li key={i} className="border-b border-ink-900/15 pb-2">
                <span className="text-xs uppercase tracking-widest text-umber-700/70 mr-2">{n.time}</span>
                <span className="text-ink-900">{n.entry}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-xs italic text-umber-700/60">
          Visited {visited.size} scenes.
        </p>
      </div>
    </OverlayShell>
  );
}

function MapOverlay() {
  const close = useGame(s => s.toggleMap);
  return (
    <OverlayShell title="Harrow Manor" onClose={close}>
      <img src="/images/map.png" alt="Map of the manor" className="w-full h-auto rounded" />
    </OverlayShell>
  );
}

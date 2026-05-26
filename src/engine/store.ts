import { create } from 'zustand';
import { story } from '../scenes/all';
import { GameState } from '../scenes/GameState';
import type { Scene, Choice, DisplayChoice } from '../scenes/Scene';

export type Toast = {
  id: number;
  kind: 'item' | 'trust_up' | 'trust_down' | 'flag' | 'ending';
  key: string;
  amount?: number;
};

const MILESTONE_FLAGS = new Set([
  'knows_method', 'knows_motive',
  'clara_witnessed', 'clara_offers_alliance', 'clara_named_edmund', 'clara_defends_agnes', 'clara_closed',
  'thomas_caught_lie', 'thomas_broke',
  'henry_admits_doubt', 'henry_aligned', 'henry_drugged_suspected',
  'agnes_saw_thomas', 'agnes_witness',
  'doctor_pressured_by_edmund', 'doctor_allied',
  'edmund_alerted', 'edmund_chamber_locked',
  'mandate_given', 'seen_silhouette',
]);

type GameStore = {
  currentSceneId: string;
  gameStarted: boolean;
  flags: Set<string>;
  items: Set<string>;
  trust: Record<string, number>;
  actions: number;
  visited: Set<string>;
  history: string[];
  showInventory: boolean;
  showTrust: boolean;
  showNotebook: boolean;
  showMap: boolean;
  unlockedEndings: Set<string>;
  toasts: Toast[];

  begin: () => void;
  choose: (nextId: string) => void;
  restart: () => void;
  returnToTitle: () => void;
  toggleInventory: () => void;
  toggleTrust: () => void;
  toggleNotebook: () => void;
  toggleMap: () => void;
  dismissToast: (id: number) => void;
};

let toastId = 0;
const nextToastId = () => ++toastId;

// Engine-side auto-triggers (events that fire when the player returns to the hub)
function checkAutoTriggers(state: { actions: number; flags: Set<string>; items: Set<string>; currentSceneId: string }): string | null {
  if (state.currentSceneId !== 'investigation_hub') return null;
  const a = state.actions;
  const f = state.flags;
  const i = state.items;
  const has = (k: string) => f.has(k) || i.has(k);

  // Compute evidence count — needed for evidence-gated triggers
  let evidence = 0;
  if (has('wire_hook') && has('wet_glove')) evidence++;
  if (has('bottle_normal') && has('fiber_latch')) evidence++;
  if (has('wet_sill') || has('footprint')) evidence++;
  if (has('doctor_sample')) evidence++;
  if (has('diary_torn') && has('debt_note')) evidence++;
  if (has('clara_witnessed')) evidence++;
  if (has('thomas_broke')) evidence++;
  if (has('agnes_saw_thomas')) evidence++;

  // Hard deadline — 6 PM (action 18 at 35 min/action from 7:30 AM)
  if (a >= 18 && !f.has('triggered_ending_too_late')) return 'ending_too_late';
  // Edmund silences Robert after the bribe is refused — needs alerted + refused + late hour
  if (f.has('edmund_alerted') && f.has('refused_bribe') && a >= 15 && !f.has('triggered_ending_murdered')) {
    return 'ending_murdered';
  }
  // Thomas dies — but with enough time afterward to still reach the drawing room
  if (a >= 16 && !f.has('thomas_broke') && !f.has('thomas_dead') && !f.has('triggered_thomas_dies')) return 'thomas_dies';
  // Edmund corners Robert with a bribe — only if Robert has real evidence against him
  if (f.has('edmund_alerted') && evidence >= 2 && a >= 11 && !f.has('triggered_edmund_threatens')) return 'edmund_threatens';
  // Edmund returns and locks his chamber
  if (a >= 14 && !f.has('searched_edmund_room') && !f.has('triggered_event_edmund_returns')) return 'event_edmund_returns';
  // Rain stops, the lane is opening — afternoon turn
  if (a >= 13 && !f.has('triggered_time_warning')) return 'time_warning';
  // Clara at the fountain
  if (a >= 12 && !f.has('clara_closed') && !f.has('triggered_event_clara_in_garden')) return 'event_clara_in_garden';
  // Edmund catches Robert leaving his chamber — quiet warning before he goes hostile
  if (a >= 8 && f.has('searched_edmund_room') && !f.has('edmund_alerted') && !f.has('triggered_event_edmund_in_corridor')) return 'event_edmund_in_corridor';
  // Crowe slips out to his surgery
  if (a >= 9 && !f.has('triggered_event_crowe_leaves')) return 'event_crowe_leaves';
  // Body is carried out
  if (a >= 7 && !f.has('triggered_event_body_moved')) return 'event_body_moved';
  return null;
}

// Build a GameStateRO from the store state — used for evaluating choice/route conditions
function stateView(s: Pick<GameStore, 'currentSceneId' | 'visited' | 'flags' | 'items' | 'trust' | 'actions'>): GameState {
  const view = new GameState();
  view.currentSceneId = s.currentSceneId;
  view.visited = s.visited as Set<string>;
  view.flags = s.flags as Set<string>;
  view.items = s.items as Set<string>;
  view.trust = s.trust;
  view.actions = s.actions;
  return view;
}

export const useGame = create<GameStore>((set) => ({
  currentSceneId: story.start.id,
  gameStarted: false,
  flags: new Set<string>(),
  items: new Set<string>(),
  trust: {},
  actions: 0,
  visited: new Set<string>(),
  history: [],
  showInventory: false,
  showTrust: false,
  showNotebook: false,
  showMap: false,
  unlockedEndings: new Set<string>(),
  toasts: [],

  begin: () => set({ gameStarted: true }),

  choose: (nextId: string) => {
    const originalIntent = nextId;
    set(state => {
      // If returning to hub, check for an auto-triggered event and redirect
      if (nextId === 'investigation_hub') {
        const willActions = state.currentSceneId !== 'investigation_hub' ? state.actions + 1 : state.actions;
        const triggered = checkAutoTriggers({
          actions: willActions,
          flags: state.flags,
          items: state.items,
          currentSceneId: 'investigation_hub',
        });
        if (triggered && triggered !== state.currentSceneId) nextId = triggered;
      }

      const nextScene = story.tryGet(nextId);
      if (!nextScene) {
        console.error(`Scene not found: ${nextId}`);
        return state;
      }

      const newFlags = new Set(state.flags);
      const newItems = new Set(state.items);
      const newTrust = { ...state.trust };
      const newVisited = new Set(state.visited);
      const newToasts = [...state.toasts];

      const wasVisitedBefore = newVisited.has(nextId);
      newVisited.add(nextId);

      // Apply onEnter effects only on first visit
      if (!wasVisitedBefore) {
        const tmpState = new GameState();
        tmpState.flags = newFlags;
        tmpState.items = newItems;
        tmpState.trust = newTrust;
        tmpState.visited = newVisited;
        tmpState.actions = state.actions;
        tmpState.currentSceneId = nextId;

        const beforeFlags = new Set(newFlags);
        const beforeItems = new Set(newItems);
        const beforeTrust = { ...newTrust };

        nextScene.apply(tmpState);

        // Compute deltas for toasts
        for (const i of newItems) {
          if (!beforeItems.has(i)) newToasts.push({ id: nextToastId(), kind: 'item', key: i });
        }
        for (const f of newFlags) {
          if (!beforeFlags.has(f) && MILESTONE_FLAGS.has(f)) {
            newToasts.push({ id: nextToastId(), kind: 'flag', key: f });
          }
        }
        for (const [k, v] of Object.entries(newTrust)) {
          const delta = v - (beforeTrust[k] ?? 0);
          if (delta !== 0) {
            newToasts.push({ id: nextToastId(), kind: delta > 0 ? 'trust_up' : 'trust_down', key: k, amount: delta });
          }
        }
      }

      let newActions = state.actions;
      if (state.currentSceneId !== 'investigation_hub' && originalIntent === 'investigation_hub') {
        newActions++;
      }

      // Mark Edmund's room as searched when player finds the loose floorboard / glove
      if (nextId === 'edmund_wardrobe' || nextId === 'edmund_under_bed') {
        newFlags.add('searched_edmund_room');
      }

      // Mark events / one-time triggers
      if (nextId.startsWith('event_') || ['edmund_threatens', 'thomas_dies', 'ending_too_late', 'ending_murdered', 'time_warning'].includes(nextId)) {
        newFlags.add(`triggered_${nextId}`);
      }

      // Walking away from Edmund's bribe attempt commits Robert to the case
      if (state.currentSceneId === 'edmund_threatens' && originalIntent === 'investigation_hub') {
        newFlags.add('refused_bribe');
      }

      // Track unlocked endings
      let unlocked = state.unlockedEndings;
      if (nextScene.isEnding) {
        unlocked = new Set(state.unlockedEndings);
        unlocked.add(nextId);
        newToasts.push({ id: nextToastId(), kind: 'ending', key: nextId, amount: unlocked.size });
      }

      return {
        ...state,
        currentSceneId: nextId,
        flags: newFlags,
        items: newItems,
        trust: newTrust,
        actions: newActions,
        visited: newVisited,
        history: [...state.history, nextId],
        unlockedEndings: unlocked,
        toasts: newToasts,
      };
    });
  },

  restart: () => {
    set(state => ({
      currentSceneId: story.start.id,
      gameStarted: true,
      flags: new Set<string>(),
      items: new Set<string>(),
      trust: {},
      actions: 0,
      visited: new Set<string>(),
      history: [],
      showInventory: false,
      showTrust: false,
      showNotebook: false,
      showMap: false,
      toasts: [],
      unlockedEndings: state.unlockedEndings,
    }));
  },

  returnToTitle: () => {
    set(state => ({
      currentSceneId: story.start.id,
      gameStarted: false,
      flags: new Set<string>(),
      items: new Set<string>(),
      trust: {},
      actions: 0,
      visited: new Set<string>(),
      history: [],
      showInventory: false,
      showTrust: false,
      showNotebook: false,
      showMap: false,
      toasts: [],
      unlockedEndings: state.unlockedEndings,
    }));
  },

  toggleInventory: () => set(state => ({ showInventory: !state.showInventory, showTrust: false, showNotebook: false, showMap: false })),
  toggleTrust: () => set(state => ({ showTrust: !state.showTrust, showInventory: false, showNotebook: false, showMap: false })),
  toggleNotebook: () => set(state => ({ showNotebook: !state.showNotebook, showInventory: false, showTrust: false, showMap: false })),
  toggleMap: () => set(state => ({ showMap: !state.showMap, showInventory: false, showTrust: false, showNotebook: false })),
  dismissToast: (id: number) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));

// ─── Hooks for components ───────────────────────────────────────────────

export function useCurrentScene(): Scene {
  const id = useGame(s => s.currentSceneId);
  return story.get(id);
}

export function useAvailableChoices(): Choice[] {
  const state = useGame();
  const scene = story.get(state.currentSceneId);
  return scene.getVisibleChoices(stateView(state));
}

export function useDisplayChoices(): DisplayChoice[] {
  const state = useGame();
  const scene = story.get(state.currentSceneId);
  return scene.getDisplayChoices(stateView(state));
}

export function useResolvedRoute(): string | null {
  const state = useGame();
  const scene = story.get(state.currentSceneId);
  const next = scene.resolveRoute(stateView(state));
  return next?.id ?? null;
}

export { story };

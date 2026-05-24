import type { GameState, GameStateRO } from './GameState';

export type SceneRef = () => Scene;

export interface SceneOptions {
  id: string;
  title?: string;
  image?: string;
  text: string;
  dynamicText?: (state: GameStateRO) => string;
  character?: string;
  isEnding?: boolean;
  onEnter?: (state: GameState) => void;
  choices?: ChoiceOptions[];
  routes?: RouteOptions[];
}

export interface ChoiceOptions {
  label: string;
  next: SceneRef;
  available?: (state: GameStateRO) => boolean;
  lockHint?: string;
}

export interface RouteOptions {
  next: SceneRef;
  when?: (state: GameStateRO) => boolean;
}

export class Choice {
  readonly label: string;
  readonly next: SceneRef;
  readonly lockHint?: string;
  private readonly availableFn?: (state: GameStateRO) => boolean;

  constructor(opts: ChoiceOptions) {
    this.label = opts.label;
    this.next = opts.next;
    this.availableFn = opts.available;
    this.lockHint = opts.lockHint;
  }

  isAvailable(state: GameStateRO): boolean {
    return !this.availableFn || this.availableFn(state);
  }

  resolve(): Scene {
    return this.next();
  }
}

export type DisplayChoice = {
  choice: Choice;
  locked: boolean;
};

export class Route {
  readonly next: SceneRef;
  private readonly whenFn?: (state: GameStateRO) => boolean;

  constructor(opts: RouteOptions) {
    this.next = opts.next;
    this.whenFn = opts.when;
  }

  matches(state: GameStateRO): boolean {
    return !this.whenFn || this.whenFn(state);
  }

  resolve(): Scene {
    return this.next();
  }
}

export class Scene {
  readonly id: string;
  readonly title?: string;
  readonly image?: string;
  readonly text: string;
  readonly character?: string;
  readonly isEnding: boolean;
  readonly choices: Choice[];
  readonly routes: Route[];
  private readonly onEnterFn?: (state: GameState) => void;
  private readonly dynamicTextFn?: (state: GameStateRO) => string;

  constructor(opts: SceneOptions) {
    this.id = opts.id;
    this.title = opts.title;
    this.image = opts.image;
    this.text = opts.text;
    this.character = opts.character;
    this.isEnding = opts.isEnding ?? false;
    this.onEnterFn = opts.onEnter;
    this.dynamicTextFn = opts.dynamicText;
    this.choices = (opts.choices ?? []).map(c => new Choice(c));
    this.routes = (opts.routes ?? []).map(r => new Route(r));
  }

  // Apply onEnter effects (called only on first visit)
  apply(state: GameState): void {
    if (this.onEnterFn) this.onEnterFn(state);
  }

  // Returns the full text — dynamic if dynamicText is provided
  getText(state: GameStateRO): string {
    if (this.dynamicTextFn) {
      const extra = this.dynamicTextFn(state);
      if (!this.text.trim()) return extra;
      return extra ? `${this.text}\n\n${extra}` : this.text;
    }
    return this.text;
  }

  // True if this scene is a "branching" location — a parent with multiple
  // forward options — vs a tunnel sub-scene that has only one way out.
  // We only hide visited targets at branching scenes; tunnel scenes always
  // show their single back/exit choice so the player is never stranded.
  private isBranching(): boolean {
    return this.choices.length > 1;
  }

  private shouldHideVisited(targetId: string): boolean {
    if (targetId === 'investigation_hub') return false;
    return this.id === 'investigation_hub' || this.isBranching();
  }

  // Get only the choices visible to the player given current state.
  getVisibleChoices(state: GameStateRO): Choice[] {
    return this.choices.filter(c => {
      if (!c.isAvailable(state)) return false;
      const targetId = c.next().id;
      if (this.shouldHideVisited(targetId) && state.visited.has(targetId)) return false;
      return true;
    });
  }

  // Like getVisibleChoices, but also includes locked choices that carry a
  // lockHint — those are rendered disabled with the hint, so the player
  // can see what they could have unlocked. Visited and silently-unavailable
  // choices stay hidden.
  getDisplayChoices(state: GameStateRO): DisplayChoice[] {
    const out: DisplayChoice[] = [];
    for (const c of this.choices) {
      const targetId = c.next().id;
      if (this.shouldHideVisited(targetId) && state.visited.has(targetId)) continue;
      const available = c.isAvailable(state);
      if (!available && !c.lockHint) continue;
      out.push({ choice: c, locked: !available });
    }
    return out;
  }

  // Engine-resolved next scene (auto-route based on state)
  resolveRoute(state: GameStateRO): Scene | null {
    for (const r of this.routes) {
      if (r.matches(state)) return r.resolve();
    }
    return null;
  }
}

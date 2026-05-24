// Read-only view of game state (passed to condition functions)
export interface GameStateRO {
  readonly currentSceneId: string;
  readonly visited: ReadonlySet<string>;
  readonly flags: ReadonlySet<string>;
  readonly items: ReadonlySet<string>;
  readonly trust: Readonly<Record<string, number>>;
  readonly actions: number;
  has(name: string): boolean;
  hasFlag(name: string): boolean;
  hasItem(name: string): boolean;
  trustOf(char: string): number;
  evidenceCount(): number;
}

// Mutable state used by the engine
export class GameState implements GameStateRO {
  currentSceneId: string = '';
  visited: Set<string> = new Set();
  flags: Set<string> = new Set();
  items: Set<string> = new Set();
  trust: Record<string, number> = {};
  actions: number = 0;

  // Read methods
  has(name: string): boolean { return this.flags.has(name) || this.items.has(name); }
  hasFlag(name: string): boolean { return this.flags.has(name); }
  hasItem(name: string): boolean { return this.items.has(name); }
  trustOf(char: string): number { return this.trust[char] ?? 0; }
  evidenceCount(): number {
    let n = 0;
    if (this.has('wire_hook') && this.has('wet_glove')) n++;
    if (this.has('bottle_normal') && this.has('fiber_latch')) n++;
    if (this.has('wet_sill') || this.has('footprint')) n++;
    if (this.has('doctor_sample')) n++;
    if (this.has('diary_torn') && this.has('debt_note')) n++;
    if (this.has('clara_witnessed')) n++;
    if (this.has('thomas_broke')) n++;
    if (this.has('agnes_saw_thomas')) n++;
    return n;
  }

  // Mutation methods
  setFlag(name: string): void { this.flags.add(name); }
  addItem(name: string): void { this.items.add(name); }
  modifyTrust(char: string, delta: number): void {
    this.trust[char] = (this.trust[char] ?? 0) + delta;
  }
  markVisited(id: string): void { this.visited.add(id); }
  wasVisited(id: string): boolean { return this.visited.has(id); }
  incrementActions(): void { this.actions++; }

  // Clone for state mutations
  clone(): GameState {
    const copy = new GameState();
    copy.currentSceneId = this.currentSceneId;
    copy.visited = new Set(this.visited);
    copy.flags = new Set(this.flags);
    copy.items = new Set(this.items);
    copy.trust = { ...this.trust };
    copy.actions = this.actions;
    return copy;
  }
}

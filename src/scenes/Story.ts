import type { Scene } from './Scene';

export class Story {
  private readonly scenesById: Map<string, Scene> = new Map();
  readonly start: Scene;

  constructor(scenes: Scene[], startId: string) {
    for (const s of scenes) {
      if (this.scenesById.has(s.id)) {
        throw new Error(`Duplicate scene id: ${s.id}`);
      }
      this.scenesById.set(s.id, s);
    }
    const start = this.scenesById.get(startId);
    if (!start) throw new Error(`Start scene not found: ${startId}`);
    this.start = start;
  }

  get(id: string): Scene {
    const sc = this.scenesById.get(id);
    if (!sc) throw new Error(`Scene not found: ${id}`);
    return sc;
  }

  tryGet(id: string): Scene | undefined {
    return this.scenesById.get(id);
  }

  has(id: string): boolean {
    return this.scenesById.has(id);
  }

  all(): Scene[] {
    return [...this.scenesById.values()];
  }

  size(): number {
    return this.scenesById.size;
  }
}

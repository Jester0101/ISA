export type Choice = {
  label: string;
  next: string;
  requires?: string;
};

export type SceneEffects = {
  flags?: string[];
  items?: string[];
  trust?: Record<string, number>;
};

export type Route = {
  next: string;
  condition?: string;
};

export type Scene = {
  id: string;
  text: string;
  image?: string;
  onEnter?: SceneEffects;
  choices: Choice[];
  routes?: Route[];
  isEnding?: boolean;
  character?: string;
};

export type Story = {
  start: string;
  scenes: Record<string, Scene>;
};

export type GameState = {
  currentSceneId: string;
  flags: Set<string>;
  items: Set<string>;
  trust: Record<string, number>;
  actions: number;
  visited: Set<string>;
  history: string[];
};

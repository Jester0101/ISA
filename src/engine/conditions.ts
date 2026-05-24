// Recursive descent parser for choice conditions.
// Supports: atoms (flag, item, trust_x >= N, actions < N, ranges), NOT, AND, OR, parentheses.

type State = {
  flags: Set<string>;
  items: Set<string>;
  trust: Record<string, number>;
  actions: number;
};

type Ctx = {
  s: string;
  pos: number;
  state: State;
};

function skipWs(c: Ctx) {
  while (c.pos < c.s.length && /\s/.test(c.s[c.pos])) c.pos++;
}

function consumeKeyword(c: Ctx, kw: string): boolean {
  skipWs(c);
  const slice = c.s.slice(c.pos, c.pos + kw.length);
  if (slice.toUpperCase() !== kw) return false;
  const next = c.s[c.pos + kw.length];
  // Word boundary required (next char must be whitespace, paren, or EOL)
  if (next !== undefined && !/\s|\(|\)/.test(next)) return false;
  c.pos += kw.length;
  return true;
}

function evalAtom(atom: string, state: State): boolean {
  const t = atom.trim();
  if (!t) return true;

  // trust_x OP N
  const trustMatch = t.match(/^trust_(\w+)\s*(>=|<=|==|>|<|=)\s*(-?\d+)$/);
  if (trustMatch) {
    const char = trustMatch[1];
    const op = trustMatch[2];
    const target = parseInt(trustMatch[3], 10);
    const val = state.trust[char] || 0;
    switch (op) {
      case '>=': return val >= target;
      case '<=': return val <= target;
      case '>': return val > target;
      case '<': return val < target;
      case '==':
      case '=': return val === target;
    }
  }

  // actions OP N
  const actMatch = t.match(/^actions\s*(>=|<=|==|>|<|=)\s*(-?\d+)$/);
  if (actMatch) {
    const op = actMatch[1];
    const target = parseInt(actMatch[2], 10);
    switch (op) {
      case '>=': return state.actions >= target;
      case '<=': return state.actions <= target;
      case '>': return state.actions > target;
      case '<': return state.actions < target;
      case '==':
      case '=': return state.actions === target;
    }
  }

  // Range "N <= actions <= M" or with <
  const rangeMatch = t.match(/^(\d+)\s*(<=?)\s*actions\s*(<=?)\s*(\d+)$/);
  if (rangeMatch) {
    const lo = parseInt(rangeMatch[1], 10);
    const opLo = rangeMatch[2];
    const opHi = rangeMatch[3];
    const hi = parseInt(rangeMatch[4], 10);
    const passLo = opLo === '<=' ? state.actions >= lo : state.actions > lo;
    const passHi = opHi === '<=' ? state.actions <= hi : state.actions < hi;
    return passLo && passHi;
  }

  // Bare identifier — flag or item
  if (state.flags.has(t)) return true;
  if (state.items.has(t)) return true;

  return false;
}

function parsePrimary(c: Ctx): boolean {
  skipWs(c);
  if (c.s[c.pos] === '(') {
    c.pos++;
    const v = parseOr(c);
    skipWs(c);
    if (c.s[c.pos] === ')') c.pos++;
    return v;
  }
  // Read atom up to next AND/OR/NOT keyword or ) or end
  const start = c.pos;
  while (c.pos < c.s.length) {
    const ch = c.s[c.pos];
    if (ch === '(' || ch === ')') break;
    const rest = c.s.slice(c.pos);
    // Check for keyword with word boundary before
    if (c.pos > start && /^(AND|OR)\b/i.test(rest) && /\s/.test(c.s[c.pos - 1])) break;
    if (c.pos > start && /^NOT\b/i.test(rest) && /\s/.test(c.s[c.pos - 1])) break;
    c.pos++;
  }
  const atom = c.s.slice(start, c.pos).trim();
  return evalAtom(atom, c.state);
}

function parseUnary(c: Ctx): boolean {
  if (consumeKeyword(c, 'NOT')) {
    return !parsePrimary(c);
  }
  return parsePrimary(c);
}

function parseAnd(c: Ctx): boolean {
  let left = parseUnary(c);
  while (consumeKeyword(c, 'AND')) {
    const right = parseUnary(c);
    left = left && right;
  }
  return left;
}

function parseOr(c: Ctx): boolean {
  let left = parseAnd(c);
  while (consumeKeyword(c, 'OR')) {
    const right = parseAnd(c);
    left = left || right;
  }
  return left;
}

export function evaluate(condition: string | undefined, state: State): boolean {
  if (!condition) return true;
  const ctx: Ctx = { s: condition.trim(), pos: 0, state };
  return parseOr(ctx);
}

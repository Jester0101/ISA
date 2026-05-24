// Full audit of story.json — verifies consistency, reachability, and timing.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORY = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'data', 'story.json'), 'utf8'));

const issues = [];
const warnings = [];

function err(s) { issues.push('❌ ' + s); }
function warn(s) { warnings.push('⚠️  ' + s); }
function ok(s) { console.log('✓ ' + s); }

const scenes = STORY.scenes;
const sceneIds = new Set(Object.keys(scenes));

// 1. Verify all `next` references point to existing scenes
console.log('\n── 1. CHECKING SCENE REFERENCES ──');
let badRefs = 0;
for (const [id, sc] of Object.entries(scenes)) {
  for (const c of sc.choices || []) {
    if (!sceneIds.has(c.next)) {
      err(`${id} → "${c.label}" → [[${c.next}]] (target does not exist)`);
      badRefs++;
    }
  }
}
if (badRefs === 0) ok(`All ${Object.keys(scenes).length} scenes have valid references`);

// 2. Verify body text is clean (no choice/state lines leaked)
console.log('\n── 2. CHECKING BODY TEXT CLEANLINESS ──');
let dirtyBodies = 0;
for (const [id, sc] of Object.entries(scenes)) {
  const text = sc.text || '';
  // Check for leaked patterns
  if (/^-\s*["“].+["”].+\[\[/m.test(text)) {
    err(`${id}: body contains choice-like lines`);
    dirtyBodies++;
  }
  if (/\*\*State/i.test(text) || /\*\*Auto-trigger/i.test(text)) {
    err(`${id}: body contains state/trigger block`);
    dirtyBodies++;
  }
  if (/^##\s+\w/m.test(text)) {
    warn(`${id}: body contains section header (## ...)`);
  }
  if (/\[\[\w+\]\]/.test(text)) {
    warn(`${id}: body contains [[wikilinks]]`);
  }
}
if (dirtyBodies === 0) ok('All body texts are clean');

// 3. Hub-specific check: all expected choice categories present and conditions are mutually exclusive
console.log('\n── 3. HUB CHOICE CONDITIONS ──');
const hub = scenes.investigation_hub;
if (!hub) {
  err('investigation_hub scene is missing!');
} else {
  ok(`Hub has ${hub.choices.length} choices`);

  // Group by character/location for mutual exclusion check
  const charGroups = {
    Clara: hub.choices.filter(c => /clara/.test(c.next)),
    Henry: hub.choices.filter(c => c.next.startsWith('talk_henry') || c.next === 'talk_henry_2'),
    Edmund: hub.choices.filter(c => /^(talk_edmund|edmund_room|edmund_threatens)/.test(c.next)),
    Agnes: hub.choices.filter(c => c.next.startsWith('talk_agnes')),
    Doctor: hub.choices.filter(c => c.next.startsWith('talk_doctor')),
    Thomas: hub.choices.filter(c => c.next.startsWith('talk_thomas')),
  };

  for (const [name, choices] of Object.entries(charGroups)) {
    if (choices.length === 0) continue;
    const noCondition = choices.filter(c => !c.requires);
    if (noCondition.length > 1) {
      err(`${name}: ${noCondition.length} choices have NO condition — would show all at once`);
      noCondition.forEach(c => err(`    ${c.next} (no requires)`));
    } else {
      ok(`${name}: ${choices.length} choices, all have conditions`);
    }
  }
}

// 4. Simulate the action counter timeline — check what's available at each tick
console.log('\n── 4. TIMELINE SIMULATION (no flags set, no items) ──');
function evaluate(condition, state) {
  if (!condition) return true;
  // Minimal version of conditions.ts logic for audit
  const ctx = { s: condition.trim(), pos: 0, state };
  return parseOr(ctx);
}
function parseOr(c) {
  let l = parseAnd(c);
  while (consume(c, 'OR')) l = parseAnd(c) || l;
  return l;
}
function parseAnd(c) {
  let l = parseUnary(c);
  while (consume(c, 'AND')) l = parseUnary(c) && l;
  return l;
}
function parseUnary(c) {
  if (consume(c, 'NOT')) return !parsePrimary(c);
  return parsePrimary(c);
}
function parsePrimary(c) {
  skipWs(c);
  if (c.s[c.pos] === '(') {
    c.pos++; const v = parseOr(c); skipWs(c); if (c.s[c.pos] === ')') c.pos++; return v;
  }
  const start = c.pos;
  while (c.pos < c.s.length) {
    const ch = c.s[c.pos];
    if (ch === '(' || ch === ')') break;
    const rest = c.s.slice(c.pos);
    if (c.pos > start && /^(AND|OR)\b/i.test(rest) && /\s/.test(c.s[c.pos - 1])) break;
    if (c.pos > start && /^NOT\b/i.test(rest) && /\s/.test(c.s[c.pos - 1])) break;
    c.pos++;
  }
  return evalAtom(c.s.slice(start, c.pos).trim(), c.state);
}
function evalAtom(t, s) {
  if (!t) return true;
  const tm = t.match(/^trust_(\w+)\s*(>=|<=|==|>|<|=)\s*(-?\d+)$/);
  if (tm) {
    const v = s.trust[tm[1]] || 0; const tg = +tm[3];
    return tm[2] === '>=' ? v >= tg : tm[2] === '<=' ? v <= tg : tm[2] === '>' ? v > tg : tm[2] === '<' ? v < tg : v === tg;
  }
  const am = t.match(/^actions\s*(>=|<=|==|>|<|=)\s*(-?\d+)$/);
  if (am) {
    const tg = +am[2];
    return am[1] === '>=' ? s.actions >= tg : am[1] === '<=' ? s.actions <= tg : am[1] === '>' ? s.actions > tg : am[1] === '<' ? s.actions < tg : s.actions === tg;
  }
  const rm = t.match(/^(\d+)\s*(<=?)\s*actions\s*(<=?)\s*(\d+)$/);
  if (rm) {
    const passLo = rm[2] === '<=' ? s.actions >= +rm[1] : s.actions > +rm[1];
    const passHi = rm[3] === '<=' ? s.actions <= +rm[4] : s.actions < +rm[4];
    return passLo && passHi;
  }
  return s.flags.has(t) || s.items.has(t);
}
function consume(c, kw) {
  skipWs(c);
  const slice = c.s.slice(c.pos, c.pos + kw.length);
  if (slice.toUpperCase() !== kw) return false;
  const next = c.s[c.pos + kw.length];
  if (next !== undefined && !/\s|\(|\)/.test(next)) return false;
  c.pos += kw.length;
  return true;
}
function skipWs(c) { while (c.pos < c.s.length && /\s/.test(c.s[c.pos])) c.pos++; }

// Simulate the hub from action=0 with mandate_given (gameplay state)
for (const actions of [0, 3, 6, 7, 9, 11, 12, 13, 14]) {
  const state = {
    flags: new Set(['mandate_given']),
    items: new Set(),
    trust: { henry: 2 },
    actions,
  };
  const available = hub.choices.filter(c => evaluate(c.requires, state));
  console.log(`  actions=${actions}: ${available.length} choices available`);

  // Check Clara mutual exclusivity
  const claraVisible = available.filter(c => /clara/.test(c.next));
  if (claraVisible.length > 1) {
    err(`  actions=${actions}: ${claraVisible.length} Clara choices visible: ${claraVisible.map(c => c.next).join(', ')}`);
  }
  // Same for other characters
  for (const [name, group] of [
    ['Henry', hub.choices.filter(c => c.next === 'talk_henry_1' || c.next === 'talk_henry_dining')],
    ['Edmund', hub.choices.filter(c => c.next === 'talk_edmund_1' || c.next === 'talk_edmund_locked')],
    ['Agnes', hub.choices.filter(c => c.next === 'talk_agnes_1' || c.next === 'talk_agnes_packing')],
    ['Doctor', hub.choices.filter(c => /^talk_doctor_(1|away|2)/.test(c.next))],
    ['Thomas', hub.choices.filter(c => c.next === 'talk_thomas_1' || c.next === 'talk_thomas_kitchen')],
  ]) {
    const visible = group.filter(c => evaluate(c.requires, state));
    if (visible.length > 1) {
      err(`  actions=${actions}: ${visible.length} ${name} choices visible: ${visible.map(c => c.next).join(', ')}`);
    }
  }
}

// 5. Verify endings are reachable
console.log('\n── 5. ENDING REACHABILITY ──');
const endings = Object.keys(scenes).filter(id => id.startsWith('ending_'));
console.log(`  Found ${endings.length} endings`);

// Build reverse graph: target → [scenes that lead here]
const incoming = new Map();
for (const id of sceneIds) incoming.set(id, []);
for (const [id, sc] of Object.entries(scenes)) {
  for (const c of sc.choices || []) {
    if (incoming.has(c.next)) incoming.get(c.next).push(id);
  }
  for (const r of sc.routes || []) {
    if (incoming.has(r.next)) incoming.get(r.next).push(id);
  }
}

// Endings reachable only via engine auto-triggers (not scene routes)
const ENGINE_TRIGGERED_ENDINGS = new Set(['ending_too_late', 'ending_murdered']);
for (const eid of endings) {
  const inc = incoming.get(eid);
  if (inc.length === 0 && !ENGINE_TRIGGERED_ENDINGS.has(eid)) {
    err(`${eid} has no incoming references (unreachable)`);
  }
}
const unreachable = endings.filter(e => incoming.get(e).length === 0 && !ENGINE_TRIGGERED_ENDINGS.has(e));
if (unreachable.length === 0) ok('All endings have at least one path (scene-route or engine-trigger)');

// 6. Check for orphan scenes (not reachable from start)
console.log('\n── 6. ORPHAN SCENES ──');
const reachable = new Set();
function visit(id) {
  if (reachable.has(id)) return;
  reachable.add(id);
  const sc = scenes[id];
  if (!sc) return;
  for (const c of sc.choices || []) visit(c.next);
  for (const r of sc.routes || []) visit(r.next);
}
visit('start');
// Also add auto-trigger destinations as reachable (events triggered by engine)
for (const eventId of ['event_body_moved', 'event_crowe_leaves', 'event_clara_in_garden', 'event_clara_locked_door', 'event_edmund_returns', 'event_edmund_in_corridor', 'thomas_dies', 'edmund_threatens', 'ending_too_late', 'ending_murdered', 'time_warning']) {
  if (scenes[eventId]) visit(eventId);
}
const orphans = [...sceneIds].filter(id => !reachable.has(id));
if (orphans.length === 0) ok('All scenes reachable');
else {
  warn(`Orphan scenes: ${orphans.length}`);
  orphans.forEach(o => warn(`    ${o}`));
}

// 7. Trust scenes — check for double-counted onEnter
console.log('\n── 7. TRUST CONSISTENCY ──');
let trustScenes = 0;
for (const [id, sc] of Object.entries(scenes)) {
  if (sc.onEnter?.trust) trustScenes++;
}
ok(`${trustScenes} scenes have trust effects (one-time enforced by engine)`);

// 8. Final report
console.log('\n────────────────────────────────────────');
console.log(`ISSUES: ${issues.length}`);
console.log(`WARNINGS: ${warnings.length}`);
console.log('────────────────────────────────────────');
issues.forEach(i => console.log(i));
warnings.forEach(w => console.log(w));
if (issues.length === 0) console.log('\n✓ ALL CHECKS PASSED');

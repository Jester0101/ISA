// One-time converter: reads story.json and generates src/scenes/all.ts
// with strongly-typed Scene instances and lambda-based connections.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORY = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'data', 'story.json'), 'utf8'));
const OUT = join(__dirname, '..', 'src', 'scenes', 'all.ts');

// ─── Condition translator ──────────────────────────────────────────────
// Translates strings like "actions < 7 AND NOT clara_closed"
// into JS expressions like "(s.actions < 7 && !s.has('clara_closed'))"

function translateCondition(cond) {
  if (!cond) return null;
  const ctx = { s: cond.trim(), pos: 0 };
  return parseOr(ctx);
}

function parseOr(c) {
  const parts = [parseAnd(c)];
  while (consumeKeyword(c, 'OR')) parts.push(parseAnd(c));
  if (parts.length === 1) return parts[0];
  return '(' + parts.join(' || ') + ')';
}

function parseAnd(c) {
  const parts = [parseUnary(c)];
  while (consumeKeyword(c, 'AND')) parts.push(parseUnary(c));
  if (parts.length === 1) return parts[0];
  return '(' + parts.join(' && ') + ')';
}

function parseUnary(c) {
  if (consumeKeyword(c, 'NOT')) {
    const inner = parsePrimary(c);
    return `!${inner}`;
  }
  return parsePrimary(c);
}

function parsePrimary(c) {
  skipWs(c);
  if (c.s[c.pos] === '(') {
    c.pos++;
    const v = parseOr(c);
    skipWs(c);
    if (c.s[c.pos] === ')') c.pos++;
    return v;
  }
  const start = c.pos;
  while (c.pos < c.s.length) {
    const ch = c.s[c.pos];
    if (ch === '(' || ch === ')') break;
    const rest = c.s.slice(c.pos);
    if (c.pos > start && /^(AND|OR)\s/i.test(rest)) break;
    c.pos++;
  }
  return atomToJS(c.s.slice(start, c.pos).trim());
}

function atomToJS(atom) {
  if (!atom) return 'true';
  // trust_X OP N
  let m = atom.match(/^trust_(\w+)\s*(>=|<=|==|>|<|=)\s*(-?\d+)$/);
  if (m) {
    const op = m[2] === '=' ? '===' : m[2];
    return `s.trustOf('${m[1]}') ${op} ${m[3]}`;
  }
  // Range N <= actions <= M (including with strict <)
  m = atom.match(/^(\d+)\s*(<=?)\s*actions\s*(<=?)\s*(\d+)$/);
  if (m) {
    const opLo = m[2] === '<=' ? '>=' : '>';
    const opHi = m[3];
    return `(s.actions ${opLo} ${m[1]} && s.actions ${opHi} ${m[4]})`;
  }
  // actions OP N
  m = atom.match(/^actions\s*(>=|<=|==|>|<|=)\s*(-?\d+)$/);
  if (m) {
    const op = m[1] === '=' ? '===' : m[1];
    return `s.actions ${op} ${m[2]}`;
  }
  // evidence_count / evidence_strength OP N
  m = atom.match(/^evidence_(?:count|strength)\s*(>=|<=|==|>|<|=)\s*(-?\d+)$/);
  if (m) {
    const op = m[1] === '=' ? '===' : m[1];
    return `s.evidenceCount() ${op} ${m[2]}`;
  }
  // Bare identifier — flag or item
  if (/^[a-z_][a-z0-9_]*$/i.test(atom)) {
    return `s.has('${atom}')`;
  }
  // Unknown
  return `false /* unparsed: ${atom.replace(/\*\//g, '* /')} */`;
}

function consumeKeyword(c, kw) {
  skipWs(c);
  const slice = c.s.slice(c.pos, c.pos + kw.length);
  if (slice.toUpperCase() !== kw) return false;
  const next = c.s[c.pos + kw.length];
  if (next !== undefined && !/\s|\(|\)/.test(next)) return false;
  c.pos += kw.length;
  return true;
}

function skipWs(c) {
  while (c.pos < c.s.length && /\s/.test(c.s[c.pos])) c.pos++;
}

// ─── String escaping for embedded text ─────────────────────────────────

function escapeTemplate(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function escapeSingleQuote(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ─── onEnter body builder ──────────────────────────────────────────────

function buildOnEnterBody(onEnter) {
  if (!onEnter) return null;
  const lines = [];
  if (onEnter.items) for (const i of onEnter.items) lines.push(`s.addItem('${i}');`);
  if (onEnter.flags) for (const f of onEnter.flags) lines.push(`s.setFlag('${f}');`);
  if (onEnter.trust) for (const [c, v] of Object.entries(onEnter.trust)) lines.push(`s.modifyTrust('${c}', ${v});`);
  if (lines.length === 0) return null;
  return lines;
}

// ─── Dynamic text builders for specific scenes ─────────────────────────

const HUB_DYNAMIC_TEXT = `
  dynamicText: (s) => {
    const lines = [];
    const a = s.actions;
    const isFirst = a === 0;

    // Compute the current time (game starts at 07:30, each action = 35 min)
    const totalMin = 7 * 60 + 30 + a * 35;
    const hh = Math.floor(totalMin / 60) % 24;
    const mm = totalMin % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const clock = pad(hh) + ':' + pad(mm);

    if (isFirst) {
      // Long opening narration — only the first time the player reaches the gallery
      lines.push("Half past seven by the clock on the mantel in the gallery.");
      lines.push("The rain was thinning. I could see it in the change of light at the tall windows, and in the way the wind had stopped working at the chimneys. By six this evening, perhaps earlier, the lanes from Lowford would be passable to a parish gig.");
      lines.push("Twelve hours, then. Less if I were unlucky.");
      lines.push("I had done this kind of work before. The trick was not in finding the truth, which was usually less hidden than the families thought. The trick was in finding the small wrongness in the room before the household, in its grief, in its fear, in its ordinary morning business, found a way to make the room right again. The bedclothes would be changed. The flask would be emptied. The window would be cleaned by the morning maid. The carpet would be beaten in the courtyard. The constables would arrive at a tidy house and a tidy doctor's certificate, and the constables, who were not paid to be detectives, would go home.");
      lines.push("I stood in the gallery and listed in my head the rooms I needed and the people I would put my questions to. The order would come from what I found first, and from where the household chose to be at any given hour, and from how long it kept its temper.");
      lines.push("I began.");
      return lines.join('\\n\\n');
    }

    // Returning to the gallery — a vignette of the house at this hour.
    // One unique paragraph per return, plus the live clock.
    const vignettes = [
      // a === 1 (~08:05)
      "I was back in the gallery before the long-case clock had quite finished striking the hour. From the corridor came the small careful voices of the two maids, sent up at last from the kitchen and unsure which doors they were to enter. A draught from the east window moved a curtain and let it fall again. The house had not yet decided what kind of morning it was going to have.",
      // a === 2 (~08:40)
      "Bates came up the stair with a tray of tea I had not asked for and set it on the little table by the gallery window without a word. The cup gave off a thin curl of steam that the cold of the gallery took apart almost at once. Somewhere below stairs Mrs Cope's voice rose, then steadied itself, then fell back into the work.",
      // a === 3 (~09:15)
      "The rain had thinned, though it had not stopped. A grey watery light lay along the gallery floor in the shape of the windows, and the wood took the light without warmth. From the master corridor I could hear the slow, deliberate footsteps of a man — Sir Henry, I supposed — pacing a room he had not, an hour earlier, been able to remain in.",
      // a === 4 (~09:50)
      "A door closed on the floor above me with the soft particular sound a bedroom door has when the person closing it is making a point of not being heard. Below in the hall, the under-housemaid was sweeping the porch step in the patient half-pretending way of a servant who has been told to find an outdoor errand.",
      // a === 5 (~10:25)
      "The smell of bread had begun to come up from the kitchen, in the slow polite way the smell of bread travels through an old house. In the morning room Clara, or the place where Clara had been, was quiet again. Bates passed the foot of the stair with a folded cloth and did not look up. The household was managing itself by the small instructions it had been given by no one in particular.",
      // a === 6 (~11:00)
      "The rain had stopped while I had been at my work. The yellow had begun, very faintly, to find the edge of the cloud above the moor. From the back of the house came the small everyday noises of a kitchen that had decided to make a luncheon nobody was likely to eat. I stood at the window for a moment and let the change of light reach me.",
      // a === 7 (~11:35)
      "A trap was brought round to the front of the house and stood for a few minutes on the gravel with the boy at the horse's head. Then it was led away again, on no instruction I had heard given. The household was in that thin stretch of the morning when servants do things they would not, on a calmer day, do without asking.",
      // a === 8 (~12:10)
      "Noon was close. The gallery clock had a small dry cough before each chime, in the way old clocks do, and it coughed now and struck twelve in the slow heavy notes of a thing that had been telling the time in this house since before any of us. I waited for the last of them. The household waited with me, in its own way.",
      // a === 9 (~12:45)
      "Luncheon had been laid and was being taken in by those who could face it. The smell of mutton had gone past the smell of bread, in the small irrevocable way meals come on. The gallery itself was empty. Whatever was happening in the house at this hour was happening behind closed doors.",
      // a === 10 (~13:20)
      "The afternoon had begun without my noticing. A brighter strip of sun had reached the carpet at the head of the stair, and a maid had been told to pull a curtain across it. She had not yet done so. The light lay where it had been put. From the dining room the soft sound of plates being cleared came up to me without comment.",
      // a === 11 (~13:55)
      "Bates passed the gallery without his coat, in his shirtsleeves, carrying a folded paper. He did not see me, or chose not to. The house had begun to move with the small private hurry of a household that knew, without having been told, that the morning was no longer a morning and the matter was no longer to be left to itself.",
      // a === 12 (~14:30)
      "The cloud at the western window had broken open at last, and clean afternoon light lay along the gallery floor. It was a cruel light. It found nothing the morning had hidden, and explained nothing the morning had not made plain. The lane from Lowford was passable now. Delay had ceased to be caution.",
      // a === 13 (~15:05)
      "A horse came down the avenue and turned off at the home farm before it reached the porch — not the parish gig, not yet. I watched it go. The yellow had spread across the moor in the way March light spreads after a long storm, with a kind of forgiveness that had no business in this morning.",
      // a === 14 (~15:40)
      "The drawing room had been opened and aired. A maid was setting chairs. Mrs Cope passed the door once and looked in and went on without speaking. The house was preparing itself for the half past four, in the small careful way it prepared for any event that mattered. There were perhaps two hours of the afternoon left in me.",
      // a === 15 (~16:15)
      "The gallery clock struck the quarter past, and the sound carried further than usual, as it does in a house that has stopped its small noises to listen. Through the long window I could see the avenue, empty still, and the wet gleam where the gravel had begun to dry. Somewhere not far enough away the constables were on the road.",
      // a === 16 (~16:50)
      "Below stairs the kitchen had gone quiet. A pan was set down once, set down again, and after that nothing. The household had begun, without saying so, to wait. I had not many turns of the gallery clock left, and what I had left I would have to use.",
      // a === 17 (~17:25)
      "The light at the western window had gone the deep yellow it goes for the last half hour before evening, when even bad weather is forgiven. A horse came down the lane and turned in at the porch — slower than a gentleman's, steadier than a labourer's. The gig had not yet stopped. It was the kind of arrival that has, in my experience, only one shape.",
      // a === 18 (~18:00)
      "Six o'clock. The gallery clock struck it once, twice, then went on with the long ones a clock makes for the hour, and I counted them with the careful attention of a man whose case had run out of room. The constables were at the door. Whatever I had not done by now would not be done by me.",
    ];
    let vignette = vignettes[Math.min(a - 1, vignettes.length - 1)];
    if (!vignette) vignette = "I came back to the gallery and let it have me for a moment before I moved again.";
    lines.push(clock + " by the gallery clock.");
    lines.push(vignette);

    // What's in my head, second visit onward
    if (s.has('knows_method') && s.has('knows_motive')) {
      lines.push("I had two of the three things a magistrate would ask for. The third would have to be a voice from this house.");
    } else if (s.has('knows_method')) {
      lines.push("I could see the shape of the how. The who was still the work.");
    } else if (s.has('knows_motive')) {
      lines.push("I could see the shape of the why. The who would not be a surprise when I came to it.");
    }

    // Witnesses & alliances
    if (s.has('thomas_broke')) lines.push("A confession was in my notebook. I had perhaps an hour before the man who had used the witness noticed what I had done to him.");
    else if (s.has('thomas_dead')) lines.push("Mr. Reid was at the foot of the back stair. I had pressed him too slowly, and another hand had not.");
    if (s.has('clara_offers_alliance')) lines.push("Miss Harrow had offered, by the fountain, to walk with me. I had an ally with a surname.");
    if (s.has('henry_aligned')) lines.push("Sir Henry knew. Sir Henry had known six weeks. He would stand where I put him.");
    if (s.has('doctor_allied')) lines.push("Crowe had pressed a sealed bottle into my hand in the library.");
    if (s.has('agnes_witness')) lines.push("Miss Blake had agreed to speak in the drawing room.");
    if (s.has('clara_closed')) lines.push("The morning room door would not open to me again before four.");
    if (s.has('edmund_chamber_locked')) lines.push("The door across the corridor had been locked from the inside. Whatever else there was to find there was past my hand.");

    return lines.join('\\n\\n');
  },`;

// ─── Generate code for one scene ───────────────────────────────────────

function generateScene(id, sc) {
  const lines = [];
  lines.push(`export const ${jsId(id)}: Scene = new Scene({`);
  lines.push(`  id: '${id}',`);
  if (sc.title) lines.push(`  title: ${JSON.stringify(sc.title)},`);
  if (sc.image) lines.push(`  image: ${JSON.stringify(sc.image)},`);
  if (sc.character) lines.push(`  character: ${JSON.stringify(sc.character)},`);
  if (sc.isEnding) lines.push(`  isEnding: true,`);

  // Text as template literal
  lines.push(`  text: \`${escapeTemplate(sc.text)}\`,`);

  // Dynamic text for the hub
  if (id === 'investigation_hub') {
    lines.push(HUB_DYNAMIC_TEXT.trim());
  }

  // onEnter
  const onEnterBody = buildOnEnterBody(sc.onEnter);
  if (onEnterBody) {
    lines.push(`  onEnter: (s) => {`);
    onEnterBody.forEach(l => lines.push(`    ${l}`));
    lines.push(`  },`);
  }

  // Choices
  if (sc.choices && sc.choices.length > 0) {
    lines.push(`  choices: [`);
    for (const c of sc.choices) {
      const parts = [`label: '${escapeSingleQuote(c.label)}'`, `next: () => ${jsId(c.next)}`];
      if (c.requires) {
        const js = translateCondition(c.requires);
        if (js) parts.push(`available: (s) => ${js}`);
      }
      if (c.lock_hint) {
        parts.push(`lockHint: '${escapeSingleQuote(c.lock_hint)}'`);
      }
      lines.push(`    { ${parts.join(', ')} },`);
    }
    lines.push(`  ],`);
  }

  // Routes
  if (sc.routes && sc.routes.length > 0) {
    lines.push(`  routes: [`);
    for (const r of sc.routes) {
      const parts = [`next: () => ${jsId(r.next)}`];
      if (r.condition) {
        const js = translateCondition(r.condition);
        if (js) parts.push(`when: (s) => ${js}`);
      }
      lines.push(`    { ${parts.join(', ')} },`);
    }
    lines.push(`  ],`);
  }

  lines.push(`});`);
  return lines.join('\n');
}

// JS identifier-safe version of scene id
function jsId(id) {
  return id.replace(/[^a-zA-Z0-9_$]/g, '_');
}

// ─── Main ───────────────────────────────────────────────────────────────

const sceneIds = Object.keys(STORY.scenes);
console.log(`Converting ${sceneIds.length} scenes...`);

// ─── Post-process the story to enforce gameplay rules ──────────────────

const HUB = 'investigation_hub';

// (Auto-rewrite of sub-scene "Back" to hub was removed — it made it impossible
//  to investigate both details inside a parent location, e.g. inspecting the
//  bottle in the bedroom locked you out of inspecting the window. Now sub-scene
//  "Back" buttons return to their parent as the story.json intended, and the
//  parent's "Back to the gallery" exits to the hub.)

// 2. Prefix hub labels with character names for clarity.
const CHAR_PREFIX = {
  talk_henry_1: 'Sir Henry — ',
  talk_henry_dining: 'Sir Henry — ',
  talk_henry_2: 'Sir Henry — ',
  talk_edmund_1: 'Edmund — ',
  talk_edmund_2: 'Edmund — ',
  talk_edmund_locked: 'Edmund — ',
  edmund_room: 'Edmund — ',
  talk_clara_1: 'Clara — ',
  talk_clara_garden: 'Clara — ',
  event_clara_locked_door: 'Clara — ',
  talk_clara_closed: 'Clara — ',
  talk_agnes_1: 'Miss Blake — ',
  talk_agnes_packing: 'Miss Blake — ',
  talk_agnes_help: 'Miss Blake — ',
  talk_doctor_1: 'Doctor Crowe — ',
  talk_doctor_away: 'Doctor Crowe — ',
  talk_doctor_2: 'Doctor Crowe — ',
  talk_thomas_1: 'Thomas — ',
  talk_thomas_kitchen: 'Thomas — ',
};
const hub = STORY.scenes[HUB];
if (hub && hub.choices) {
  for (const c of hub.choices) {
    const prefix = CHAR_PREFIX[c.next];
    if (prefix && !c.label.startsWith(prefix)) {
      // Strip filler words "Find him/her/them"
      const cleaned = c.label
        .replace(/^Find (him|her|them) /i, '')
        .replace(/^Sit at /i, 'sit at ')
        .replace(/^Look for (him|her|them) /i, '')
        .replace(/^Return to (him|her|them) /i, 'return ');
      c.label = prefix + cleaned;
    }
  }
}

const sceneTitles = {
  start: 'I — The Carriage',
  arrival: 'II — The Hall',
  dinner: 'III — At Table',
  after_dinner_hub: 'IV — After the Ladies Withdrew',
  retire: 'V — A Storm in the Chimney',
  morning_scream: 'VI — Before Six',
  bedroom_first: 'VII — The Master Bedroom',
  examine_body: "VIII — The Doctor's Verdict",
  mandate: 'IX — The Mandate',
  investigation_hub: 'The Investigation',
  final_gathering: 'The Drawing Room',
  evaluate_evidence: 'The Account',
};

const lines = [];
lines.push("// AUTO-GENERATED by scripts/convert-to-classes.mjs");
lines.push("// Do not edit directly — re-run the converter after changing story.json,");
lines.push("// or edit scenes directly here for fine-tuning.");
lines.push("");
lines.push("import { Scene } from './Scene';");
lines.push("import { Story } from './Story';");
lines.push("");

// Emit each scene in declaration order
for (const id of sceneIds) {
  const sc = STORY.scenes[id];
  if (!sc.title && sceneTitles[id]) sc.title = sceneTitles[id];
  lines.push(generateScene(id, sc));
  lines.push('');
}

// Emit the Story registry
lines.push('// Registry of all scenes — assembled once, used everywhere');
lines.push('export const story = new Story([');
for (const id of sceneIds) {
  lines.push(`  ${jsId(id)},`);
}
lines.push("], 'start');");
lines.push('');

writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`Wrote ${OUT}`);
console.log(`Total: ${sceneIds.length} scenes, ~${lines.length} lines.`);

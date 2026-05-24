// Parses Obsidian markdown vault into story.json
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VAULT = process.argv[2] || 'C:\\Users\\sasha\\Desktop\\HarrowManor';
const OUT = join(__dirname, '..', 'src', 'data', 'story.json');

const PHOTO_DIR = join(VAULT, 'photo');
const SKIP_FILES = new Set(['00_INDEX.md']);

const ALIASES = {
  'after_dinner_hub': 'scn_after_dinner',
  'bedroom_bottle': 'scn_evidence_bottle',
  'bedroom_window': 'bedroom_window',
  'bedroom_search': 'scn_bedroom_first',
  'examine_body': 'scn_bedroom_first',
  'courtyard_carniz': 'scn_courtyard',
  'dinner_observe_clara': 'scn_dinner_clara',
  'dinner_observe_edmund': 'scn_dinner_edmund',
  'dinner_talk_henry': 'scn_dinner_henry',
  'edmund_under_bed': 'scn_edmund_room',
  'edmund_wardrobe': 'scn_edmund_room',
  'empty_room': 'scn_bedroom_first',
  'empty_room_floor': 'scn_evidence_footprint',
  'empty_room_sill': 'bedroom_window',
  'garden_evening': 'scn_courtyard',
  'evaluate_evidence': 'scn_final_gathering',
  'final_gathering': 'scn_final_gathering',
  'accuse_edmund': 'scn_final_gathering',
  'accuse_clara': 'scn_final_gathering',
  'accuse_agnes': 'scn_final_gathering',
  'accuse_henry': 'scn_final_gathering',
  'accuse_doctor': 'scn_final_gathering',
  'investigation_hub': 'map',
  'servants_hall': 'scn_laundress',
  'servants_laundress': 'scn_laundress',
  'study': 'loc_arrival',
  'study_diary': 'loc_arrival',
  'study_letters': 'loc_arrival',
  'time_warning': 'paper',
  'talk_doctor_1': 'char_crowe',
  'talk_doctor_dose': 'char_crowe',
  'talk_doctor_certain': 'char_crowe',
  'talk_doctor_2': 'char_crowe',
  'talk_doctor_away': 'scn_talk_doctor_evening',
  'talk_doctor_evening': 'scn_talk_doctor_evening',
  'talk_henry_1': 'char_henry',
  'talk_henry_marriage': 'char_henry',
  'talk_henry_brandy': 'char_henry',
  'talk_henry_2': 'scn_mandate',
  'talk_henry_dining': 'scn_dinner_henry',
  'talk_edmund_1': 'char_edmund',
  'talk_edmund_alibi': 'char_edmund',
  'talk_edmund_laudanum': 'char_edmund',
  'talk_edmund_2': 'char_edmund',
  'talk_edmund_locked': 'scn_edmund_threatens',
  'edmund_threatens': 'scn_edmund_threatens',
  'edmund_room': 'scn_edmund_room',
  'talk_clara_1': 'char_clara',
  'talk_clara_soft': 'char_clara',
  'talk_clara_hard': 'char_clara',
  'talk_clara_night': 'char_clara',
  'talk_clara_edmund': 'char_clara',
  'talk_clara_agnes': 'char_clara',
  'talk_clara_garden': 'scn_clara_garden',
  'talk_clara_closed': 'char_clara',
  'event_clara_in_garden': 'scn_clara_garden',
  'event_clara_locked_door': 'char_clara',
  'talk_agnes_1': 'char_agnes',
  'talk_agnes_henry': 'char_agnes',
  'talk_agnes_alibi': 'char_agnes',
  'talk_agnes_help': 'char_agnes',
  'talk_agnes_packing': 'char_agnes',
  'talk_thomas_1': 'char_thomas',
  'talk_thomas_alibi': 'char_thomas',
  'talk_thomas_cuffs': 'char_thomas',
  'talk_thomas_break': 'char_thomas',
  'talk_thomas_kitchen': 'char_thomas',
  'thomas_dies': 'scn_thomas_dies',
  'event_body_moved': 'scn_morning_scream',
  'event_crowe_leaves': 'char_crowe',
  'event_edmund_returns': 'scn_edmund_room',
  'event_edmund_in_corridor': 'scn_edmund_threatens',
  'ending_henry_confronts': 'ending_justice',
  'start': 'scn_start',
  'arrival': 'loc_arrival',
  'dinner': 'scn_dinner',
  'retire': 'scn_retire',
  'morning_scream': 'scn_morning_scream',
  'bedroom_first': 'scn_bedroom_first',
  'mandate': 'scn_mandate',
};

function buildImageMap() {
  const map = {};
  if (!existsSync(PHOTO_DIR)) return map;
  for (const f of readdirSync(PHOTO_DIR)) {
    const lower = f.toLowerCase();
    let key = lower.replace(/\.(jpg|jpeg|png|webp)$/, '');
    key = key.replace(/\.(jpg|jpeg|png|webp)$/, '');
    map[key] = f;
  }
  return map;
}

function findImage(sceneId, imageMap) {
  const sid = sceneId.toLowerCase();
  if (imageMap[sid]) return imageMap[sid];
  if (imageMap['scn_' + sid]) return imageMap['scn_' + sid];
  if (ALIASES[sid]) {
    const aliasKey = ALIASES[sid].toLowerCase();
    if (imageMap[aliasKey]) return imageMap[aliasKey];
  }
  return null;
}

function parseEffects(line) {
  const effects = {};
  const flags = [];
  const items = [];
  const trust = {};

  const flagMatches = line.matchAll(/flag\s+[`'"]([^`'"]+)[`'"]/g);
  for (const m of flagMatches) flags.push(m[1]);

  const itemMatches = line.matchAll(/item\s+[`'"]([^`'"]+)[`'"]/g);
  for (const m of itemMatches) items.push(m[1]);

  const trustMatches = line.matchAll(/trust_(\w+)\s*([+-])=\s*(\d+)/g);
  for (const m of trustMatches) {
    const char = m[1];
    const sign = m[2] === '+' ? 1 : -1;
    const val = parseInt(m[3], 10);
    trust[char] = (trust[char] || 0) + sign * val;
  }

  if (flags.length) effects.flags = flags;
  if (items.length) effects.items = items;
  if (Object.keys(trust).length) effects.trust = trust;
  return effects;
}

function looksLikeFlag(s) {
  return /^[a-z_][a-z0-9_]*$/i.test(s.trim());
}

function looksLikeCondition(s) {
  const t = s.trim();
  if (!t) return false;
  // Bare flag/item identifier
  if (looksLikeFlag(t)) return true;
  // Contains operator or keyword (trust_, actions, NOT, AND, OR, comparison ops)
  if (/[><=]/.test(t)) return true;
  if (/trust_\w+/i.test(t)) return true;
  if (/\bactions\b/i.test(t)) return true;
  if (/\bNOT\b|\bAND\b|\bOR\b/i.test(t)) return true;
  return false;
}

// Extract a balanced (...) block starting at offset; returns inner text or null
function extractBalancedParens(s, start) {
  if (s[start] !== '(') return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0) return s.slice(start + 1, i);
    }
  }
  return null;
}

// Detect "bare" routes (no quoted label) like:
//   -> [[ending_framed_clara]]
//   - If `henry_aligned` -> [[ending_henry_confronts]]
//   - `evidence_strength >= 4` (description) -> [[ending_triumph]]
//   - Otherwise -> [[evaluate_evidence]]
function parseRouteLine(line) {
  const t = line.trim();
  // Skip lines that look like normal quoted choices
  if (/^-\s*["“]/.test(t)) return null;
  // Must have an arrow + wikilink
  const m = t.match(/^(?:-\s*)?(?:If\s+|\*?\(?\s*)?(.*?)\s*(?:-?->|→)\s*\[\[([^\]|]+)\]\]\s*\)?\*?\s*$/i);
  if (!m) return null;

  let cond = m[1].trim();
  const next = m[2].trim();
  // Strip ALL backticks and italic markers
  cond = cond.replace(/[`*]/g, '').trim();
  // "Otherwise" or empty = no condition
  if (!cond || /^otherwise$/i.test(cond)) {
    return { next, condition: undefined };
  }
  // Strip parenthetical description
  cond = cond.replace(/\s*\([^)]*\)\s*$/, '').trim();
  // Strip non-ASCII tail
  const nonAscii = cond.search(/[^\x00-\x7F]/);
  if (nonAscii > 0) cond = cond.slice(0, nonAscii).trim();
  return { next, condition: cond || undefined };
}

function parseChoiceLine(line) {
  const linkMatch = line.match(/^-\s*["“]([^"“”]+)["”"]\s*(?:-?->|→)\s*\[\[([^\]|]+)\]\]/);
  if (!linkMatch) return null;

  const label = linkMatch[1].trim().replace(/\.\s*$/, '');
  const next = linkMatch[2].trim();

  let rest = line.slice(linkMatch[0].length).trim();
  if (rest.startsWith('*')) rest = rest.slice(1).trimStart();

  let requires;
  if (rest.startsWith('(')) {
    const inner = extractBalancedParens(rest, 0);
    if (inner !== null) {
      let cond = inner.trim().replace(/^requires:\s*/i, '');
      // Strip anything after the first non-ASCII character (em-dash, mojibake, smart quotes)
      const nonAsciiIdx = cond.search(/[^\x00-\x7F]/);
      if (nonAsciiIdx > 0) cond = cond.slice(0, nonAsciiIdx).trim();
      // Only keep if it looks like a real condition (not descriptive text)
      if (looksLikeCondition(cond)) {
        requires = cond;
      }
    }
  }

  return { label, next, requires };
}

function parseScene(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const id = basename(filePath, '.md');
  if (SKIP_FILES.has(basename(filePath))) return null;

  const lines = raw.split('\n');
  const scene = { id, text: '', choices: [], routes: [] };
  const bodyLines = [];
  let pastHeader = false;
  let skipBlock = false;
  let inRouteBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!pastHeader && trimmed.startsWith('# ')) {
      pastHeader = true;
      continue;
    }

    if (trimmed === '---') {
      skipBlock = false;
      continue;
    }

    if (trimmed.match(/^\*\*State/i) || trimmed.match(/^\*\*Auto-trigger/i)) {
      skipBlock = true;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      skipBlock = false;
      // "## Next" or "## Logic" sections contain routing directives
      inRouteBlock = /^##\s+(Next|Logic|Routes)\b/i.test(trimmed);
      continue;
    }

    const choice = parseChoiceLine(trimmed);
    if (choice) {
      scene.choices.push(choice);
      continue;
    }

    // Bare arrow routes (auto-routing — engine evaluates)
    const route = parseRouteLine(trimmed);
    if (route) {
      scene.routes.push(route);
      continue;
    }

    if (trimmed.startsWith('**On enter:**') || trimmed.startsWith('**Triggers:**')) {
      const effects = parseEffects(trimmed);
      if (Object.keys(effects).length > 0) {
        if (!scene.onEnter) scene.onEnter = {};
        if (effects.flags) scene.onEnter.flags = [...(scene.onEnter.flags || []), ...effects.flags];
        if (effects.items) scene.onEnter.items = [...(scene.onEnter.items || []), ...effects.items];
        if (effects.trust) scene.onEnter.trust = { ...(scene.onEnter.trust || {}), ...effects.trust };
      }
      continue;
    }

    if (trimmed.startsWith('**Condition:**') || trimmed.startsWith('**Available:**') || trimmed.startsWith('**Note:**')) {
      continue;
    }

    if (skipBlock) continue;

    if (/^-\s*[`]/.test(trimmed)) continue;

    bodyLines.push(line);
  }

  scene.text = bodyLines.join('\n').trim();
  scene.text = scene.text.replace(/\n{3,}/g, '\n\n');

  // Clean up: empty routes array
  if (scene.routes.length === 0) delete scene.routes;

  if (id.startsWith('ending_')) {
    scene.isEnding = true;
  }

  const charMatch = id.match(/^talk_(\w+?)(_|$)/);
  if (charMatch) {
    scene.character = charMatch[1];
  }

  return scene;
}

const imageMap = buildImageMap();
const files = readdirSync(VAULT).filter(f => f.endsWith('.md'));
const scenes = {};

let parsed = 0;
let skipped = 0;
for (const file of files) {
  const scene = parseScene(join(VAULT, file));
  if (!scene) { skipped++; continue; }
  const img = findImage(scene.id, imageMap);
  if (img) scene.image = img;
  scenes[scene.id] = scene;
  parsed++;
}

const story = { start: 'start', scenes };

const dataDir = dirname(OUT);
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

writeFileSync(OUT, JSON.stringify(story, null, 2), 'utf8');
console.log(`Parsed ${parsed} scenes (skipped ${skipped}). Output: ${OUT}`);

const sceneIds = Object.keys(scenes).sort();
console.log(`Scenes: ${sceneIds.length}`);
const noImage = sceneIds.filter(id => !scenes[id].image);
if (noImage.length) console.log(`No image for ${noImage.length}: ${noImage.join(', ')}`);
else console.log('All scenes have images.');

if (scenes.investigation_hub) {
  console.log(`Hub: ${scenes.investigation_hub.choices.length} choices`);
}

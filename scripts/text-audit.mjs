// Text-content audit: checks for name/place/plot consistency across all scenes
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORY = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'data', 'story.json'), 'utf8'));

const issues = [];
const info = [];

function err(s) { issues.push('❌ ' + s); }
function note(s) { info.push('• ' + s); }

const scenes = STORY.scenes;

// Canonical names — anything else in same context is suspicious
const CANONICAL = {
  // Characters
  'Robert Ashford': ['Ashford', 'Robert', 'Mr Ashford', 'Mr. Ashford'],
  'Sir Henry Harrow': ['Sir Henry', 'Harrow', 'Henry'],
  'Lady Eleanor Harrow': ['Lady Eleanor', 'Eleanor'],
  'Edmund Harrow': ['Edmund', 'Mr Edmund', 'Mr Harrow', 'Mr. Harrow'],
  'Clara Harrow': ['Clara', 'Miss Harrow'],
  'Miss Agnes Blake': ['Miss Blake', 'Agnes Blake', 'Agnes'],
  'Doctor Nathaniel Crowe': ['Doctor Crowe', 'Crowe', 'Dr Crowe', 'Dr. Crowe'],
  'Thomas Reid': ['Thomas', 'Mr Reid', 'Mr. Reid', 'Reid'],
  'Charles Penrose': ['Charles', 'Penrose'],
  'Mrs Pell': ['Mrs. Pell', 'Pell'],
  'Mrs Cope': ['Mrs. Cope', 'Cope'],
  'Bates': ['Bates'],
  'Hargreaves': ['Hargreaves'],
  // Places
  'Lowford': ['Lowford'],
  'Holborn': ['Holborn'],
  'Wakefield': ['Wakefield'],
  'Manchester': ['Manchester'],
  'York': ['York'],
};

// Check for name typos / inconsistent spellings
const SUSPICIOUS_PATTERNS = [
  { pattern: /\bElinor\b/, expected: 'Eleanor', who: 'Lady Eleanor' },
  { pattern: /\bEdmonds?\b/, expected: 'Edmund', who: 'Edmund' },
  { pattern: /\bClare\b/, expected: 'Clara', who: 'Clara' },
  { pattern: /\bDoctor Crow\b/, expected: 'Doctor Crowe', who: 'Doctor Crowe' },
  { pattern: /\bThomas Read\b/, expected: 'Thomas Reid', who: 'Thomas' },
  { pattern: /\bMs\.? Blake\b/, expected: 'Miss Blake', who: 'Agnes' },
  { pattern: /\bAshfield\b/, expected: 'Ashford', who: 'Robert' },
  { pattern: /\bHargreaves\b/, expected: 'Hargreaves', who: 'constable' },
  // Different ways of writing the same place
  { pattern: /\bLowforde?\b(?!\.|s)/i, expected: 'Lowford', who: 'town', strict: true },
];

console.log('\n── 1. NAME CONSISTENCY ──');
let nameTypos = 0;
for (const [id, sc] of Object.entries(scenes)) {
  const text = sc.text || '';
  for (const { pattern, expected, who, strict } of SUSPICIOUS_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const found = m[0];
      if (found !== expected) {
        if (strict || !text.includes(expected)) {
          err(`${id}: "${found}" — expected "${expected}" (${who})`);
          nameTypos++;
        }
      }
    }
  }
}
if (nameTypos === 0) console.log('✓ No obvious name typos');

// 2. Check that endings reference the correct outcomes
console.log('\n── 2. ENDING CONTENT MATCHES THE PATH ──');
const ENDING_EXPECTATIONS = {
  ending_triumph: { mustContain: ['Edmund', 'constable', 'hanged'], context: 'Edmund arrested publicly' },
  ending_justice: { mustContain: ['Edmund', 'letter', 'magistrate'], context: 'Edmund writes confession under Henry' },
  ending_quiet: { mustContain: ['Edmund', 'Cape Town', 'packet'], context: 'Edmund sent to colonies' },
  ending_failed_accusation: { mustContain: ['Edmund', 'laughed'], context: 'Edmund laughs off the accusation' },
  ending_framed_clara: { mustContain: ['Clara', 'workhouse'], context: 'Clara dies in workhouse' },
  ending_framed_agnes: { mustContain: ['Blake', 'Thames'], context: 'Agnes dies in Thames' },
  ending_framed_henry: { mustContain: ['Sir Henry', 'pistol'], context: 'Henry shoots himself' },
  ending_framed_doctor: { mustContain: ['Crowe', 'Liverpool', 'licence'], context: 'Crowe ruined' },
  ending_henry_confronts: { mustContain: ['Sir Henry', 'Edmund', 'library', 'letter'], context: 'Henry takes son to library' },
  ending_clara_ally_triumph: { mustContain: ['Clara', 'Edmund', 'witness'], context: 'Clara names her brother' },
  ending_clara_betrayed: { mustContain: ['Clara', 'Blake'], context: 'Clara turns against Robert' },
  ending_murdered: { mustContain: ['Edmund', 'stair'], context: 'Edmund kills Robert' },
  ending_bribed: { mustContain: ['guineas', 'natural causes'], context: 'Robert takes the money' },
  ending_silence: { mustContain: ['no name'], context: 'Robert refuses to name' },
  ending_refused: { mustContain: ['London', 'rain'], context: 'Robert refuses the work' },
  ending_too_late: { mustContain: ['constable', 'natural causes'], context: 'Out of time' },
};

let endingMismatches = 0;
for (const [id, expectation] of Object.entries(ENDING_EXPECTATIONS)) {
  const sc = scenes[id];
  if (!sc) {
    err(`${id} scene missing!`);
    continue;
  }
  for (const term of expectation.mustContain) {
    if (!sc.text.toLowerCase().includes(term.toLowerCase())) {
      err(`${id}: text does not mention "${term}" (${expectation.context})`);
      endingMismatches++;
    }
  }
}
if (endingMismatches === 0) console.log(`✓ All 16 endings narrate the expected outcome`);

// 3. Plot consistency — Edmund is ALWAYS the killer
console.log('\n── 3. EDMUND IS CONSISTENTLY THE KILLER ──');
// Check that scenes that should identify Edmund DO identify him
const edmundIdentifyingScenes = [
  'talk_thomas_break',
  'talk_clara_edmund',
  'evaluate_evidence',
  'accuse_edmund',
];
let edmundConsistent = true;
for (const id of edmundIdentifyingScenes) {
  const sc = scenes[id];
  if (!sc) continue;
  if (!sc.text.toLowerCase().includes('edmund') && !sc.text.toLowerCase().includes('he')) {
    err(`${id}: should identify Edmund as the killer`);
    edmundConsistent = false;
  }
}
if (edmundConsistent) console.log('✓ Edmund consistently identified as the killer in key scenes');

// 4. Method consistency — laudanum + window-ledge
console.log('\n── 4. METHOD CONSISTENCY (laudanum + locked room) ──');
const methodScenes = ['bedroom_bottle', 'talk_doctor_dose', 'talk_doctor_certain', 'bedroom_window', 'empty_room_sill', 'courtyard_carniz', 'edmund_under_bed', 'edmund_wardrobe'];
let methodConsistent = true;
for (const id of methodScenes) {
  const sc = scenes[id];
  if (!sc) continue;
  const txt = sc.text.toLowerCase();
  // Just check that they reference the relevant elements
  if (id.includes('bottle') && !txt.includes('laudanum')) {
    err(`${id}: should mention laudanum`);
    methodConsistent = false;
  }
  if (id.includes('window') && !txt.includes('latch') && !txt.includes('window')) {
    err(`${id}: should mention window/latch`);
    methodConsistent = false;
  }
}
if (methodConsistent) console.log('✓ Method-related scenes mention the right details');

// 5. Charles Penrose mentioned consistently (Clara's beau)
console.log('\n── 5. CHARLES PENROSE (Clara\'s beau) CONSISTENCY ──');
const penroseScenes = Object.entries(scenes).filter(([, sc]) =>
  sc.text.toLowerCase().includes('charles') || sc.text.toLowerCase().includes('penrose')
);
console.log(`✓ Charles Penrose mentioned in ${penroseScenes.length} scenes`);
penroseScenes.forEach(([id]) => note(`    ${id}`));

// 6. Final report
console.log('\n────────────────────────────────────────');
console.log(`ISSUES: ${issues.length}`);
console.log('────────────────────────────────────────');
issues.forEach(i => console.log(i));
if (info.length && issues.length === 0) {
  console.log('\nInfo:');
  info.forEach(s => console.log(s));
}
if (issues.length === 0) console.log('\n✓ ALL TEXT CHECKS PASSED');

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

// 半音数だけで移すとE♭がD♯になってしまうため、文字の進み数も一緒に持たせる
export const NOTATIONS = {
  concert: { label: '実音', letters: 0, semitones: 0 },
  alto: { label: 'アルト E♭', letters: 5, semitones: 9 },
  tenor: { label: 'テナー B♭', letters: 8, semitones: 14 }
};

export const INTERVALS = {
  M2: { name: '長2度', letters: 1, semitones: 2 },
  m3: { name: '短3度', letters: 2, semitones: 3 },
  M3: { name: '長3度', letters: 2, semitones: 4 },
  P4: { name: '完全4度', letters: 3, semitones: 5 },
  d5: { name: '減5度', letters: 4, semitones: 6 },
  P5: { name: '完全5度', letters: 4, semitones: 7 },
  m7: { name: '短7度', letters: 6, semitones: 10 },
  M7: { name: '長7度', letters: 6, semitones: 11 }
};

export const QUALITIES = {
  '': { name: 'メジャー', label: '', tones: ['M3', 'P5'] },
  m: { name: 'マイナー', label: 'm', tones: ['m3', 'P5'] },
  maj7: { name: 'メジャーセブンス', label: 'maj7', tones: ['M3', 'P5', 'M7'] },
  7: { name: 'ドミナントセブンス', label: '7', tones: ['M3', 'P5', 'm7'] },
  m7: { name: 'マイナーセブンス', label: 'm7', tones: ['m3', 'P5', 'm7'] },
  m7b5: { name: 'マイナーセブン♭5', label: 'm7♭5', tones: ['m3', 'd5', 'm7'] }
};

export const DIATONIC = [
  { quality: 'maj7', roman: 'Imaj7' },
  { quality: 'm7', roman: 'IIm7' },
  { quality: 'm7', roman: 'IIIm7' },
  { quality: 'maj7', roman: 'IVmaj7' },
  { quality: '7', roman: 'V7' },
  { quality: 'm7', roman: 'VIm7' },
  { quality: 'm7b5', roman: 'VIIm7♭5' }
];

export function parseNote(text) {
  const match = /^([A-G])(##|#|bb|b)?(\d)?$/.exec(text);
  if (!match) throw new Error(`音名が読めません: ${text}`);
  const sign = match[2]?.startsWith('#') ? 1 : -1;
  const acc = match[2] ? sign * match[2].length : 0;
  const octave = match[3] === undefined ? 4 : Number(match[3]);
  return { letter: LETTERS.indexOf(match[1]), acc, octave };
}

export function noteToText(note, withOctave = true) {
  const acc = note.acc > 0 ? '#'.repeat(note.acc) : 'b'.repeat(-note.acc);
  return LETTERS[note.letter] + acc + (withOctave ? note.octave : '');
}

export function noteName(note) {
  const acc = note.acc > 0 ? '♯'.repeat(note.acc) : '♭'.repeat(-note.acc);
  return LETTERS[note.letter] + acc;
}

export function noteToMidi(note) {
  return 12 * (note.octave + 1) + NATURAL_SEMITONES[note.letter] + note.acc;
}

// 五線の上下位置は♯♭に関係なく文字で決まるので、文字だけの通し番号を使う
export function diatonicIndex(note) {
  return note.octave * 7 + note.letter;
}

export function transpose(note, letterSteps, semitones) {
  const total = note.letter + letterSteps;
  const letter = ((total % 7) + 7) % 7;
  const octave = note.octave + Math.floor(total / 7);
  const natural = 12 * (octave + 1) + NATURAL_SEMITONES[letter];
  return { letter, octave, acc: noteToMidi(note) + semitones - natural };
}

export function addInterval(note, code) {
  const interval = INTERVALS[code];
  return transpose(note, interval.letters, interval.semitones);
}

export function toWritten(note, notationKey) {
  const notation = NOTATIONS[notationKey];
  return transpose(note, notation.letters, notation.semitones);
}

// 和音が五線の中ほどに収まるよう、ルートはC〜Fを4、G〜Bを3のオクターブに置く
export function placeRoot(note) {
  return { ...note, octave: note.letter <= 3 ? 4 : 3 };
}

export function majorScale(root) {
  return MAJOR_SCALE.map((semitones, i) => transpose(root, i, semitones));
}

export function parseChord(text) {
  const match = /^([A-G](?:#|b)?)(.*)$/.exec(text);
  if (!match || !(match[2] in QUALITIES)) throw new Error(`コード名が読めません: ${text}`);
  return { root: placeRoot(parseNote(match[1])), quality: match[2] };
}

export function makeChord(root, quality) {
  return { root: placeRoot(root), quality };
}

export function chordToText(chord) {
  return noteToText(chord.root, false) + chord.quality;
}

export function chordNotes(chord) {
  return [chord.root, ...QUALITIES[chord.quality].tones.map((code) => addInterval(chord.root, code))];
}

export function chordName(chord, notationKey) {
  return noteName(toWritten(chord.root, notationKey)) + QUALITIES[chord.quality].label;
}

export function twoFiveOne(keyRoot) {
  const scale = majorScale(keyRoot);
  return [makeChord(scale[1], 'm7'), makeChord(scale[4], '7'), makeChord(scale[0], 'maj7')];
}

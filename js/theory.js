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
  A1: { name: '増1度', letters: 0, semitones: 1 },
  m2: { name: '短2度', letters: 1, semitones: 1 },
  M2: { name: '長2度', letters: 1, semitones: 2 },
  m3: { name: '短3度', letters: 2, semitones: 3 },
  M3: { name: '長3度', letters: 2, semitones: 4 },
  P4: { name: '完全4度', letters: 3, semitones: 5 },
  d5: { name: '減5度', letters: 4, semitones: 6 },
  P5: { name: '完全5度', letters: 4, semitones: 7 },
  A5: { name: '増5度', letters: 4, semitones: 8 },
  m6: { name: '短6度', letters: 5, semitones: 8 },
  M6: { name: '長6度', letters: 5, semitones: 9 },
  d7: { name: '減7度', letters: 6, semitones: 9 },
  m7: { name: '短7度', letters: 6, semitones: 10 },
  M7: { name: '長7度', letters: 6, semitones: 11 },
  m9: { name: '♭9th', letters: 8, semitones: 13 },
  M9: { name: '9th', letters: 8, semitones: 14 },
  A9: { name: '♯9th', letters: 8, semitones: 15 },
  P11: { name: '11th', letters: 10, semitones: 17 },
  A11: { name: '♯11th', letters: 10, semitones: 18 },
  m13: { name: '♭13th', letters: 12, semitones: 20 },
  M13: { name: '13th', letters: 12, semitones: 21 }
};

export const QUALITIES = {
  '': { name: 'メジャー', label: '', tones: ['M3', 'P5'] },
  m: { name: 'マイナー', label: 'm', tones: ['m3', 'P5'] },
  maj7: { name: 'メジャーセブンス', label: 'maj7', tones: ['M3', 'P5', 'M7'] },
  7: { name: 'ドミナントセブンス', label: '7', tones: ['M3', 'P5', 'm7'] },
  m7: { name: 'マイナーセブンス', label: 'm7', tones: ['m3', 'P5', 'm7'] },
  m7b5: { name: 'マイナーセブン♭5', label: 'm7♭5', tones: ['m3', 'd5', 'm7'] },
  '7b9': { name: 'セブン・フラットナイン', label: '7(♭9)', tones: ['M3', 'P5', 'm7', 'm9'] },
  9: { name: 'ナインス', label: '9', tones: ['M3', 'P5', 'm7', 'M9'] },
  dim7: { name: 'ディミニッシュセブンス', label: 'dim7', tones: ['m3', 'd5', 'd7'] },
  '7sus4': { name: 'セブン・サスフォー', label: '7sus4', tones: ['P4', 'P5', 'm7'] },
  mMaj7: { name: 'マイナー・メジャーセブンス', label: 'm(maj7)', tones: ['m3', 'P5', 'M7'] },
  m6: { name: 'マイナーシックス', label: 'm6', tones: ['m3', 'P5', 'M6'] },
  '7#5': { name: 'セブン・シャープファイブ', label: '7(♯5)', tones: ['M3', 'A5', 'm7'] }
};

// コードに合わせるスケール（ルートからの半音数）。lettersがなければ文字は1つずつ進む。
// オルタードなどはジャズの慣習どおり♯9thを短3度の文字で書くため、文字の進み方を別に持たせる
export const MODES = {
  ionian: { name: 'イオニアン', semitones: [0, 2, 4, 5, 7, 9, 11] },
  dorian: { name: 'ドリアン', semitones: [0, 2, 3, 5, 7, 9, 10] },
  mixolydian: { name: 'ミクソリディアン', semitones: [0, 2, 4, 5, 7, 9, 10] },
  locrian: { name: 'ロクリアン', semitones: [0, 1, 3, 5, 6, 8, 10] },
  lydian: { name: 'リディアン', semitones: [0, 2, 4, 6, 7, 9, 11] },
  lydianDominant: { name: 'リディアン・ドミナント', semitones: [0, 2, 4, 6, 7, 9, 10] },
  melodicMinor: { name: 'メロディックマイナー', semitones: [0, 2, 3, 5, 7, 9, 11] },
  altered: { name: 'オルタード', semitones: [0, 1, 3, 4, 6, 8, 10], letters: [0, 1, 2, 2, 3, 5, 6] },
  halfWhole: { name: 'コンビネーション・オブ・ディミニッシュ', semitones: [0, 1, 3, 4, 6, 7, 9, 10], letters: [0, 1, 2, 2, 3, 4, 5, 6] },
  wholeTone: { name: 'ホールトーン', semitones: [0, 2, 4, 6, 8, 10], letters: [0, 1, 2, 3, 4, 6] },
  bebopDominant: { name: 'ビバップ・ドミナント', semitones: [0, 2, 4, 5, 7, 9, 10, 11], letters: [0, 1, 2, 3, 4, 5, 6, 6] },
  bebopMajor: { name: 'ビバップ・メジャー', semitones: [0, 2, 4, 5, 7, 8, 9, 11], letters: [0, 1, 2, 3, 4, 4, 5, 6] },
  majorPentatonic: { name: 'メジャー・ペンタトニック', semitones: [0, 2, 4, 7, 9], letters: [0, 1, 2, 4, 5] },
  minorPentatonic: { name: 'マイナー・ペンタトニック', semitones: [0, 3, 5, 7, 10], letters: [0, 2, 3, 4, 6] },
  harmonicMinor: { name: 'ハーモニック・マイナー', semitones: [0, 2, 3, 5, 7, 8, 11] },
  phrygianDominant: { name: 'フリジアン・ドミナント', semitones: [0, 1, 4, 5, 7, 8, 10] },
  wholeHalf: { name: 'ディミニッシュ・スケール', semitones: [0, 2, 3, 5, 6, 8, 9, 11], letters: [0, 1, 2, 3, 4, 5, 6, 6] }
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

export function modeScale(root, modeKey) {
  const { semitones, letters } = MODES[modeKey];
  return semitones.map((step, i) => transpose(root, letters ? letters[i] : i, step));
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

// マイナーキーのツーファイブワン。Vは短調の響きを出すため♭9を足す
export function minorTwoFiveOne(keyRoot) {
  return [
    makeChord(addInterval(keyRoot, 'M2'), 'm7b5'),
    makeChord(addInterval(keyRoot, 'P5'), '7b9'),
    makeChord(keyRoot, 'm7')
  ];
}

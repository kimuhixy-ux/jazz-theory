import {
  INTERVALS, QUALITIES, DIATONIC, parseNote, noteToText, chordToText, chordNotes,
  addInterval, transpose, placeRoot, majorScale, makeChord, twoFiveOne
} from './theory.js';

const DEGREE_NAMES = ['ルート', '3度', '5度', '7度'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// ♭のつくルートでm7♭5を作るとダブルフラットが出て初歩には難しいので、ルートを絞る
const HALF_DIMINISHED_ROOTS = ['C', 'D', 'E', 'G', 'A', 'B'];

function randomChord(roots, qualities) {
  const quality = pick(qualities);
  const root = pick(quality === 'm7b5' ? HALF_DIMINISHED_ROOTS : roots);
  return makeChord(parseNote(root), quality);
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// 画面側で記譜に合わせて書き換えられるよう、音名とコード名は印つきの文字列で持つ
const n = (note) => `{n:${noteToText(note)}}`;
const c = (chord) => `{c:${chordToText(chord)}}`;
const spell = (notes) => notes.map(n).join('・');
const single = (note) => ({ notes: [note], chord: null });
const chordColumn = (chord) => ({ notes: chordNotes(chord), chord });

function makeQuestion({ prompt, correct, wrong, explain, columns, ear = false }) {
  const choices = shuffle([correct, ...wrong]);
  return { prompt, choices, answer: choices.indexOf(correct), explain, columns, ear };
}

function keyRoot(keys) {
  return placeRoot(parseNote(pick(keys)));
}

// 五線の中ほど（E4〜D5）に収めて、ガイドトーンを読みやすくする
function fitRange(note) {
  let octave = note.octave;
  while (octave * 7 + note.letter > 36) octave -= 1;
  while (octave * 7 + note.letter < 30) octave += 1;
  return { ...note, octave };
}

function guideColumn(chord) {
  const tones = chordNotes(chord);
  return { notes: [fitRange(tones[1]), fitRange(tones[3])], chord };
}

const earGenerators = {
  step() {
    const root = parseNote(pick(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B3']));
    const isHalf = Math.random() < 0.5;
    const upper = transpose(root, 1, isHalf ? 1 : 2);
    const answer = isHalf ? '半音' : '全音';
    return makeQuestion({
      prompt: '2つの音の間は半音？ 全音？', correct: answer, wrong: [isHalf ? '全音' : '半音'],
      explain: `${n(root)} → ${n(upper)} は${answer}です。`, columns: [single(root), single(upper)], ear: true
    });
  },
  interval({ list }) {
    const code = pick(list);
    const root = parseNote(pick(['C4', 'D4', 'F4', 'G3', 'A3']));
    const upper = addInterval(root, code);
    const { name, semitones } = INTERVALS[code];
    return makeQuestion({
      prompt: '聴こえた音程は？', correct: name, wrong: list.filter((x) => x !== code).map((x) => INTERVALS[x].name),
      explain: `${n(root)} → ${n(upper)} は${name}（半音${semitones}つ）。`,
      columns: [{ notes: [root, upper], chord: null }], ear: true
    });
  },
  quality({ list }) {
    const chord = randomChord(['C', 'D', 'F', 'G', 'A', 'Bb', 'Eb'], list);
    const quality = chord.quality;
    const label = (q) => (QUALITIES[q].label ? `${QUALITIES[q].label}（${QUALITIES[q].name}）` : QUALITIES[q].name);
    return makeQuestion({
      prompt: '聴こえたコードの種類は？', correct: label(quality), wrong: list.filter((x) => x !== quality).map(label),
      explain: `${c(chord)} ＝ ${spell(chordNotes(chord))}`,
      columns: [{ notes: chordNotes(chord), chord: null }], ear: true
    });
  },
  progression({ keys }) {
    const root = keyRoot(keys);
    const chords = twoFiveOne(root);
    const romans = ['IIm7', 'V7', 'Imaj7'];
    const i = Math.floor(Math.random() * 3);
    return makeQuestion({
      prompt: '最初に Imaj7 で調を示します。2つ目のコードは？', correct: romans[i], wrong: romans.filter((_, j) => j !== i),
      explain: `キー${n(root)}：2つ目は ${c(chords[i])}（${romans[i]}）でした。`,
      columns: [chordColumn(chords[2]), chordColumn(chords[i])], ear: true
    });
  }
};

const readGenerators = {
  intervalName({ list }) {
    const code = pick(list);
    const root = parseNote(pick(['C4', 'D4', 'F4', 'G3', 'A3']));
    const upper = addInterval(root, code);
    const wrong = shuffle(list.filter((x) => x !== code)).slice(0, 3).map((x) => INTERVALS[x].name);
    return makeQuestion({
      prompt: `${n(root)} から上の ${n(upper)} までの音程は？`, correct: INTERVALS[code].name, wrong,
      explain: `半音${INTERVALS[code].semitones}つ分なので${INTERVALS[code].name}です。`,
      columns: [{ notes: [root, upper], chord: null }]
    });
  },
  scaleDegree({ keys }) {
    const root = keyRoot(keys);
    const scale = majorScale(root);
    const i = 1 + Math.floor(Math.random() * 6);
    const wrong = shuffle(scale.filter((_, j) => j !== i && j !== 0)).slice(0, 3).map(n);
    return makeQuestion({
      prompt: `キー${n(root)} のメジャースケールで${i + 1}番目の音は？`, correct: n(scale[i]), wrong,
      explain: `キー${n(root)}：${spell(scale)}`, columns: scale.map(single)
    });
  },
  chordTone({ roots, qualities }) {
    const chord = randomChord(roots, qualities);
    const tones = chordNotes(chord);
    const i = 1 + Math.floor(Math.random() * (tones.length - 1));
    return makeQuestion({
      prompt: `${c(chord)} の${DEGREE_NAMES[i]}の音は？`, correct: n(tones[i]),
      wrong: tones.filter((_, j) => j !== i).map(n),
      explain: `${c(chord)} ＝ ${spell(tones)}（${DEGREE_NAMES.slice(0, tones.length).join('・')}）`,
      columns: [chordColumn(chord)]
    });
  },
  diatonic({ keys }) {
    const root = keyRoot(keys);
    const scale = majorScale(root);
    const i = Math.floor(Math.random() * 7);
    const { quality, roman } = DIATONIC[i];
    const chord = makeChord(scale[i], quality);
    const otherQualities = shuffle(['maj7', '7', 'm7', 'm7b5'].filter((q) => q !== quality)).slice(0, 2);
    const neighbor = makeChord(scale[(i + 1) % 7], DIATONIC[(i + 1) % 7].quality);
    return makeQuestion({
      prompt: `キー${n(root)} の ${roman} は？`, correct: c(chord),
      wrong: [...otherQualities.map((q) => c(makeChord(scale[i], q))), c(neighbor)],
      explain: `${i + 1}番目の音 ${n(scale[i])} の上に、スケールの音だけで重ねると ${c(chord)} です。`,
      columns: [chordColumn(chord)]
    });
  },
  twoFive({ keys }) {
    const root = keyRoot(keys);
    const chords = twoFiveOne(root);
    const line = (list) => list.map(c).join(' → ');
    const swapped = [makeChord(chords[0].root, '7'), makeChord(chords[1].root, 'm7'), chords[2]];
    return makeQuestion({
      prompt: `キー${n(root)} のツーファイブワンは？`, correct: line(chords),
      wrong: [line(twoFiveOne(addInterval(root, 'P4'))), line(twoFiveOne(addInterval(root, 'P5'))), line(swapped)],
      explain: `2番目の音の m7 → 5番目の音の 7 → 1番目の音の maj7 です。`,
      columns: chords.map(chordColumn)
    });
  },
  guideTone({ keys }) {
    const [two, five, one] = twoFiveOne(keyRoot(keys));
    const variant = pick([
      { from: two, to: five, fromDegree: 3, answerDegree: 1 },
      { from: five, to: one, fromDegree: 3, answerDegree: 1 },
      { from: two, to: five, fromDegree: 1, answerDegree: 3, askDegree: true }
    ]);
    const fromTone = chordNotes(variant.from)[variant.fromDegree];
    const toTones = chordNotes(variant.to);
    const columns = [guideColumn(variant.from), guideColumn(variant.to)];
    if (variant.askDegree) {
      return makeQuestion({
        prompt: `${c(variant.from)} の3度 ${n(fromTone)} は、次の ${c(variant.to)} では何度の音として残る？`,
        correct: '7度', wrong: ['ルート', '3度', '5度'],
        explain: `${n(fromTone)} は動かずに ${c(variant.to)} の7度になります。`, columns
      });
    }
    return makeQuestion({
      prompt: `${c(variant.from)} の7度 ${n(fromTone)} は、次の ${c(variant.to)} で半音下がって何になる？`,
      correct: n(toTones[1]), wrong: [toTones[0], toTones[2], toTones[3]].map(n),
      explain: `${n(fromTone)} → ${n(toTones[1])}（${c(variant.to)} の3度）へ半音下がります。`, columns
    });
  }
};

const GENERATORS = { ...earGenerators, ...readGenerators };

// 単元に複数の出題形式があるときは、偏らないよう順番に混ぜてからシャッフルする
export function buildQuiz(specs, length) {
  const questions = [];
  for (let i = 0; i < length; i += 1) {
    const spec = specs[i % specs.length];
    questions.push(GENERATORS[spec.type](spec.params ?? {}));
  }
  return shuffle(questions);
}

import {
  INTERVALS, QUALITIES, DIATONIC, MODES, NOTATIONS, parseNote, noteToText, noteToMidi, chordToText, chordNotes,
  addInterval, transpose, placeRoot, diatonicIndex, majorScale, modeScale, makeChord, twoFiveOne, minorTwoFiveOne, toWritten
} from './theory.js';

const DEGREE_NAMES = ['ルート', '3度', '5度', '7度'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// ♭のつくルートでm7♭5やdim7を作るとダブルフラットが出て読みにくいので、ルートを絞る
const HALF_DIMINISHED_ROOTS = ['C', 'D', 'E', 'G', 'A', 'B'];
const DIMINISHED_ROOTS = ['C#', 'E', 'F#', 'G#', 'A', 'B'];
// 7(♯5)は♯のつくルートだとアルト・テナーでダブルシャープになる
const AUGMENTED_ROOTS = ['C', 'Eb', 'F', 'G', 'Ab', 'Bb'];
const RESTRICTED_ROOTS = { m7b5: HALF_DIMINISHED_ROOTS, dim7: DIMINISHED_ROOTS, '7#5': AUGMENTED_ROOTS };

function randomChord(roots, qualities) {
  const quality = pick(qualities);
  const root = pick(RESTRICTED_ROOTS[quality] ?? roots);
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

const TENSIONS = { maj7: ['M9', 'A11', 'M13'], 7: ['M9', 'm9', 'A9', 'M13'], m7: ['M9', 'P11'] };
const SCALE_FOR = { maj7: 'ionian', m7: 'dorian', 7: 'mixolydian', m7b5: 'locrian' };
const QUALITY_FOR_MODE = { ionian: 'maj7', dorian: 'm7', mixolydian: '7', locrian: 'm7b5', lydian: 'maj7', lydianDominant: '7' };
const BLUES_FORM = [['I7'], ['IV7'], ['I7'], ['I7'], ['IV7'], ['IV7'], ['I7'], ['VI7'], ['IIm7'], ['V7'], ['I7', 'VI7'], ['IIm7', 'V7']];
const BLUES_ROMANS = { I7: [null, '7'], IV7: ['P4', '7'], V7: ['P5', '7'], VI7: ['M6', '7'], IIm7: ['M2', 'm7'] };

const line = (chords) => chords.map(c).join(' → ');

// アルト・テナーに直したときにダブルシャープ・ダブルフラットになる音は、出題に使わない
const isPlain = (note) => Object.keys(NOTATIONS).every((key) => Math.abs(toWritten(note, key).acc) < 2);

// 同じ高さの音が選択肢に並ばないよう、音の高さ（12で割った余り）が違うものだけ選ぶ
function distinctWrong(pool, correct, count) {
  const used = new Set([noteToMidi(correct) % 12]);
  const result = [];
  for (const note of shuffle(pool.filter(isPlain))) {
    const pitchClass = noteToMidi(note) % 12;
    if (used.has(pitchClass)) continue;
    used.add(pitchClass);
    result.push(note);
  }
  return result.slice(0, count);
}

function bluesChord(keyRootNote, roman) {
  const [interval, quality] = BLUES_ROMANS[roman];
  return makeChord(interval ? addInterval(keyRootNote, interval) : keyRootNote, quality);
}

const stepUpEarGenerators = {
  twoFiveMode({ keys }) {
    const root = keyRoot(keys);
    const isMinor = Math.random() < 0.5;
    const answer = isMinor ? 'マイナー' : 'メジャー';
    const chords = isMinor ? minorTwoFiveOne(root) : twoFiveOne(root);
    return makeQuestion({
      prompt: '聴こえたのはどちらのツーファイブワン？', correct: answer, wrong: [isMinor ? 'メジャー' : 'マイナー'],
      explain: `${answer}：${line(chords)}`, columns: chords.map(chordColumn), ear: true
    });
  },
  subEar({ keys }) {
    const [two, five, one] = twoFiveOne(keyRoot(keys));
    const isSub = Math.random() < 0.5;
    const middle = isSub ? makeChord(addInterval(five.root, 'd5'), '7') : five;
    const answer = isSub ? '裏コード（♭II7）' : 'V7';
    return makeQuestion({
      prompt: '真ん中のコードは V7？ 裏コード？', correct: answer, wrong: [isSub ? 'V7' : '裏コード（♭II7）'],
      explain: `${line([two, middle, one])}。裏コードはベースが半音ずつ下がります。`,
      columns: [two, middle, one].map(chordColumn), ear: true
    });
  },
  // qualityを渡すと、どのスケールでも同じコードを鳴らす（コードの違いで答えがわからないように）
  modeEar({ list, quality }) {
    const mode = pick(list);
    const root = parseNote(pick(['C4', 'D4', 'F4', 'G3']));
    const chord = makeChord(root, quality ?? QUALITY_FOR_MODE[mode]);
    const scale = modeScale(chord.root, mode);
    return makeQuestion({
      prompt: 'コードのあとにスケールを鳴らします。どのスケール？', correct: MODES[mode].name,
      wrong: list.filter((x) => x !== mode).map((x) => MODES[x].name),
      explain: `${c(chord)} の上の${MODES[mode].name}：${spell(scale)}`,
      columns: [chordColumn(chord), ...scale.map(single)], ear: true
    });
  }
};

const stepUpReadGenerators = {
  // codesを渡すと、7のコードの指定したテンション（オルタードなど）だけを出す
  tension({ roots, codes }) {
    let chord;
    let code;
    let target;
    do {
      chord = randomChord(roots, codes ? ['7'] : Object.keys(TENSIONS));
      code = pick(codes ?? TENSIONS[chord.quality]);
      target = addInterval(chord.root, code);
    } while (!isPlain(target));
    const pool = [...chordNotes(chord).slice(1), ...['m9', 'M9', 'A9', 'P11', 'A11', 'm13', 'M13'].map((x) => addInterval(chord.root, x))];
    return makeQuestion({
      prompt: `${c(chord)} の ${INTERVALS[code].name} の音は？`, correct: n(target), wrong: distinctWrong(pool, target, 3).map(n),
      explain: `9thは2度、11thは4度、13thは6度を1オクターブ上で数えた音。${c(chord)} の ${INTERVALS[code].name} は ${n(target)}。`,
      columns: [{ notes: [...chordNotes(chord), target], chord }]
    });
  },
  minorTwoFive({ keys }) {
    const root = keyRoot(keys);
    const chords = minorTwoFiveOne(root);
    const broken = [makeChord(chords[0].root, 'm7'), makeChord(chords[1].root, 'maj7'), chords[2]];
    return makeQuestion({
      prompt: `キー${n(root)}マイナーのツーファイブワンは？`, correct: line(chords),
      wrong: [line(twoFiveOne(root)), line(minorTwoFiveOne(addInterval(root, 'P4'))), line(broken)],
      explain: '2番目の音の m7♭5 → 5番目の音の 7(♭9) → 1番目の音の m7 です。', columns: chords.map(chordColumn)
    });
  },
  secondary({ keys }) {
    const root = keyRoot(keys);
    const scale = majorScale(root);
    const targets = [1, 2, 3, 4, 5];
    const i = pick(targets);
    const target = makeChord(scale[i], DIATONIC[i].quality);
    const dominantOf = (j) => makeChord(addInterval(scale[j], 'P5'), '7');
    const dominant = dominantOf(i);
    const others = shuffle(targets.filter((j) => j !== i)).slice(0, 2).map(dominantOf);
    return makeQuestion({
      prompt: `キー${n(root)} で ${c(target)}（${DIATONIC[i].roman}）へ向かうセカンダリードミナントは？`,
      correct: c(dominant), wrong: [c(makeChord(dominant.root, 'm7')), ...others.map(c)],
      explain: `${c(target)} のルート ${n(scale[i])} の完全5度上 ${n(dominant.root)} に7のコードを作ると ${c(dominant)}。`,
      columns: [chordColumn(dominant), chordColumn(target)]
    });
  },
  tritoneSub({ roots }) {
    const dominant = makeChord(parseNote(pick(roots)), '7');
    const sub = makeChord(addInterval(dominant.root, 'd5'), '7');
    if (Math.random() < 0.5) {
      return makeQuestion({
        prompt: `${c(dominant)} の裏コードは？`, correct: c(sub),
        wrong: ['m3', 'M2', 'P4'].map((x) => c(makeChord(addInterval(dominant.root, x), '7'))),
        explain: `ルート ${n(dominant.root)} から半音6つ離れた ${n(sub.root)} の7のコードが裏コードです。`,
        columns: [chordColumn(dominant), chordColumn(sub)]
      });
    }
    const third = chordNotes(dominant)[1];
    return makeQuestion({
      prompt: `${c(dominant)} の3度 ${n(third)} は、裏コード ${c(sub)} では何度の音？`, correct: '7度', wrong: ['ルート', '3度', '5度'],
      explain: `${n(third)} と ${c(sub)} の7度 ${n(chordNotes(sub)[3])} は同じ高さ（異名同音）。3度と7度が入れ替わります。`,
      columns: [guideColumn(dominant), guideColumn(sub)]
    });
  },
  blues({ keys }) {
    const root = keyRoot(keys);
    const bar = Math.floor(Math.random() * 10);
    const roman = BLUES_FORM[bar][0];
    const wrongRomans = shuffle(Object.keys(BLUES_ROMANS).filter((x) => x !== roman)).slice(0, 3);
    const start = Math.floor(bar / 4) * 4;
    // 11・12小節目は1小節に2つのコードが入るので、小節ごとに区切って書き、譜例のコードの数と合わせる
    const bars = BLUES_FORM.slice(start, start + 4).map((group) => group.map((x) => c(bluesChord(root, x))).join(' ')).join('｜');
    const row = BLUES_FORM.slice(start, start + 4).flat();
    return makeQuestion({
      prompt: `キー${n(root)} のジャズブルースで、${bar + 1}小節目のコードは？`, correct: c(bluesChord(root, roman)),
      wrong: wrongRomans.map((x) => c(bluesChord(root, x))),
      explain: `${bar + 1}小節目は ${roman}。譜例は${start + 1}〜${start + 4}小節目：${bars}`,
      columns: row.map((x) => chordColumn(bluesChord(root, x)))
    });
  },
  chordScale({ roots }) {
    const chord = randomChord(roots, Object.keys(SCALE_FOR));
    const mode = SCALE_FOR[chord.quality];
    const scale = modeScale(chord.root, mode);
    return makeQuestion({
      prompt: `${c(chord)} に合わせる基本のスケールは？`, correct: MODES[mode].name,
      wrong: Object.values(SCALE_FOR).filter((x) => x !== mode).map((x) => MODES[x].name),
      explain: `${c(chord)} には${MODES[mode].name}：${spell(scale)}`,
      columns: [chordColumn(chord), ...scale.map(single)]
    });
  }
};

// どちらか2択の聴き取り問題をまとめて作る
function earPair({ prompt, options, explainOf }) {
  const [answer, other] = shuffle(Object.keys(options));
  return makeQuestion({
    prompt, correct: answer, wrong: [other], explain: explainOf(options[answer]),
    columns: options[answer].map(chordColumn), ear: true
  });
}

const QUALITY_SET = ['m7', '7', 'maj7', 'm7b5'];

// 空欄の位置のコードを、同じルートのほかの種類や進行中のほかのコードと紛らわせて問う
function fillBlank({ prompt, chords, blankFrom, explain }) {
  const k = blankFrom + Math.floor(Math.random() * (chords.length - blankFrom));
  const answer = chords[k];
  const shown = chords.map((x, i) => (i === k ? '？' : c(x))).join(' → ');
  const wrong = QUALITY_SET.filter((q) => q !== answer.quality).map((q) => c(makeChord(answer.root, q)));
  return makeQuestion({
    prompt: `${prompt}　${shown}`, correct: c(answer), wrong: shuffle(wrong).slice(0, 3),
    explain, columns: chords.map(chordColumn)
  });
}

function subdominantMinorSet(root) {
  return {
    'IVm7': makeChord(addInterval(root, 'P4'), 'm7'),
    '♭VII7': makeChord(addInterval(root, 'm7'), '7'),
    '♭VImaj7': makeChord(addInterval(root, 'm6'), 'maj7'),
    'IVmaj7': makeChord(addInterval(root, 'P4'), 'maj7'),
    'V7': makeChord(addInterval(root, 'P5'), '7')
  };
}

const advancedGenerators = {
  passingDim({ keys }) {
    const root = keyRoot(keys);
    const scale = majorScale(root);
    // I→II、II→III、IV→V、V→VI の間に、半音上げたルートのdim7をはさむ
    const [from, to] = pick([[0, 1], [1, 2], [3, 4], [4, 5]]);
    const fromChord = makeChord(scale[from], DIATONIC[from].quality);
    const toChord = makeChord(scale[to], DIATONIC[to].quality);
    const raised = transpose(scale[from], 0, 1);
    const dim = makeChord(raised, 'dim7');
    return makeQuestion({
      prompt: `キー${n(root)} で ${c(fromChord)} と ${c(toChord)} の間に入るパッシング・ディミニッシュは？`, correct: c(dim),
      wrong: [c(makeChord(raised, 'm7')), c(makeChord(raised, '7')), c(makeChord(scale[to], 'dim7'))],
      explain: `${n(scale[from])} を半音上げた ${n(raised)} のdim7。ベースが ${n(scale[from])}→${n(raised)}→${n(scale[to])} と半音で上がります。`,
      columns: [fromChord, dim, toChord].map(chordColumn)
    });
  },
  dimAsDominant({ roots }) {
    const dominant = makeChord(parseNote(pick(roots)), '7b9');
    const dim = makeChord(addInterval(dominant.root, 'M3'), 'dim7');
    return makeQuestion({
      prompt: `${c(dim)} は、どの7(♭9)からルートを省いた形？`, correct: c(dominant),
      wrong: ['M2', 'P4', 'P5'].map((x) => c(makeChord(addInterval(dominant.root, x), '7b9'))),
      explain: `${c(dominant)} の3度・5度・7度・♭9th（${spell(chordNotes(dominant).slice(1))}）を並べると ${c(dim)}。`,
      columns: [chordColumn(dominant), chordColumn(dim)]
    });
  },
  subMinor({ keys }) {
    const root = keyRoot(keys);
    const set = subdominantMinorSet(root);
    const roman = pick(['IVm7', '♭VII7', '♭VImaj7']);
    const wrong = shuffle(Object.keys(set).filter((x) => x !== roman)).slice(0, 3);
    return makeQuestion({
      prompt: `キー${n(root)} の ${roman} は？`, correct: c(set[roman]), wrong: wrong.map((x) => c(set[x])),
      explain: `${roman} は同じ主音のマイナーキーから借りたコード。キー${n(root)} では ${c(set[roman])}。`,
      columns: [chordColumn(set[roman]), chordColumn(makeChord(root, 'maj7'))]
    });
  },
  backdoorEar({ keys }) {
    const root = keyRoot(keys);
    const set = subdominantMinorSet(root);
    const tonic = makeChord(root, 'maj7');
    return earPair({
      prompt: 'Imaj7 へ戻る前の2つのコードは、ツーファイブ？ バックドア？',
      options: { 'ツーファイブ（IIm7 → V7）': twoFiveOne(root), 'バックドア（IVm7 → ♭VII7）': [set.IVm7, set['♭VII7'], tonic] },
      explainOf: (chords) => chords.map(c).join(' → ')
    });
  },
  relatedTwo({ roots }) {
    const dominant = makeChord(parseNote(pick(roots)), '7');
    const two = makeChord(addInterval(dominant.root, 'P5'), 'm7');
    const target = addInterval(dominant.root, 'P4');
    return makeQuestion({
      prompt: `${c(dominant)} と組になるリレイテッドIIm7は？`, correct: c(two),
      wrong: [c(makeChord(addInterval(dominant.root, 'M2'), 'm7')), c(makeChord(target, 'm7')), c(makeChord(two.root, 'm7b5'))],
      explain: `${c(dominant)} の行き先 ${n(target)} から見たIIm7が ${c(two)}。ルートは ${c(dominant)} の完全5度上です。`,
      columns: [chordColumn(two), chordColumn(dominant)]
    });
  },
  chain({ keys }) {
    const root = keyRoot(keys);
    const scale = majorScale(root);
    const chords = [makeChord(scale[2], 'm7'), makeChord(scale[5], '7'), makeChord(scale[1], 'm7'), makeChord(scale[4], '7'), makeChord(root, 'maj7')];
    return fillBlank({
      prompt: `キー${n(root)} のツーファイブの連鎖。？に入るコードは？`, chords, blankFrom: 0,
      explain: `m7 → 7 の組が、完全5度ずつ下がりながら続きます：${line(chords)}`
    });
  },
  ninthEar({ roots }) {
    const root = parseNote(pick(roots));
    return earPair({
      prompt: '聴こえたのは 7(9)？ 7(♭9)？',
      options: { '7(9)': [makeChord(root, '9')], '7(♭9)': [makeChord(root, '7b9')] },
      explainOf: ([chord]) => `${c(chord)} ＝ ${spell(chordNotes(chord))}`
    });
  },
  resolveTension({ keys }) {
    const root = keyRoot(keys);
    const dominant = makeChord(addInterval(root, 'P5'), '7');
    const isMinor = Math.random() < 0.5;
    const tonic = makeChord(root, isMinor ? 'm7' : 'maj7');
    const pair = (codes) => codes.map((x) => n(addInterval(dominant.root, x))).join('・');
    const natural = pair(['M9', 'M13']);
    const altered = pair(['m9', 'm13']);
    const tensions = (isMinor ? ['m9', 'm13'] : ['M9', 'M13']).map((x) => addInterval(dominant.root, x));
    return makeQuestion({
      prompt: `${c(dominant)} → ${c(tonic)}。${c(dominant)} に自然に合うテンションの組は？`,
      correct: isMinor ? altered : natural, wrong: [isMinor ? natural : altered],
      explain: isMinor ? `マイナーへ解決するときは ♭9th・♭13th（${altered}）。キーの音とそろいます。` : `メジャーへ解決するときは 9th・13th（${natural}）。キーの音とそろいます。`,
      // 解説で名前を出すテンションを譜面にも載せ、文と楽譜を一致させる
      columns: [{ notes: [...chordNotes(dominant), ...tensions], chord: dominant }, chordColumn(tonic)]
    });
  },
  coltrane({ keys }) {
    const root = keyRoot(keys);
    // 長3度ずつ下がる3つのキー。それぞれの前に、そのキーのV7を置く
    const second = addInterval(root, 'm6');
    const third = addInterval(root, 'M3');
    const fiveOf = (key) => makeChord(addInterval(key, 'P5'), '7');
    const chords = [makeChord(root, 'maj7'), fiveOf(second), makeChord(second, 'maj7'), fiveOf(third), makeChord(third, 'maj7')];
    return fillBlank({
      prompt: `${n(root)} から始まるコルトレーン・チェンジ。？に入るコードは？`, chords, blankFrom: 1,
      explain: `${n(root)}・${n(second)}・${n(third)} と長3度ずつ下がる3つのキーを、V7 → Imaj7 でつなぎます：${line(chords)}`
    });
  }
};

// 上にのせる三和音が下のコードと重ならないよう、いちばん上の音より高くなるまでオクターブを上げる
function placeAbove(notes, top) {
  const shift = Math.max(0, Math.ceil((diatonicIndex(top) + 1 - diatonicIndex(notes[0])) / 7));
  return notes.map((x) => ({ ...x, octave: x.octave + shift }));
}

// 7のコードの上にのせる三和音（ルートからの音程）と、それで加わる音
const UPPER_TRIADS = [
  { interval: 'M2', added: '9th・♯11th・13th' },
  { interval: 'm6', added: '♭13th・ルート・♯9th' },
  { interval: 'M6', added: '13th・♭9th・3度' },
  { interval: 'd5', added: '♯11th・7度・♭9th' }
];

function upperStructure(roots) {
  const dominant = makeChord(parseNote(pick(roots)), '7');
  const shell = [0, 1, 3].map((i) => chordNotes(dominant)[i]);
  const entries = UPPER_TRIADS.map((x) => ({ ...x, triad: makeChord(addInterval(dominant.root, x.interval), '') }));
  const answer = pick(entries);
  const columns = [{ notes: [...shell, ...placeAbove(chordNotes(answer.triad), shell[2])], chord: dominant }];
  return { dominant, entries, answer, columns };
}

const CLICHE = ['m', 'mMaj7', 'm7', 'm6'];

const developGenerators = {
  susFour({ roots }) {
    const sus = makeChord(parseNote(pick(roots)), '7sus4');
    const dominant = makeChord(sus.root, '7');
    const fourth = addInterval(sus.root, 'P4');
    const third = addInterval(sus.root, 'M3');
    const wrong = distinctWrong(['M3', 'P5', 'm7', 'M2'].map((x) => addInterval(sus.root, x)), fourth, 3);
    return makeQuestion({
      prompt: `${c(sus)} で、3度の代わりに入っている音は？`, correct: n(fourth), wrong: wrong.map(n),
      explain: `${c(sus)} ＝ ${spell(chordNotes(sus))}。4度の ${n(fourth)} が半音下がって3度の ${n(third)} になると ${c(dominant)} です。`,
      columns: [chordColumn(sus), chordColumn(dominant)]
    });
  },
  susAsTwo({ roots }) {
    const sus = makeChord(parseNote(pick(roots)), '7sus4');
    const two = makeChord(addInterval(sus.root, 'P5'), 'm7');
    return makeQuestion({
      prompt: `${c(sus)} の響きは、どのm7を ${n(sus.root)} の上にのせたものに近い？`, correct: c(two),
      wrong: ['M2', 'P4', 'M6'].map((x) => c(makeChord(addInterval(sus.root, x), 'm7'))),
      explain: `${c(two)}（IIm7）の音を V の ${n(sus.root)} の上で鳴らすと、ツーとファイブを一度に鳴らしたような sus4 の響きになります。`,
      columns: [chordColumn(two), chordColumn(sus)]
    });
  },
  raisedFour({ roots }) {
    const mode = pick(['lydian', 'lydianDominant']);
    const chord = makeChord(parseNote(pick(roots)), QUALITY_FOR_MODE[mode]);
    const scale = modeScale(chord.root, mode);
    const wrong = distinctWrong(['P4', 'P5', 'M3', 'M6'].map((x) => addInterval(chord.root, x)), scale[3], 3);
    return makeQuestion({
      prompt: `${n(chord.root)} の${MODES[mode].name}で、4番目の音は？`, correct: n(scale[3]), wrong: wrong.map(n),
      explain: `${MODES[mode].name}は4番目を半音上げたスケール：${spell(scale)}。${c(chord)} の♯11thがこの音です。`,
      columns: [chordColumn(chord), ...scale.map(single)]
    });
  },
  quartalStack({ roots }) {
    const root = parseNote(pick(roots));
    const stack = (codes) => codes.reduce((notes, code) => [...notes, addInterval(notes.at(-1), code)], [root]);
    const correct = stack(['P4', 'P4', 'P4']);
    const wrong = [['M3', 'm3', 'M3'], ['m3', 'M3', 'm3'], ['P4', 'M3', 'P4']].map(stack);
    return makeQuestion({
      prompt: `${n(root)} から完全4度を3つ積んだ音は？`, correct: spell(correct), wrong: wrong.map(spell),
      explain: `${spell(correct)}。どの隣り合う音も完全4度なので、調がはっきりしない、浮遊した響きになります。`,
      columns: [{ notes: correct, chord: null }]
    });
  },
  quartalEar({ roots }) {
    const root = parseNote(pick(roots));
    const fourths = [root, ...[1, 2, 3].map((i) => transpose(root, i * 3, i * 5))];
    const options = { '4度積み': fourths, '3度積み（m7）': chordNotes(makeChord(root, 'm7')) };
    const [answer, other] = shuffle(Object.keys(options));
    return makeQuestion({
      prompt: '聴こえたのは 4度積み？ 3度積み？', correct: answer, wrong: [other],
      explain: `${answer}：${spell(options[answer])}`,
      columns: [{ notes: options[answer], chord: null }], ear: true
    });
  },
  upperTensions({ roots }) {
    const { dominant, entries, answer, columns } = upperStructure(roots);
    return makeQuestion({
      prompt: `${c(dominant)} の上に ${c(answer.triad)} の三和音をのせると、加わる音は？`, correct: answer.added,
      wrong: entries.filter((x) => x !== answer).map((x) => x.added),
      explain: `${c(answer.triad)} ＝ ${spell(chordNotes(answer.triad))}。${c(dominant)} から見ると ${answer.added} です。`,
      columns
    });
  },
  upperTriad({ roots }) {
    const { dominant, entries, answer, columns } = upperStructure(roots);
    return makeQuestion({
      prompt: `${c(dominant)} に ${answer.added} を足したい。上にのせる三和音は？`, correct: c(answer.triad),
      wrong: entries.filter((x) => x !== answer).map((x) => c(x.triad)),
      explain: `${c(answer.triad)}（${spell(chordNotes(answer.triad))}）をのせると、${answer.added} が加わります。`,
      columns
    });
  },
  cliche({ roots }) {
    const root = parseNote(pick(roots));
    const chords = CLICHE.map((q) => makeChord(root, q));
    const k = 1 + Math.floor(Math.random() * 3);
    const shown = chords.map((x, i) => (i === k ? '？' : c(x))).join(' → ');
    const moving = [root, ...['M7', 'm7', 'M6'].map((x) => addInterval(root, x))].map((x, i) => (i === 0 ? { ...x, octave: x.octave + 1 } : x));
    return makeQuestion({
      prompt: `ラインクリシェ。？に入るコードは？　${shown}`, correct: c(chords[k]),
      wrong: chords.filter((_, i) => i !== k).map(c),
      explain: `${line(chords)}。動く声部が ${spell(moving)} と半音ずつ下がります。`,
      columns: chords.map(chordColumn)
    });
  }
};

// スケールの特徴をひと言で添えて、覚える手がかりにする
const SCALE_HINT = {
  dorian: 'ナチュラルマイナーの6番目を半音上げた形',
  mixolydian: 'メジャースケールの7番目を半音下げた形',
  lydianDominant: 'ミクソリディアンの4番目を半音上げた形',
  melodicMinor: 'ドリアンの7番目を半音上げた形',
  altered: 'ルート・3度・7度以外をすべて半音ずらした形',
  halfWhole: '半音・全音を交互にくり返す8音の形',
  wholeTone: '全音だけでできた6音の形'
};

// 7のコードで使いたいテンションと、それを含むスケール
const DOMINANT_SCALES = {
  mixolydian: ['M9', 'M13'],
  lydianDominant: ['M9', 'A11', 'M13'],
  halfWhole: ['m9', 'A9', 'M13'],
  altered: ['m9', 'A9', 'm13'],
  wholeTone: ['M9', 'A11', 'A5']
};
const tensionLabel = (codes) => codes.map((x) => (x === 'A5' ? '♯5' : INTERVALS[x].name)).join('・');

// 求めるテンションをすべて含むスケールは正解とも言えるので、不正解の選択肢から外す
function containsAll(root, mode, codes) {
  const pitches = new Set(modeScale(root, mode).map((x) => noteToMidi(x) % 12));
  return codes.every((x) => pitches.has(noteToMidi(addInterval(root, x)) % 12));
}

const applyGenerators = {
  whichScale({ roots, modes, quality }) {
    const mode = pick(modes);
    const chord = makeChord(parseNote(pick(roots)), quality);
    const scale = modeScale(chord.root, mode);
    return makeQuestion({
      prompt: `${c(chord)} の上で ${spell(scale)}。このスケールは？`, correct: MODES[mode].name,
      wrong: modes.filter((x) => x !== mode).map((x) => MODES[x].name),
      explain: `${MODES[mode].name}は${SCALE_HINT[mode]}です。`,
      columns: [chordColumn(chord), ...scale.map(single)]
    });
  },
  notInScale({ roots, mode, quality, outside }) {
    const chord = makeChord(parseNote(pick(roots)), quality);
    const scale = modeScale(chord.root, mode);
    const answer = addInterval(chord.root, pick(outside));
    const wrong = distinctWrong(scale.slice(1), answer, 3);
    return makeQuestion({
      prompt: `${n(chord.root)} の${MODES[mode].name}に含まれない音は？`, correct: n(answer), wrong: wrong.map(n),
      explain: `${n(chord.root)} の${MODES[mode].name}：${spell(scale)}。${n(answer)} は含まれません。`,
      columns: [chordColumn(chord), ...scale.map(single)]
    });
  },
  tensionToScale({ roots }) {
    const mode = pick(Object.keys(DOMINANT_SCALES));
    const chord = makeChord(parseNote(pick(roots)), '7');
    const scale = modeScale(chord.root, mode);
    const codes = DOMINANT_SCALES[mode];
    const others = Object.keys(DOMINANT_SCALES).filter((x) => x !== mode && !containsAll(chord.root, x, codes));
    const wrong = shuffle(others).slice(0, 3);
    return makeQuestion({
      prompt: `${c(chord)} で ${tensionLabel(codes)} を使いたい。合うスケールは？`, correct: MODES[mode].name,
      wrong: wrong.map((x) => MODES[x].name),
      explain: `${MODES[mode].name}（${SCALE_HINT[mode]}）：${spell(scale)}`,
      columns: [chordColumn(chord), ...scale.map(single)]
    });
  }
};

// アボイドノート：コードの音の半音上にぶつかるスケールの音（clashはぶつかる相手のコードの音の番号）
const AVOID = {
  maj7: { mode: 'ionian', avoid: 'P4', clash: 1 },
  7: { mode: 'mixolydian', avoid: 'P4', clash: 1 },
  m7b5: { mode: 'locrian', avoid: 'm2', clash: 0 }
};

// ビバップ・スケールは元のスケールに経過音を1つ足したもの
const BEBOP = {
  bebopDominant: { base: 'mixolydian', added: 'M7', quality: '7' },
  bebopMajor: { base: 'ionian', added: 'A5', quality: 'maj7' }
};

// コードのルートから見て、どこのメジャー・ペンタトニックを弾くとどの響きになるか
const PENTA_OVER = [
  { quality: 'maj7', interval: 'M2', sound: '♯11th' },
  { quality: '7', interval: 'd5', sound: 'オルタード（♭9th・♯9th・♯11th・♭13th）' }
];

// ベース音の上にのせる三和音（ベースからの音程）と、全体の響き
const SLASH = [
  { interval: 'm7', sound: '9sus4' },
  { interval: 'M2', sound: 'リディアン（♯11th）' },
  { interval: 'm3', sound: 'm7' },
  { interval: 'm2', sound: 'フリジアン（sus4・♭9th）' }
];

function slashVoicing(roots) {
  const root = parseNote(pick(roots));
  const bass = { ...placeRoot(root), octave: placeRoot(root).octave - 1 };
  const answer = pick(SLASH);
  const triad = makeChord(addInterval(root, answer.interval), '');
  const columns = [{ notes: [bass, ...placeAbove(chordNotes(triad), bass)], chord: null }];
  return { bass, triad, answer, columns, label: `${c(triad)}/${n(bass)}` };
}

// 密集して積んだ4音（転回形も）と、上から2番目を1オクターブ下げたドロップ2
function drop2Voicing(roots, qualities) {
  const chord = randomChord(roots, qualities);
  const tones = chordNotes(chord);
  const k = Math.floor(Math.random() * 4);
  const close = [...tones.slice(k), ...tones.slice(0, k).map((x) => ({ ...x, octave: x.octave + 1 }))];
  const dropped = { ...close[2], octave: close[2].octave - 1 };
  return { chord, close, drop: [dropped, close[0], close[1], close[3]] };
}

const masteryGenerators = {
  avoidNote({ roots, qualities }) {
    const chord = randomChord(roots, qualities);
    const rule = AVOID[chord.quality];
    const scale = modeScale(chord.root, rule.mode);
    const answer = addInterval(chord.root, rule.avoid);
    const clash = chordNotes(chord)[rule.clash];
    return makeQuestion({
      prompt: `${c(chord)}（${MODES[rule.mode].name}）で、アボイドノートは？`, correct: n(answer),
      wrong: distinctWrong([1, 3, 5].map((i) => scale[i]), answer, 2).map(n),
      explain: `${n(answer)} はコードの音 ${n(clash)} の半音上でぶつかります。長く伸ばさず、経過音として使います。`,
      columns: [chordColumn(chord), ...scale.map(single)]
    });
  },
  passingTone({ roots, modes }) {
    const mode = pick(modes);
    const rule = BEBOP[mode];
    const chord = makeChord(parseNote(pick(roots)), rule.quality);
    const answer = addInterval(chord.root, rule.added);
    const wrong = distinctWrong(['m2', 'm3', 'd5', 'm6', 'M7', 'A5'].map((x) => addInterval(chord.root, x)), answer, 3);
    return makeQuestion({
      prompt: `${n(chord.root)} の${MODES[mode].name}で、${MODES[rule.base].name}に足された経過音は？`, correct: n(answer),
      wrong: wrong.map(n),
      explain: `${spell(modeScale(chord.root, mode))}。8音にすると、ルートから下りたときコードの音が拍の頭にそろいます。`,
      columns: [chordColumn(chord), ...modeScale(chord.root, mode).map(single)]
    });
  },
  pentaOver({ roots }) {
    const entry = pick(PENTA_OVER);
    const chord = makeChord(parseNote(pick(roots)), entry.quality);
    const answer = addInterval(chord.root, entry.interval);
    const penta = modeScale(answer, 'majorPentatonic');
    return makeQuestion({
      prompt: `${c(chord)} で ${entry.sound} の響きを出したい。どの音から始まるメジャー・ペンタトニック？`, correct: n(answer),
      wrong: [chord.root, ...['P4', 'P5'].map((x) => addInterval(chord.root, x))].map(n),
      explain: `${n(answer)} のメジャー・ペンタトニック：${spell(penta)}。${c(chord)} から見ると ${entry.sound} が入ります。`,
      columns: [chordColumn(chord), ...penta.map(single)]
    });
  },
  slashSound({ roots }) {
    const { triad, answer, columns, label } = slashVoicing(roots);
    return makeQuestion({
      prompt: `${label}（ベースの上に ${c(triad)} の三和音）。どんな響き？`, correct: answer.sound,
      wrong: SLASH.filter((x) => x !== answer).map((x) => x.sound),
      explain: `${spell(columns[0].notes)}。ベースから見ると ${answer.sound} の響きです。`,
      columns
    });
  },
  slashName({ roots }) {
    const { bass, triad, answer, columns, label } = slashVoicing(roots);
    const others = SLASH.filter((x) => x !== answer).map((x) => `${c(makeChord(addInterval(bass, x.interval), ''))}/${n(bass)}`);
    return makeQuestion({
      prompt: `${n(bass)} の ${answer.sound} の響きを、スラッシュコードで書くと？`, correct: label, wrong: others,
      explain: `${c(triad)}（${spell(chordNotes(triad))}）を ${n(bass)} の上にのせます。`,
      columns
    });
  },
  drop2Bottom({ roots, qualities }) {
    const { chord, close, drop } = drop2Voicing(roots, qualities);
    return makeQuestion({
      prompt: `${c(chord)} を ${spell(close)}（下から）と積んだ。ドロップ2にすると、いちばん下の音は？`, correct: n(drop[0]),
      wrong: distinctWrong(close, drop[0], 3).map(n),
      explain: `上から2番目の ${n(drop[0])} を1オクターブ下げて、${spell(drop)}。`,
      columns: [{ notes: close, chord }, { notes: drop, chord }]
    });
  },
  drop2Ear({ roots, qualities }) {
    const { chord, close, drop } = drop2Voicing(roots, qualities);
    const options = { 'クローズ（密集）': close, 'ドロップ2': drop };
    const [answer, other] = shuffle(Object.keys(options));
    return makeQuestion({
      prompt: '聴こえたのは クローズ？ ドロップ2？', correct: answer, wrong: [other],
      explain: `${c(chord)} の${answer}：${spell(options[answer])}`,
      columns: [{ notes: options[answer], chord }], ear: true
    });
  }
};

// ソー・ホワット・ヴォイシング：ルートから完全4度を3つ、いちばん上だけ長3度
const SO_WHAT = ['P4', 'P4', 'P4', 'M3'];
const stackFrom = (root, codes) => codes.reduce((notes, code) => [...notes, addInterval(notes.at(-1), code)], [root]);

// ずらした先のドリアンに♯♯や♭♭が出ないよう、2通りの綴り（例：D♭とC♯）から読みやすいほうを選ぶ
function slipRoot(root, up) {
  const spellings = up ? [addInterval(root, 'm2'), addInterval(root, 'A1')] : [transpose(root, -1, -1), transpose(root, 0, -1)];
  return spellings.find((x) => modeScale(x, 'dorian').every(isPlain)) ?? spellings[0];
}

// 書きかえの技ごとに、元の進行と書きかえた進行を[キーからの音程, コードの種類]で持つ（nullはキーの音）
const REHARMS = {
  '裏コード': [[['M2', 'm7'], ['P5', '7'], [null, 'maj7']], [['M2', 'm7'], ['m2', '7'], [null, 'maj7']]],
  'セカンダリー・ドミナント': [[[null, 'maj7'], ['M6', 'm7'], ['M2', 'm7'], ['P5', '7']], [[null, 'maj7'], ['M6', '7'], ['M2', 'm7'], ['P5', '7']]],
  'パッシング・ディミニッシュ': [[[null, 'maj7'], [null, 'maj7'], ['M2', 'm7'], ['P5', '7']], [[null, 'maj7'], ['A1', 'dim7'], ['M2', 'm7'], ['P5', '7']]],
  'バックドア': [[['M2', 'm7'], ['P5', '7'], [null, 'maj7']], [['P4', 'm7'], ['m7', '7'], [null, 'maj7']]]
};
const REHARM_HINT = {
  '裏コード': 'V7 を、減5度離れた同じ3度・7度をもつ7のコードに置きかえました。',
  'セカンダリー・ドミナント': '次のコードへ向かう7のコードに変えて、引っぱる力を強めました。',
  'パッシング・ディミニッシュ': '2つのコードの間に、ベースが半音で上がる dim7 をはさみました。',
  'バックドア': 'IIm7 → V7 の代わりに、IVm7 → ♭VII7 から I へ戻りました。'
};
const fromKey = (key, [interval, quality]) => makeChord(interval ? addInterval(key, interval) : key, quality);

const masterGenerators = {
  soWhatTop({ roots }) {
    const chord = makeChord(parseNote(pick(roots)), 'm7');
    const notes = stackFrom(chord.root, SO_WHAT);
    return makeQuestion({
      prompt: `${c(chord)} のソー・ホワット・ヴォイシング。${spell(notes.slice(0, 4))} の上にのせる音は？`, correct: n(notes[4]),
      wrong: distinctWrong(['P4', 'm3', 'm2'].map((x) => addInterval(notes[3], x)), notes[4], 3).map(n),
      explain: `いちばん上だけ長3度：${spell(notes)}。${c(chord)} の5度が上にきて、マイナーの響きがはっきりします。`,
      columns: [{ notes, chord }]
    });
  },
  soWhatStack({ roots }) {
    const chord = makeChord(parseNote(pick(roots)), 'm7');
    const notes = stackFrom(chord.root, SO_WHAT);
    const wrong = [['P4', 'P4', 'P4', 'P4'], ['m3', 'M3', 'm3', 'M3'], ['M3', 'P4', 'P4', 'P4']].map((x) => spell(stackFrom(chord.root, x)));
    return makeQuestion({
      prompt: `${c(chord)} のソー・ホワット・ヴォイシングは？（下から）`, correct: spell(notes), wrong,
      explain: `${n(chord.root)} から完全4度を3つ、最後に長3度：${spell(notes)}。`,
      columns: [{ notes, chord }]
    });
  },
  sideSlip({ roots }) {
    const chord = makeChord(parseNote(pick(roots)), 'm7');
    const up = Math.random() < 0.5;
    const answer = makeChord(slipRoot(chord.root, up), 'm7');
    const others = [slipRoot(chord.root, !up), addInterval(chord.root, 'M2'), transpose(chord.root, -1, -2)];
    return makeQuestion({
      prompt: `${c(chord)} の上で、ドリアンを${up ? '半音上' : '半音下'}にずらして弾く。どのm7のドリアン？`, correct: c(answer),
      wrong: others.map((x) => c(makeChord(x, 'm7'))),
      explain: `${c(answer)} のドリアン：${spell(modeScale(answer.root, 'dorian'))}。わざと外して、${c(chord)} に戻ると緊張がほどけます。`,
      columns: [chordColumn(chord), ...modeScale(answer.root, 'dorian').map(single)]
    });
  },
  slipEar({ roots }) {
    const chord = makeChord(parseNote(pick(roots)), 'm7');
    const options = {
      'インサイド（内側）': modeScale(chord.root, 'dorian'),
      'アウトサイド（半音上）': modeScale(slipRoot(chord.root, true), 'dorian')
    };
    const [answer, other] = shuffle(Object.keys(options));
    return makeQuestion({
      prompt: `${c(chord)} のあとのフレーズは インサイド？ アウトサイド？`, correct: answer, wrong: [other],
      explain: `${answer}：${spell(options[answer])}`,
      columns: [chordColumn(chord), ...options[answer].map(single)], ear: true
    });
  },
  reharmName({ keys }) {
    const name = pick(Object.keys(REHARMS));
    const key = keyRoot(keys);
    const [before, after] = REHARMS[name].map((list) => list.map((x) => fromKey(key, x)));
    return makeQuestion({
      prompt: `${line(before)} を ${line(after)} に書きかえた。使った技は？`, correct: name,
      wrong: Object.keys(REHARMS).filter((x) => x !== name),
      explain: REHARM_HINT[name],
      columns: after.map(chordColumn)
    });
  }
};

// 1音ずつ、前の音より高く1オクターブ以内になるよう積む（ヴォイシングを下から順に並べるため）
function stackUp(notes) {
  return notes.reduce((result, note) => {
    if (result.length === 0) return [note];
    const previous = noteToMidi(result.at(-1));
    let x = { ...note };
    while (noteToMidi(x) <= previous) x = { ...x, octave: x.octave + 1 };
    while (noteToMidi(x) - previous > 12) x = { ...x, octave: x.octave - 1 };
    return [...result, x];
  }, []);
}

// ルートレス・ヴォイシングの4音。7のコードは5度の代わりに13thを使う
const ROOTLESS = { maj7: ['M3', 'P5', 'M7', 'M9'], m7: ['m3', 'P5', 'm7', 'M9'], 7: ['M3', 'M13', 'm7', 'M9'] };
const rotate = (list, k) => [...list.slice(k), ...list.slice(0, k)];

function rootless(chord, form) {
  const tones = ROOTLESS[chord.quality].map((x) => addInterval(chord.root, x));
  return stackUp(form === 'A' ? tones : rotate(tones, 2));
}

// コードとスケールごとのトライアド・ペア（ルートからの音程。nullはルート）
const TRIAD_PAIRS = [
  { quality: 'm7', scale: 'ドリアン', intervals: ['m3', 'P4'] },
  { quality: 'maj7', scale: 'リディアン', intervals: [null, 'M2'] },
  { quality: '7', scale: 'オルタード', intervals: ['d5', 'm6'] }
];
const pairTriads = (root, intervals) => intervals.map((x) => makeChord(x ? addInterval(root, x) : root, ''));
const pairLabel = (triads) => triads.map(c).join(' と ');

// 同主短調から借りるコード（キーからの音程とコードの種類）と、もとのダイアトニック・コード
const BORROWED = [
  { roman: '♭IIImaj7', borrowed: ['m3', 'maj7'], diatonic: ['M3', 'm7'] },
  { roman: '♭VImaj7', borrowed: ['m6', 'maj7'], diatonic: ['M6', 'm7'] },
  { roman: '♭VII7', borrowed: ['m7', '7'], diatonic: ['M7', 'm7b5'] },
  { roman: 'IVm7', borrowed: ['P4', 'm7'], diatonic: ['P4', 'maj7'] },
  { roman: 'IIm7♭5', borrowed: ['M2', 'm7b5'], diatonic: ['M2', 'm7'] }
];

// 狙う音を、上はスケールの隣の音、下は半音下の音ではさむ
function enclosure(roots, qualities) {
  const chord = randomChord(roots, qualities);
  const target = fitRange(chordNotes(chord)[pick([1, 2])]);
  const step = modeScale(chord.root, SCALE_FOR[chord.quality]).find((x) => x.letter === (target.letter + 1) % 7);
  const above = transpose(target, 1, (noteToMidi(step) - noteToMidi(target) + 12) % 12);
  // 狙う音に♯がつくと半音下が♯♯になるので、そのときは同じ文字のナチュラルで書く
  const below = [transpose(target, -1, -1), transpose(target, 0, -1)].find(isPlain);
  return { chord, target, above, below, columns: [chordColumn(chord), ...[above, below, target].map(single)] };
}

// メロディの下に残り3つのコードの音をすき間なく並べ、いちばん下にメロディをオクターブ下で重ねる
function blockVoicing(roots, qualities) {
  const chord = randomChord(roots, qualities);
  const tones = chordNotes(chord);
  const k = Math.floor(Math.random() * 4);
  const melody = { ...tones[k], octave: tones[k].octave + 1 };
  const inner = [1, 2, 3].map((i) => tones[(k - i + 4) % 4]).map((x) => {
    let y = { ...x };
    while (noteToMidi(y) >= noteToMidi(melody)) y = { ...y, octave: y.octave - 1 };
    while (noteToMidi(melody) - noteToMidi(y) > 12) y = { ...y, octave: y.octave + 1 };
    return y;
  });
  const double = { ...melody, octave: melody.octave - 1 };
  return { chord, melody, inner, notes: [double, ...[...inner].reverse(), melody] };
}

const secretGenerators = {
  rootlessForm({ roots, qualities }) {
    const chord = randomChord(roots, qualities);
    const form = pick(['A', 'B']);
    const voicing = rootless(chord, form);
    const wrong = [rootless(chord, form === 'A' ? 'B' : 'A'), stackUp(chordNotes(chord)), stackUp(rotate(ROOTLESS[chord.quality].map((x) => addInterval(chord.root, x)), 1))];
    return makeQuestion({
      prompt: `${c(chord)} の${form}型ルートレス・ヴォイシングは？（下から）`, correct: spell(voicing), wrong: wrong.map(spell),
      explain: `${form === 'A' ? '3度' : '7度'}から積み、ルートを省いて9thを入れます${chord.quality === '7' ? '（7のコードは5度の代わりに13th）' : ''}：${spell(voicing)}`,
      columns: [{ notes: voicing, chord }]
    });
  },
  rootlessMove({ keys }) {
    const [two, five] = twoFiveOne(keyRoot(keys));
    const a = rootless(two, 'A');
    // キーによってルートのオクターブが違うので、Vの和音をIIの和音と同じ高さにそろえる
    const raw = rootless(five, 'B');
    const shift = Math.round((noteToMidi(a[0]) - noteToMidi(raw[0])) / 12);
    const b = raw.map((x) => ({ ...x, octave: x.octave + shift }));
    const pairs = a.map((x, i) => [x, b[i]]);
    const moving = pairs.find(([x, y]) => noteToMidi(x) !== noteToMidi(y));
    const wrong = pairs.filter((p) => p !== moving).map(([x]) => `${n(x)} → ${n(transpose(x, -1, -2))}`);
    return makeQuestion({
      prompt: `${c(two)}（A型）→ ${c(five)}（B型）。動く音は1つだけ。どれ？`, correct: `${n(moving[0])} → ${n(moving[1])}`, wrong,
      explain: `${spell(a)} → ${spell(b)}。${c(two)} の7度が半音下がって ${c(five)} の3度になり、ほかの3音はそのまま残ります。`,
      columns: [{ notes: a, chord: two }, { notes: b, chord: five }]
    });
  },
  triadPair({ roots }) {
    const entry = pick(TRIAD_PAIRS);
    const chord = makeChord(parseNote(pick(roots)), entry.quality);
    const triads = pairTriads(chord.root, entry.intervals);
    const others = [...TRIAD_PAIRS.filter((x) => x !== entry).map((x) => x.intervals), ['P5', 'M6']];
    return makeQuestion({
      prompt: `${c(chord)}（${entry.scale}）で使うトライアド・ペアは？`, correct: pairLabel(triads),
      wrong: others.map((x) => pairLabel(pairTriads(chord.root, x))),
      explain: `${triads.map((t) => `${c(t)}（${spell(chordNotes(t))}）`).join('と')}。音の重ならない2つの三和音の6音が、すべて${entry.scale}の音です。`,
      columns: [chordColumn(chord), ...triads.map(chordColumn)]
    });
  },
  triadPairScale({ roots }) {
    const entry = pick(TRIAD_PAIRS);
    const chord = makeChord(parseNote(pick(roots)), entry.quality);
    const triads = pairTriads(chord.root, entry.intervals);
    return makeQuestion({
      prompt: `${c(chord)} の上で ${pairLabel(triads)} を交互に弾く。どのスケールの響き？`, correct: entry.scale,
      wrong: ['ドリアン', 'リディアン', 'オルタード', 'ミクソリディアン'].filter((x) => x !== entry.scale).slice(0, 3),
      explain: `${spell(triads.flatMap(chordNotes))}。${c(chord)} から見ると${entry.scale}の音です。`,
      columns: [chordColumn(chord), ...triads.map(chordColumn)]
    });
  },
  enclosureTarget({ roots, qualities }) {
    const { chord, target, above, below, columns } = enclosure(roots, qualities);
    return makeQuestion({
      prompt: `${c(chord)} で ${n(above)}・${n(below)} と弾いた。はさまれて狙われている音は？`, correct: n(target),
      wrong: distinctWrong([above, below, ...chordNotes(chord)], target, 3).map(n),
      explain: `上の ${n(above)}（スケールの音）と下の ${n(below)}（半音下）で ${n(target)} をはさむのがエンクロージャー。狙った音が強く聴こえます。`,
      columns
    });
  },
  enclosureBelow({ roots, qualities }) {
    const { chord, target, above, below, columns } = enclosure(roots, qualities);
    return makeQuestion({
      prompt: `${c(chord)} の ${n(target)} をエンクロージャーで狙う。上は ${n(above)}。下からはさむ音は？`, correct: n(below),
      wrong: distinctWrong([transpose(target, -1, -2), above, target, transpose(target, -2, -3)], below, 3).map(n),
      explain: `下は半音下の ${n(below)}。${n(above)} → ${n(below)} → ${n(target)} と進みます。`,
      columns
    });
  },
  borrowedChord({ keys }) {
    const key = keyRoot(keys);
    const entry = pick(BORROWED);
    const answer = fromKey(key, entry.borrowed);
    const candidates = [fromKey(key, entry.diatonic), ...['maj7', '7', 'm7'].map((q) => makeChord(answer.root, q))].map(c);
    const wrong = [...new Set(candidates)].filter((x) => x !== c(answer)).slice(0, 3);
    return makeQuestion({
      prompt: `キー ${n(key)} のメジャーで、同主短調（${n(key)} マイナー）から借りた ${entry.roman} は？`, correct: c(answer), wrong,
      explain: `${n(key)} マイナーのダイアトニック・コードを借りています。ふつうは ${c(fromKey(key, entry.diatonic))} の場所に、一瞬かげりがさします。`,
      columns: [chordColumn(answer)]
    });
  },
  borrowedRoman({ keys }) {
    const key = keyRoot(keys);
    const entry = pick(BORROWED);
    const answer = fromKey(key, entry.borrowed);
    return makeQuestion({
      prompt: `キー ${n(key)} の曲に ${c(answer)} が出てきた。同主短調から借りた何のコード？`, correct: entry.roman,
      wrong: shuffle(BORROWED.filter((x) => x !== entry)).slice(0, 3).map((x) => x.roman),
      explain: `${c(answer)} はキー ${n(key)} の ${entry.roman}。${n(key)} マイナーから借りたコードです。`,
      columns: [chordColumn(fromKey(key, [null, 'maj7'])), chordColumn(answer)]
    });
  },
  blockInner({ roots, qualities }) {
    const { chord, melody, inner, notes } = blockVoicing(roots, qualities);
    return makeQuestion({
      prompt: `メロディ ${n(melody)} に ${c(chord)} のブロック・コードをつける。メロディのすぐ下の音は？`, correct: n(inner[0]),
      wrong: distinctWrong([inner[1], inner[2], melody], inner[0], 3).map(n),
      explain: `上から ${spell([...notes].reverse())}。メロディの下にコードの音をすき間なく並べ、いちばん下でメロディを重ねます。`,
      columns: [{ notes, chord }]
    });
  },
  blockBottom({ roots, qualities }) {
    const { chord, melody, inner, notes } = blockVoicing(roots, qualities);
    return makeQuestion({
      prompt: `メロディ ${n(melody)} に ${c(chord)} のブロック・コード。いちばん下で鳴らす音は？`, correct: n(notes[0]),
      wrong: distinctWrong(inner, melody, 3).map(n),
      explain: `いちばん下はメロディと同じ ${n(melody)} を1オクターブ下で。メロディが太く聴こえます：${spell(notes)}`,
      columns: [{ notes, chord }]
    });
  }
};

// ペダルの音を低く置き、その上にコードの音を積む
const overPedal = (pedal, chord) => ({ notes: stackUp([{ ...pedal, octave: 3 }, ...chordNotes(chord)]), chord });
const diatonicChords = (key) => majorScale(key).map((root, i) => makeChord(root, DIATONIC[i].quality));
const PEDAL_SETS = { tonic: { name: 'トニック', degrees: [0, 1, 0] }, dominant: { name: 'ドミナント', degrees: [1, 3, 4] } };

// 同じ種類のコードを動かす幅（下がる幅はup: false）
const CONSTANT_MOVES = [
  { code: 'm3', up: false, label: '短3度下' },
  { code: 'M3', up: false, label: '長3度下' },
  { code: 'm2', up: false, label: '半音下' },
  { code: 'M2', up: true, label: '全音上' }
];
// 同じ幅で動かし続けると♯や♭がたまっていくので、同じ高さの綴り（文字を1つ前後）から読みやすいものを選ぶ
function moveRoot(root, move, quality) {
  const { letters, semitones } = INTERVALS[move.code];
  const moved = move.up ? transpose(root, letters, semitones) : transpose(root, -letters, -semitones);
  const options = [0, -1, 1].map((k) => transpose(moved, k, 0)).filter((x) => chordNotes(makeChord(x, quality)).every(isPlain));
  return options.sort((a, b) => spellingCost(a) - spellingCost(b))[0] ?? moved;
}

// 3つのルートがどれも読みやすい綴り（C♭やE♯を含まない）になるまで選び直す
function constantChain(roots) {
  for (;;) {
    const move = pick(CONSTANT_MOVES);
    const quality = pick(['maj7', 'm7']);
    const first = parseNote(pick(roots));
    const second = moveRoot(first, move, quality);
    const chain = [first, second, moveRoot(second, move, quality)];
    if (chain.every((x) => spellingCost(x) <= 3)) return { move, quality, chain };
  }
}

// E♯・B♯・F♭・C♭は記譜ごとに見ても読みにくいので、♯♭の数に加えて重く数える
function spellingCost(note) {
  return Object.keys(NOTATIONS).reduce((sum, key) => {
    const x = toWritten(note, key);
    const odd = (x.acc === 1 && (x.letter === 2 || x.letter === 6)) || (x.acc === -1 && (x.letter === 0 || x.letter === 3));
    return sum + Math.abs(x.acc) + (odd ? 3 : 0);
  }, 0);
}

// パターンの数字をコードの音程に。3度と7度はコードの種類で変わる
const DIGITAL_PATTERNS = { '1-2-3-5': ['1', '2', '3', '5'], '1-3-5-7': ['1', '3', '5', '7'], '3-5-7-9': ['3', '5', '7', '9'], '5-3-2-1': ['5', '3', '2', '1'] };
function degreeNote(chord, degree) {
  const third = chord.quality === 'm7' ? 'm3' : 'M3';
  const seventh = chord.quality === 'maj7' ? 'M7' : 'm7';
  const code = { 2: 'M2', 3: third, 5: 'P5', 7: seventh, 9: 'M9' }[degree];
  return code ? addInterval(chord.root, code) : chord.root;
}
function digitalNotes(chord, name) {
  const notes = DIGITAL_PATTERNS[name].map((d) => degreeNote(chord, d));
  return name === '5-3-2-1' ? stackUp([...notes].reverse()).reverse() : stackUp(notes);
}

// キーの主音と5度の真ん中（3度と♭3度の間）を軸に、音を鏡に映す。文字も同じ軸で折り返して綴る
function mirror(key, note) {
  const letters = (((key.letter + 4 - note.letter) % 7) + 7) % 7;
  let semitones = ((((noteToMidi(key) % 12) + 7 - (noteToMidi(note) % 12)) % 12) + 12) % 12;
  let result = transpose(key, letters, semitones);
  while (result.acc > 6) result = transpose(key, letters, (semitones -= 12));
  while (result.acc < -6) result = transpose(key, letters, (semitones += 12));
  return result;
}
// 鏡に映すと音程の並びが逆さになるので、7度を映した音が新しいルートになる
const MIRROR_QUALITY = { 7: 'm7b5', m7: 'm7', maj7: 'maj7' };
const mirrorChord = (key, chord) => makeChord(mirror(key, chordNotes(chord)[3]), MIRROR_QUALITY[chord.quality]);

const masteryPlusGenerators = {
  pedalNote({ keys }) {
    const key = keyRoot(keys);
    const set = pick(Object.values(PEDAL_SETS));
    const pedal = set === PEDAL_SETS.tonic ? key : addInterval(key, 'P5');
    const chords = set.degrees.map((i) => diatonicChords(key)[i]);
    return makeQuestion({
      prompt: `${chords.map(c).join(' → ')}。ずっと低く鳴り続けている音（ペダル）は？`, correct: n(pedal),
      wrong: distinctWrong(chords.flatMap(chordNotes), pedal, 3).map(n),
      explain: `いちばん下の ${n(pedal)} が動かず、その上でコードが変わっています（${set.name}・ペダル）。`,
      columns: chords.map((chord) => overPedal(pedal, chord))
    });
  },
  pedalDominant({ keys }) {
    const key = keyRoot(keys);
    const answer = addInterval(key, 'P5');
    return makeQuestion({
      prompt: `キー ${n(key)} でドミナント・ペダルに使う音は？`, correct: n(answer),
      wrong: distinctWrong(['P4', 'M2', 'M6', 'M3'].map((x) => addInterval(key, x)).concat([key]), answer, 3).map(n),
      explain: `キーの5度、${n(answer)}。V7のルートを伸ばし続けると、解決を待つ緊張が長く続きます。`,
      columns: diatonicChords(key).filter((_, i) => [1, 3, 4].includes(i)).map((chord) => overPedal(answer, chord))
    });
  },
  constantNext({ roots }) {
    const { move, quality, chain: [first, second, third] } = constantChain(roots);
    const answer = makeChord(third, quality);
    const others = [makeChord(third, quality === 'maj7' ? 'm7' : 'maj7'), makeChord(third, '7'), ...CONSTANT_MOVES.filter((x) => x !== move).map((x) => makeChord(moveRoot(second, x, quality), quality)).filter((x) => spellingCost(x.root) <= 3)];
    const wrong = [...new Set(others.map(c))].filter((x) => x !== c(answer)).slice(0, 3);
    return makeQuestion({
      prompt: `${c(makeChord(first, quality))} → ${c(makeChord(second, quality))} → ？ 同じ形のまま動かすと次は？`, correct: c(answer), wrong,
      explain: `${move.label}ずつ、${QUALITIES[quality].label}のまま動かしています。キーの決まりより、形のそろった響きを優先する作り方です。`,
      columns: [first, second, third].map((r) => chordColumn(makeChord(r, quality)))
    });
  },
  constantWhich({ roots }) {
    const { move, quality, chain } = constantChain(roots);
    const [first] = chain;
    const chords = chain.map((r) => makeChord(r, quality));
    const key = placeRoot(first);
    const line = (list) => list.map(c).join(' → ');
    const wrong = [line(twoFiveOne(key)), line(minorTwoFiveOne(key)), line([0, 5, 1].map((i) => diatonicChords(key)[i]))];
    return makeQuestion({
      prompt: 'コンスタント・ストラクチャーになっている進行はどれ？', correct: line(chords), wrong,
      explain: `${line(chords)} は、すべて同じ種類のコードが${move.label}ずつ動いています。ほかはキーの中のコードをつないだ進行です。`,
      columns: chords.map(chordColumn)
    });
  },
  digitalSpell({ roots, qualities }) {
    const chord = randomChord(roots, qualities);
    const name = pick(Object.keys(DIGITAL_PATTERNS));
    const notes = digitalNotes(chord, name);
    return makeQuestion({
      prompt: `${c(chord)} で ${name} のパターンを弾くと？`, correct: spell(notes),
      wrong: Object.keys(DIGITAL_PATTERNS).filter((x) => x !== name).map((x) => spell(digitalNotes(chord, x))),
      explain: `${c(chord)} の ${name}：${spell(notes)}。数字はコードのルートから数えた度数です。`,
      columns: [chordColumn(chord), ...notes.map(single)]
    });
  },
  digitalName({ roots, qualities }) {
    const chord = randomChord(roots, qualities);
    const name = pick(Object.keys(DIGITAL_PATTERNS));
    const notes = digitalNotes(chord, name);
    return makeQuestion({
      prompt: `${c(chord)} の上で ${spell(notes)}。何のパターン？`, correct: name,
      wrong: Object.keys(DIGITAL_PATTERNS).filter((x) => x !== name),
      explain: `${c(chord)} のルートから数えると ${name} です。`,
      columns: [chordColumn(chord), ...notes.map(single)]
    });
  },
  mirrorNote({ keys }) {
    const key = keyRoot(keys);
    const note = pick(majorScale(key));
    const answer = mirror(key, note);
    return makeQuestion({
      prompt: `キー ${n(key)} のネガティブ・ハーモニー。${n(note)} は鏡に映すと何の音？`, correct: n(answer),
      wrong: distinctWrong([...majorScale(key), ...majorScale(key).map((x) => transpose(x, 0, -1))], answer, 3).map(n),
      explain: `軸は ${n(key)} と ${n(addInterval(key, 'P5'))} のちょうど真ん中。${n(key)}↔${n(addInterval(key, 'P5'))} のように入れ替わり、${n(note)} は ${n(answer)} に映ります。`,
      columns: [single(fitRange(note)), single(fitRange(answer))]
    });
  },
  mirrorChordName({ keys }) {
    const key = keyRoot(keys);
    const chord = pick([1, 3, 4, 0].map((i) => diatonicChords(key)[i]));
    const answer = mirrorChord(key, chord);
    const candidates = [chord, makeChord(answer.root, '7'), makeChord(answer.root, answer.quality === 'm7' ? 'maj7' : 'm7'), makeChord(answer.root, 'm7b5')];
    const wrong = [...new Set(candidates.map(c))].filter((x) => x !== c(answer)).slice(0, 3);
    return makeQuestion({
      prompt: `キー ${n(key)} のネガティブ・ハーモニーで ${c(chord)} を鏡に映すと？`, correct: c(answer), wrong,
      explain: `${spell(chordNotes(chord))} を1音ずつ映すと ${spell(chordNotes(chord).map((x) => mirror(key, x)))}。下から並べ直すと ${c(answer)} です。`,
      columns: [chordColumn(chord), chordColumn(answer)]
    });
  },
  pivotChord({ keys }) {
    const key = keyRoot(keys);
    const other = placeRoot(addInterval(key, 'P5'));
    const a = diatonicChords(key).map(c);
    const b = diatonicChords(other).map(c);
    const shared = a.filter((x) => b.includes(x));
    const answer = pick(diatonicChords(key).filter((x) => b.includes(c(x))));
    return makeQuestion({
      prompt: `キー ${n(key)} からキー ${n(other)} へ転調する。両方のキーにあるピボット・コードは？`, correct: c(answer),
      wrong: shuffle([...a, ...b].filter((x) => !shared.includes(x))).slice(0, 3),
      explain: `両方のキーにあるのは ${shared.join('・')}。どれも、片方のキーからもう片方のキーへの橋わたしに使えます。`,
      columns: [chordColumn(answer)]
    });
  },
  pivotRoman({ keys }) {
    const key = keyRoot(keys);
    const other = placeRoot(addInterval(key, 'P5'));
    const a = diatonicChords(key);
    const b = diatonicChords(other);
    const i = pick(a.map((x, k) => k).filter((k) => b.some((y) => c(y) === c(a[k]))));
    const j = b.findIndex((y) => c(y) === c(a[i]));
    return makeQuestion({
      prompt: `${c(a[i])} はキー ${n(key)} では ${DIATONIC[i].roman}。キー ${n(other)} では？`, correct: DIATONIC[j].roman,
      wrong: shuffle(DIATONIC.filter((_, k) => k !== j && k !== i)).slice(0, 3).map((x) => x.roman),
      explain: `${c(a[i])} はキー ${n(other)} の ${DIATONIC[j].roman}。同じコードの役目を読みかえて、新しいキーに入ります。`,
      columns: [chordColumn(a[i])]
    });
  }
};

// 曲の型：[キーからの音程, コードの種類, 役目, 合うスケール]（音程nullはキーの音、スケールnullは出題しない）
const SONG_FORMS = {
  autumn: {
    minor: false,
    bars: [
      ['M2', 'm7', 'IIm7', 'dorian'], ['P5', '7', 'V7', 'mixolydian'], [null, 'maj7', 'Imaj7', 'ionian'], ['P4', 'maj7', 'IVmaj7', 'lydian'],
      ['M7', 'm7b5', 'VIIm7♭5', 'locrian'], ['M3', '7', 'III7', 'phrygianDominant'], ['M6', 'm6', 'VIm6', 'melodicMinor'], ['M6', 'm6', 'VIm6', 'melodicMinor']
    ]
  },
  rhythm: {
    minor: false,
    bars: [
      [null, 'maj7', 'Imaj7', 'ionian'], ['M6', 'm7', 'VIm7', null], ['M2', 'm7', 'IIm7', 'dorian'], ['P5', '7', 'V7', 'mixolydian'],
      ['M3', 'm7', 'IIIm7', null], ['M6', '7', 'VI7', 'phrygianDominant'], ['M2', 'm7', 'IIm7', 'dorian'], ['P5', '7', 'V7', 'mixolydian'],
      ['M3', '7', 'III7', 'phrygianDominant'], ['M6', '7', 'VI7', 'phrygianDominant'], ['M2', '7', 'II7', null], ['P5', '7', 'V7', 'mixolydian']
    ]
  },
  minorBlues: {
    minor: true,
    bars: [
      [null, 'm7', 'Im7', 'dorian'], [null, 'm7', 'Im7', 'dorian'], [null, 'm7', 'Im7', 'dorian'], [null, 'm7', 'Im7', 'dorian'],
      ['P4', 'm7', 'IVm7', 'dorian'], ['P4', 'm7', 'IVm7', 'dorian'], [null, 'm7', 'Im7', 'dorian'], [null, 'm7', 'Im7', 'dorian'],
      ['m6', '7', '♭VI7', 'lydianDominant'], ['P5', '7', 'V7', 'phrygianDominant'], [null, 'm7', 'Im7', 'dorian'], ['P5', '7', 'V7', 'phrygianDominant']
    ]
  }
};
const SCALE_REASON = {
  dorian: 'm7 の基本。6度がナチュラルで明るめのマイナーです。',
  mixolydian: '7 の基本。メジャーのキーの中のドミナントに合います。',
  ionian: 'キーそのもののスケールです。',
  lydian: 'IVmaj7 はキーの音だと♯11th にあたる音が入るリディアンになります。',
  locrian: 'VIIm7♭5 はキーの音だけで作るとロクリアンです。',
  phrygianDominant: 'マイナーのコードへ解決する 7 なので、♭9th・♭13th を含むフリジアン・ドミナントが合います。',
  melodicMinor: 'm6 は6度がナチュラルで7度が長7度のメロディックマイナーが合います。',
  lydianDominant: '♭VI7 は♯11th を含むリディアン・ドミナントがよく合います。'
};
const SONG_SCALES = Object.keys(SCALE_REASON);
// どちらでも弾けて正解が1つに決まらない組は、選択肢に並べない
const SCALE_RIVAL = { mixolydian: 'lydianDominant', lydianDominant: 'mixolydian' };

function songChart({ form: formKey, keys }) {
  const form = SONG_FORMS[formKey];
  const key = keyRoot(keys);
  const chords = form.bars.map(([at, quality]) => fromKey(key, [at, quality]));
  return { form, key, chords };
}
const keyLabel = (key, form) => `キー ${n(key)}${form.minor ? 'マイナー' : ''}`;
// 印をつけた小節を【 】で囲んだ、1行のコード譜にする
const chartText = (chords, marks) => chords.map((x, i) => (marks.includes(i) ? `【${c(x)}】` : c(x))).join(' | ');
const nextOf = (chords, i) => chords[(i + 1) % chords.length];
// 次のコードのルートが5度下（4度上）なら、強い解決の流れ
const fallsFifth = (a, b) => (((noteToMidi(b.root) - noteToMidi(a.root)) % 12) + 12) % 12 === 5;
// 半音上の音。裏コードのルートは解決先の半音上なので、C♭のような綴りにならないよう2通りから読みやすい方を選ぶ
const halfStepUp = (target) => [addInterval(target, 'm2'), addInterval(target, 'A1')].sort((a, b) => spellingCost(a) - spellingCost(b))[0];

const songGenerators = {
  songRole(params) {
    const { form, key, chords } = songChart(params);
    const i = Math.floor(Math.random() * chords.length);
    const roman = form.bars[i][2];
    const pool = [...new Set([...form.bars.map((x) => x[2]), ...DIATONIC.map((x) => x.roman)])].filter((x) => x !== roman);
    return makeQuestion({
      prompt: `${keyLabel(key, form)} の曲：${chartText(chords, [i])}　【 】のコードの役目は？`, correct: roman, wrong: shuffle(pool).slice(0, 3),
      explain: `${c(chords[i])} は${keyLabel(key, form)}の ${roman}。キーの音から数えて役目を読むと、ほかのキーでも同じ考え方で弾けます。`,
      columns: [chordColumn(chords[i])]
    });
  },
  songTritone(params) {
    const { form, key, chords } = songChart(params);
    const i = pick(chords.map((_, k) => k).filter((k) => chords[k].quality === '7' && fallsFifth(chords[k], nextOf(chords, k))));
    const answer = makeChord(halfStepUp(nextOf(chords, i).root), '7');
    const others = [chords[i], makeChord(halfStepUp(chords[i].root), '7'), makeChord(answer.root, 'm7'), makeChord(nextOf(chords, i).root, '7')];
    const wrong = [...new Set(others.map(c))].filter((x) => x !== c(answer)).slice(0, 3);
    return makeQuestion({
      prompt: `${keyLabel(key, form)} の曲：${chartText(chords, [i])}　【 】を裏コードにすると？`, correct: c(answer), wrong,
      explain: `${c(chords[i])} と ${c(answer)} は3度と7度が同じ。ベースが半音で ${c(nextOf(chords, i))} へ下りていきます。`,
      columns: [chordColumn(chords[i]), chordColumn(answer), chordColumn(nextOf(chords, i))]
    });
  },
  songBackdoor(params) {
    const { form, key, chords } = songChart(params);
    const starts = chords.map((_, k) => k).filter((k) => chords[k].quality === 'm7' && nextOf(chords, k).quality === '7'
      && nextOf(chords, k + 1).quality === 'maj7' && fallsFifth(chords[k], nextOf(chords, k)) && fallsFifth(nextOf(chords, k), nextOf(chords, k + 1)));
    const i = pick(starts);
    const j = (i + 1) % chords.length;
    const target = nextOf(chords, j).root;
    const pair = (a, qa, b, qb) => `${c(makeChord(a, qa))} → ${c(makeChord(b, qb))}`;
    const correct = pair(addInterval(target, 'P4'), 'm7', addInterval(target, 'm7'), '7');
    return makeQuestion({
      prompt: `${keyLabel(key, form)} の曲：${chartText(chords, [i, j])}　【 】の2つをバックドアに書きかえると？`, correct,
      wrong: [pair(chords[i].root, 'm7', halfStepUp(target), '7'), pair(addInterval(target, 'P4'), 'maj7', chords[j].root, '7'), pair(addInterval(target, 'M6'), '7', chords[i].root, 'm7')],
      explain: `IVm7 → ♭VII7 から ${c(nextOf(chords, j))} へ。サブドミナントマイナーの陰りを通って、裏口から帰ってきます。`,
      columns: [chordColumn(makeChord(addInterval(target, 'P4'), 'm7')), chordColumn(makeChord(addInterval(target, 'm7'), '7')), chordColumn(nextOf(chords, j))]
    });
  },
  songScale(params) {
    const { form, key, chords } = songChart(params);
    const i = pick(form.bars.map((_, k) => k).filter((k) => form.bars[k][3]));
    const mode = form.bars[i][3];
    const wrong = shuffle(SONG_SCALES.filter((x) => x !== mode && x !== SCALE_RIVAL[mode])).slice(0, 3).map((x) => MODES[x].name);
    return makeQuestion({
      prompt: `${keyLabel(key, form)} の曲：${chartText(chords, [i])}　【 】の上で弾くスケールは？`, correct: MODES[mode].name, wrong,
      explain: `${c(chords[i])}（${form.bars[i][2]}）：${SCALE_REASON[mode]}${spell(modeScale(chords[i].root, mode))}`,
      columns: [chordColumn(chords[i]), ...modeScale(chords[i].root, mode).map(single)]
    });
  },
  songGuide(params) {
    const { form, key, chords } = songChart(params);
    const i = pick(chords.map((_, k) => k).filter((k) => fallsFifth(chords[k], nextOf(chords, k))));
    const next = nextOf(chords, i);
    const seventh = chordNotes(chords[i])[3];
    const answer = chordNotes(next)[1];
    return makeQuestion({
      prompt: `${keyLabel(key, form)} の曲：${chartText(chords, [i])}　【 】の7度 ${n(seventh)} は、次の ${c(next)} で何の音へ進む？`, correct: n(answer),
      wrong: distinctWrong([...chordNotes(next), seventh, halfStepUp(seventh)], answer, 3).map(n),
      explain: `${n(seventh)} が半音か全音下がって、${c(next)} の3度 ${n(answer)} へ。この線をつなぐと進行がなめらかに聞こえます。`,
      columns: [guideColumn(chords[i]), guideColumn(next)]
    });
  }
};

const GENERATORS = {
  ...earGenerators, ...readGenerators, ...stepUpEarGenerators, ...stepUpReadGenerators, ...advancedGenerators, ...developGenerators,
  ...applyGenerators, ...masteryGenerators, ...masterGenerators,
  ...secretGenerators, ...masteryPlusGenerators, ...songGenerators
};

// 単元に複数の出題形式があるときは、偏らないよう順番に混ぜてからシャッフルする
export function buildQuiz(specs, length) {
  const questions = [];
  for (let i = 0; i < length; i += 1) {
    const spec = specs[i % specs.length];
    questions.push(GENERATORS[spec.type](spec.params ?? {}));
  }
  return shuffle(questions);
}

import {
  INTERVALS, QUALITIES, DIATONIC, MODES, NOTATIONS, parseNote, noteToText, noteToMidi, chordToText, chordNotes,
  addInterval, transpose, placeRoot, majorScale, modeScale, makeChord, twoFiveOne, minorTwoFiveOne, toWritten
} from './theory.js';

const DEGREE_NAMES = ['ルート', '3度', '5度', '7度'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// ♭のつくルートでm7♭5やdim7を作るとダブルフラットが出て読みにくいので、ルートを絞る
const HALF_DIMINISHED_ROOTS = ['C', 'D', 'E', 'G', 'A', 'B'];
const DIMINISHED_ROOTS = ['C#', 'E', 'F#', 'G#', 'A', 'B'];
const RESTRICTED_ROOTS = { m7b5: HALF_DIMINISHED_ROOTS, dim7: DIMINISHED_ROOTS };

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
const QUALITY_FOR_MODE = { ionian: 'maj7', dorian: 'm7', mixolydian: '7', locrian: 'm7b5' };
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
  modeEar({ list }) {
    const mode = pick(list);
    const root = parseNote(pick(['C4', 'D4', 'F4', 'G3']));
    const chord = makeChord(root, QUALITY_FOR_MODE[mode]);
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
    const row = BLUES_FORM.slice(Math.floor(bar / 4) * 4, Math.floor(bar / 4) * 4 + 4).flat();
    return makeQuestion({
      prompt: `キー${n(root)} のジャズブルースで、${bar + 1}小節目のコードは？`, correct: c(bluesChord(root, roman)),
      wrong: wrongRomans.map((x) => c(bluesChord(root, x))),
      explain: `${bar + 1}小節目は ${roman}。譜例は${Math.floor(bar / 4) * 4 + 1}〜${Math.floor(bar / 4) * 4 + 4}小節目です。`,
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
    return makeQuestion({
      prompt: `${c(dominant)} → ${c(tonic)}。${c(dominant)} に自然に合うテンションの組は？`,
      correct: isMinor ? altered : natural, wrong: [isMinor ? natural : altered],
      explain: isMinor ? `マイナーへ解決するときは ♭9th・♭13th（${altered}）。キーの音とそろいます。` : `メジャーへ解決するときは 9th・13th（${natural}）。キーの音とそろいます。`,
      columns: [chordColumn(dominant), chordColumn(tonic)]
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

const GENERATORS = { ...earGenerators, ...readGenerators, ...stepUpEarGenerators, ...stepUpReadGenerators, ...advancedGenerators };

// 単元に複数の出題形式があるときは、偏らないよう順番に混ぜてからシャッフルする
export function buildQuiz(specs, length) {
  const questions = [];
  for (let i = 0; i < length; i += 1) {
    const spec = specs[i % specs.length];
    questions.push(GENERATORS[spec.type](spec.params ?? {}));
  }
  return shuffle(questions);
}

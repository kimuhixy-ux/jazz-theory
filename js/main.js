import { NOTATIONS, parseNote, parseChord, noteName, chordName, chordNotes, toWritten } from './theory.js';
import { drawStaff } from './staff.js';
import { unlockAudio, playColumns } from './audio.js';
import { buildQuiz } from './quiz.js';

const STORAGE_KEY = 'jazz-theory';
const QUIZ_LENGTH = 10;
const TOKEN = /\{([nc]):([^}]+)\}/g;

const state = { notation: 'concert', units: [], progress: {}, quiz: null };
const view = document.getElementById('view');

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
    if (saved.notation in NOTATIONS) state.notation = saved.notation;
    state.progress = saved.progress ?? {};
  } catch {
    // 非公開モードなどで読めなくても、既定値のまま使えるようにする
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ notation: state.notation, progress: state.progress }));
  } catch {
    // 保存できない環境でも学習自体は続けられるので、失敗は無視する
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className, text, onClick) {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

// {n:C4} や {c:Dm7} を、いま選んでいる記譜の音名・コード名に置き換える
function renderTokens(text) {
  const fragment = document.createDocumentFragment();
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    fragment.append(text.slice(last, match.index));
    const value = match[1] === 'n'
      ? noteName(toWritten(parseNote(match[2]), state.notation))
      : chordName(parseChord(match[2]), state.notation);
    fragment.append(el('span', 'pitch', value));
    last = match.index + match[0].length;
  }
  fragment.append(text.slice(last));
  return fragment;
}

function exampleColumns(example) {
  if (example.seq) return example.seq.map((text) => ({ notes: [parseNote(text)], chord: null }));
  if (example.chords) {
    return example.chords.map((text) => {
      const chord = parseChord(text);
      return { notes: chordNotes(chord), chord };
    });
  }
  return example.columns.map((column) => {
    const chord = column.chord ? parseChord(column.chord) : null;
    return { notes: column.notes ? column.notes.map(parseNote) : chordNotes(chord), chord };
  });
}

function staffFigure(columns, notation = state.notation) {
  const figure = el('figure', 'example');
  figure.append(drawStaff(columns.map((column) => ({
    notes: column.notes.map((note) => toWritten(note, notation)),
    label: column.chord ? chordName(column.chord, notation) : ''
  }))));
  figure.append(button('play-button', '▶ 鳴らす', () => playColumns(columns)));
  return figure;
}

function renderNotationBar() {
  const bar = document.getElementById('notation-bar');
  bar.replaceChildren();
  for (const [key, notation] of Object.entries(NOTATIONS)) {
    const option = button('segment', notation.label, () => {
      state.notation = key;
      saveSettings();
      renderNotationBar();
      render(false);
    });
    option.setAttribute('aria-pressed', String(key === state.notation));
    bar.append(option);
  }
}

function renderHome() {
  view.append(el('p', 'lead', '初歩から順に、読んで・聴いて・答えて覚えます。'));
  const list = el('ol', 'unit-list');
  state.units.forEach((unit, i) => {
    const item = el('li');
    const best = state.progress[unit.id];
    const row = button('unit-button', '', () => { location.hash = `#/${unit.id}`; });
    const body = el('span', 'unit-body');
    body.append(el('span', 'unit-title', unit.title), el('span', 'unit-summary', unit.summary));
    row.append(el('span', 'unit-number', String(i + 1)), body, el('span', 'unit-score', best === undefined ? '' : `${best}/${QUIZ_LENGTH}`));
    item.append(row);
    list.append(item);
  });
  view.append(list);
}

function renderCard(card) {
  const article = el('article', 'card');
  article.append(el('h3', '', card.title));
  for (const paragraph of card.text) {
    const p = el('p');
    p.append(renderTokens(paragraph));
    article.append(p);
  }
  if (card.example) {
    article.append(staffFigure(exampleColumns(card.example), card.example.concert ? 'concert' : state.notation));
    if (card.example.concert) article.append(el('p', 'note', '※この譜例はいつも実音で表示します'));
  }
  if (card.link) {
    const link = el('a', 'link-button', card.link.label);
    link.href = card.link.url;
    link.target = '_blank';
    link.rel = 'noopener';
    article.append(link);
  }
  return article;
}

function renderUnitHeader(unit, tab) {
  const header = el('div', 'unit-header');
  header.append(button('back-button', '‹ 一覧', () => { location.hash = ''; }), el('h2', '', unit.title));
  const tabs = el('div', 'tabs');
  for (const [key, label] of [['read', '読む'], ['quiz', '練習']]) {
    const tabButton = button('tab', label, () => { location.hash = key === 'read' ? `#/${unit.id}` : `#/${unit.id}/quiz`; });
    tabButton.setAttribute('aria-pressed', String(key === tab));
    tabs.append(tabButton);
  }
  view.append(header, tabs);
}

function renderRead(unit) {
  unit.cards.forEach((card) => view.append(renderCard(card)));
  view.append(button('primary-button', '練習へ進む', () => { location.hash = `#/${unit.id}/quiz`; }));
}

function startQuiz(unit) {
  state.quiz = { unitId: unit.id, questions: buildQuiz(unit.quiz, QUIZ_LENGTH), index: 0, score: 0, chosen: null, played: -1 };
}

function choose(i) {
  const quiz = state.quiz;
  if (quiz.chosen !== null) return;
  quiz.chosen = i;
  if (i === quiz.questions[quiz.index].answer) quiz.score += 1;
  render(false);
}

function nextQuestion(unit) {
  const quiz = state.quiz;
  quiz.index += 1;
  quiz.chosen = null;
  if (quiz.index >= quiz.questions.length) {
    state.progress[unit.id] = Math.max(state.progress[unit.id] ?? 0, quiz.score);
    saveSettings();
  }
  render(false);
}

function renderFeedback(container, question, unit) {
  const quiz = state.quiz;
  const isCorrect = quiz.chosen === question.answer;
  const feedback = el('div', `feedback ${isCorrect ? 'is-correct' : 'is-wrong'}`);
  feedback.append(el('p', 'verdict', isCorrect ? '正解！' : 'ちがいます'));
  const explain = el('p');
  explain.append(renderTokens(question.explain));
  feedback.append(explain, staffFigure(question.columns));
  const isLast = quiz.index + 1 >= quiz.questions.length;
  feedback.append(button('primary-button', isLast ? '結果を見る' : '次へ', () => nextQuestion(unit)));
  container.append(feedback);
}

function renderQuestion(unit) {
  const quiz = state.quiz;
  const question = quiz.questions[quiz.index];
  view.append(el('p', 'quiz-progress', `${quiz.index + 1} / ${quiz.questions.length}　正解 ${quiz.score}`));
  const prompt = el('p', 'prompt');
  prompt.append(renderTokens(question.prompt));
  view.append(prompt);
  if (question.ear) view.append(button('play-button', '▶ 聴く', () => playColumns(question.columns)));
  const choices = el('div', 'choices');
  question.choices.forEach((choice, i) => {
    const choiceButton = button('choice', '', () => choose(i));
    choiceButton.append(renderTokens(choice));
    if (quiz.chosen !== null) {
      choiceButton.disabled = true;
      if (i === question.answer) choiceButton.classList.add('is-answer');
      else if (i === quiz.chosen) choiceButton.classList.add('is-chosen');
    }
    choices.append(choiceButton);
  });
  view.append(choices);
  if (quiz.chosen !== null) renderFeedback(view, question, unit);
  // 聴く問題は表示した時点で一度だけ自動で鳴らす（記譜の切り替えで再描画しても鳴らし直さない）
  if (question.ear && quiz.played !== quiz.index) {
    quiz.played = quiz.index;
    playColumns(question.columns);
  }
}

function renderResult(unit) {
  const quiz = state.quiz;
  const result = el('div', 'result');
  result.append(el('p', 'result-score', `${quiz.questions.length}問中 ${quiz.score}問 正解`));
  result.append(el('p', '', quiz.score >= 8 ? 'よくできました。次の単元へ進みましょう。' : '「読む」を見直してから、もう一度挑戦してみましょう。'));
  result.append(button('primary-button', 'もう一度', () => { startQuiz(unit); render(false); }));
  result.append(button('secondary-button', '一覧へ戻る', () => { location.hash = ''; }));
  view.append(result);
}

function renderQuiz(unit) {
  if (!state.quiz || state.quiz.unitId !== unit.id) startQuiz(unit);
  if (state.quiz.index >= state.quiz.questions.length) renderResult(unit);
  else renderQuestion(unit);
}

// 画面の切り替えは #/単元id と #/単元id/quiz で表し、iPhoneの戻る操作にも対応させる
function render(scrollTop = true) {
  view.replaceChildren();
  const [unitId, tab] = location.hash.replace(/^#\//, '').split('/');
  const unit = state.units.find((item) => item.id === unitId);
  if (!unit) renderHome();
  else {
    renderUnitHeader(unit, tab === 'quiz' ? 'quiz' : 'read');
    if (tab === 'quiz') renderQuiz(unit);
    else renderRead(unit);
  }
  if (scrollTop) window.scrollTo(0, 0);
}

async function init() {
  loadSettings();
  renderNotationBar();
  // iPhoneの音の制限を外すため、どこをタップしても音声を準備する
  document.addEventListener('click', unlockAudio, true);
  document.addEventListener('touchend', unlockAudio, true);
  const response = await fetch('data/lessons.json');
  state.units = (await response.json()).units;
  window.addEventListener('hashchange', () => render());
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
}

init();

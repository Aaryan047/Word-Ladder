// ---------- THEME (Pac-Man ghosts: Blinky, Pinky, Inky, Clyde — light + dark, distinct bg per ghost) ----------
const THEMES = [
  { id:'blinky-light', mode:'light', accent:'#e11d2e', bg:'#fdf2f2', fg:'#2a1516', card:'#ffffff', border:'#f3d4d4' },
  { id:'blinky-dark',  mode:'dark',  accent:'#ff5a5f', bg:'#1a1013', fg:'#f5e6e7', card:'#241417', border:'#3a1e22' },
  { id:'pinky-light',  mode:'light', accent:'#d6409f', bg:'#fdf2f9', fg:'#2a1524', card:'#ffffff', border:'#f3d4ea' },
  { id:'pinky-dark',   mode:'dark',  accent:'#ff8fd6', bg:'#1a1018', fg:'#f5e6f0', card:'#241420', border:'#3a1e30' },
  { id:'inky-light',   mode:'light', accent:'#0e8fa6', bg:'#f0fafb', fg:'#122a2d', card:'#ffffff', border:'#cdeef2' },
  { id:'inky-dark',    mode:'dark',  accent:'#4dd9e8', bg:'#0e1a1c', fg:'#e2f5f6', card:'#132428', border:'#1e363a' },
  { id:'clyde-light',  mode:'light', accent:'#c9760f', bg:'#fdf6ec', fg:'#2a1f10', card:'#ffffff', border:'#f3e2c4' },
  { id:'clyde-dark',   mode:'dark',  accent:'#ffb454', bg:'#1a140d', fg:'#f5ecdf', card:'#241c12', border:'#3a2c1a' },
];
const modeBtn = document.getElementById('modeToggle');
const swatchWrap = document.getElementById('swatches');
let currentTheme = localStorage.getItem('wl_theme') || 'blinky-light';

function applyTheme(id){
  const t = THEMES.find(x => x.id === id) || THEMES[0];
  currentTheme = t.id;
  document.body.classList.toggle('dark', t.mode === 'dark');
  const root = document.documentElement.style;
  root.setProperty('--bg', t.bg);
  root.setProperty('--fg', t.fg);
  root.setProperty('--accent', t.accent);
  root.setProperty('--card', t.card);
  root.setProperty('--border', t.border);
  modeBtn.textContent = t.mode === 'dark' ? '☀' : '☾';
  renderSwatches();
  localStorage.setItem('wl_theme', t.id);
}
function renderSwatches(){
  const mode = THEMES.find(x => x.id === currentTheme).mode;
  swatchWrap.innerHTML = '';
  THEMES.filter(t => t.mode === mode).forEach(t => {
    const b = document.createElement('button');
    b.className = 'swatch' + (t.id === currentTheme ? ' active' : '');
    b.style.background = t.accent;
    b.title = t.id.split('-')[0].replace(/^./, c => c.toUpperCase());
    b.type = 'button';
    b.onclick = () => applyTheme(t.id);
    swatchWrap.appendChild(b);
  });
}
modeBtn.onclick = () => {
  const ghost = currentTheme.split('-')[0];
  const otherMode = THEMES.find(x => x.id === currentTheme).mode === 'dark' ? 'light' : 'dark';
  applyTheme(ghost + '-' + otherMode);
};

// ---------- TABS ----------
const tabs = document.querySelectorAll('.tab');
tabs.forEach(t => t.onclick = () => {
  tabs.forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  document.getElementById('dailyTab').classList.toggle('hidden', t.dataset.tab !== 'daily');
  document.getElementById('customTab').classList.toggle('hidden', t.dataset.tab !== 'custom');
  resetToSetup();
  if (t.dataset.tab === 'daily') loadDailyPuzzle();
});

// ---------- BUCKET / BFS SOLVER (for custom mode) ----------
const bucketCache = {};
function getBuckets(length){
  if (bucketCache[length]) return bucketCache[length];
  const words = (GAME_DATA.wordSets[String(length)] || []);
  const buckets = {};
  for (const w of words){
    for (let i = 0; i < w.length; i++){
      const key = i + '|' + w.slice(0,i) + w.slice(i+1);
      (buckets[key] = buckets[key] || []).push(w);
    }
  }
  bucketCache[length] = buckets;
  return buckets;
}
function neighbors(word){
  const buckets = getBuckets(word.length);
  const out = new Set();
  for (let i = 0; i < word.length; i++){
    const key = i + '|' + word.slice(0,i) + word.slice(i+1);
    (buckets[key] || []).forEach(w => { if (w !== word) out.add(w); });
  }
  return [...out];
}
function bfsPath(start, end){
  if (start === end) return [start];
  const visited = new Map([[start, null]]);
  const queue = [start];
  while (queue.length){
    const cur = queue.shift();
    if (cur === end){
      const path = [];
      let x = cur;
      while (x !== null){ path.unshift(x); x = visited.get(x); }
      return path;
    }
    for (const n of neighbors(cur)){
      if (!visited.has(n)){ visited.set(n, cur); queue.push(n); }
    }
  }
  return null;
}
function bfsDistances(start, maxDist){
  const dist = new Map([[start, 0]]);
  const queue = [start];
  while (queue.length){
    const cur = queue.shift();
    const d = dist.get(cur);
    if (d >= maxDist) continue;
    for (const n of neighbors(cur)){
      if (!dist.has(n)){ dist.set(n, d + 1); queue.push(n); }
    }
  }
  return dist;
}

// ---------- WORD VALIDITY (API first, offline fallback) ----------
async function isRealWord(word){
  word = word.toLowerCase();
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (res.ok) return true;
    return offlineHasWord(word);
  } catch (e){
    return offlineHasWord(word);
  }
}
function offlineHasWord(word){
  const set = GAME_DATA.wordSets[String(word.length)];
  return !!set && set.includes(word);
}

// ---------- STATE ----------
let state = null;

function resetToSetup(){
  document.getElementById('gameArea').classList.add('hidden');
  document.getElementById('resultArea').classList.add('hidden');
  document.getElementById('customSetup').classList.remove('hidden');
  document.getElementById('customMsg').textContent = '';
  state = null;
}

// ---------- DAILY PUZZLE ----------
let dailyVariant = 0;
document.querySelectorAll('.variantBtn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.variantBtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    dailyVariant = Number(btn.dataset.v);
    loadDailyPuzzle();
  };
});
function dayOfYearIndex(){
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const day = Math.floor(diff / 86400000);
  return day % GAME_DATA.days.length;
}
function loadDailyPuzzle(){
  const idx = dayOfYearIndex();
  const puzzle = GAME_DATA.days[idx][dailyVariant];
  startGame(puzzle.start, puzzle.end, puzzle.path);
}

// ---------- CUSTOM SETUP ----------
document.getElementById('startCustomBtn').onclick = async () => {
  const msg = document.getElementById('customMsg');
  const a = document.getElementById('startInput').value.trim().toLowerCase();
  const b = document.getElementById('endInput').value.trim().toLowerCase();
  msg.className = 'msg';
  if (!/^[a-z]+$/.test(a) || !/^[a-z]+$/.test(b)){
    msg.textContent = 'letters only, ape.'; msg.className='msg error'; return;
  }
  if (a.length !== b.length){
    msg.textContent = 'both words same length, please.'; msg.className='msg error'; return;
  }
  if (a.length < 5 || a.length > 15){
    msg.textContent = 'word length must be 5-15.'; msg.className='msg error'; return;
  }
  if (a === b){
    msg.textContent = 'start and end must differ.'; msg.className='msg error'; return;
  }
  msg.textContent = 'checking words...'; msg.className='msg';
  const [okA, okB] = await Promise.all([isRealWord(a), isRealWord(b)]);
  if (!okA || !okB){
    msg.textContent = `not real word: ${!okA ? a : b}`; msg.className='msg error'; return;
  }
  msg.textContent = '';
  startGame(a, b, null);
};

let difficulty = 'medium';
document.querySelectorAll('.diffBtn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.diffBtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    difficulty = btn.dataset.d;
  };
});
const DIFFICULTY_SPECS = {
  easy:   { lengths: [5, 6],       minSteps: 2, maxSteps: 4 },
  medium: { lengths: [6, 7, 8],    minSteps: 4, maxSteps: 6 },
  hard:   { lengths: [7, 8, 9],    minSteps: 6, maxSteps: 9 },
};

document.getElementById('randomiseBtn').onclick = () => {
  const msg = document.getElementById('customMsg');
  msg.className = 'msg';
  const spec = DIFFICULTY_SPECS[difficulty];
  const maxTries = 50;
  for (let i = 0; i < maxTries; i++){
    const length = spec.lengths[Math.floor(Math.random() * spec.lengths.length)];
    const words = GAME_DATA.wordSets[String(length)];
    if (!words || words.length < 2) continue;
    const start = words[Math.floor(Math.random() * words.length)];
    const dist = bfsDistances(start, spec.maxSteps);
    const candidates = [...dist.entries()].filter(([w, d]) => d >= spec.minSteps && d <= spec.maxSteps).map(([w]) => w);
    if (!candidates.length) continue;
    const end = candidates[Math.floor(Math.random() * candidates.length)];
    const path = bfsPath(start, end);
    document.getElementById('startInput').value = start;
    document.getElementById('endInput').value = end;
    msg.textContent = '';
    startGame(start, end, path);
    return;
  }
  msg.textContent = 'could not roll a pair, try again.'; msg.className = 'msg error';
};

// ---------- GAME FLOW ----------
function startGame(start, end, knownPath){
  state = { start, end, length: start.length, chain: [start], knownOptimal: knownPath };
  document.getElementById('customSetup').classList.add('hidden');
  document.getElementById('resultArea').classList.add('hidden');
  document.getElementById('gameArea').classList.remove('hidden');
  document.getElementById('gameMsg').textContent = '';
  document.getElementById('guessInput').value = '';
  renderChain();
}

function renderChain(){
  const ol = document.getElementById('chain');
  ol.innerHTML = '';
  state.chain.forEach((w, i) => {
    const li = document.createElement('li');
    li.textContent = w;
    if (i === 0) li.classList.add('step-start');
    if (w === state.end) li.classList.add('step-end');
    ol.appendChild(li);
  });
  const reached = state.chain[state.chain.length - 1] === state.end;
  if (!reached){
    const ghost = document.createElement('li');
    ghost.textContent = state.end;
    ghost.classList.add('step-ghost');
    ol.appendChild(ghost);
  }
  document.getElementById('undoBtn').disabled = state.chain.length <= 1;
}

document.getElementById('undoBtn').onclick = () => {
  if (!state || state.chain.length <= 1) return;
  state.chain.pop();
  const msg = document.getElementById('gameMsg');
  msg.textContent = 'undone.'; msg.className = 'msg';
  renderChain();
};

function diffByOne(a, b){
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  return diff === 1;
}

document.getElementById('guessForm').onsubmit = async (e) => {
  e.preventDefault();
  const input = document.getElementById('guessInput');
  const msg = document.getElementById('gameMsg');
  const guess = input.value.trim().toLowerCase();
  const last = state.chain[state.chain.length - 1];
  msg.className = 'msg';

  if (!guess) return;
  if (guess.length !== state.length){ msg.textContent = `word must be ${state.length} letters.`; msg.className='msg error'; return; }
  if (state.chain.includes(guess)){ msg.textContent = 'already used that word.'; msg.className='msg error'; return; }
  if (!diffByOne(last, guess)){ msg.textContent = 'change exactly one letter from last word.'; msg.className='msg error'; return; }

  msg.textContent = 'checking...';
  const real = await isRealWord(guess);
  if (!real){ msg.textContent = `"${guess}" not a real word.`; msg.className='msg error'; return; }

  state.chain.push(guess);
  input.value = '';
  msg.textContent = 'good.'; msg.className='msg ok';
  renderChain();

  if (guess === state.end) finishGame(true);
};

document.getElementById('giveUpBtn').onclick = () => finishGame(false);

function finishGame(solved){
  document.getElementById('gameArea').classList.add('hidden');
  const resultArea = document.getElementById('resultArea');
  resultArea.classList.remove('hidden');
  document.getElementById('resultTitle').textContent = solved ? 'Solved!' : 'Route revealed';

  let optimal = state.knownOptimal;
  if (!optimal) optimal = bfsPath(state.start, state.end);

  const yourSteps = state.chain.length - 1;
  const optSteps = optimal ? optimal.length - 1 : null;
  document.getElementById('resultStats').textContent = optimal
    ? `Your path: ${yourSteps} step(s). Optimal: ${optSteps} step(s).`
    : `Your path: ${yourSteps} step(s). Optimal route unknown (no connecting chain found in word list).`;

  document.getElementById('yourPath').innerHTML = state.chain.map(w => `<span>${w}</span>`).join('<span>→</span>');
  document.getElementById('optimalPath').innerHTML = optimal
    ? optimal.map(w => `<span>${w}</span>`).join('<span>→</span>')
    : '<span>—</span>';
}

document.getElementById('playAgainBtn').onclick = () => {
  document.getElementById('resultArea').classList.add('hidden');
  const activeTab = document.querySelector('.tab.active').dataset.tab;
  if (activeTab === 'daily') loadDailyPuzzle();
  else resetToSetup();
};

// ---------- INIT (all listeners above are already bound regardless of what happens here) ----------
applyTheme(currentTheme);
try {
  if (typeof GAME_DATA === 'undefined') throw new Error('data.js did not load — GAME_DATA missing.');
  loadDailyPuzzle();
} catch (err) {
  const el = document.getElementById('fatalError');
  el.textContent = 'Could not load puzzle data: ' + err.message + ' — check that data.js sits next to index.html.';
  el.classList.remove('hidden');
  console.error(err);
}

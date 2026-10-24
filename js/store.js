// Stan aplikacji + zapis.
// Faza 1: zapis tylko w localStorage. W fazie 2 dojdzie adapter GitHub
// (ten sam interfejs load/save), a localStorage zostanie jako cache offline.
//
// Kształt danych:
//   tasks:    [{ id, title, cat, project, prio, due, plan, note, done, doneAt, createdAt }]
//   projects: [{ id, name, desc, status, color, link, createdAt }]
//   library:  [{ id, title, author, kind, status, rating, note, link, startedAt, finishedAt, createdAt }]
//   days:     { 'YYYY-MM-DD': { focus, energy, mood, note } }

import { today, uid, addDays } from './utils.js';

const KEY = 'panel:data:v1';

const localAdapter = {
  kind: 'local',
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },
};

const emptyState = () => ({ version: 3, tasks: [], projects: [], library: [], days: {} });

/* ---------- Przykładowe dane (oznaczone seed: true, do usunięcia jednym kliknięciem) ---------- */

function seedExtras(s) {
  const t = today();
  const now = new Date().toISOString();
  const proj = (name, desc, color, extra = {}) =>
    ({ id: uid(), name, desc, status: 'aktywny', color, link: '', createdAt: now, seed: true, ...extra });
  const pPanel = proj('Panel produktywności', 'Własny system do zadań, projektów i dziennika.', '--primary-color');
  const pPython = proj('Kurs Pythona', 'Od podstaw do własnych skryptów analizujących dane.', '--info');
  const pPokoj = proj('Remont pokoju', 'Malowanie, nowe biurko, porządek w kablach.', '--warning');
  const pBlog = proj('Blog', 'Pomysł na przyszłość: pisać o tym, czego się uczę.', '--tip', { status: 'wstrzymany' });
  s.projects.push(pPanel, pPython, pPokoj, pBlog);

  const item = (title, author, kind, status, extra = {}) => ({
    id: uid(), title, author, kind, status, rating: null, note: '', link: '',
    startedAt: null, finishedAt: null, createdAt: now, seed: true, ...extra,
  });
  s.library.push(
    item('Głęboka praca', 'Cal Newport', 'książka', 'w trakcie', { startedAt: addDays(t, -9) }),
    item('Python Crash Course', 'Eric Matthes', 'kurs', 'w trakcie', { startedAt: addDays(t, -20), note: 'Rozdziały 1–6 za mną. Najlepsze są projekty na końcu.' }),
    item('Gödel, Escher, Bach', 'Douglas Hofstadter', 'książka', 'kolejka', { note: 'Klasyk o logice, matematyce i świadomości.' }),
    item('Diuna', 'Frank Herbert', 'książka', 'kolejka'),
    item('Essence of Linear Algebra', '3Blue1Brown', 'kurs', 'kolejka', { link: 'https://www.3blue1brown.com/topics/linear-algebra' }),
    item('Spider-Man: Poprzez multiwersum', 'J. Dos Santos, K. Powers, J. Thompson', 'film', 'skończone',
      { rating: 5, finishedAt: addDays(t, -12), note: 'Każda klatka mogłaby wisieć na ścianie.' }),
    item('Kot w butach: Ostatnie życzenie', 'Joel Crawford', 'film', 'skończone',
      { rating: 5, finishedAt: addDays(t, -30), note: 'Zaskakująco dojrzały film o strachu przed śmiercią.' }),
    item('Atomic Habits', 'James Clear', 'książka', 'porzucone',
      { rating: 2, finishedAt: addDays(t, -60), note: 'Za dużo liczenia szklanek wody. Nie dla mnie.' }),
  );

  // Dziennik z ostatnich tygodni — żeby wykres energii nie był pusty
  const rnd = mulberry32(42);
  for (let i = 1; i <= 21; i++) {
    const day = (s.days[addDays(t, -i)] = {});
    day.energy = Math.max(2, Math.min(10, Math.round(6 + Math.sin(i / 2.3) * 2 + (rnd() - 0.5) * 2)));
    day.mood = Math.max(1, Math.min(5, Math.round(day.energy / 2 + (rnd() - 0.5))));
    if (i % 4 === 1) day.note = ['Dobry, skupiony dzień. Dużo zrobione przed południem.', 'Słabo spałem, ale wieczorem się rozkręciłem.', 'Za dużo telefonu. Jutro fokus od rana.', 'Spacer pomógł — głowa czysta.', 'Dzień administracyjny: maile, opłaty, telefony.', 'Nauka Pythona szła zaskakująco dobrze.'][i % 6];
    day.seed = true;
  }
  return { pPanel, pPython, pPokoj };
}

function seedState() {
  const s = emptyState();
  const t = today();
  const { pPanel, pPython, pPokoj } = seedExtras(s);
  const mk = (title, extra = {}) => ({
    id: uid(), title, cat: 'inbox', project: null, prio: 0, due: null, plan: null, note: '',
    done: false, doneAt: null, createdAt: new Date().toISOString(), seed: true, ...extra,
  });
  const focus = mk('Rozpisać plan panelu na najbliższy tydzień', { cat: 'kognitywne', prio: 3, plan: t, project: pPanel.id, note: 'Co jeszcze ma się znaleźć w panelu i w jakiej kolejności.' });
  s.tasks.push(
    focus,
    mk('Przeczytać rozdział o pętlach i funkcjach', { cat: 'kognitywne', prio: 2, plan: t, project: pPython.id }),
    mk('Odpisać na maile z uczelni', { cat: 'administracja', prio: 1, plan: t, due: t }),
    mk('Opłacić rachunek za telefon', { cat: 'administracja', due: addDays(t, -1), prio: 2 }),
    mk('Spacer bez telefonu, 30 min', { cat: 'odlaczenie', plan: t }),
    mk('Posprzątać biurko', { cat: 'lekkie', plan: t, done: true, doneAt: t, project: pPokoj.id }),
    mk('Kupić farbę i wałek', { cat: 'lekkie', due: addDays(t, 3), project: pPokoj.id }),
    mk('Zrobić ćwiczenia z list i słowników', { cat: 'kognitywne', due: addDays(t, 5), project: pPython.id }),
    mk('Skonfigurować GitHub Pages', { cat: 'kognitywne', project: pPanel.id, done: true, doneAt: addDays(t, -2) }),
    mk('Zaprojektować wygląd panelu', { cat: 'kognitywne', project: pPanel.id, done: true, doneAt: addDays(t, -1) }),
    mk('Zainstalować Pythona i VS Code', { cat: 'lekkie', project: pPython.id, done: true, doneAt: addDays(t, -6) }),
    mk('Pomysł: tracker książek w panelu', { note: 'Może jako osobny moduł później.' }),
    mk('Zarezerwować termin u dentysty', { cat: 'administracja', due: addDays(t, 8) }),
  );
  s.days[t] = { focus: focus.id, seed: true };
  return s;
}

/** Deterministyczny generator losowy — przykładowe dane wyglądają tak samo przy każdym starcie. */
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uzupełnia dane zapisane przez starszą wersję panelu. */
function migrate(s) {
  if (!s) return seedState();
  s.tasks ||= [];
  s.projects ||= [];
  s.library ||= [];
  s.days ||= {};
  for (const t of s.tasks) if (!('project' in t)) t.project = null;
  if ((s.version || 1) < 3) {
    // v3: nawyki zastąpione biblioteką. Przykładowe dane generujemy od nowa.
    delete s.habits;
    for (const d of Object.values(s.days)) delete d.habits;
    if (s.tasks.some((t) => t.seed)) return seedState();
    s.version = 3;
  }
  return s;
}

let adapter = localAdapter;
let state = migrate(adapter.load());
adapter.save(state);
const listeners = new Set();

export const store = {
  get state() { return state; },
  get backend() { return adapter.kind; },

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /** Każda zmiana przechodzi tędy: mutacja -> zapis -> powiadomienie widoków. */
  update(mutator) {
    mutator(state);
    adapter.save(state);
    listeners.forEach((fn) => fn(state));
  },

  /* ---------- Zadania ---------- */

  task(id) { return state.tasks.find((t) => t.id === id); },

  addTask(partial) {
    const task = {
      id: uid(), title: '', cat: 'inbox', project: null, prio: 0, due: null, plan: null, note: '',
      done: false, doneAt: null, createdAt: new Date().toISOString(), ...partial,
    };
    this.update((s) => { s.tasks.unshift(task); });
    return task;
  },

  updateTask(id, patch) { this.patch('tasks', id, patch); },

  toggleDone(id) {
    const t = this.task(id);
    if (!t) return;
    this.updateTask(id, t.done ? { done: false, doneAt: null } : { done: true, doneAt: today() });
  },

  removeTask(id) { return this.remove('tasks', id); },

  /* ---------- Projekty i biblioteka (wspólne operacje na kolekcjach) ---------- */

  project(id) { return state.projects.find((p) => p.id === id); },

  add(coll, obj) {
    const item = { id: uid(), createdAt: new Date().toISOString(), ...obj };
    this.update((s) => { s[coll].push(item); });
    return item;
  },

  patch(coll, id, patch) {
    this.update((s) => {
      const x = s[coll].find((i) => i.id === id);
      if (x) Object.assign(x, patch);
    });
  },

  /** Usuwa i zwraca funkcję cofającą. */
  remove(coll, id) {
    const idx = state[coll].findIndex((x) => x.id === id);
    if (idx < 0) return () => {};
    const removed = state[coll][idx];
    this.update((s) => { s[coll].splice(idx, 1); });
    return () => this.update((s) => { s[coll].splice(Math.min(idx, s[coll].length), 0, removed); });
  },

  /* ---------- Dni: fokus i dziennik ---------- */

  day(date = today()) { return state.days[date] || {}; },

  patchDay(date, patch) {
    this.update((s) => { s.days[date] = { ...(s.days[date] || {}), ...patch }; });
  },

  setFocus(id, date = today()) { this.patchDay(date, { focus: id }); },

  /* ---------- Przykładowe dane ---------- */

  hasSeed() {
    return [state.tasks, state.projects, state.library].some((list) => list.some((x) => x.seed));
  },

  clearSeed() {
    this.update((s) => {
      const taskIds = new Set(s.tasks.filter((t) => t.seed).map((t) => t.id));
      const projIds = new Set(s.projects.filter((p) => p.seed).map((p) => p.id));
      s.tasks = s.tasks.filter((t) => !t.seed);
      s.projects = s.projects.filter((p) => !p.seed);
      s.library = s.library.filter((x) => !x.seed);
      for (const t of s.tasks) if (projIds.has(t.project)) t.project = null;
      for (const [date, d] of Object.entries(s.days)) {
        if (taskIds.has(d.focus)) delete d.focus;
        if (d.seed) { delete d.energy; delete d.mood; delete d.note; delete d.seed; }
        if (!Object.values(d).some((v) => v != null)) delete s.days[date];
      }
    });
  },

  reset() {
    state = emptyState();
    adapter.save(state);
    listeners.forEach((fn) => fn(state));
  },
};

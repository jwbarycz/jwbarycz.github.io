// Stan aplikacji + zapis lokalny (localStorage).
// Synchronizacja z GitHubem siedzi w sync.js — subskrybuje zmiany stąd
// i podmienia stan po scaleniu (replace).
//
// Każdy element i dzień ma `updatedAt`, a usunięte id trafiają do `deleted`
// (id → czas usunięcia). Dzięki temu dwa urządzenia da się scalić bez utraty zmian.
//
// Kształt danych:
//   tasks:    [{ id, title, cat, project, prio, due, plan, note, done, doneAt, createdAt }]
//   projects: [{ id, name, desc, status, color, link, createdAt }]
//   ideas:    [{ id, title, note, pinned, converted: { kind: 'task'|'project', id, at } | null, createdAt }]
//   days:     { 'YYYY-MM-DD': { focus, energy, mood, note, updatedAt } }
//   deleted:  { id: ISO }

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

const emptyState = () => ({ version: 5, tasks: [], projects: [], ideas: [], days: {}, deleted: {} });

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

  const idea = (title, extra = {}) =>
    ({ id: uid(), title, note: '', pinned: false, converted: null, createdAt: now, seed: true, ...extra });
  s.ideas.push(
    idea('Nagrać krótki film o tym, jak zbudowałem ten panel', { pinned: true, note: 'Od pomysłu, przez wygląd, po synchronizację z GitHubem.', createdAt: addDays(t, -2) + 'T19:10:00.000Z' }),
    idea('Tracker książek i filmów w panelu', { note: 'Może kiedyś jako osobna zakładka.', createdAt: addDays(t, -5) + 'T21:00:00.000Z' }),
    idea('Wypad w góry jesienią — sprawdzić noclegi', { createdAt: addDays(t, -1) + 'T08:30:00.000Z' }),
    idea('Skrypt w Pythonie, który sam sortuje pobrane pliki', { createdAt: addDays(t, -8) + 'T17:45:00.000Z' }),
    idea('Założyć własnego bloga', { converted: { kind: 'project', id: pBlog.id, at: addDays(t, -3) }, createdAt: addDays(t, -12) + 'T22:15:00.000Z' }),
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
  s.ideas ||= [];
  s.days ||= {};
  for (const t of s.tasks) if (!('project' in t)) t.project = null;
  s.deleted ||= {};
  if ((s.version || 1) < 3) {
    // v3: nawyki zastąpione biblioteką. Przykładowe dane generujemy od nowa.
    delete s.habits;
    for (const d of Object.values(s.days)) delete d.habits;
    if (s.tasks.some((t) => t.seed)) return seedState();
  }
  // v5: biblioteka zastąpiona pomysłami
  delete s.library;
  s.version = 5;
  return s;
}

const PRISTINE_KEY = 'panel:pristine';
const nowIso = () => new Date().toISOString();

let adapter = localAdapter;
const loaded = adapter.load();
let state = migrate(loaded);
// "Dziewicze" dane = same przykłady, niczego jeszcze nie zmieniono. Takie dane przy pierwszym
// połączeniu z GitHubem zastępujemy zdalnymi zamiast je scalać (żeby przykłady nie trafiły do repo).
// Same przykłady = jest co najmniej jeden element, wszystkie są przykładowe, a dziennik nie ma własnych wpisów.
// Puste dane NIE są "dziewicze" — mogą mieć np. wpis w dzienniku zrobiony offline.
const onlySeed = (s) => {
  const items = [...s.tasks, ...s.projects, ...s.ideas];
  return items.length > 0 && items.every((x) => x.seed)
    && Object.values(s.days).every((d) => d.seed || !(d.energy || d.mood || d.note));
};
if (!loaded || (loaded.version || 1) < 3 || onlySeed(state)) setPristine(true);
adapter.save(state);
const listeners = new Set();

function setPristine(v) {
  try { v ? localStorage.setItem(PRISTINE_KEY, '1') : localStorage.removeItem(PRISTINE_KEY); } catch {}
}

export const store = {
  get state() { return state; },

  get pristine() {
    try { return localStorage.getItem(PRISTINE_KEY) === '1'; } catch { return false; }
  },

  /** fn(state, { remote }) — remote: true, gdy zmiana przyszła z synchronizacji. */
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /** Każda lokalna zmiana przechodzi tędy: mutacja -> zapis -> powiadomienie widoków i synchronizacji. */
  update(mutator) {
    mutator(state);
    setPristine(false);
    adapter.save(state);
    listeners.forEach((fn) => fn(state, { remote: false }));
  },

  clearPristine() { setPristine(false); },

  /** Podmiana całego stanu (po scaleniu z GitHubem). */
  replace(next) {
    state = migrate(next);
    adapter.save(state);
    listeners.forEach((fn) => fn(state, { remote: true }));
  },

  /* ---------- Zadania ---------- */

  task(id) { return state.tasks.find((t) => t.id === id); },

  addTask(partial) {
    const now = nowIso();
    const task = {
      id: uid(), title: '', cat: 'inbox', project: null, prio: 0, due: null, plan: null, note: '',
      done: false, doneAt: null, createdAt: now, updatedAt: now, ...partial,
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

  /* ---------- Projekty i pomysły (wspólne operacje na kolekcjach) ---------- */

  project(id) { return state.projects.find((p) => p.id === id); },

  add(coll, obj) {
    const now = nowIso();
    const item = { id: uid(), createdAt: now, ...obj, updatedAt: now };
    this.update((s) => { s[coll].push(item); });
    return item;
  },

  patch(coll, id, patch) { this.patchWhere(coll, (x) => x.id === id, patch); },

  patchWhere(coll, pred, patch) {
    const now = nowIso();
    this.update((s) => {
      for (const x of s[coll]) if (pred(x)) Object.assign(x, patch, { updatedAt: now });
    });
  },

  /** Usuwa i zwraca funkcję cofającą. */
  remove(coll, id) {
    const idx = state[coll].findIndex((x) => x.id === id);
    if (idx < 0) return () => {};
    const removed = state[coll][idx];
    this.update((s) => {
      s[coll].splice(idx, 1);
      s.deleted[id] = nowIso();
    });
    return () => this.update((s) => {
      delete s.deleted[id];
      s[coll].splice(Math.min(idx, s[coll].length), 0, { ...removed, updatedAt: nowIso() });
    });
  },

  /* ---------- Dni: fokus i dziennik ---------- */

  day(date = today()) { return state.days[date] || {}; },

  patchDay(date, patch) {
    this.update((s) => { s.days[date] = { ...(s.days[date] || {}), ...patch, updatedAt: nowIso() }; });
  },

  setFocus(id, date = today()) { this.patchDay(date, { focus: id }); },

  /* ---------- Przykładowe dane ---------- */

  hasSeed() {
    return [state.tasks, state.projects, state.ideas].some((list) => list.some((x) => x.seed));
  },

  clearSeed() {
    const now = nowIso();
    this.update((s) => {
      const seedIds = [s.tasks, s.projects, s.ideas].flatMap((list) => list.filter((x) => x.seed).map((x) => x.id));
      const ids = new Set(seedIds);
      for (const id of seedIds) s.deleted[id] = now;
      s.tasks = s.tasks.filter((t) => !t.seed);
      s.projects = s.projects.filter((p) => !p.seed);
      s.ideas = s.ideas.filter((x) => !x.seed);
      for (const t of s.tasks) if (ids.has(t.project)) Object.assign(t, { project: null, updatedAt: now });
      for (const d of Object.values(s.days)) {
        const touched = ids.has(d.focus) || d.seed;
        if (ids.has(d.focus)) delete d.focus;
        if (d.seed) { delete d.energy; delete d.mood; delete d.note; delete d.seed; }
        if (touched) d.updatedAt = now;
      }
    });
  },
};

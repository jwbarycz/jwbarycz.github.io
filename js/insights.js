// Wyliczenia i pomocnicze dla projektów, biblioteki i dziennika.

import { store } from './store.js';
import { today, addDays } from './utils.js';

/* ---------- Projekty ---------- */

export const PROJECT_STATUSES = [
  { id: 'aktywny', name: 'aktywny' },
  { id: 'wstrzymany', name: 'wstrzymany' },
  { id: 'zakończony', name: 'zakończony' },
];

export function projectStats(projectId) {
  const tasks = store.state.tasks.filter((t) => t.project === projectId);
  const done = tasks.filter((t) => t.done).length;
  const open = tasks.filter((t) => !t.done);
  const nextDue = open.map((t) => t.due).filter(Boolean).sort()[0] || null;
  const lastDone = tasks.filter((t) => t.done).map((t) => t.doneAt).sort().pop() || null;
  return { tasks, total: tasks.length, done, open: open.length, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0, nextDue, lastDone };
}

/* ---------- Biblioteka ---------- */

export const LIBRARY_KINDS = ['książka', 'film', 'serial', 'kurs', 'artykuł', 'podcast'];

export const LIBRARY_STATUSES = [
  { id: 'w trakcie', title: 'W trakcie' },
  { id: 'kolejka', title: 'Kolejka' },
  { id: 'skończone', title: 'Skończone' },
  { id: 'porzucone', title: 'Porzucone' },
];

const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

/**
 * "Diuna — Frank Herbert #ks" → { title: 'Diuna', author: 'Frank Herbert', kind: 'książka' }
 * Autor po " — " albo " - ", rodzaj po "#" (wystarczy początek).
 */
export function parseLibrary(input) {
  let text = input.trim();
  let kind = 'książka';
  text = text.replace(/(^|\s)#(\S+)/g, (m, sp, tok) => {
    const k = LIBRARY_KINDS.find((x) => fold(x).startsWith(fold(tok)));
    if (!k) return m;
    kind = k;
    return '';
  }).trim();
  const [title, ...rest] = text.split(/\s+[—–-]\s+/);
  return { title: title.trim(), author: rest.join(' – ').trim(), kind };
}

export const stars = (n) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');

export function finishedThisYear() {
  const y = String(new Date().getFullYear());
  return store.state.library.filter((x) => x.status === 'skończone' && x.finishedAt?.startsWith(y)).length;
}

/* ---------- Dziennik ---------- */

export function journalEntries() {
  return Object.entries(store.state.days)
    .filter(([, d]) => d.energy || d.mood || d.note)
    .map(([date, d]) => ({ date, ...d }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Seria energii z ostatnich n dni (null = brak wpisu). */
export function energySeries(days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today(), i - days + 1);
    return { date, value: store.day(date).energy ?? null };
  });
}

export function avg(values) {
  const v = values.filter((x) => x != null);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
}

export const MOOD_NAMES = ['', 'źle', 'słabo', 'ok', 'dobrze', 'super'];

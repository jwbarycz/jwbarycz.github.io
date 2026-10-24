// Derived data for projects and the journal.

import { store } from './store.js';
import { today, addDays } from './utils.js';

/* ---------- Projects ---------- */

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

/* ---------- Journal ---------- */

export function journalEntries() {
  return Object.entries(store.state.days)
    .filter(([, d]) => d.energy || d.mood || d.note)
    .map(([date, d]) => ({ date, ...d }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Energy series for the last n days (null = no entry). */
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

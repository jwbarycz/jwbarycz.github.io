// Task logic: quick-add parser, selectors, sorting.

import { config } from './config.js';
import { store } from './store.js';
import { today, fold, parseDateToken } from './utils.js';

function matchProject(tok) {
  const t = fold(tok);
  const active = store.state.projects.filter((p) => p.status !== 'zakończony');
  return active.find((p) => fold(p.name).startsWith(t)) || active.find((p) => fold(p.name).includes(t));
}

function matchCategory(tok) {
  const t = fold(tok);
  return config.categories.find((c) => fold(c.id).startsWith(t) || fold(c.name).startsWith(t));
}

/**
 * "Zadzwonić do banku !2 #adm @pt" →
 * { title: 'Zadzwonić do banku', prio: 2, cat: 'administracja', due: '2026-10-30' }
 * `^dzis` / `^jutro` plans the task for a day (without a due date), `+name` assigns a project.
 */
export function parseQuick(input) {
  const out = {};
  const words = [];
  for (const w of input.trim().split(/\s+/)) {
    let m;
    if ((m = w.match(/^!([1-3])$/))) out.prio = Number(m[1]);
    else if (/^!{1,3}$/.test(w)) out.prio = w.length;
    else if (w.length > 1 && w[0] === '#' && matchCategory(w.slice(1))) out.cat = matchCategory(w.slice(1)).id;
    else if (w.length > 1 && w[0] === '@' && parseDateToken(w.slice(1))) out.due = parseDateToken(w.slice(1));
    else if (w.length > 1 && w[0] === '^' && parseDateToken(w.slice(1))) out.plan = parseDateToken(w.slice(1));
    else if (w.length > 1 && w[0] === '+' && matchProject(w.slice(1))) out.project = matchProject(w.slice(1)).id;
    else words.push(w);
  }
  out.title = words.join(' ');
  return out;
}

/* ---------- Selectors ---------- */

const t0 = () => today();

export const isOverdue = (t) => !t.done && t.due && t.due < t0();

/** Task belongs to today's plan (overdue plans roll over to today). */
export const isForToday = (t) =>
  t.done ? t.doneAt === t0() && ((t.plan && t.plan <= t0()) || (t.due && t.due <= t0()))
         : (t.plan && t.plan <= t0()) || (t.due && t.due <= t0());

export const isUpcoming = (t) => !t.done && !isForToday(t) && (t.plan || t.due);
export const isSomeday = (t) => !t.done && !t.plan && !t.due;

/** Date shown in the left column of the list. */
export const displayDate = (t) => (t.done ? t.doneAt : t.due || t.plan || null);

export function sortTasks(list) {
  return [...list].sort((a, b) =>
    (a.done - b.done) ||
    (b.prio - a.prio) ||
    String(a.due || a.plan || '9999').localeCompare(String(b.due || b.plan || '9999')) ||
    String(b.createdAt).localeCompare(String(a.createdAt)));
}

export const sortDone = (list) =>
  [...list].sort((a, b) => String(b.doneAt).localeCompare(String(a.doneAt)));

export function groupByCategory(list) {
  return config.categories
    .map((c) => ({ cat: c, tasks: list.filter((t) => t.cat === c.id) }));
}

export const prioMark = (p) => (p ? '!'.repeat(p) : '');

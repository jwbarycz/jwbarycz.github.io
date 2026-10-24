// Logika zadań: parser szybkiego dodawania, selektory, sortowanie.

import { config } from './config.js';
import { store } from './store.js';
import { today, addDays, parseIso, pad } from './utils.js';

const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

const WEEKDAY_TOKENS = { nd: 0, nie: 0, pn: 1, pon: 1, wt: 2, sr: 3, cz: 4, czw: 4, pt: 5, pia: 5, sb: 6, sob: 6 };

function parseDateToken(tok) {
  const t = fold(tok);
  const now = today();
  if (t === 'dzis' || t === 'dzisiaj') return now;
  if (t === 'jutro') return addDays(now, 1);
  if (t === 'pojutrze') return addDays(now, 2);
  if (t === 'tydzien') return addDays(now, 7);
  if (t in WEEKDAY_TOKENS) {
    const cur = parseIso(now).getDay();
    const diff = (WEEKDAY_TOKENS[t] - cur + 7) % 7 || 7;
    return addDays(now, diff);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/);
  if (m) {
    const y = m[3] ? Number(m[3]) : new Date().getFullYear();
    let iso = `${y}-${pad(m[2])}-${pad(m[1])}`;
    if (!m[3] && iso < now) iso = `${y + 1}-${pad(m[2])}-${pad(m[1])}`;
    return iso;
  }
  return null;
}

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
 * `^dzis` / `^jutro` planuje zadanie na dany dzień (bez terminu), `+nazwa` przypisuje projekt.
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

/* ---------- Selektory ---------- */

const t0 = () => today();

export const isOverdue = (t) => !t.done && t.due && t.due < t0();

/** Zadanie należy do dzisiejszego planu (zaległe plany przechodzą na dziś). */
export const isForToday = (t) =>
  t.done ? t.doneAt === t0() && ((t.plan && t.plan <= t0()) || (t.due && t.due <= t0()))
         : (t.plan && t.plan <= t0()) || (t.due && t.due <= t0());

export const isUpcoming = (t) => !t.done && !isForToday(t) && (t.plan || t.due);
export const isSomeday = (t) => !t.done && !t.plan && !t.due;

/** Data, którą pokazujemy w lewej kolumnie listy. */
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

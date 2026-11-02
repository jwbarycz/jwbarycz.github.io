// Study logic: deadline kinds, urgency, when to start preparing and today's portion.
// Pure functions (no store access) — testable in Node.

import { config } from './config.js';
import { today, addDays, daysBetween, fold, parseDateToken } from './utils.js';

const KINDS = config.study.kinds;

export const kindById = (id) => KINDS.find((k) => k.id === id) || KINDS[KINDS.length - 1];

/** Days of preparation: explicit value, or the kind's default scaled by weight. */
export function prepDays(item) {
  if (item.prepDays != null && item.prepDays !== '') return Math.max(0, Number(item.prepDays));
  const factor = config.study.weightFactor[item.weight || 2] ?? 1;
  return Math.max(1, Math.round(kindById(item.kind).prepDays * factor));
}

export const startDate = (item) => (item.date ? addDays(item.date, -prepDays(item)) : null);

export function scopeProgress(item) {
  const total = item.scope?.length || 0;
  const done = item.scope?.filter((t) => t.done).length || 0;
  return { done, total, left: total - done, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** "dziś", "jutro", "za 5 dni", "2 dni temu". */
export function inDays(n) {
  if (n === 0) return 'dziś';
  if (n === 1) return 'jutro';
  if (n === -1) return 'wczoraj';
  return n > 0 ? `za ${n} dni` : `${-n} dni temu`;
}

/**
 * How urgent an item is, from the deadline and the preparation window.
 * rank: lower = more urgent (used for sorting).
 */
export function urgency(item, now = today()) {
  if (item.done) return { level: 'done', rank: 9, label: 'zrobione' };
  if (!item.date) return { level: 'nodate', rank: 6, label: 'bez daty' };
  const daysLeft = daysBetween(now, item.date);
  const start = startDate(item);
  const startIn = daysBetween(now, start);
  const base = { daysLeft, start, startIn };
  if (daysLeft < 0) return { ...base, level: 'overdue', rank: 0, label: 'po terminie' };
  if (daysLeft <= 2) return { ...base, level: 'critical', rank: 1, label: daysLeft === 0 ? 'dziś!' : 'ostatnia chwila' };
  if (startIn <= 0) return { ...base, level: 'now', rank: 2, label: 'czas się uczyć' };
  if (startIn <= 7) return { ...base, level: 'soon', rank: 3, label: `zacznij ${inDays(startIn)}` };
  return { ...base, level: 'later', rank: 4, label: 'spokojnie' };
}

/** How many topics to cover today to finish the day before the deadline (null when not studying yet). */
export function dailyPortion(item, now = today()) {
  const u = urgency(item, now);
  if (!['now', 'critical'].includes(u.level)) return null;
  const { left } = scopeProgress(item);
  if (!left) return 0;
  return Math.ceil(left / Math.max(1, u.daysLeft));
}

export function sortByUrgency(list, now = today()) {
  return [...list].sort((a, b) => {
    const ua = urgency(a, now), ub = urgency(b, now);
    return (ua.rank - ub.rank) || String(a.date || '9999').localeCompare(String(b.date || '9999')) || (b.weight - a.weight);
  });
}

export const sortByDate = (list) =>
  [...list].sort((a, b) => String(a.date || '9999').localeCompare(String(b.date || '9999')) || (b.weight - a.weight));

/** Name shown for an item: its own title, or the kind ("Egzamin"). */
export const itemTitle = (item) => item.title || kindById(item.kind).name;

/**
 * Quick add: "Kolokwium 1 #kol +stat @12.11 !3" →
 * { title: 'Kolokwium 1', kind: 'kolokwium', subject: <id>, date: '2026-11-12', weight: 3 }
 * Without #kind it's a "zadanie". Subjects match by a prefix of the name (diacritics ignored).
 */
export function parseStudy(input, subjects = []) {
  const out = { kind: 'zadanie', weight: 2 };
  const words = [];
  for (const w of input.trim().split(/\s+/)) {
    const rest = w.slice(1);
    let m;
    if ((m = w.match(/^!([1-3])$/))) out.weight = Number(m[1]);
    else if (/^!{1,3}$/.test(w)) out.weight = w.length;
    else if (w[0] === '#' && rest && KINDS.some((k) => k.token.startsWith(fold(rest)) || fold(k.name).startsWith(fold(rest)))) {
      out.kind = KINDS.find((k) => k.token.startsWith(fold(rest)) || fold(k.name).startsWith(fold(rest))).id;
    } else if (w[0] === '+' && rest && matchSubject(rest, subjects)) out.subject = matchSubject(rest, subjects).id;
    else if (w[0] === '@' && rest && parseDateToken(rest)) out.date = parseDateToken(rest);
    else words.push(w);
  }
  out.title = words.join(' ');
  // "Egzamin" on its own is just the kind, not a title
  if (fold(out.title) === fold(kindById(out.kind).name)) out.title = '';
  return out;
}

function matchSubject(tok, subjects) {
  const t = fold(tok);
  return subjects.find((s) => fold(s.name).startsWith(t))
    || subjects.find((s) => fold(s.name).split(/\s+/).some((w) => w.startsWith(t)));
}

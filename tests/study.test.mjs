// Run: node tests/study.test.mjs
import assert from 'node:assert/strict';
import { prepDays, startDate, urgency, dailyPortion, sortByUrgency, parseStudy, scopeProgress, inDays } from '../js/study.js';

const NOW = '2026-11-02';
const item = (extra) => ({ id: Math.random().toString(36), kind: 'egzamin', date: '2026-11-30', weight: 2, prepDays: null, scope: [], done: false, ...extra });

// Preparation window: kind default × weight, or an explicit number
assert.equal(prepDays(item()), 14);
assert.equal(prepDays(item({ weight: 3 })), 21);
assert.equal(prepDays(item({ weight: 1 })), 7);
assert.equal(prepDays(item({ prepDays: 4 })), 4);
assert.equal(prepDays(item({ kind: 'zadanie', weight: 1 })), 1); // never less than a day
assert.equal(startDate(item()), '2026-11-16');

// Urgency levels
assert.equal(urgency(item({ date: '2026-11-01' }), NOW).level, 'overdue');
assert.equal(urgency(item({ date: '2026-11-02' }), NOW).label, 'dziś!');
assert.equal(urgency(item({ date: '2026-11-04' }), NOW).level, 'critical');
assert.equal(urgency(item({ date: '2026-11-10' }), NOW).level, 'now');       // start was 27.10
const soon = urgency(item({ date: '2026-11-20' }), NOW);                       // start 06.11
assert.equal(soon.level, 'soon');
assert.equal(soon.label, 'zacznij za 4 dni');
assert.equal(urgency(item({ date: '2027-01-30' }), NOW).level, 'later');
assert.equal(urgency(item({ done: true }), NOW).level, 'done');
assert.equal(urgency(item({ date: '' }), NOW).level, 'nodate');

// Today's portion: remaining topics spread over the days left
const topics = (n, done = 0) => Array.from({ length: n }, (_, i) => ({ id: String(i), text: `t${i}`, done: i < done }));
assert.equal(dailyPortion(item({ date: '2026-11-06', scope: topics(9, 1) }), NOW), 2); // 8 left / 4 days
assert.equal(dailyPortion(item({ date: '2026-11-02', scope: topics(5) }), NOW), 5);    // exam today: everything
assert.equal(dailyPortion(item({ date: '2027-01-30', scope: topics(5) }), NOW), null); // too early
assert.deepEqual(scopeProgress(item({ scope: topics(4, 1) })), { done: 1, total: 4, left: 3, pct: 25 });

// Sorting: overdue → last minute → studying now → soon → later → done
const list = [
  item({ id: 'later', date: '2027-01-30' }),
  item({ id: 'done', done: true }),
  item({ id: 'now', date: '2026-11-10' }),
  item({ id: 'overdue', date: '2026-10-30' }),
  item({ id: 'critical', date: '2026-11-03' }),
  item({ id: 'soon', date: '2026-11-20' }),
];
assert.deepEqual(sortByUrgency(list, NOW).map((x) => x.id), ['overdue', 'critical', 'now', 'soon', 'later', 'done']);

// Quick add
const subjects = [{ id: 'm', name: 'Mikroekonomia' }, { id: 's', name: 'Statystyka opisowa' }];
assert.deepEqual(parseStudy('Kolokwium 1 #kol +stat @2026-11-12 !3', subjects),
  { kind: 'kolokwium', weight: 3, subject: 's', date: '2026-11-12', title: 'Kolokwium 1' });
assert.deepEqual(parseStudy('Egzamin #egz +mikro @2027-02-01', subjects),
  { kind: 'egzamin', weight: 2, subject: 'm', date: '2027-02-01', title: '' });
assert.equal(parseStudy('przeczytać rozdział 3 +opis', subjects).subject, 's'); // matches a later word too
assert.equal(parseStudy('coś #nieznane', subjects).title, 'coś #nieznane');
assert.equal(inDays(5), 'za 5 dni');

console.log('study: all tests passed');

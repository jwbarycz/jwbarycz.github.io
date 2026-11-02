// Run: node tests/merge.test.mjs
import assert from 'node:assert/strict';
import { mergeStates, sameData } from '../js/merge.js';

const T = (n) => `2026-10-24T10:00:${String(n).padStart(2, '0')}.000Z`;
const base = { version: 6, tasks: [], projects: [], ideas: [], subjects: [], study: [], days: {}, deleted: {} };
const now = Date.parse('2026-10-24T12:00:00Z');

// Edits to the same item: the newer one wins, regardless of argument order
let a = { ...base, tasks: [{ id: 't1', title: 'A', createdAt: T(0), updatedAt: T(5) }] };
let b = { ...base, tasks: [{ id: 't1', title: 'B', createdAt: T(0), updatedAt: T(9) }] };
assert.equal(mergeStates(a, b, now).tasks[0].title, 'B');
assert.equal(mergeStates(b, a, now).tasks[0].title, 'B');

// Different items from two devices are combined, newest task first
a = { ...base, tasks: [{ id: 't1', createdAt: T(1) }] };
b = { ...base, tasks: [{ id: 't2', createdAt: T(2) }] };
assert.deepEqual(mergeStates(a, b, now).tasks.map((t) => t.id), ['t2', 't1']);

// A deletion beats earlier edits; a later edit brings the item back
a = { ...base, deleted: { t1: T(8) } };
b = { ...base, tasks: [{ id: 't1', createdAt: T(0), updatedAt: T(5) }] };
assert.equal(mergeStates(a, b, now).tasks.length, 0);
b.tasks[0].updatedAt = T(9);
assert.equal(mergeStates(a, b, now).tasks.length, 1);

// Days: the newer entry wins as a whole, different dates are combined
a = { ...base, days: { '2026-10-24': { energy: 5, updatedAt: T(1) }, '2026-10-23': { energy: 3 } } };
b = { ...base, days: { '2026-10-24': { energy: 8, updatedAt: T(4) } } };
const m = mergeStates(a, b, now);
assert.equal(m.days['2026-10-24'].energy, 8);
assert.equal(m.days['2026-10-23'].energy, 3);

// Study items and subjects are merged like the other collections
a = { ...base, subjects: [{ id: 's1', name: 'Mikro', createdAt: T(0) }], study: [{ id: 'x', kind: 'egzamin', createdAt: T(0), updatedAt: T(1) }] };
b = { ...base, study: [{ id: 'x', kind: 'egzamin', grade: '5', createdAt: T(0), updatedAt: T(3) }] };
const ms = mergeStates(a, b, now);
assert.equal(ms.subjects.length, 1);
assert.equal(ms.study[0].grade, '5');

// Old deletion markers are forgotten, fresh ones kept
a = { ...base, deleted: { old: '2026-01-01T00:00:00Z', fresh: T(0) } };
assert.deepEqual(Object.keys(mergeStates(a, base, now).deleted), ['fresh']);

// Merging is idempotent; sameData ignores key order
const once = mergeStates(a, b, now);
assert.ok(sameData(once, mergeStates(once, b, now)));
assert.ok(sameData({ x: 1, y: [1, { a: 1, b: 2 }] }, { y: [1, { b: 2, a: 1 }], x: 1 }));
assert.ok(!sameData({ x: 1 }, { x: 2 }));

console.log('merge: all tests passed');

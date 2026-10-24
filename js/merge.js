// Scalanie dwóch wersji danych (np. z telefonu i z komputera).
// Zasada: dla każdego elementu wygrywa nowsza zmiana (updatedAt), a usunięcie
// wygrywa ze zmianami, które były przed nim. Bez zależności — da się testować w Node.

const COLLECTIONS = ['tasks', 'projects', 'library'];
// Ślady usunięć starsze niż pół roku można zapomnieć
const TOMBSTONE_TTL_MS = 180 * 86400000;

const stamp = (x) => x.updatedAt || x.createdAt || '';
const newer = (a, b) => (stamp(b) > stamp(a) ? b : a);

function mergeDeleted(a = {}, b = {}, now = Date.now()) {
  const out = {};
  for (const src of [a, b]) {
    for (const [id, at] of Object.entries(src)) {
      if (now - Date.parse(at) > TOMBSTONE_TTL_MS) continue;
      if (!out[id] || at > out[id]) out[id] = at;
    }
  }
  return out;
}

function mergeList(a = [], b = [], deleted) {
  const byId = new Map();
  for (const x of [...a, ...b]) {
    byId.set(x.id, byId.has(x.id) ? newer(byId.get(x.id), x) : x);
  }
  return [...byId.values()].filter((x) => !(deleted[x.id] && deleted[x.id] >= stamp(x)));
}

function mergeDays(a = {}, b = {}) {
  const out = { ...a };
  for (const [date, d] of Object.entries(b)) out[date] = out[date] ? newer(out[date], d) : d;
  return out;
}

const byCreated = (dir) => (x, y) => dir * String(x.createdAt).localeCompare(String(y.createdAt));

export function mergeStates(a, b, now = Date.now()) {
  const deleted = mergeDeleted(a.deleted, b.deleted, now);
  const out = { version: Math.max(a.version || 1, b.version || 1), deleted, days: mergeDays(a.days, b.days) };
  for (const c of COLLECTIONS) out[c] = mergeList(a[c], b[c], deleted);
  // Kolejność jak w aplikacji: zadania od najnowszych, reszta od najstarszych
  out.tasks.sort(byCreated(-1));
  out.projects.sort(byCreated(1));
  out.library.sort(byCreated(1));
  return out;
}

/** Porównanie treści (bez kolejności kluczy) — żeby nie robić pustych commitów. */
export function sameData(a, b) {
  return canonical(a) === canonical(b);
}

function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

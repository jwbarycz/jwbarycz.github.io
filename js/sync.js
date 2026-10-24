// Synchronizacja z prywatnym repo na GitHubie (domyślnie jwbarycz/panel-data).
//
// Dane leżą w jednym pliku data.json. Każdy zapis to commit przez GitHub Contents API.
// Cykl: pobierz plik -> scal z lokalnymi danymi (merge.js) -> zapisz wynik lokalnie
// -> jeśli coś się zmieniło, wyślij commit. Gdy w międzyczasie inne urządzenie
// zapisało swoją wersję (konflikt sha), cykl powtarza się od pobrania.

import { config } from './config.js';
import { store } from './store.js';
import { mergeStates, sameData } from './merge.js';

const API = 'https://api.github.com';
const FILE = 'data.json';
const TOKEN_KEY = 'panel:github-token';
const DIRTY_KEY = 'panel:dirty';
const PUSH_DELAY_MS = 2000;
const POLL_MS = 3 * 60 * 1000;

const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};

class SyncError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; }
}

/* ---------- Status (dla plakietki i ustawień) ---------- */

const status = { state: 'local', message: '', lastSync: null };
const statusListeners = new Set();

function setStatus(state, message = '') {
  Object.assign(status, { state, message });
  if (state === 'ok') status.lastSync = new Date();
  statusListeners.forEach((fn) => fn({ ...status }));
}

/* ---------- GitHub Contents API ---------- */

const repoPath = () => `${API}/repos/${config.github.owner}/${config.github.dataRepo}`;

async function gh(path, { token, method = 'GET', body, accept = 'application/vnd.github+json', keepalive = false } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      cache: 'no-store',
      keepalive,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: accept,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new SyncError('offline', 'Brak połączenia z GitHubem');
  }
  if (res.status === 401) throw new SyncError('auth', 'Token jest nieprawidłowy albo wygasł');
  if (res.status === 403) throw new SyncError('auth', 'Token nie ma uprawnień do zapisu (Contents: Read and write) albo przekroczono limit zapytań');
  return res;
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

const fileUrl = () => `${repoPath()}/contents/${FILE}?ref=${encodeURIComponent(config.github.branch)}`;

/** → { data, sha } albo null, gdy pliku jeszcze nie ma. */
async function readRemote(token) {
  const res = await gh(fileUrl(), { token });
  if (res.status === 404) return null;
  if (!res.ok) throw new SyncError('error', `GitHub odpowiedział ${res.status} przy pobieraniu danych`);
  const meta = await res.json();
  let text;
  if (meta.encoding === 'base64' && meta.content) {
    text = fromBase64(meta.content);
  } else {
    // Pliki > 1 MB API zwraca bez treści — wtedy pobieramy surową zawartość
    const raw = await gh(fileUrl(), { token, accept: 'application/vnd.github.raw+json' });
    text = await raw.text();
  }
  try {
    return { data: JSON.parse(text), sha: meta.sha };
  } catch {
    throw new SyncError('error', `${FILE} w repo nie jest poprawnym JSON-em — popraw go ręcznie na GitHubie`);
  }
}

/** Zapisuje plik; zwraca false przy konflikcie (ktoś zapisał w międzyczasie). */
async function writeRemote(token, data, sha, { keepalive = false } = {}) {
  const stampText = new Date().toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
  const res = await gh(`${repoPath()}/contents/${FILE}`, {
    token,
    method: 'PUT',
    keepalive,
    body: {
      message: `panel: zapis ${stampText}`,
      content: toBase64(JSON.stringify(data, null, 2) + '\n'),
      branch: config.github.branch,
      ...(sha ? { sha } : {}),
    },
  });
  if (res.status === 409 || res.status === 422) return false;
  if (!res.ok) throw new SyncError('error', `GitHub odpowiedział ${res.status} przy zapisie`);
  return true;
}

/* ---------- Cykl synchronizacji ---------- */

async function syncOnce(token, { keepalive = false } = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const remote = await readRemote(token);
    const local = store.state;
    let next;
    if (!remote) next = local;
    else if (store.pristine) next = remote.data; // nowe urządzenie: bierzemy dane z repo zamiast przykładów
    else next = mergeStates(local, remote.data);

    if (!sameData(next, local)) store.replace(next);
    if (store.pristine && remote) store.clearPristine();

    if (remote && sameData(next, remote.data)) return;
    if (await writeRemote(token, store.state, remote?.sha, { keepalive })) {
      store.clearPristine();
      return;
    }
  }
  throw new SyncError('error', 'Nie udało się zapisać po kilku próbach (ciągłe konflikty)');
}

let chain = Promise.resolve();
let pushTimer = null;

/** Synchronizacje idą jedna po drugiej, nigdy równolegle. */
function enqueue(opts) {
  const token = ls.get(TOKEN_KEY);
  if (!token) return chain;
  chain = chain.then(async () => {
    setStatus('syncing');
    try {
      await syncOnce(token, opts);
      ls.set(DIRTY_KEY, null);
      setStatus('ok');
    } catch (e) {
      setStatus(e.kind === 'offline' ? 'offline' : 'error', e.message);
    }
  });
  return chain;
}

/* ---------- API dla reszty aplikacji ---------- */

export const sync = {
  get status() { return { ...status }; },
  get connected() { return !!ls.get(TOKEN_KEY); },
  get dirty() { return ls.get(DIRTY_KEY) === '1'; },

  onStatus(fn) { statusListeners.add(fn); return () => statusListeners.delete(fn); },

  /** Sprawdza token i dostęp do repo, zapisuje go i robi pierwszą synchronizację. */
  async connect(token) {
    token = token.trim();
    const res = await gh(repoPath(), { token }).catch((e) => e);
    if (res instanceof SyncError) return { ok: false, message: res.message };
    if (res.status === 404) return { ok: false, message: `Token nie widzi repo ${config.github.owner}/${config.github.dataRepo} — sprawdź „Repository access”` };
    if (!res.ok) return { ok: false, message: `GitHub odpowiedział ${res.status}` };
    ls.set(TOKEN_KEY, token);
    await enqueue();
    return status.state === 'ok' ? { ok: true } : { ok: false, message: status.message };
  },

  disconnect() {
    clearTimeout(pushTimer);
    ls.set(TOKEN_KEY, null);
    ls.set(DIRTY_KEY, null);
    setStatus('local');
  },

  now() { clearTimeout(pushTimer); return enqueue(); },

  start() {
    // Lokalna zmiana -> po chwili ciszy wysyłamy (kilka szybkich zmian = jeden commit)
    store.subscribe((_, { remote }) => {
      if (remote || !this.connected) return;
      ls.set(DIRTY_KEY, '1');
      setStatus('pending', 'Zmiany czekają na wysłanie');
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => enqueue(), PUSH_DELAY_MS);
    });

    const stale = () => !status.lastSync || Date.now() - status.lastSync > 20_000;
    document.addEventListener('visibilitychange', () => {
      if (!this.connected) return;
      if (document.visibilityState === 'hidden' && this.dirty) {
        // Zamykasz kartę / chowasz aplikację: wyślij od razu, nie czekaj na timer
        clearTimeout(pushTimer);
        enqueue({ keepalive: true });
      } else if (document.visibilityState === 'visible' && stale()) {
        enqueue();
      }
    });
    window.addEventListener('online', () => enqueue());
    setInterval(() => { if (document.visibilityState === 'visible') enqueue(); }, POLL_MS);

    if (this.connected) enqueue();
    else setStatus('local');
  },
};

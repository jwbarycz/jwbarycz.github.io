// Small helpers: dates, HTML, ids.

export const pad = (n) => String(n).padStart(2, '0');

/** Local date as 'YYYY-MM-DD'. */
export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseIso(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export const today = () => isoDate();

export function daysBetween(fromIso, toIso) {
  return Math.round((parseIso(toIso) - parseIso(fromIso)) / 86400000);
}

const WEEKDAYS_SHORT = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
const WEEKDAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const MONTHS_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca',
  'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

export function longDate(iso = today()) {
  const d = parseIso(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

/** ISO-8601 week number. */
export function isoWeek(iso = today()) {
  const d = parseIso(iso);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}

/** Short human-friendly date (in Polish): "dziś", "jutro", "pt 30.10", "3 dni temu". */
export function relDate(iso) {
  if (!iso) return '';
  const diff = daysBetween(today(), iso);
  if (diff === 0) return 'dziś';
  if (diff === 1) return 'jutro';
  if (diff === -1) return 'wczoraj';
  if (diff < 0) return `${-diff} dni temu`;
  const d = parseIso(iso);
  if (diff < 7) return `${WEEKDAYS_SHORT[d.getDay()]} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}${d.getFullYear() !== new Date().getFullYear() ? '.' + d.getFullYear() : ''}`;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Safe HTML fragment — not escaped again when nested. */
class SafeHtml extends String {}

/** Tagged template that escapes values (except nested `html` / `raw`). */
export function html(strings, ...values) {
  return new SafeHtml(strings.reduce((out, str, i) => {
    const v = values[i - 1];
    const s = Array.isArray(v) ? v.map(asHtml).join('') : asHtml(v);
    return out + s + str;
  }));
}
const asHtml = (v) => (v instanceof SafeHtml ? String(v) : v === false || v == null ? '' : esc(v));
export const raw = (value) => new SafeHtml(String(value));

export const plural = (n, one, few, many) => {
  if (n === 1) return one;
  const d = n % 10, t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
};

/* ---------- Parsing user input ---------- */

/** Lowercase without Polish diacritics — for matching user input. */
export const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

const WEEKDAY_TOKENS = { nd: 0, nie: 0, pn: 1, pon: 1, wt: 2, sr: 3, cz: 4, czw: 4, pt: 5, pia: 5, sb: 6, sob: 6 };

/** "dziś", "jutro", "pt", "30.10", "2026-11-02" → 'YYYY-MM-DD' (or null). */
export function parseDateToken(tok) {
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

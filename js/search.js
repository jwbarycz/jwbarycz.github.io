// Search modal (Cmd/Ctrl + K): tasks, projects, ideas and journal notes.
// Matching ignores case and Polish diacritics; every query word has to match.

import { store } from './store.js';
import { html, raw, esc, plural } from './utils.js';
import { openTaskDialog, openIdeaDialog } from './components.js';
import { ui as journalUi } from './views/journal.js';

const LIMIT = 20;

/* ---------- Text helpers ---------- */

/** Folds one character (code point) at a time, so folded indexes match the original ones. */
const foldChar = (c) => (c === 'ł' || c === 'Ł' ? 'l' : c.normalize('NFD').charAt(0).toLowerCase());
const fold = (s) => Array.from(s, foldChar).join('');

/** Wraps matched words in <mark>, escaping everything else. */
function highlight(text, terms) {
  const chars = Array.from(text);
  const f = chars.map(foldChar).join('');
  const marks = new Array(chars.length).fill(false);
  for (const t of terms) {
    let i = f.indexOf(t);
    while (i !== -1) { marks.fill(true, i, i + t.length); i = f.indexOf(t, i + t.length); }
  }
  let out = '';
  let open = false;
  chars.forEach((c, i) => {
    if (marks[i] && !open) { out += '<mark>'; open = true; }
    if (!marks[i] && open) { out += '</mark>'; open = false; }
    out += esc(c);
  });
  return raw(out + (open ? '</mark>' : ''));
}

/** Cuts a long text down to a window around the first match. */
function snippet(text, terms, size = 140) {
  const chars = Array.from(text);
  if (chars.length <= size) return text;
  const f = chars.map(foldChar).join('');
  const first = Math.min(...terms.map((t) => f.indexOf(t)).filter((i) => i >= 0), chars.length);
  const start = Math.max(0, Math.min(first - 40, chars.length - size));
  return (start > 0 ? '…' : '') + chars.slice(start, start + size).join('') + (start + size < chars.length ? '…' : '');
}

/* ---------- Index ---------- */

function documents() {
  const s = store.state;
  return [
    ...s.tasks.map((t) => ({ kind: 'zadanie', id: t.id, title: t.title, body: t.note || '', date: t.doneAt || t.due || t.plan || t.createdAt, done: t.done })),
    ...s.projects.map((p) => ({ kind: 'projekt', id: p.id, title: p.name, body: p.desc || '', date: p.createdAt })),
    ...s.ideas.map((x) => ({ kind: 'pomysł', id: x.id, title: x.title, body: x.note || '', date: x.createdAt })),
    ...Object.entries(s.days)
      .filter(([, d]) => d.note)
      .map(([date, d]) => ({ kind: 'dziennik', id: date, title: `Dziennik ${date}`, body: d.note, date })),
  ];
}

function search(query) {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return { terms, results: [] };
  const results = [];
  for (const doc of documents()) {
    const title = fold(doc.title);
    const body = fold(doc.body);
    if (!terms.every((t) => title.includes(t) || body.includes(t))) continue;
    // Title hits and word starts rank higher, open tasks above done ones, newer above older
    let score = 0;
    for (const t of terms) {
      if (title.includes(t)) score += 10 + (title.startsWith(t) || title.includes(' ' + t) ? 5 : 0);
      else score += 3;
    }
    if (doc.done) score -= 4;
    results.push({ ...doc, score });
  }
  results.sort((a, b) => b.score - a.score || String(b.date).localeCompare(String(a.date)));
  return { terms, results };
}

/* ---------- Modal ---------- */

const dlg = () => document.getElementById('search-dialog');
let current = [];
let selected = 0;

function resultsInfo(total) {
  if (!total) return 'Brak wyników';
  const n = `${total} ${plural(total, 'wynik', 'wyniki', 'wyników')}`;
  return total > LIMIT ? `${n} · pokazuję pierwsze ${LIMIT}` : n;
}

function renderResults(query) {
  const box = dlg().querySelector('#search-results');
  const { terms, results } = search(query);
  current = results.slice(0, LIMIT);
  selected = 0;
  dlg().querySelector('.clear-button').hidden = !query;
  if (!terms.length) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = html`
    <div class="results-info" role="status" aria-live="polite">${resultsInfo(results.length)}</div>
    <div class="results" role="listbox" aria-label="Wyniki">
      ${current.map((r, i) => html`
        <div class="result" role="option" id="search-opt-${i}" data-index="${i}" aria-selected="${String(i === 0)}">
          <span class="result-title">${highlight(r.title, terms)}</span>
          <span class="result-meta"><span class="kind">${r.kind}</span>${r.body ? html` · ${highlight(snippet(r.body, terms), terms)}` : ''}</span>
        </div>`)}
    </div>`;
  updateSelection();
}

function updateSelection() {
  dlg().querySelectorAll('.result').forEach((el, i) => {
    el.setAttribute('aria-selected', String(i === selected));
    if (i === selected) el.scrollIntoView({ block: 'nearest' });
  });
  dlg().querySelector('input').setAttribute('aria-activedescendant', current.length ? `search-opt-${selected}` : '');
}

function openResult(r) {
  dlg().close();
  if (r.kind === 'zadanie') openTaskDialog(r.id);
  if (r.kind === 'projekt') location.hash = `#/projekty/${r.id}`;
  if (r.kind === 'pomysł') { location.hash = '#/pomysly'; openIdeaDialog(r.id); }
  if (r.kind === 'dziennik') {
    journalUi.date = r.id;
    if (location.hash === '#/dziennik') window.dispatchEvent(new HashChangeEvent('hashchange'));
    else location.hash = '#/dziennik';
  }
}

export function openSearch() {
  const d = dlg();
  if (d.open) return;
  d.innerHTML = html`
    <h1 id="search-title">Szukaj</h1>
    <div class="search-bar">
      <input type="search" role="combobox" aria-expanded="true" aria-controls="search-results" aria-autocomplete="list"
        autocomplete="off" spellcheck="false" placeholder="zadania, projekty, pomysły, dziennik…">
      <button type="button" class="clear-button" title="Wyczyść" aria-label="Wyczyść" hidden>
        <svg viewBox="0 -960 960 960" aria-hidden="true"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
      </button>
    </div>
    <div id="search-results" hidden></div>`;
  const input = d.querySelector('input');
  input.addEventListener('input', () => renderResults(input.value));
  d.querySelector('.clear-button').addEventListener('click', () => { input.value = ''; renderResults(''); input.focus(); });
  d.querySelector('#search-results').addEventListener('click', (e) => {
    const el = e.target.closest('.result');
    if (el) openResult(current[Number(el.dataset.index)]);
  });
  d.showModal();
  input.focus();
}

export function initSearch() {
  const d = dlg();
  document.getElementById('search-button').addEventListener('click', openSearch);
  // Clicking the dimmed backdrop closes the modal
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (d.open) d.close();
      else if (!document.querySelector('dialog[open]')) openSearch();
      return;
    }
    // A type="search" field eats the first Escape (it clears the text), so close explicitly
    if (d.open && e.key === 'Escape') { e.preventDefault(); d.close(); return; }
    if (!d.open || !current.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); selected = (selected + 1) % current.length; updateSelection(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); selected = (selected - 1 + current.length) % current.length; updateSelection(); }
    if (e.key === 'Enter') { e.preventDefault(); openResult(current[selected]); }
  });
}

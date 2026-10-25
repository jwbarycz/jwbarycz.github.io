// Shared UI pieces: icons, tasks (compact row and post-style entry), prompt,
// edit dialogs, toast, energy chart.

import { config, categoryById } from './config.js';
import { html, raw, relDate, today, addDays } from './utils.js';
import { isOverdue, prioMark, displayDate } from './tasks.js';
import { PROJECT_STATUSES, MOOD_NAMES } from './insights.js';
import { store } from './store.js';

const svg = (d) => raw(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`);

export const icons = {
  star: svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  next: svg('<path d="M5 12h13M13 6l6 6-6 6"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
};

/** Small red tag on sample items, like a blog's DRAFT label. */
export const draftLabel = (x) => (x.seed ? html`<span class="draft-label">PRZYKŁAD</span>` : '');

export const catChip = (cat) =>
  html`<span class="chip" style="--cat: var(${cat.color})"><span class="sw"></span>${cat.name.toLowerCase()}</span>`;

export function projectChip(projectId) {
  const p = projectId && store.project(projectId);
  if (!p) return '';
  return html`<a class="chip chip-link" href="#/projekty/${p.id}" style="--cat: var(${p.color})"><span class="sw"></span>${p.name}</a>`;
}

function dueChip(t) {
  if (!t.due || t.done) return '';
  const cls = isOverdue(t) ? 'overdue' : t.due === today() ? 'today' : '';
  return html`<span class="chip ${cls}" title="termin ${t.due}">⏲ ${relDate(t.due)}</span>`;
}

function taskActions(t, context) {
  const focusId = store.day().focus;
  const plannedToday = t.plan && t.plan <= today();
  const out = [];
  if (!t.done) {
    out.push(html`<button class="icon-btn" data-action="focus" title="${focusId === t.id ? 'Usuń z fokusu' : 'Ustaw jako fokus dnia'}" aria-label="Fokus">${icons.star}</button>`);
    if (context === 'today' || plannedToday) {
      out.push(html`<button class="icon-btn" data-action="tomorrow" title="Przenieś na jutro" aria-label="Na jutro">${icons.next}</button>`);
    } else {
      out.push(html`<button class="icon-btn" data-action="plan-today" title="Zaplanuj na dziś" aria-label="Na dziś">${icons.sun}</button>`);
    }
  }
  out.push(html`<button class="icon-btn" data-action="edit" title="Edytuj" aria-label="Edytuj">${icons.edit}</button>`);
  out.push(html`<button class="icon-btn" data-action="delete" title="Usuń" aria-label="Usuń">${icons.trash}</button>`);
  return out;
}

/**
 * Compact task row with a checkbox (cards on the home page).
 * opts.showCat / opts.showProject — chips, opts.context — 'today' | 'list'
 */
export function taskRow(t, opts = {}) {
  const focusId = store.day().focus;
  const plannedToday = t.plan && t.plan <= today();
  const meta = [
    opts.showCat ? catChip(categoryById(t.cat)) : '',
    opts.showProject ? projectChip(t.project) : '',
    dueChip(t),
    !t.done && opts.context !== 'today' && plannedToday ? html`<span class="chip today">☀ dziś</span>` : '',
  ].join('');

  return html`
    <li class="task ${t.done ? 'done' : ''} ${focusId === t.id && !t.done ? 'is-focus' : ''}" data-id="${t.id}">
      <input type="checkbox" class="check" data-action="toggle" ${t.done ? raw('checked') : ''} aria-label="Zrobione: ${t.title}">
      <div class="body">
        <div class="title" data-action="edit">${t.prio ? html`<span class="prio">${prioMark(t.prio)}</span>` : ''}${t.title}</div>
        <div class="meta">${raw(meta)}</div>
      </div>
      <div class="actions">${taskActions(t, opts.context)}</div>
    </li>`;
}

export function taskList(tasks, opts = {}, emptyText = 'Pusto.') {
  if (!tasks.length) return html`<p class="empty">${emptyText}</p>`;
  return html`<ul class="task-list">${tasks.map((t) => taskRow(t, opts))}</ul>`;
}

/**
 * Task as a blog-style list entry:
 * date on the left, "# Title", serif description, "Read more ⟶"-style link.
 */
export function postTask(t, opts = {}) {
  const focusId = store.day().focus;
  const date = displayDate(t);
  const cat = categoryById(t.cat);
  const metaBits = [
    catChip(cat),
    opts.hideProject ? '' : projectChip(t.project),
    dueChip(t),
    !t.done && t.plan && t.plan <= today() ? html`<span class="chip today">☀ dziś</span>` : '',
    !t.done && t.plan && t.plan > today() ? html`<span class="chip">↳ ${relDate(t.plan)}</span>` : '',
  ].join('');

  return html`
    <li class="list-item ${t.done ? 'done' : ''}" data-id="${t.id}">
      <div class="post-header">
        <time class="${isOverdue(t) ? 'overdue' : ''}" datetime="${date || ''}">${date || '—'}</time>
        <div class="post-body">
          <h3 class="post-title ${focusId === t.id && !t.done ? 'is-focus' : ''}">
            <span class="title-text" data-action="edit">${t.title}</span>${t.prio ? html` <span class="prio">${prioMark(t.prio)}</span>` : ''}${draftLabel(t)}
          </h3>
          ${t.note ? html`<div class="description">${t.note}</div>` : ''}
          <div class="meta">${raw(metaBits)}</div>
          <div class="post-links">
            <button class="readmore" data-action="toggle">${t.done ? 'Przywróć ⟵' : 'Zrobione ⟶'}</button>
            <span class="actions">${taskActions(t, 'list')}</span>
          </div>
        </div>
      </div>
    </li>`;
}

export function postTaskList(tasks, opts = {}, emptyText = 'Pusto.') {
  if (!tasks.length) return html`<p class="empty">${emptyText}</p>`;
  return html`<ul class="post-list">${tasks.map((t) => postTask(t, opts))}</ul>`;
}

export function quickAdd(placeholder) {
  return html`
    <form class="quick-add" data-form="quick-add" autocomplete="off">
      <label class="prompt">
        <span class="caret" aria-hidden="true">&gt;</span>
        <span class="sr-only">Nowe zadanie</span>
        <input name="q" id="quick-input" placeholder="${placeholder}" enterkeyhint="done">
      </label>
      <p class="prompt-hint">
        <code>!1-3</code> priorytet · <code>#adm</code> kategoria · <code>+python</code> projekt · <code>@jutro</code> <code>@pt</code> <code>@30.10</code> termin · <code>^jutro</code> zaplanuj
      </p>
    </form>`;
}

/* ---------- Energy chart (sparkline) ---------- */

export function sparkline(series, { height = 64, max = 10 } = {}) {
  const w = 300;
  const pts = series.map((p, i) => p.value == null ? null : [
    (i / Math.max(1, series.length - 1)) * w,
    height - 4 - ((p.value - 1) / (max - 1)) * (height - 8),
  ]);
  const segs = [];
  let cur = [];
  for (const p of pts) { if (p) cur.push(p); else if (cur.length) { segs.push(cur); cur = []; } }
  if (cur.length) segs.push(cur);
  const path = segs.map((s) => 'M' + s.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' L')).join(' ');
  const area = segs.filter((s) => s.length > 1)
    .map((s) => `M${s[0][0].toFixed(1)},${height} L` + s.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' L') + ` L${s[s.length - 1][0].toFixed(1)},${height} Z`).join(' ');
  const dots = pts.filter(Boolean).map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/>`).join('');
  return raw(`<svg class="sparkline" viewBox="0 0 ${w} ${height}" preserveAspectRatio="none" role="img" aria-label="Energia z ostatnich dni">
    <path class="area" d="${area}"/><path class="line" d="${path}" vector-effect="non-scaling-stroke"/><g class="dots">${dots}</g></svg>`);
}

/* ---------- Daily check-in: energy + mood ---------- */

export function checkin(date = today()) {
  const d = store.day(date);
  return html`
    <div class="checkin" data-date="${date}">
      <div class="checkin-row">
        <span class="label">energia</span>
        <div class="scale" role="group" aria-label="Energia 1–10">
          ${Array.from({ length: 10 }, (_, i) => i + 1).map((n) =>
            html`<button class="scale-btn ${d.energy === n ? 'on' : ''} ${d.energy >= n ? 'fill' : ''}" data-action="energy" data-value="${n}" aria-pressed="${String(d.energy === n)}">${n}</button>`)}
        </div>
      </div>
      <div class="checkin-row">
        <span class="label">nastrój</span>
        <div class="scale mood" role="group" aria-label="Nastrój">
          ${[1, 2, 3, 4, 5].map((n) =>
            html`<button class="scale-btn ${d.mood === n ? 'on' : ''}" data-action="mood" data-value="${n}" aria-pressed="${String(d.mood === n)}">${MOOD_NAMES[n]}</button>`)}
        </div>
      </div>
    </div>`;
}

/* ---------- Callouts ---------- */

const NOTES_KEY = 'panel:notes';

function collapsedNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || {}; } catch { return {}; }
}

/** Remembers whether a collapsible callout is folded (per id, in this browser only). */
export function toggleNote(id) {
  const state = collapsedNotes();
  state[id] = !state[id];
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(state)); } catch {}
}

/**
 * Callout box. type: info | warning | success | danger | tip.
 * With opts.id it becomes collapsible and remembers its state.
 */
export function callout(type, title, body, opts = {}) {
  const collapsed = opts.id ? !!collapsedNotes()[opts.id] : false;
  const head = opts.id
    ? html`<button type="button" class="note-head" data-action="note-toggle" data-note="${opts.id}" aria-expanded="${String(!collapsed)}">${title}</button>`
    : html`<div class="note-head">${title}</div>`;
  return html`
    <div class="note ${type}">
      ${head}
      <div class="note-body" ${collapsed ? raw('hidden') : ''}>${body}</div>
    </div>`;
}

/* ---------- Toast with undo ---------- */
let toastTimer;
export function toast(msg, undo) {
  const el = document.getElementById('toast');
  el.querySelector('.msg').textContent = msg;
  const btn = el.querySelector('button');
  btn.hidden = !undo;
  btn.onclick = () => { undo?.(); el.classList.remove('show'); };
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), undo ? 5000 : 2200);
}

/* ---------- Dialogs ---------- */

function showDialog(markup, onSave, onReady) {
  const dlg = document.getElementById('task-dialog');
  dlg.innerHTML = markup;
  const form = dlg.querySelector('form');
  dlg.onclose = () => { if (dlg.returnValue === 'save') onSave(new FormData(form)); };
  dlg.returnValue = '';
  onReady?.(form);
  dlg.showModal();
  const first = form.querySelector('input, textarea');
  first?.focus();
  first?.select?.();
}

const option = (value, label, selected) =>
  html`<option value="${value}" ${selected ? raw('selected') : ''}>${label}</option>`;

export function openTaskDialog(id, defaults = {}) {
  const t = id ? store.task(id) : { title: '', cat: 'inbox', project: null, prio: 0, due: null, plan: null, note: '', ...defaults };
  if (!t) return;
  const projects = store.state.projects.filter((p) => p.status !== 'zakończony' || p.id === t.project);

  showDialog(html`
    <form method="dialog">
      <h2 id="task-dialog-title">${id ? 'Edytuj zadanie' : 'Nowe zadanie'}</h2>
      <label class="field">tytuł
        <input class="input" name="title" required value="${t.title}">
      </label>
      <div class="field-row">
        <label class="field">kategoria
          <select class="input" name="cat">${config.categories.map((c) => option(c.id, c.name, c.id === t.cat))}</select>
        </label>
        <label class="field">projekt
          <select class="input" name="project">
            ${option('', '— brak', !t.project)}
            ${projects.map((p) => option(p.id, p.name, p.id === t.project))}
          </select>
        </label>
        <label class="field">priorytet
          <select class="input" name="prio">
            ${[[0, '— brak'], [1, '! niski'], [2, '!! średni'], [3, '!!! wysoki']].map(([v, l]) => option(v, l, v === t.prio))}
          </select>
        </label>
      </div>
      <div class="field-row">
        <label class="field">zaplanuj na dzień
          <input class="input" type="date" name="plan" value="${t.plan || ''}">
        </label>
        <label class="field">termin (deadline)
          <input class="input" type="date" name="due" value="${t.due || ''}">
        </label>
      </div>
      <label class="field">opis / notatka
        <textarea class="input" name="note" rows="3">${t.note || ''}</textarea>
      </label>
      <div class="dialog-actions">
        <div>
          <button class="btn small ghost" type="button" data-set-plan="${today()}">☀ dziś</button>
          <button class="btn small ghost" type="button" data-set-plan="${addDays(today(), 1)}">jutro</button>
          <button class="btn small ghost" type="button" data-set-plan="">bez planu</button>
        </div>
        <div>
          <button class="btn" value="cancel" formnovalidate>Anuluj</button>
          <button class="btn primary" value="save">Zapisz</button>
        </div>
      </div>
    </form>`,
  (f) => {
    const data = {
      title: String(f.get('title')).trim(),
      cat: f.get('cat'),
      project: f.get('project') || null,
      prio: Number(f.get('prio')),
      plan: f.get('plan') || null,
      due: f.get('due') || null,
      note: String(f.get('note')).trim(),
    };
    if (!data.title) return;
    if (id) store.updateTask(id, data);
    else store.addTask(data);
  },
  (form) => form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-set-plan]');
    if (b) form.plan.value = b.dataset.setPlan;
  }));
}

const PROJECT_COLORS = [
  ['--primary-color', 'czerwony'], ['--info', 'niebieski'], ['--warning', 'pomarańczowy'],
  ['--success', 'zielony'], ['--tip', 'turkusowy'], ['--violet', 'fioletowy'],
];

export function openProjectDialog(id) {
  const p = id ? store.project(id) : { name: '', desc: '', status: 'aktywny', color: '--info', link: '' };
  if (!p) return;
  showDialog(html`
    <form method="dialog">
      <h2 id="task-dialog-title">${id ? 'Edytuj projekt' : 'Nowy projekt'}</h2>
      <label class="field">nazwa
        <input class="input" name="name" required value="${p.name}">
      </label>
      <label class="field">opis (jedno zdanie, jak na karcie projektu)
        <textarea class="input" name="desc" rows="2">${p.desc}</textarea>
      </label>
      <div class="field-row">
        <label class="field">status
          <select class="input" name="status">${PROJECT_STATUSES.map((s) => option(s.id, s.name, s.id === p.status))}</select>
        </label>
        <label class="field">kolor
          <select class="input" name="color">${PROJECT_COLORS.map(([v, l]) => option(v, l, v === p.color))}</select>
        </label>
      </div>
      <label class="field">link (repo, dokument, folder — opcjonalnie)
        <input class="input" name="link" type="url" placeholder="https://" value="${p.link || ''}">
      </label>
      <div class="dialog-actions">
        <div></div>
        <div>
          <button class="btn" value="cancel" formnovalidate>Anuluj</button>
          <button class="btn primary" value="save">Zapisz</button>
        </div>
      </div>
    </form>`,
  (f) => {
    const data = {
      name: String(f.get('name')).trim(),
      desc: String(f.get('desc')).trim(),
      status: f.get('status'),
      color: f.get('color'),
      link: String(f.get('link')).trim(),
    };
    if (!data.name) return;
    if (id) store.patch('projects', id, data);
    else store.add('projects', data);
  });
}

export function openIdeaDialog(id) {
  const x = store.state.ideas.find((i) => i.id === id);
  if (!x) return;
  showDialog(html`
    <form method="dialog">
      <h2 id="task-dialog-title">Pomysł</h2>
      <label class="field">w jednym zdaniu
        <input class="input" name="title" required value="${x.title}">
      </label>
      <label class="field">rozwinięcie — dlaczego, jak, co dalej
        <textarea class="input" name="note" rows="5">${x.note || ''}</textarea>
      </label>
      <label class="check-label"><input type="checkbox" class="check" name="pinned" ${x.pinned ? raw('checked') : ''}> przypnij na górę</label>
      <div class="dialog-actions">
        <div></div>
        <div>
          <button class="btn" value="cancel" formnovalidate>Anuluj</button>
          <button class="btn primary" value="save">Zapisz</button>
        </div>
      </div>
    </form>`,
  (f) => {
    const title = String(f.get('title')).trim();
    if (!title) return;
    store.patch('ideas', id, { title, note: String(f.get('note')).trim(), pinned: f.get('pinned') === 'on' });
  });
}

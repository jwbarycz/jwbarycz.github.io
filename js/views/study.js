// "Studia" view — exams, tests, projects and assignments per subject, ordered by urgency,
// with a 6-week timeline, when to start preparing and today's portion of material.

import { config } from '../config.js';
import { store } from '../store.js';
import { html, raw, esc, today, addDays, daysBetween, relDate, plural, fold } from '../utils.js';
import { kindById, urgency, prepDays, scopeProgress, dailyPortion, sortByUrgency, sortByDate, inDays, itemTitle, pointsLabel, openQuestions } from '../study.js';
import { icons, draftLabel, callout } from '../components.js';

// openScopes: ids of items whose topic list the user unfolded (kept across re-renders)
export const ui = { sort: 'urgency', subject: null, showAllDone: false, openScopes: new Map() };

const TIMELINE_DAYS = 42;
const DONE_LIMIT = 6;

const subjectById = (id) => store.state.subjects.find((s) => s.id === id);

/** "Kolokwium 1", or "Egzamin" when there's no title; never "Kolokwium: Kolokwium 1". */
function heading(item) {
  const kind = kindById(item.kind).name;
  if (!item.title) return kind;
  // Plain assignments and dates don't need a "Zadanie:" / "Ważna data:" prefix
  if (['zadanie', 'inne'].includes(item.kind) || fold(item.title).startsWith(fold(kind))) return item.title;
  return `${kind}: ${item.title}`;
}

const subjectChip = (s) => (s ? html`<a class="chip chip-link" href="#/studia/${s.id}" style="--cat: var(${s.color})"><span class="sw"></span>${s.name}</a>` : '');

function urgencyChip(u) {
  if (u.level === 'done') return '';
  return html`<span class="chip urgency u-${u.level}">${u.label}</span>`;
}

/** One line about preparation: when to start, or how much to do today. */
function planLine(item, u) {
  if (u.level === 'done') return '';
  if (u.level === 'nodate') return item.dateNote ? html`<div class="study-plan">Termin: ${item.dateNote} — dokładna data jeszcze nieznana.</div>` : '';
  if (!prepDays(item)) return '';
  const { left, total } = scopeProgress(item);
  const portion = dailyPortion(item);
  if (u.level === 'overdue') return html`<div class="study-plan">Termin minął ${inDays(u.daysLeft)} — oznacz jako zrobione albo zmień datę.</div>`;
  if (u.level === 'now' || u.level === 'critical') {
    return html`<div class="study-plan now">
      ${total ? html`Na dziś: <b>${portion} ${plural(portion, 'temat', 'tematy', 'tematów')}</b> · zostało ${left} z ${total}` : html`Czas się przygotowywać — dopisz, z czego się uczyć`}
      · start nauki: ${relDate(u.start)}</div>`;
  }
  const when = u.startIn <= 1 ? inDays(u.startIn) : `${relDate(u.start)} (${inDays(u.startIn)})`;
  return html`<div class="study-plan">Zacznij ${when} · ${prepDays(item)} ${plural(prepDays(item), 'dzień', 'dni', 'dni')} przygotowań${total ? ` · ${total} ${plural(total, 'temat', 'tematy', 'tematów')}` : ''}</div>`;
}

function scopeList(item) {
  if (!item.scope?.length) return '';
  const p = scopeProgress(item);
  return html`
    <details class="scope" data-id="${item.id}" ${(ui.openScopes.get(item.id) ?? (p.left > 0 && ['now', 'critical'].includes(urgency(item).level))) ? 'open' : ''}>
      <summary>Z czego: ${p.done}/${p.total}<span class="progress thin"><span style="--value:${p.pct}%"></span></span></summary>
      <ul>
        ${item.scope.map((t) => html`
          <li><label class="check-label">
            <input type="checkbox" class="check" data-action="scope-toggle" data-topic="${t.id}" ${t.done ? 'checked' : ''}>
            <span class="${t.done ? 'strike muted' : ''}">${t.text}</span>
          </label></li>`)}
      </ul>
    </details>`;
}

export function studyItem(item, opts = {}) {
  const u = urgency(item);
  const s = subjectById(item.subject);
  const when = [item.time, item.place].filter(Boolean).join(' · ');
  return html`
    <li class="list-item study-item lvl-${u.level} ${item.done ? 'done' : ''}" data-id="${item.id}">
      <div class="post-header">
        <time datetime="${item.date || ''}" class="${!item.date && item.dateNote ? 'approx' : ''}">${item.date || item.dateNote || '—'}</time>
        <div class="post-body">
          <h3 class="post-title" style="--kind: var(${kindById(item.kind).color})">
            <span class="title-text" data-action="study-edit">${heading(item)}</span>${item.weight ? html` <span class="prio">${'!'.repeat(item.weight)}</span>` : ''}${draftLabel(item)}
          </h3>
          <div class="meta">
            ${opts.hideSubject ? '' : subjectChip(s)}
            ${urgencyChip(u)}
            ${item.date && !item.done ? html`<span class="chip">${inDays(u.daysLeft)}</span>` : ''}
            ${item.tentative && !item.done ? html`<span class="chip tentative">do potwierdzenia</span>` : ''}
            ${when ? html`<span class="chip">${when}</span>` : ''}
            ${pointsLabel(item) ? html`<span class="chip">${pointsLabel(item)}</span>` : ''}
            ${item.done && item.grade ? html`<span class="chip grade">ocena: ${item.grade}</span>` : ''}
          </div>
          ${planLine(item, u)}
          ${item.note ? html`<div class="description">${item.note}</div>` : ''}
          ${item.done ? '' : scopeList(item)}
          <div class="post-links">
            <button class="readmore" data-action="study-done">${item.done ? 'Przywróć ⟵' : 'Zrobione ⟶'}</button>
            <button class="readmore" data-action="study-edit">${item.scope?.length ? 'Edytuj ⟶' : 'Dopisz materiał ⟶'}</button>
            <span class="actions"><button class="icon-btn" data-action="study-delete" title="Usuń" aria-label="Usuń">${icons.trash}</button></span>
          </div>
        </div>
      </div>
    </li>`;
}

/** Next 6 weeks, one lane per deadline: the preparation window as a bar ending in a dot on the date. */
function timeline(items) {
  const t = today();
  const end = addDays(t, TIMELINE_DAYS);
  const visible = sortByDate(items.filter((x) => !x.done && x.date && x.date >= t && x.date <= end));
  const pos = (d) => `${(Math.max(0, Math.min(TIMELINE_DAYS, daysBetween(t, d))) / TIMELINE_DAYS) * 100}%`;
  const weeks = Array.from({ length: TIMELINE_DAYS / 7 + 1 }, (_, i) => addDays(t, i * 7));
  return html`
    <div class="timeline" role="img" aria-label="Terminy w ciągu najbliższych 6 tygodni">
      <div class="tl-track" style="--lanes:${visible.length}">
        ${visible.map((x, lane) => {
          const k = kindById(x.kind);
          const s = subjectById(x.subject);
          const start = addDays(x.date, -prepDays(x));
          return html`
            <span class="tl-prep" style="--lane:${lane}; left:${pos(start)}; right:calc(100% - ${pos(x.date)}); --kind: var(${k.color})"></span>
            <button class="tl-dot w${x.weight}" style="--lane:${lane}; left:${pos(x.date)}; --kind: var(${k.color})" data-action="study-edit" data-id="${x.id}"
              title="${x.date} · ${heading(x)}${s ? ` · ${s.name}` : ''}" aria-label="${x.date}: ${heading(x)}${s ? `, ${s.name}` : ''}"></button>`;
        })}
        <span class="tl-today" title="dziś"></span>
      </div>
      <div class="tl-weeks">${weeks.map((d, i) => html`<span style="left:${(i * 7 / TIMELINE_DAYS) * 100}%">${i === 0 ? 'dziś' : relDate(d)}</span>`)}</div>
    </div>`;
}

/** Rules text → paragraphs, with "- " lines grouped into lists. */
function formatRules(text) {
  const out = [];
  let list = null;
  for (const line of String(text).split('\n')) {
    const t = line.trim();
    if (t.startsWith('- ')) {
      list ||= [];
      list.push(`<li>${esc(t.slice(2))}</li>`);
      continue;
    }
    if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
    if (t) out.push(`<p>${esc(t)}</p>`);
  }
  if (list) out.push(`<ul>${list.join('')}</ul>`);
  return raw(out.join(''));
}

/** Checklist of things to find out; with opts.showSubject the subject chip comes first. */
function questionList(entries, opts = {}) {
  return html`
    <ul class="question-list">
      ${entries.map(({ subject, question }) => html`
        <li>
          <label class="check-label">
            <input type="checkbox" class="check" data-action="question-toggle" data-subject="${subject.id}" data-q="${question.id}" ${question.done ? 'checked' : ''}>
            <span class="${question.done ? 'strike muted' : ''}">${opts.showSubject ? html`<span class="q-subject" style="--cat: var(${subject.color})">${subject.name}</span> ` : ''}${question.text}</span>
          </label>
        </li>`)}
    </ul>`;
}

function subjectCard(s) {
  const items = store.state.study.filter((x) => x.subject === s.id);
  const open = sortByUrgency(items.filter((x) => !x.done));
  const next = open[0];
  const grades = items.map((x) => parseFloat(String(x.grade).replace(',', '.'))).filter((g) => !Number.isNaN(g));
  return html`
    <div class="card subject-card" style="--cat: var(${s.color})">
      <div class="card-head">
        <h3><a href="#/studia/${s.id}">${s.name}</a>${draftLabel(s)}</h3>
        <span class="form-badge" title="${s.form === 'E' ? 'egzamin' : 'zaliczenie'}">${s.form}</span>
      </div>
      <div class="subject-meta">${s.code ? `${s.code} · ` : ''}${s.ects ? `${s.ects} ECTS · ` : ''}${open.length} ${plural(open.length, 'termin', 'terminy', 'terminów')} do zrobienia${(s.questions || []).some((q) => !q.done) ? ` · ${(s.questions || []).filter((q) => !q.done).length} do ustalenia` : ''}${grades.length ? ` · średnia ${(grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2).replace('.', ',')}` : ''}</div>
      ${next ? html`<div class="subject-next">następne: <b>${heading(next)}</b> ${next.date ? html`· ${relDate(next.date)}` : ''} ${urgencyChip(urgency(next))}</div>` : html`<div class="subject-next faint">nic nie wisi</div>`}
    </div>`;
}

function studyPrompt(placeholder) {
  return html`
    <form data-form="add-study" autocomplete="off">
      <label class="prompt">
        <span class="caret" aria-hidden="true">&gt;</span>
        <span class="sr-only">Nowy termin</span>
        <input name="q" id="quick-input" placeholder="${placeholder}" enterkeyhint="done">
      </label>
      <p class="prompt-hint">
        ${config.study.kinds.map((k) => html`<code>#${k.token}</code> `)}rodzaj · <code>+mikro</code> przedmiot · <code>@12.11</code> data · <code>!3</code> waga
      </p>
    </form>`;
}

export function renderStudy() {
  const { subjects, study } = store.state;
  let items = study;
  if (ui.subject) items = items.filter((x) => x.subject === ui.subject);
  const open = items.filter((x) => !x.done);
  const done = items.filter((x) => x.done).sort((a, b) => String(b.doneAt || b.date).localeCompare(String(a.doneAt || a.date)));
  const sorted = ui.sort === 'date' ? sortByDate(open) : sortByUrgency(open);
  const studyingNow = open.filter((x) => ['now', 'critical', 'overdue'].includes(urgency(x).level)).length;
  const in14 = open.filter((x) => x.date && daysBetween(today(), x.date) >= 0 && daysBetween(today(), x.date) <= 14).length;

  return html`
    <div class="page-header">Studia<span class="dot">.</span></div>
    <p class="section-content">${config.study.university} · ${config.study.term}. ${in14} ${plural(in14, 'termin', 'terminy', 'terminów')} w ciągu 2 tygodni${studyingNow ? `, ${studyingNow} ${plural(studyingNow, 'wymaga', 'wymagają', 'wymaga')} nauki teraz` : ''}.</p>

    ${!subjects.length ? callout('tip', 'Zacznij od przedmiotów', html`
      <p>Dodaj przedmioty z tego semestru (nazwa, E/Z, ECTS), a potem terminy: egzaminy, kolokwia, projekty i zadania. Panel sam policzy, kiedy zacząć naukę.</p>
      <p><button class="link-btn" data-action="subject-new">Dodaj pierwszy przedmiot</button></p>`) : ''}

    <div style="margin-top:1.75rem">${studyPrompt('np. Kolokwium 1 #kol +stat @12.11 !3')}</div>

    ${open.some((x) => x.date) ? html`<h2 class="list-section">Najbliższe 6 tygodni</h2>${timeline(open)}` : ''}

    <div class="study-toolbar">
      <div class="filters" role="toolbar" aria-label="Sortowanie">
        <button class="tab" data-study-sort="urgency" aria-pressed="${String(ui.sort === 'urgency')}">wg pilności</button>
        <button class="tab" data-study-sort="date" aria-pressed="${String(ui.sort === 'date')}">wg daty</button>
      </div>
      <div class="post-links">
        <button class="readmore" data-action="study-new">+ termin</button>
        <button class="readmore" data-action="subject-new">+ przedmiot</button>
      </div>
    </div>
    ${subjects.length ? html`
      <div class="chips-filter" aria-label="Przedmiot">
        ${subjects.map((s) => html`<button class="chip" style="--cat: var(${s.color})" data-filter-subject="${s.id}" aria-pressed="${String(ui.subject === s.id)}"><span class="sw"></span>${s.name.toLowerCase()}</button>`)}
      </div>` : ''}

    <main class="list">
      <h2 class="list-section">Do zrobienia <span class="count">${open.length}</span></h2>
      ${sorted.length ? html`<ul class="post-list">${sorted.map((x) => studyItem(x))}</ul>`
        : html`<p class="empty">Nic nie wisi${ui.subject ? ' z tego przedmiotu' : ''}. Pięknie.</p>`}

      ${(() => {
        const qs = openQuestions(ui.subject ? subjects.filter((x) => x.id === ui.subject) : subjects);
        return qs.length ? callout('warning', `Do ustalenia (${qs.length})`, html`
          <p class="muted">Rzeczy, których nie ma w materiałach — do dopytania prowadzących. Odhacz, gdy już wiesz, i dopisz odpowiedź w zasadach przedmiotu.</p>
          ${questionList(qs, { showSubject: true })}`, { id: 'study-questions' }) : '';
      })()}

      ${!ui.subject && subjects.length ? html`
        <h2 class="list-section">Przedmioty <span class="count">${subjects.length}</span></h2>
        <div class="grid two">${subjects.map(subjectCard)}</div>` : ''}

      ${done.length ? html`
        <h2 class="list-section">Zaliczone <span class="count">${done.length}</span></h2>
        <ul class="post-list">${(ui.showAllDone ? done : done.slice(0, DONE_LIMIT)).map((x) => studyItem(x))}</ul>
        ${done.length > DONE_LIMIT ? html`<button class="readmore" data-action="study-all-done">${ui.showAllDone ? 'Pokaż mniej ⟵' : `Pokaż wszystkie (${done.length}) ⟶`}</button>` : ''}` : ''}
    </main>
  `;
}

export function renderSubject(id) {
  const s = subjectById(id);
  if (!s) {
    return html`<div class="page-header">Nie ma takiego przedmiotu<span class="dot">.</span></div>
      <p><a href="#/studia">⟵ studia</a></p>`;
  }
  const items = store.state.study.filter((x) => x.subject === id);
  const open = sortByUrgency(items.filter((x) => !x.done));
  const done = items.filter((x) => x.done);
  return html`
    <p class="crumbs"><a href="#/studia">⟵ studia</a></p>
    <div class="page-header" style="margin-top:1.25rem">${s.name}<span class="dot" style="color: var(${s.color})">.</span></div>
    <p class="section-content">${s.form === 'E' ? 'Egzamin' : 'Zaliczenie'}${s.ects ? ` · ${s.ects} ECTS` : ''}${s.code ? ` · ${s.code}` : ''}</p>
    ${s.lecturer || s.email || s.office || s.consultations ? html`
      <dl class="contact">
        ${s.lecturer ? html`<dt>prowadzący</dt><dd>${s.lecturer}</dd>` : ''}
        ${s.email ? html`<dt>e-mail</dt><dd><a href="mailto:${s.email}">${s.email}</a></dd>` : ''}
        ${s.office ? html`<dt>pokój</dt><dd>${s.office}</dd>` : ''}
        ${s.consultations ? html`<dt>konsultacje</dt><dd>${s.consultations}</dd>` : ''}
      </dl>` : ''}
    ${s.note ? html`<p class="section-content muted" style="margin-top:.5rem">${s.note}</p>` : ''}
    <div class="post-links" style="margin-top:1rem">
      ${/^https?:\/\//.test(s.link || '') ? html`<a href="${s.link}" target="_blank" rel="noopener">Otwórz link ⟶</a>` : ''}
      <button class="readmore" data-action="subject-edit" data-id="${s.id}">Edytuj przedmiot ⟶</button>
      <button class="readmore danger" data-action="subject-delete" data-id="${s.id}">Usuń</button>
    </div>

    <div style="margin-top:2rem">${studyPrompt(`termin z „${s.name}”… np. Egzamin #egz @1.02`)}</div>

    <main class="list">
      <h2 class="list-section">Do zrobienia <span class="count">${open.length}</span></h2>
      ${open.length ? html`<ul class="post-list">${open.map((x) => studyItem(x, { hideSubject: true }))}</ul>` : html`<p class="empty">Nic nie wisi.</p>`}

      ${s.rules ? html`
        <h2 class="list-section">Zasady zaliczenia</h2>
        <div class="rules">${formatRules(s.rules)}</div>` : ''}

      ${(s.questions || []).length ? html`
        <h2 class="list-section">Do ustalenia <span class="count">${s.questions.filter((q) => !q.done).length}/${s.questions.length}</span></h2>
        ${questionList(s.questions.map((q) => ({ subject: s, question: q })))}` : ''}
      ${done.length ? html`
        <h2 class="list-section">Zaliczone <span class="count">${done.length}</span></h2>
        <ul class="post-list">${done.map((x) => studyItem(x, { hideSubject: true }))}</ul>` : ''}
    </main>
  `;
}

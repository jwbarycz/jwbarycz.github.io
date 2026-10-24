// Widok "Projekty" — karty projektów, plus strona projektu.

import { store } from '../store.js';
import { html, relDate } from '../utils.js';
import { sortTasks, sortDone } from '../tasks.js';
import { projectStats, PROJECT_STATUSES } from '../insights.js';
import { postTaskList, quickAdd } from '../components.js';

/** Zamiast zdjęcia: kolorowe pole z postępem i kratką zadań (pełna = zrobione). */
function projectMedia(p, s) {
  const dots = s.tasks
    .slice()
    .sort((a, b) => b.done - a.done)
    .map((t) => html`<span class="pdot ${t.done ? 'on' : ''}" title="${t.title}"></span>`);
  return html`
    <div class="card-media project-media" style="--cat: var(${p.color})">
      <div class="pm-top">
        <span class="pm-pct">${s.pct}<small>%</small></span>
        <span class="pm-status">${p.status}</span>
      </div>
      <div class="pm-dots">${dots.length ? dots : html`<span class="pm-empty">brak zadań</span>`}</div>
      <div class="progress thin"><span style="--value:${s.pct}%"></span></div>
    </div>`;
}

function projectCard(p) {
  const s = projectStats(p.id);
  return html`
    <div class="card pcard">
      ${projectMedia(p, s)}
      <div class="card-info">
        <h3 class="card-title"><a href="#/projekty/${p.id}">${p.name}</a></h3>
        <div class="meta">
          <time datetime="${p.createdAt.slice(0, 10)}">${p.createdAt.slice(0, 10)}</time>
          · ${s.done}/${s.total} zadań${s.nextDue ? html` · termin ${relDate(s.nextDue)}` : ''}
        </div>
        <div class="card-description">${p.desc || '—'}</div>
      </div>
    </div>`;
}

export function renderProjects() {
  const groups = PROJECT_STATUSES.map((st) => ({
    st, items: store.state.projects.filter((p) => p.status === st.id),
  }));
  const [active, ...rest] = groups;

  return html`
    <div class="page-header">Projekty<span class="dot">.</span></div>
    <p class="section-content">Większe rzeczy, rozbite na zadania. Postęp liczy się sam z zadań przypisanych do projektu (<code>+nazwa</code> przy dodawaniu).</p>
    <div style="margin:1.25rem 0 1.5rem"><button class="btn small" data-action="new-project">+ nowy projekt</button></div>

    ${active.items.length
      ? html`<div class="cards">${active.items.map(projectCard)}</div>`
      : html`<p class="empty">Brak aktywnych projektów.</p>`}

    ${rest.filter((g) => g.items.length).map((g) => html`
      <h2 class="list-section">${g.st.id === 'zakończony' ? 'Zakończone' : 'Wstrzymane'} <span class="count">${g.items.length}</span></h2>
      <div class="cards muted-cards">${g.items.map(projectCard)}</div>`)}
  `;
}

export function renderProject(id) {
  const p = store.project(id);
  if (!p) {
    return html`<div class="page-header">Nie ma takiego projektu<span class="dot">.</span></div>
      <p><a href="#/projekty">⟵ wszystkie projekty</a></p>`;
  }
  const s = projectStats(p.id);
  const open = sortTasks(s.tasks.filter((t) => !t.done));
  const done = sortDone(s.tasks.filter((t) => t.done));

  return html`
    <p class="crumbs"><a href="#/projekty">⟵ projekty</a></p>
    <div class="page-header" style="margin-top:1.25rem">${p.name}<span class="dot" style="color: var(${p.color})">.</span></div>
    ${p.desc ? html`<p class="section-content">${p.desc}</p>` : ''}

    <div class="project-head">
      <div class="stat-row">
        <div class="stat"><div class="label">postęp</div><div class="value">${s.pct}<small>%</small></div>
          <div class="progress"><span style="--value:${s.pct}%; background: var(${p.color})"></span></div></div>
        <div class="stat"><div class="label">zadania</div><div class="value">${s.done}<small> / ${s.total}</small></div></div>
        <div class="stat"><div class="label">najbliższy termin</div><div class="value small">${s.nextDue ? relDate(s.nextDue) : '—'}</div></div>
        <div class="stat"><div class="label">status</div><div class="value small">${p.status}</div></div>
      </div>
      <div class="post-links" style="margin-top:1rem">
        ${/^https?:\/\//.test(p.link || '') ? html`<a href="${p.link}" target="_blank" rel="noopener">Otwórz link ⟶</a>` : ''}
        <button class="readmore" data-action="edit-project" data-id="${p.id}">Edytuj projekt ⟶</button>
        <button class="readmore danger" data-action="delete-project" data-id="${p.id}">Usuń</button>
      </div>
    </div>

    <div style="margin-top:2rem">${quickAdd(`zadanie w projekcie „${p.name}”…`)}</div>

    <main class="list">
      <h2 class="list-section">Do zrobienia <span class="count">${open.length}</span></h2>
      ${postTaskList(open, { hideProject: true }, 'Wszystko zrobione — czas na kolejny krok albo zamknięcie projektu.')}
      ${done.length ? html`
        <h2 class="list-section">Zrobione <span class="count">${done.length}</span></h2>
        ${postTaskList(done, { hideProject: true })}` : ''}
    </main>
  `;
}

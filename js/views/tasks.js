// "Zadania" (Tasks) view — a blog-style list.

import { config } from '../config.js';
import { store } from '../store.js';
import { html } from '../utils.js';
import { isOverdue, isForToday, isUpcoming, isSomeday, sortTasks, sortDone } from '../tasks.js';
import { postTaskList, quickAdd } from '../components.js';

// Category/project filter lives in memory only
export const ui = { cat: null, project: null, showAllDone: false };

const DONE_LIMIT = 8;

export function renderTasks() {
  const all = store.state.tasks;
  let list = all;
  if (ui.cat) list = list.filter((t) => t.cat === ui.cat);
  if (ui.project) list = list.filter((t) => t.project === ui.project);

  const sections = [
    { title: 'Po terminie', tasks: sortTasks(list.filter(isOverdue)) },
    { title: 'Dziś', tasks: sortTasks(list.filter((t) => !t.done && isForToday(t) && !isOverdue(t))) },
    { title: 'Nadchodzące', tasks: sortTasks(list.filter(isUpcoming)) },
    { title: 'Bez terminu', tasks: sortTasks(list.filter(isSomeday)) },
  ].filter((s) => s.tasks.length);

  const done = sortDone(list.filter((t) => t.done));
  const shownDone = ui.showAllDone ? done : done.slice(0, DONE_LIMIT);
  const projects = store.state.projects.filter((p) => p.status !== 'zakończony');
  const openCount = list.filter((t) => !t.done).length;

  return html`
    <div class="page-header">Zadania<span class="dot">.</span></div>
    <p class="section-content">Wszystko, co jest do zrobienia — zapisane, żeby nie trzeba było pamiętać. ${openCount} otwartych.</p>

    <div style="margin-top:1.75rem">${quickAdd('nowe zadanie… (bez daty trafia do „bez terminu”)')}</div>

    <div class="chips-filter" aria-label="Filtr kategorii" style="margin-top:1.25rem">
      ${config.categories.map((c) => html`<button class="chip" style="--cat: var(${c.color})" data-filter-cat="${c.id}" aria-pressed="${String(ui.cat === c.id)}"><span class="sw"></span>${c.name.toLowerCase()}</button>`)}
      ${projects.length ? html`<span class="chips-sep" aria-hidden="true">·</span>` : ''}
      ${projects.map((p) => html`<button class="chip" style="--cat: var(${p.color})" data-filter-project="${p.id}" aria-pressed="${String(ui.project === p.id)}"><span class="sw"></span>+${p.name.toLowerCase()}</button>`)}
    </div>

    <main class="list">
      ${sections.map((s) => html`
        <h2 class="list-section">${s.title} <span class="count">${s.tasks.length}</span></h2>
        ${postTaskList(s.tasks)}`)}
      ${!sections.length ? html`<p class="empty" style="margin-top:2rem">Nic otwartego${ui.cat || ui.project ? ' w tym filtrze' : ''}. Pięknie.</p>` : ''}

      ${done.length ? html`
        <h2 class="list-section">Zrobione <span class="count">${done.length}</span></h2>
        ${postTaskList(shownDone)}
        ${done.length > DONE_LIMIT ? html`<button class="readmore" data-action="toggle-all-done">${ui.showAllDone ? 'Pokaż mniej ⟵' : `Pokaż wszystkie (${done.length}) ⟶`}</button>` : ''}` : ''}
    </main>
  `;
}

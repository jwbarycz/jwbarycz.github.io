// Widok "Biblioteka" — książki, filmy, seriale, kursy: kolejka, w trakcie, skończone.

import { store } from '../store.js';
import { html } from '../utils.js';
import { LIBRARY_KINDS, LIBRARY_STATUSES, stars, finishedThisYear } from '../insights.js';
import { icons } from '../components.js';

export const ui = { kind: null };

/** Data po lewej: kiedy skończone / zaczęte / dodane. */
const itemDate = (x) => x.finishedAt || x.startedAt || x.createdAt.slice(0, 10);

function libraryItem(x) {
  const links = {
    kolejka: html`<button class="readmore" data-action="lib-start">Zaczynam ⟶</button>`,
    'w trakcie': html`<button class="readmore" data-action="lib-finish">Skończone ⟶</button>
      <button class="readmore danger" data-action="lib-drop">Porzucam</button>`,
    skończone: '',
    porzucone: html`<button class="readmore danger" data-action="lib-start">Wracam do tego</button>`,
  }[x.status];

  return html`
    <li class="list-item ${x.status === 'porzucone' ? 'dropped' : ''}" data-id="${x.id}">
      <div class="post-header">
        <time datetime="${itemDate(x)}">${itemDate(x)}</time>
        <div class="post-body">
          <h3 class="post-title"><span class="title-text" data-action="lib-edit">${x.title}</span></h3>
          <div class="lib-byline">
            ${x.author ? html`<span class="author">${x.author}</span>` : ''}
            <span class="chip">${x.kind}</span>
            ${x.rating ? html`<span class="stars" title="${x.rating}/5">${stars(x.rating)}</span>` : ''}
          </div>
          ${x.note ? html`<div class="description">${x.note}</div>` : ''}
          <div class="post-links">
            ${links}
            <button class="readmore" data-action="lib-edit">Edytuj ⟶</button>
            ${/^https?:\/\//.test(x.link || '') ? html`<a href="${x.link}" target="_blank" rel="noopener">Link ⟶</a>` : ''}
            <span class="actions"><button class="icon-btn" data-action="lib-delete" title="Usuń" aria-label="Usuń">${icons.trash}</button></span>
          </div>
        </div>
      </div>
    </li>`;
}

export function renderLibrary() {
  let items = store.state.library;
  if (ui.kind) items = items.filter((x) => x.kind === ui.kind);
  const byStatus = (id) => items.filter((x) => x.status === id);

  const sections = LIBRARY_STATUSES.map((st) => {
    let list = byStatus(st.id);
    // Skończone/porzucone: najnowsze na górze. Kolejka: najstarsze dodane na górze (kto pierwszy, ten lepszy).
    list = st.id === 'kolejka'
      ? list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      : list.sort((a, b) => itemDate(b).localeCompare(itemDate(a)));
    return { ...st, list };
  }).filter((s) => s.list.length);

  const usedKinds = LIBRARY_KINDS.filter((k) => store.state.library.some((x) => x.kind === k));

  return html`
    <div class="page-header">Biblioteka<span class="dot">.</span></div>
    <p class="section-content">Książki, filmy, seriale i kursy: co czeka w kolejce, co jest w trakcie i co z tego zostało w głowie. W tym roku skończone: ${finishedThisYear()}.</p>

    <form data-form="add-library" autocomplete="off" style="margin-top:1.75rem">
      <label class="prompt">
        <span class="caret" aria-hidden="true">&gt;</span>
        <span class="sr-only">Dodaj do kolejki</span>
        <input name="q" placeholder="tytuł — autor #film" enterkeyhint="done">
      </label>
      <p class="prompt-hint">trafia do kolejki · <code>— autor</code> opcjonalnie · <code>#film</code> <code>#serial</code> <code>#kurs</code> <code>#art</code> <code>#pod</code> (domyślnie książka)</p>
    </form>

    ${usedKinds.length > 1 ? html`
      <div class="chips-filter" aria-label="Rodzaj">
        ${usedKinds.map((k) => html`<button class="chip" data-filter-kind="${k}" aria-pressed="${String(ui.kind === k)}">${k}</button>`)}
      </div>` : ''}

    <main class="list">
      ${sections.map((s) => html`
        <h2 class="list-section">${s.title} <span class="count">${s.list.length}</span></h2>
        <ul class="post-list">${s.list.map(libraryItem)}</ul>`)}
      ${!sections.length ? html`<p class="empty" style="margin-top:2rem">Pusto. Dopisz pierwszą rzecz powyżej.</p>` : ''}
    </main>
  `;
}

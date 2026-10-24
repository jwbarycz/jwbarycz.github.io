// Widok "Pomysły" — szybka wrzutnia na luźne myśli. Każdą można jednym
// kliknięciem zamienić w zadanie albo projekt (pomysł zostaje, z linkiem do wyniku).

import { store } from '../store.js';
import { html } from '../utils.js';
import { icons } from '../components.js';

const day = (x) => x.createdAt.slice(0, 10);
const newestFirst = (a, b) => b.createdAt.localeCompare(a.createdAt);

/** Link do tego, czym pomysł się stał. */
function convertedLink(c) {
  if (c.kind === 'project') {
    const p = store.project(c.id);
    return p ? html`<a href="#/projekty/${p.id}">projekt: ${p.name} ⟶</a>` : html`<span class="faint">projekt (usunięty)</span>`;
  }
  const t = store.task(c.id);
  return t ? html`<button class="readmore" data-action="edit" data-id="${t.id}">zadanie: ${t.title} ⟶</button>` : html`<span class="faint">zadanie (usunięte)</span>`;
}

function ideaItem(x) {
  return html`
    <li class="list-item ${x.converted ? 'converted' : ''}" data-id="${x.id}">
      <div class="post-header">
        <time datetime="${day(x)}">${day(x)}</time>
        <div class="post-body">
          <h3 class="post-title ${x.pinned ? 'is-focus' : ''}"><span class="title-text" data-action="idea-edit">${x.title}</span></h3>
          ${x.note ? html`<div class="description">${x.note}</div>` : ''}
          <div class="post-links">
            ${x.converted
              ? html`<span class="converted-to">→ ${convertedLink(x.converted)}</span>`
              : html`
                <button class="readmore" data-action="idea-to-task">Na zadanie ⟶</button>
                <button class="readmore" data-action="idea-to-project">Na projekt ⟶</button>`}
            <span class="actions">
              ${x.converted ? '' : html`<button class="icon-btn" data-action="idea-pin" title="${x.pinned ? 'Odepnij' : 'Przypnij na górę'}" aria-label="Przypnij">${icons.star}</button>`}
              <button class="icon-btn" data-action="idea-edit" title="Edytuj" aria-label="Edytuj">${icons.edit}</button>
              <button class="icon-btn" data-action="idea-delete" title="Usuń" aria-label="Usuń">${icons.trash}</button>
            </span>
          </div>
        </div>
      </div>
    </li>`;
}

export function renderIdeas() {
  const all = store.state.ideas;
  const open = all.filter((x) => !x.converted).sort((a, b) => (b.pinned - a.pinned) || newestFirst(a, b));
  const done = all.filter((x) => x.converted).sort((a, b) => b.converted.at.localeCompare(a.converted.at));

  return html`
    <div class="page-header">Pomysły<span class="dot">.</span></div>
    <p class="section-content">Wszystko, co wpadnie do głowy — zanim ucieknie. Bez kategorii i terminów. Kiedy pomysł dojrzeje, jednym kliknięciem staje się zadaniem albo projektem.</p>

    <form data-form="add-idea" autocomplete="off" style="margin-top:1.75rem">
      <label class="prompt">
        <span class="caret" aria-hidden="true">&gt;</span>
        <span class="sr-only">Nowy pomysł</span>
        <input name="q" id="quick-input" placeholder="co wpadło do głowy?" enterkeyhint="done">
      </label>
      <p class="prompt-hint">Enter zapisuje · opis dopiszesz później przez edycję · <code>★</code> przypina na górę</p>
    </form>

    <main class="list">
      <h2 class="list-section">Do przemyślenia <span class="count">${open.length}</span></h2>
      ${open.length
        ? html`<ul class="post-list">${open.map(ideaItem)}</ul>`
        : html`<p class="empty">Pusto. Głowa czysta — albo pora coś zapisać.</p>`}

      ${done.length ? html`
        <h2 class="list-section">Zrealizowane <span class="count">${done.length}</span></h2>
        <ul class="post-list">${done.map(ideaItem)}</ul>` : ''}
    </main>
  `;
}

// Widok "Dziennik" — energia, nastrój i krótka notatka z każdego dnia.

import { store } from '../store.js';
import { html, today, longDate } from '../utils.js';
import { journalEntries, energySeries, avg, MOOD_NAMES } from '../insights.js';
import { checkin, sparkline } from '../components.js';

// Dzień edytowany w karcie u góry (domyślnie dziś, klik w "Edytuj" przy wpisie go zmienia)
export const ui = { date: null };

const energyBar = (n) => html`<span class="energy-bar" aria-hidden="true">${'▮'.repeat(n)}<span class="faint">${'▯'.repeat(10 - n)}</span></span>`;

export function renderJournal() {
  const date = ui.date || today();
  const d = store.day(date);
  const entries = journalEntries();
  const s30 = energySeries(30);

  return html`
    <div class="page-header">Dziennik<span class="dot">.</span></div>
    <p class="section-content">Minuta wieczorem: ile było energii, jak się czułeś, co warto zapamiętać. Po kilku tygodniach widać wzorce.</p>

    <h2 class="list-section">${date === today() ? 'Dziś' : longDate(date)}
      ${date !== today() ? html`<button class="readmore" data-action="journal-today" style="margin-left:.75rem; font-size:.75rem">wróć do dziś ⟶</button>` : ''}
    </h2>
    <div class="card">
      ${checkin(date)}
      <form data-form="journal-note" data-date="${date}" style="margin-top:1rem">
        <label class="field">notatka
          <textarea class="input" name="note" rows="3" placeholder="Co dziś poszło dobrze? Co jutro inaczej?">${d.note || ''}</textarea>
        </label>
        <div style="display:flex; justify-content:flex-end; margin-top:.6rem"><button class="btn small primary">Zapisz notatkę</button></div>
      </form>
    </div>

    <h2 class="list-section">Energia <span class="count">śr. 7 dni: ${avg(s30.slice(-7).map((x) => x.value)) ?? '—'} · 30 dni: ${avg(s30.map((x) => x.value)) ?? '—'}</span></h2>
    <div class="chart-box">
      ${sparkline(s30, { height: 90 })}
      <div class="chart-axis"><span>${s30[0].date}</span><span>dziś</span></div>
    </div>

    <h2 class="list-section">Wpisy <span class="count">${entries.length}</span></h2>
    ${entries.length ? html`
      <ul class="post-list">
        ${entries.map((e) => html`
          <li class="list-item">
            <div class="post-header">
              <time datetime="${e.date}">${e.date}</time>
              <div class="post-body">
                <h3 class="post-title"><span class="title-text">${e.energy ? `Energia ${e.energy}/10` : 'Bez oceny'}${e.mood ? ` · ${MOOD_NAMES[e.mood]}` : ''}</span></h3>
                ${e.energy ? html`<div class="meta">${energyBar(e.energy)}</div>` : ''}
                ${e.note ? html`<div class="description">${e.note}</div>` : ''}
                <div class="post-links"><button class="readmore" data-action="journal-edit" data-date="${e.date}">Edytuj ⟶</button></div>
              </div>
            </div>
          </li>`)}
      </ul>` : html`<p class="empty">Jeszcze nic. Pierwszy wpis powyżej.</p>`}
  `;
}

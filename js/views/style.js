// "Styl" view — a live design-system cheat sheet.

import { config } from '../config.js';
import { html, today, addDays } from '../utils.js';
import { taskList, postTaskList, sparkline } from '../components.js';

const swatch = (name, token, note = '') =>
  html`<div class="swatch"><div class="c" style="--c: var(${token})"></div><div class="t"><b>${name}</b>${token}${note ? html`<br>${note}` : ''}</div></div>`;

// Preview-only sample tasks — never stored
const demo = [
  { id: 'demo1', title: 'Zadanie z wysokim priorytetem', cat: 'kognitywne', prio: 3, plan: today(), due: today(), done: false, note: 'Notatka do zadania, pisana szeryfową czcionką.' },
  { id: 'demo2', title: 'Zadanie po terminie', cat: 'administracja', prio: 1, due: addDays(today(), -2), done: false },
  { id: 'demo3', title: 'Zadanie zaplanowane na później', cat: 'lekkie', prio: 0, plan: addDays(today(), 2), done: false },
  { id: 'demo4', title: 'Zadanie zrobione', cat: 'odlaczenie', prio: 0, done: true, doneAt: today() },
];

export function renderStyle() {
  return html`
    <div class="page-header">Styl<span class="dot">.</span></div>
    <p class="muted" style="margin:0">Ściąga z elementów panelu: kolory, typografia i komponenty w jednym miejscu.</p>

    <h2>Kolory</h2>
    <div class="swatches">
      ${swatch('Akcent', '--primary-color', '#ef5350')}
      ${swatch('Tło', '--bg-0')}
      ${swatch('Powierzchnia', '--surface')}
      ${swatch('Tło 2', '--bg-1')}
      ${swatch('Ramka', '--border-color')}
      ${swatch('Tekst', '--text-0')}
      ${swatch('Tekst 2', '--text-1')}
    </div>
    <h3>Kategorie i callouty</h3>
    <div class="swatches">
      ${config.categories.map((c) => swatch(c.name, c.color))}
      ${swatch('Danger', '--primary-color')}
    </div>

    <h2>Typografia</h2>
    <div class="type-sample">
      <span class="name">Space Grotesk — nagłówki</span>
      <div style="font-family:var(--header-font); font-size:2.5rem; line-height:1">Pulpit dnia<span class="accent" style="font-size:1.6em; line-height:0">.</span></div>
    </div>
    <div class="type-sample">
      <span class="name">JetBrains Mono — interfejs, daty, liczby</span>
      <div>2026-10-24 · 14:28 · 3/7 zrobione · <kbd>n</kbd> nowe</div>
    </div>
    <div class="type-sample">
      <span class="name">Source Serif 4 — treść, tytuły zadań, notatki</span>
      <p style="margin:0">Zrób dziś jedną rzecz porządnie, zamiast dziesięciu byle jak. <em>Kursywa</em>, <strong>pogrubienie</strong>, <del>przekreślenie</del> i <a href="#/styl">link z podkreśleniem</a>.</p>
    </div>
    <h3>Nagłówek sekcji</h3>
    <h4>Nagłówek czwartego poziomu</h4>
    <blockquote><p style="margin:0">Cytat z czerwoną linią po lewej.</p></blockquote>

    <h2>Przyciski i pola</h2>
    <div style="display:flex; flex-wrap:wrap; gap:.6rem; align-items:center">
      <button class="btn primary">✓ Główny</button>
      <button class="btn">Zwykły</button>
      <button class="btn ghost">Ghost</button>
      <button class="btn small">Mały</button>
      <button class="link-btn">link-przycisk</button>
      <label class="check-label"><input type="checkbox" class="check" checked> checkbox</label>
      <label class="check-label"><input type="checkbox" class="check"> pusty</label>
    </div>
    <div class="field-row" style="margin-top:1rem">
      <label class="field">pole tekstowe<input class="input" placeholder="wpisz coś…"></label>
      <label class="field">lista<select class="input"><option>Kognitywne</option><option>Lekkie</option></select></label>
    </div>
    <div style="margin-top:1rem">
      <label class="prompt"><span class="caret">&gt;</span><input placeholder="prompt szybkiego dodawania"></label>
    </div>

    <h2>Callouty</h2>
    ${['info', 'success', 'warning', 'tip', 'danger'].map((k) => html`
      <div class="note ${k}">
        <div class="note-head">${k}</div>
        <div class="note-body"><p>Ramka w stylu <code>note</code> z bloga — do podpowiedzi, ostrzeżeń i podsumowań.</p></div>
      </div>`)}

    <h2>Karty, statystyki, postęp</h2>
    <div class="grid">
      <div class="card cat-card" style="--cat: var(--info)">
        <div class="card-head"><h3>Karta kategorii</h3><span class="count">2/5</span></div>
        <p class="muted" style="margin:0">Kolorowa krawędź u góry = kategoria.</p>
      </div>
      <div class="card">
        <div class="stat">
          <div class="label">zrobione dziś</div>
          <div class="value">3<small> / 7</small></div>
          <div class="progress"><span style="--value:43%"></span></div>
        </div>
      </div>
    </div>

    <h2>Zadania</h2>
    <h3>Kompaktowe (karty na stronie głównej)</h3>
    <div class="card">${taskList(demo, { showCat: true })}</div>
    <h3>Jak lista postów (zakładka Zadania)</h3>
    ${postTaskList(demo)}

    <h2>Wykres</h2>
    <div class="chart-box">${sparkline(Array.from({ length: 14 }, (_, i) => ({ value: 5 + Math.round(Math.sin(i / 2) * 3) })))}</div>
  `;
}

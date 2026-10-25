// Home page — summary of the day and every tab.

import { config, categoryById } from '../config.js';
import { store } from '../store.js';
import { html, longDate, isoWeek, today, pad, plural, relDate, addDays } from '../utils.js';
import { isForToday, isOverdue, sortTasks, groupByCategory, prioMark } from '../tasks.js';
import { projectStats, energySeries, avg } from '../insights.js';
import { taskList, quickAdd, icons, checkin, sparkline, projectChip, callout } from '../components.js';

function dayProgress() {
  const now = new Date();
  const { start, end } = config.day;
  const mins = now.getHours() * 60 + now.getMinutes();
  const pct = Math.min(100, Math.max(0, ((mins - start * 60) / ((end - start) * 60)) * 100));
  return { pct: Math.round(pct), time: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
}

function focusCard(todays) {
  const id = store.day().focus;
  const t = id && store.task(id);
  if (!t) {
    const best = sortTasks(todays.filter((x) => !x.done))[0];
    return html`
      <div class="focus-card empty-state">
        <div class="label">fokus dnia</div>
        <div class="focus-title">Jedna rzecz, która dziś naprawdę musi się wydarzyć.</div>
        <div class="row">
          ${best ? html`<button class="btn small" data-action="focus" data-id="${best.id}">${icons.star} ${best.title}</button>` : ''}
          <span class="faint" style="font-size:.75rem">albo kliknij ★ przy dowolnym zadaniu</span>
        </div>
      </div>`;
  }
  const cat = categoryById(t.cat);
  return html`
    <div class="focus-card ${t.done ? 'done' : ''}" data-id="${t.id}">
      <div class="label">fokus dnia ${t.done ? '· zrobione ✓' : ''}</div>
      <div class="focus-title">${t.prio ? html`<span class="accent mono" style="font-size:.7em">${prioMark(t.prio)} </span>` : ''}${t.title}</div>
      ${t.note ? html`<p class="muted" style="margin:-.3rem 0 .8rem">${t.note}</p>` : ''}
      <div class="row">
        <button class="btn ${t.done ? '' : 'primary'} small" data-action="toggle">${t.done ? 'Cofnij' : '✓ Zrobione'}</button>
        <button class="btn ghost small" data-action="edit">Edytuj</button>
        <button class="btn ghost small" data-action="unfocus">Zmień fokus</button>
        <span style="margin-left:auto; display:flex; gap:.35rem; flex-wrap:wrap">
          ${projectChip(t.project)}
          <span class="chip" style="--cat: var(${cat.color})"><span class="sw"></span>${cat.name.toLowerCase()}</span>
        </span>
      </div>
    </div>`;
}

const more = (href, label) => html`<a class="readmore" href="${href}">${label} ⟶</a>`;

function ideasBox() {
  const open = store.state.ideas.filter((x) => !x.converted)
    .sort((a, b) => (b.pinned - a.pinned) || b.createdAt.localeCompare(a.createdAt));
  if (!open.length) return html`<p class="empty">Brak pomysłów do przemyślenia.</p>`;
  return html`
    <ul class="mini-list">
      ${open.slice(0, 4).map((x) => html`
        <li data-id="${x.id}">
          <span class="mini-title" data-action="idea-edit">${x.pinned ? html`<span class="accent">★ </span>` : ''}${x.title}</span>
        </li>`)}
    </ul>
    ${open.length > 4 ? html`<p class="mini-foot">i ${open.length - 4} więcej</p>` : ''}`;
}

function projectsBox() {
  const active = store.state.projects.filter((p) => p.status === 'aktywny');
  if (!active.length) return html`<p class="empty">Brak aktywnych projektów.</p>`;
  return html`
    <ul class="mini-list">
      ${active.map((p) => {
        const s = projectStats(p.id);
        return html`
          <li class="mini-project">
            <a href="#/projekty/${p.id}" class="plain">${p.name}</a>
            <span class="mini-meta">${s.done}/${s.total}</span>
            <div class="progress thin"><span style="--value:${s.pct}%; background: var(${p.color})"></span></div>
          </li>`;
      })}
    </ul>`;
}

function upcomingBox() {
  const list = sortTasks(store.state.tasks.filter((t) => !t.done && t.due && t.due > today()))
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5);
  if (!list.length) return html`<p class="empty">Żadnych terminów na horyzoncie.</p>`;
  return html`
    <ul class="mini-list">
      ${list.map((t) => html`
        <li data-id="${t.id}">
          <time datetime="${t.due}">${relDate(t.due)}</time>
          <span class="mini-title" data-action="edit">${t.title}</span>
        </li>`)}
    </ul>`;
}

export function renderHome() {
  const t = today();
  const all = store.state.tasks;
  const todays = all.filter(isForToday);
  const done = todays.filter((x) => x.done).length;
  const total = todays.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const overdue = all.filter(isOverdue);
  const { pct: dayPct, time } = dayProgress();
  const focusId = store.day().focus;
  const weekAgo = addDays(t, -6);
  const doneWeek = all.filter((x) => x.done && x.doneAt >= weekAgo).length;
  const s14 = energySeries(14);
  const energy7 = avg(s14.slice(-7).map((x) => x.value));

  // Day plan: category cards, without the focus task and overdue ones (they have their own sections)
  const groups = groupByCategory(sortTasks(todays.filter((x) => x.id !== focusId && !isOverdue(x))))
    .filter((g) => g.tasks.length || g.cat.id !== 'inbox');

  return html`
    <div class="page-header">Panel<span class="dot">.</span></div>
    <div class="dateline">
      <time datetime="${t}">${longDate(t)}</time>
      <span class="faint">tydzień ${isoWeek(t)}</span>
    </div>
    <div class="daybar" title="Postęp dnia ${config.day.start}:00–${config.day.end}:00">
      <div class="progress thin"><span style="--value:${dayPct}%"></span></div>
      <span class="tabular">${time} · ${dayPct}% dnia</span>
    </div>

    ${store.hasSeed() ? callout('tip', 'Przykładowe dane',
      html`<p>Zadania, projekty, pomysły i wpisy w dzienniku są przykładowe, żeby było widać, jak panel wygląda. <button class="link-btn" data-action="clear-seed">Usuń je</button>, kiedy zaczniesz dodawać własne.</p>`) : ''}

    <div class="stat-row stats-top">
      <div class="stat">
        <div class="label">zrobione dziś</div>
        <div class="value">${done}<small> / ${total}</small></div>
        <div class="progress"><span style="--value:${pct}%"></span></div>
      </div>
      <div class="stat">
        <div class="label">po terminie</div>
        <div class="value ${overdue.length ? 'accent' : ''}">${overdue.length}</div>
      </div>
      <div class="stat">
        <div class="label">zrobione · 7 dni</div>
        <div class="value">${doneWeek}<small> ${plural(doneWeek, 'zadanie', 'zadania', 'zadań')}</small></div>
      </div>
      <div class="stat">
        <div class="label">energia · 7 dni</div>
        <div class="value">${energy7 ?? '—'}<small> / 10</small></div>
      </div>
    </div>

    <div style="margin-top:2rem">${quickAdd('co dziś do zrobienia?')}</div>

    <div class="home-grid">
      <div class="home-main">
        <h2 class="list-section">Fokus</h2>
        ${focusCard(todays)}

        ${overdue.length ? callout('danger', `Po terminie (${overdue.length})`,
          taskList(sortTasks(overdue), { context: 'today', showCat: true, showProject: true }), { id: 'home-overdue' }) : ''}

        <h2 class="list-section">Plan dnia <span class="count">${total - done} ${plural(total - done, 'zostało', 'zostały', 'zostało')}</span></h2>
        <div class="grid two">
          ${groups.map(({ cat, tasks }) => html`
            <section class="card cat-card" style="--cat: var(${cat.color})">
              <div class="card-head">
                <h3>${cat.name}</h3>
                <span class="count">${tasks.filter((x) => x.done).length}/${tasks.length}</span>
              </div>
              ${taskList(tasks, { context: 'today', showProject: true }, 'Nic na dziś.')}
            </section>`)}
        </div>
        <div class="post-links" style="margin-top:1rem">${more('#/zadania', 'Wszystkie zadania')}</div>
      </div>

      <aside class="home-side">
        <h2 class="list-section">Jak się dziś masz</h2>
        ${checkin(t)}
        <div class="chart-box small">${sparkline(s14, { height: 48 })}</div>
        <div class="post-links">${more('#/dziennik', 'Dziennik')}</div>

        <h2 class="list-section">Pomysły</h2>
        ${ideasBox()}
        <div class="post-links">${more('#/pomysly', 'Wszystkie pomysły')}</div>

        <h2 class="list-section">Projekty</h2>
        ${projectsBox()}
        <div class="post-links">${more('#/projekty', 'Projekty')}</div>

        <h2 class="list-section">Terminy</h2>
        ${upcomingBox()}
      </aside>
    </div>
  `;
}

// Punkt wejścia: router, motyw, skróty klawiszowe, obsługa akcji.

import { config } from './config.js';
import { store } from './store.js';
import { today, addDays } from './utils.js';
import { parseQuick } from './tasks.js';
import { openTaskDialog, openProjectDialog, openIdeaDialog, toast } from './components.js';
import { renderHome } from './views/home.js';
import { renderTasks, ui as tasksUi } from './views/tasks.js';
import { renderProjects, renderProject } from './views/projects.js';
import { renderIdeas } from './views/ideas.js';
import { renderJournal, ui as journalUi } from './views/journal.js';
import { renderStyle } from './views/style.js';
import { renderSettings, ui as settingsUi } from './views/settings.js';
import { sync } from './sync.js';

const routes = {
  '': { id: 'panel', title: 'Panel', render: renderHome },
  zadania: { id: 'zadania', title: 'Zadania', render: renderTasks },
  projekty: { id: 'projekty', title: 'Projekty', render: (id) => (id ? renderProject(id) : renderProjects()) },
  pomysly: { id: 'pomysly', title: 'Pomysły', render: renderIdeas },
  dziennik: { id: 'dziennik', title: 'Dziennik', render: renderJournal },
  styl: { id: 'styl', title: 'Styl', render: renderStyle },
  ustawienia: { id: 'ustawienia', title: 'Ustawienia', render: renderSettings },
};

const view = document.getElementById('view');

/** '#/projekty/abc' → { route: routes.projekty, param: 'abc' } */
function currentRoute() {
  const [name = '', param] = location.hash.replace(/^#\/?/, '').split('/');
  return { route: routes[name] || routes[''], param };
}

function render({ keepFocus = false } = {}) {
  const { route, param } = currentRoute();
  // Zachowaj fokus w prompcie po dodaniu wpisu
  const activeId = keepFocus && document.activeElement?.closest('#view form') && document.activeElement.name;
  const activeForm = activeId && document.activeElement.form?.dataset.form;
  const scrollY = window.scrollY;

  view.innerHTML = route.render(param);

  const project = route.id === 'projekty' && param && store.project(param);
  document.title = `${project ? project.name : route.title} · ${config.name}`;
  document.querySelectorAll('[data-route]').forEach((a) => {
    if (a.dataset.route === route.id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (activeForm) view.querySelector(`form[data-form="${activeForm}"] [name="${activeId}"]`)?.focus();
  if (keepFocus) window.scrollTo(0, scrollY);
}

/* ---------- Motyw ---------- */
function setTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#0e1018' : '#ffffff';
  try { localStorage.setItem('panel:theme', theme); } catch {}
}
const toggleTheme = () => setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');

/* ---------- Akcje (delegacja zdarzeń) ---------- */
function handleAction(action, el) {
  const id = el.dataset.id || el.closest('[data-id]')?.dataset.id;
  const t = id && store.task(id);
  switch (action) {
    /* zadania */
    case 'toggle':
      store.toggleDone(id);
      if (t?.done) toast('Zrobione ✓');
      break;
    case 'focus':
      store.setFocus(store.day().focus === id ? null : id);
      break;
    case 'unfocus':
      store.setFocus(null);
      break;
    case 'tomorrow': {
      // Termin, który już minął, też przesuwamy — inaczej zadanie zostałoby na dziś
      const before = { plan: t.plan, due: t.due };
      const moveDue = t.due && t.due <= today();
      store.updateTask(id, { plan: addDays(today(), 1), ...(moveDue ? { due: addDays(today(), 1) } : {}) });
      if (store.day().focus === id) store.setFocus(null);
      toast(moveDue ? 'Przeniesione na jutro (z terminem)' : 'Przeniesione na jutro', () => store.updateTask(id, before));
      break;
    }
    case 'plan-today':
      store.updateTask(id, { plan: today() });
      toast('Zaplanowane na dziś');
      break;
    case 'edit':
      openTaskDialog(id);
      break;
    case 'delete': {
      const undo = store.removeTask(id);
      toast(`Usunięto: ${t?.title ?? ''}`, undo);
      break;
    }
    case 'toggle-all-done':
      tasksUi.showAllDone = !tasksUi.showAllDone;
      render({ keepFocus: true });
      break;

    /* projekty */
    case 'new-project':
      openProjectDialog(null);
      break;
    case 'edit-project':
      openProjectDialog(id);
      break;
    case 'delete-project': {
      const p = store.project(id);
      if (!p || !confirm(`Usunąć projekt „${p.name}”? Zadania zostaną, tylko bez projektu.`)) break;
      const linked = store.state.tasks.filter((x) => x.project === id).map((x) => x.id);
      store.patchWhere('tasks', (x) => x.project === id, { project: null });
      const undo = store.remove('projects', id);
      location.hash = '#/projekty';
      toast(`Usunięto projekt: ${p.name}`, () => {
        undo();
        store.patchWhere('tasks', (x) => linked.includes(x.id), { project: id });
      });
      break;
    }

    /* pomysły */
    case 'idea-edit':
      openIdeaDialog(id);
      break;
    case 'idea-pin': {
      const idea = store.state.ideas.find((x) => x.id === id);
      store.patch('ideas', id, { pinned: !idea.pinned });
      break;
    }
    case 'idea-to-task': {
      const idea = store.state.ideas.find((x) => x.id === id);
      const task = store.addTask({ title: idea.title, note: idea.note });
      store.patch('ideas', id, { converted: { kind: 'task', id: task.id, at: today() }, pinned: false });
      toast('Pomysł → zadanie (w „bez terminu”)', () => {
        store.removeTask(task.id);
        store.patch('ideas', id, { converted: null });
      });
      break;
    }
    case 'idea-to-project': {
      const idea = store.state.ideas.find((x) => x.id === id);
      const project = store.add('projects', { name: idea.title, desc: idea.note, status: 'aktywny', color: '--info', link: '' });
      store.patch('ideas', id, { converted: { kind: 'project', id: project.id, at: today() }, pinned: false });
      location.hash = `#/projekty/${project.id}`;
      toast('Pomysł → projekt. Dopisz pierwsze zadania.');
      break;
    }
    case 'idea-delete': {
      const idea = store.state.ideas.find((x) => x.id === id);
      const undo = store.remove('ideas', id);
      toast(`Usunięto: ${idea?.title ?? ''}`, undo);
      break;
    }

    /* dziennik */
    case 'energy':
    case 'mood': {
      const date = el.closest('[data-date]')?.dataset.date || today();
      const value = Number(el.dataset.value);
      const cur = store.day(date)[action];
      store.patchDay(date, { [action]: cur === value ? null : value });
      break;
    }
    case 'journal-edit':
      journalUi.date = el.dataset.date;
      render();
updateBadge(sync.status);
sync.start();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'journal-today':
      journalUi.date = null;
      render();
updateBadge(sync.status);
sync.start();
      break;

    /* synchronizacja */
    case 'sync-now':
      sync.now().then(() => toast(sync.status.state === 'ok' ? 'Zsynchronizowano' : sync.status.message));
      break;
    case 'sync-disconnect':
      if (confirm('Odłączyć to urządzenie od GitHuba? Dane zostaną w tej przeglądarce, ale przestaną się synchronizować.')) {
        sync.disconnect();
        render();
updateBadge(sync.status);
sync.start();
      }
      break;
    case 'export-data': {
      const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `panel-${today()}.json` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      break;
    }

    case 'clear-seed':
      store.clearSeed();
      toast('Przykładowe dane usunięte');
      break;
  }
}

view.addEventListener('click', (e) => {
  const fc = e.target.closest('[data-filter-cat]');
  if (fc) { tasksUi.cat = tasksUi.cat === fc.dataset.filterCat ? null : fc.dataset.filterCat; return render({ keepFocus: true }); }
  const fp = e.target.closest('[data-filter-project]');
  if (fp) { tasksUi.project = tasksUi.project === fp.dataset.filterProject ? null : fp.dataset.filterProject; return render({ keepFocus: true }); }

  const el = e.target.closest('[data-action]');
  if (!el || (el.tagName === 'INPUT' && el.type === 'checkbox')) return; // checkboxy obsługuje 'change'
  handleAction(el.dataset.action, el);
});

view.addEventListener('change', (e) => {
  if (e.target.matches('input[type="checkbox"][data-action]')) handleAction(e.target.dataset.action, e.target);
});

view.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const kind = form.dataset.form;

  if (kind === 'quick-add') {
    const input = form.querySelector('input');
    const parsed = parseQuick(input.value);
    if (!parsed.title) return;
    const { route, param } = currentRoute();
    // Na stronie głównej nowe zadanie ląduje w planie dnia, na stronie projektu — w projekcie
    if (route.id === 'panel' && !parsed.plan) parsed.plan = today();
    if (route.id === 'projekty' && param && !parsed.project) parsed.project = param;
    store.addTask(parsed);
    input.value = '';
    input.focus();
  }

  if (kind === 'add-idea') {
    const input = form.querySelector('input');
    const title = input.value.trim();
    if (!title) return;
    store.add('ideas', { title, note: '', pinned: false, converted: null });
    input.value = '';
    input.focus();
  }

  if (kind === 'connect-sync') {
    const token = form.token.value;
    if (!token.trim()) return;
    settingsUi.connecting = true;
    settingsUi.error = '';
    render();
updateBadge(sync.status);
sync.start();
    sync.connect(token).then((res) => {
      settingsUi.connecting = false;
      settingsUi.error = res.ok ? '' : res.message;
      render();
updateBadge(sync.status);
sync.start();
      if (res.ok) toast('Połączono z GitHubem ✓');
    });
  }

  if (kind === 'journal-note') {
    store.patchDay(form.dataset.date, { note: form.note.value.trim() });
    toast('Notatka zapisana');
  }
});

/* ---------- Skróty klawiszowe ---------- */
const JUMPS = { p: '#/', z: '#/zadania', r: '#/projekty', i: '#/pomysly', d: '#/dziennik', s: '#/styl' };
let gPressed = 0;
document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const typing = e.target.closest('input, textarea, select, [contenteditable]') || document.querySelector('dialog[open]');
  if (typing) {
    if (e.key === 'Escape' && e.target.id === 'quick-input') e.target.blur();
    return;
  }
  if (gPressed && Date.now() - gPressed < 800) {
    gPressed = 0;
    if (JUMPS[e.key]) location.hash = JUMPS[e.key];
    return;
  }
  if (e.key === 'g') { gPressed = Date.now(); return; }
  if (e.key === 'n') {
    const input = document.getElementById('quick-input');
    if (input) { e.preventDefault(); input.focus(); } else openTaskDialog(null);
  }
  if (e.key === 't') toggleTheme();
});

/* ---------- Start ---------- */
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
document.getElementById('logo').textContent = config.name;
document.getElementById('footer-left').innerHTML =
  `${config.name} · <a href="#/ustawienia">ustawienia</a> · <a href="#/styl">styl</a>`;

/* ---------- Plakietka synchronizacji przy logo ---------- */
const BADGE = {
  local: ['lokalnie', 'Dane tylko w tej przeglądarce — kliknij, żeby połączyć z GitHubem'],
  pending: ['zapisuję', 'Zmiany czekają na wysłanie'],
  syncing: ['sync…', 'Synchronizuję z GitHubem'],
  ok: ['github', 'Zsynchronizowano z GitHubem'],
  offline: ['offline', 'Brak internetu — wyślę zmiany później'],
  error: ['błąd', 'Błąd synchronizacji — kliknij po szczegóły'],
};
function updateBadge(st) {
  const el = document.getElementById('sync-badge');
  const [text, title] = BADGE[st.state] || BADGE.local;
  el.dataset.state = st.state;
  el.querySelector('.txt').textContent = text;
  el.title = st.message || title;
}
sync.onStatus((st) => {
  updateBadge(st);
  // Odśwież ustawienia, ale nie w trakcie wpisywania tokenu
  if (currentRoute().route.id === 'ustawienia' && !document.activeElement?.closest('#view input')) render({ keepFocus: true });
});

store.subscribe(() => render({ keepFocus: true }));
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

// Co minutę odśwież widok (pasek dnia, przejście przez północ) — ale nie w trakcie pisania
setInterval(() => {
  if (document.querySelector('dialog[open]') || document.activeElement?.closest('#view input, #view textarea')) return;
  render({ keepFocus: true });
}, 60_000);

render();
updateBadge(sync.status);
sync.start();

// Entry point: router, theme, keyboard shortcuts, action handling.

import { config } from './config.js';
import { store } from './store.js';
import { html, today, addDays } from './utils.js';
import { parseQuick } from './tasks.js';
import { openTaskDialog, openProjectDialog, openIdeaDialog, openStudyDialog, openSubjectDialog, toast, toggleNote } from './components.js';
import { renderHome } from './views/home.js';
import { renderTasks, ui as tasksUi } from './views/tasks.js';
import { renderProjects, renderProject } from './views/projects.js';
import { renderIdeas } from './views/ideas.js';
import { renderJournal, ui as journalUi } from './views/journal.js';
import { renderStyle } from './views/style.js';
import { renderSettings, ui as settingsUi } from './views/settings.js';
import { sync } from './sync.js';
import { initSearch } from './search.js';
import { renderStudy, renderSubject, ui as studyUi } from './views/study.js';
import { parseStudy } from './study.js';

const routes = {
  '': { id: 'panel', title: 'Panel', render: renderHome },
  studia: { id: 'studia', title: 'Studia', render: (id) => (id ? renderSubject(id) : renderStudy()) },
  zadania: { id: 'zadania', title: 'Zadania', render: renderTasks },
  projekty: { id: 'projekty', title: 'Projekty', render: (id) => (id ? renderProject(id) : renderProjects()) },
  pomysly: { id: 'pomysly', title: 'Pomysły', render: renderIdeas },
  dziennik: { id: 'dziennik', title: 'Dziennik', render: renderJournal },
  styl: { id: 'styl', title: 'Styl', render: renderStyle },
  ustawienia: { id: 'ustawienia', title: 'Ustawienia', render: renderSettings },
};

const view = document.getElementById('view');

const notFound = {
  id: '404',
  title: '404',
  render: () => html`
    <main class="centered-header">
      <div class="page-header">404<span class="dot">.</span></div>
      <span>Nie ma takiej strony :(</span>
      <span><a href="#/">wróć do panelu</a></span>
    </main>`,
};

/** '#/projekty/abc' → { route: routes.projekty, param: 'abc' } */
function currentRoute() {
  const [name = '', param] = location.hash.replace(/^#\/?/, '').split('/');
  return { route: name in routes ? routes[name] : notFound, param };
}

function render({ keepFocus = false } = {}) {
  const { route, param } = currentRoute();
  // Keep focus in the prompt after adding an entry
  const activeId = keepFocus && document.activeElement?.closest('#view form') && document.activeElement.name;
  const activeForm = activeId && document.activeElement.form?.dataset.form;
  const scrollY = window.scrollY;

  view.innerHTML = route.render(param);

  const named = param && (route.id === 'projekty' ? store.project(param)?.name
    : route.id === 'studia' ? store.state.subjects.find((s) => s.id === param)?.name : null);
  document.title = `${named || route.title} · ${config.name}`;
  document.querySelectorAll('[data-route]').forEach((a) => {
    if (a.dataset.route === route.id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (activeForm) view.querySelector(`form[data-form="${activeForm}"] [name="${activeId}"]`)?.focus();
  if (keepFocus) window.scrollTo(0, scrollY);
}

/* ---------- Theme ---------- */
const THEME_COLORS = { light: '#FFFFFF', dark: '#0E1018' };

/** Applies a theme without storing it (used on start and on every toggle). */
function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  // Both media-specific metas follow the chosen theme, not the OS one
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.content = THEME_COLORS[theme]; });
  document.getElementById('theme-toggle').setAttribute('aria-pressed', String(theme === 'dark'));
}

function setTheme(theme) {
  applyTheme(theme);
  try { localStorage.setItem('panel:theme', theme); } catch {}
}
const toggleTheme = () => setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');

/* ---------- Actions (event delegation) ---------- */
function handleAction(action, el) {
  const id = el.dataset.id || el.closest('[data-id]')?.dataset.id;
  const t = id && store.task(id);
  switch (action) {
    /* tasks */
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
      // Move a past due date too — otherwise the task would stay on today
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
    /* study */
    case 'study-new':
      openStudyDialog(null, { subject: currentRoute().route.id === 'studia' ? currentRoute().param || studyUi.subject || '' : '' });
      break;
    case 'study-edit':
      openStudyDialog(id);
      break;
    case 'study-done': {
      const item = store.state.study.find((x) => x.id === id);
      if (item.done) {
        store.patch('study', id, { done: false, doneAt: null });
      } else {
        store.patch('study', id, { done: true, doneAt: today() });
        toast('Zaliczone ✓ — ocenę dopiszesz w edycji', () => store.patch('study', id, { done: false, doneAt: null }));
      }
      break;
    }
    case 'study-delete': {
      const item = store.state.study.find((x) => x.id === id);
      const undo = store.remove('study', id);
      toast(`Usunięto: ${item?.title || item?.kind || ''}`, undo);
      break;
    }
    case 'scope-toggle': {
      const item = store.state.study.find((x) => x.id === id);
      const topic = el.dataset.topic;
      studyUi.openScopes.set(id, true);
      store.patch('study', id, { scope: item.scope.map((t) => (t.id === topic ? { ...t, done: !t.done } : t)) });
      break;
    }
    case 'question-toggle': {
      const subject = store.state.subjects.find((x) => x.id === el.dataset.subject);
      if (!subject) break;
      store.patch('subjects', subject.id, {
        questions: subject.questions.map((q) => (q.id === el.dataset.q ? { ...q, done: !q.done } : q)),
      });
      break;
    }
    case 'study-all-done':
      studyUi.showAllDone = !studyUi.showAllDone;
      render({ keepFocus: true });
      break;
    case 'subject-new':
      openSubjectDialog(null);
      break;
    case 'subject-edit':
      openSubjectDialog(id);
      break;
    case 'subject-delete': {
      const s = store.state.subjects.find((x) => x.id === id);
      if (!s || !confirm(`Usunąć przedmiot „${s.name}”? Jego terminy zostaną, tylko bez przedmiotu.`)) break;
      const linked = store.state.study.filter((x) => x.subject === id).map((x) => x.id);
      store.patchWhere('study', (x) => x.subject === id, { subject: null });
      const undo = store.remove('subjects', id);
      location.hash = '#/studia';
      toast(`Usunięto przedmiot: ${s.name}`, () => {
        undo();
        store.patchWhere('study', (x) => linked.includes(x.id), { subject: id });
      });
      break;
    }

    case 'toggle-all-done':
      tasksUi.showAllDone = !tasksUi.showAllDone;
      render({ keepFocus: true });
      break;

    /* projects */
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

    /* ideas */
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

    /* journal */
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

    /* sync */
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

    case 'note-toggle':
      toggleNote(el.dataset.note);
      render({ keepFocus: true });
      break;

    case 'clear-seed':
      store.clearSeed();
      toast('Przykładowe dane usunięte');
      break;
  }
}

view.addEventListener('click', (e) => {
  const fc = e.target.closest('[data-filter-cat]');
  if (fc) { tasksUi.cat = tasksUi.cat === fc.dataset.filterCat ? null : fc.dataset.filterCat; return render({ keepFocus: true }); }
  const ss = e.target.closest('[data-study-sort]');
  if (ss) { studyUi.sort = ss.dataset.studySort; return render({ keepFocus: true }); }
  const fs = e.target.closest('[data-filter-subject]');
  if (fs) { studyUi.subject = studyUi.subject === fs.dataset.filterSubject ? null : fs.dataset.filterSubject; return render({ keepFocus: true }); }
  const fp = e.target.closest('[data-filter-project]');
  if (fp) { tasksUi.project = tasksUi.project === fp.dataset.filterProject ? null : fp.dataset.filterProject; return render({ keepFocus: true }); }

  const el = e.target.closest('[data-action]');
  if (!el || (el.tagName === 'INPUT' && el.type === 'checkbox')) return; // checkboxes are handled by 'change'
  handleAction(el.dataset.action, el);
});

// Remember which topic lists are unfolded, so a re-render doesn't fold them back
view.addEventListener('toggle', (e) => {
  if (e.target.matches?.('details.scope')) studyUi.openScopes.set(e.target.dataset.id, e.target.open);
}, true);

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
    // On the home page a new task goes into today's plan; on a project page — into that project
    if (route.id === 'panel' && !parsed.plan) parsed.plan = today();
    if (route.id === 'projekty' && param && !parsed.project) parsed.project = param;
    store.addTask(parsed);
    input.value = '';
    input.focus();
  }

  if (kind === 'add-study') {
    const input = form.querySelector('input');
    const parsed = parseStudy(input.value, store.state.subjects);
    if (!parsed.title && !parsed.date && !parsed.subject) return;
    const { route, param } = currentRoute();
    if (!parsed.subject) parsed.subject = (route.id === 'studia' && (param || studyUi.subject)) || null;
    store.add('study', { place: '', time: '', prepDays: null, scope: [], done: false, doneAt: null, grade: '', note: '', date: '', ...parsed });
    input.value = '';
    input.focus();
    toast(parsed.date ? 'Dodane — z czego się uczyć dopiszesz w edycji' : 'Dodane bez daty — ustaw ją w edycji');
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

/* ---------- Keyboard shortcuts ---------- */
const JUMPS = { p: '#/', u: '#/studia', z: '#/zadania', r: '#/projekty', i: '#/pomysly', d: '#/dziennik', s: '#/styl' };
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
applyTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
initSearch();
document.getElementById('logo').textContent = config.name;
document.getElementById('footer-left').innerHTML =
  `${config.name} · <a href="#/ustawienia">ustawienia</a> · <a href="#/styl">styl</a>`;

/* ---------- Sync badge next to the logo ---------- */
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
  // Refresh settings, but not while the token is being typed
  if (currentRoute().route.id === 'ustawienia' && !document.activeElement?.closest('#view input')) render({ keepFocus: true });
});

store.subscribe(() => render({ keepFocus: true }));
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

// Re-render every minute (day bar, crossing midnight) — but not while typing
setInterval(() => {
  if (document.querySelector('dialog[open]') || document.activeElement?.closest('#view input, #view textarea')) return;
  render({ keepFocus: true });
}, 60_000);

render();
updateBadge(sync.status);
sync.start();

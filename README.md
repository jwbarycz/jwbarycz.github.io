# Panel

A personal task and productivity dashboard. Plain HTML/CSS/JS with no build step, served straight from GitHub Pages. The interface is in Polish.

> 🌐 **Live:** [jwbarycz.github.io](https://jwbarycz.github.io/)

## Running locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765 (ES modules don't load from `file://`).

## Sync (GitHub)

Data is stored in the private repo [`jwbarycz/panel-data`](https://github.com/jwbarycz/panel-data) as `data.json` — every change is a commit.

1. Create a [fine-grained token](https://github.com/settings/personal-access-tokens/new): *Only select repositories* → `panel-data`, *Contents: Read and write*.
2. In the panel: **ustawienia** (footer link or the badge next to the logo) → paste the token → **Połącz**.
3. Repeat step 2 on every device (same token).

How it works: changes are saved in the browser immediately and pushed to the repo after ~2 s of inactivity (several quick changes = one commit). The panel pulls updates when opened, when the tab becomes visible again and every 3 minutes. Two devices are merged item by item (the newer change wins, deletions are remembered) — see `js/merge.js`. Everything works offline; changes are pushed once the connection is back.

## Tabs

| Route | What it is |
|---|---|
| `#/` (logo) | **Panel** — summary: focus, day plan, energy, ideas, projects, deadlines |
| `#/zadania` | Tasks — blog-style list grouped into overdue / today / upcoming / no date / done |
| `#/projekty` | Projects — cards with progress; `#/projekty/<id>` is a single project with its tasks |
| `#/pomysly` | Ideas — an inbox for loose thoughts; turn any of them into a task or a project with one click |
| `#/dziennik` | Journal — daily energy (1–10), mood and a note, plus a chart |
| `#/styl` | Design-system cheat sheet (footer link) |
| `#/ustawienia` | Settings — GitHub connection, data export (JSON) |

## Structure

| File | Purpose |
|---|---|
| `index.html` | page skeleton, navigation, fonts |
| `css/style.css` | design system: color tokens, typography, components |
| `css/fonts.css`, `fonts/` | self-hosted fonts (no external requests) |
| `js/config.js` | **settings** — name, categories, day hours, data repo |
| `js/store.js` | app state and browser persistence (localStorage) |
| `js/sync.js` | sync with the `panel-data` repo via the GitHub Contents API |
| `js/merge.js` | merging data from two devices |
| `js/search.js` | search modal (⌘K / Ctrl+K) over tasks, projects, ideas and journal notes |
| `js/tasks.js` | quick-add parser, task filters and sorting |
| `js/insights.js` | derived data: project progress, energy |
| `js/components.js` | task row and blog-style entry, dialogs, energy chart |
| `js/views/*.js` | one file per tab |

## Quick add

`Napisać esej !3 #kog @pt ^jutro`

- `!1`–`!3` or `!`/`!!`/`!!!` — priority
- `#cat` — category (a prefix of the name is enough)
- `@dziś` `@jutro` `@pt` `@30.10` `@2026-11-02` — due date
- `+name` — project (a prefix of the name is enough)
- `^jutro` etc. — plan for a given day

## Shortcuts

`n` new task · `⌘K` / `Ctrl+K` search · `t` theme · `g` + `p` Panel / `z` Tasks / `r` Projects / `i` Ideas / `d` Journal / `s` Style

## Licenses

Third-party code and fonts are listed in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

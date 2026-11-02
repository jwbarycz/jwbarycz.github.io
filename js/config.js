// Panel settings — everything personal lives in one place.

export const config = {
  // Name shown in the top-left corner and in the browser tab title
  name: 'Panel',

  // Data repository used for GitHub sync
  github: {
    owner: 'jwbarycz',  // GitHub username
    dataRepo: 'panel-data',
    branch: 'main',
  },

  // "Active day" hours — drives the day progress bar on the home page
  day: { start: 7, end: 23 },

  // Task categories. `color` is a token name from css/style.css.
  categories: [
    { id: 'inbox',       name: 'Inbox',          color: '--text-2' },
    { id: 'kognitywne',  name: 'Kognitywne',     color: '--info' },
    { id: 'administracja', name: 'Administracja', color: '--warning' },
    { id: 'lekkie',      name: 'Lekkie',         color: '--success' },
    { id: 'odlaczenie',  name: 'Odłączenie',     color: '--tip' },
  ],
};

// University: shown on the Studia tab
config.study = {
  university: 'UEW',
  term: 'semestr zimowy 2026/27',
  // Kinds of deadlines. `prepDays` = how many days before the date to start preparing
  // (for medium weight; light is ×0.5, heavy ×1.5). `token` is used in quick add (#egz, #kol, …).
  kinds: [
    { id: 'egzamin',     name: 'Egzamin',     token: 'egz',  prepDays: 14, color: '--primary-color' },
    { id: 'kolokwium',   name: 'Kolokwium',   token: 'kol',  prepDays: 7,  color: '--violet' },
    { id: 'zaliczenie',  name: 'Zaliczenie',  token: 'zal',  prepDays: 7,  color: '--warning' },
    { id: 'projekt',     name: 'Projekt',     token: 'proj', prepDays: 10, color: '--info' },
    { id: 'prezentacja', name: 'Prezentacja', token: 'prez', prepDays: 5,  color: '--tip' },
    { id: 'referat',     name: 'Referat',     token: 'ref',  prepDays: 5,  color: '--tip' },
    { id: 'zadanie',     name: 'Zadanie',     token: 'zad',  prepDays: 2,  color: '--success' },
  ],
  weightFactor: { 1: 0.5, 2: 1, 3: 1.5 },
};

export const categoryById = (id) =>
  config.categories.find((c) => c.id === id) || config.categories[0];

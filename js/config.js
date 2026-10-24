// Ustawienia panelu — wszystko, co personalne, jest w jednym miejscu.

export const config = {
  // Nazwa w lewym górnym rogu i w tytule karty
  name: 'Panel',

  // Repozytoria (używane od fazy 2 — synchronizacja z GitHubem)
  github: {
    owner: 'jwbarycz',  // login GitHub
    dataRepo: 'panel-data',
    branch: 'main',
  },

  // Godziny "aktywnego dnia" — do paska postępu dnia na pulpicie
  day: { start: 7, end: 23 },

  // Kategorie zadań. `color` to nazwa tokenu z css/style.css.
  categories: [
    { id: 'inbox',       name: 'Inbox',          color: '--text-2' },
    { id: 'kognitywne',  name: 'Kognitywne',     color: '--info' },
    { id: 'administracja', name: 'Administracja', color: '--warning' },
    { id: 'lekkie',      name: 'Lekkie',         color: '--success' },
    { id: 'odlaczenie',  name: 'Odłączenie',     color: '--tip' },
  ],
};

export const categoryById = (id) =>
  config.categories.find((c) => c.id === id) || config.categories[0];

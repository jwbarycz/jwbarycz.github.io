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

export const categoryById = (id) =>
  config.categories.find((c) => c.id === id) || config.categories[0];

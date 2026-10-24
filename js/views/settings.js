// Widok "Ustawienia" — połączenie z GitHubem i kopia danych.

import { config } from '../config.js';
import { sync } from '../sync.js';
import { html } from '../utils.js';

const STATE_TEXT = {
  local: 'tylko ta przeglądarka',
  pending: 'zmiany czekają na wysłanie',
  syncing: 'synchronizuję…',
  ok: 'zsynchronizowano',
  offline: 'offline — wyślę po powrocie internetu',
  error: 'błąd synchronizacji',
};

export const ui = { connecting: false, error: '' };

const time = (d) => d && d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

export function renderSettings() {
  const st = sync.status;
  const repo = `${config.github.owner}/${config.github.dataRepo}`;
  const tokenUrl = 'https://github.com/settings/personal-access-tokens/new';

  return html`
    <div class="page-header">Ustawienia<span class="dot">.</span></div>
    <p class="section-content">Synchronizacja z prywatnym repo na GitHubie i kopia danych.</p>

    <h2 class="list-section">Synchronizacja</h2>
    <div class="sync-status" data-state="${st.state}">
      <span class="led"></span>
      <span>${STATE_TEXT[st.state] || st.state}${st.state === 'ok' && st.lastSync ? ` · ${time(st.lastSync)}` : ''}</span>
    </div>
    ${st.message && (st.state === 'error' || st.state === 'offline') ? html`
      <div class="note danger"><div class="note-head">Coś poszło nie tak</div><div class="note-body"><p>${st.message}</p></div></div>` : ''}

    ${sync.connected ? html`
      <p class="section-content" style="margin-top:1rem">Dane tego urządzenia są zapisywane w <a href="https://github.com/${repo}" target="_blank" rel="noopener">${repo}</a> jako <code>data.json</code>. Każda zmiana to commit, więc masz pełną historię.</p>
      <div class="post-links" style="margin-top:1rem">
        <button class="readmore" data-action="sync-now">Synchronizuj teraz ⟶</button>
        <a href="https://github.com/${repo}/commits/${config.github.branch}/data.json" target="_blank" rel="noopener">Historia zmian ⟶</a>
        <button class="readmore danger" data-action="sync-disconnect">Odłącz to urządzenie</button>
      </div>
    ` : html`
      <p class="section-content" style="margin-top:1rem">Na razie dane są tylko w tej przeglądarce. Połącz panel z repo <a href="https://github.com/${repo}" target="_blank" rel="noopener">${repo}</a>, żeby widzieć te same zadania na telefonie i komputerze.</p>

      <div class="note info">
        <div class="note-head">Jak zrobić token (raz, ok. 2 minuty)</div>
        <div class="note-body">
          <ol class="steps">
            <li>Otwórz <a href="${tokenUrl}" target="_blank" rel="noopener">GitHub → Fine-grained token</a>.</li>
            <li><b>Token name:</b> <code>panel</code>, <b>Expiration:</b> np. 1 rok.</li>
            <li><b>Repository access:</b> <i>Only select repositories</i> → <code>${config.github.dataRepo}</code>.</li>
            <li><b>Permissions → Repository permissions → Contents:</b> <i>Read and write</i>. Nic więcej.</li>
            <li><b>Generate token</b>, skopiuj i wklej poniżej. Ten sam token wkleisz na telefonie.</li>
          </ol>
        </div>
      </div>

      <form data-form="connect-sync" autocomplete="off" style="margin-top:1rem">
        <label class="prompt">
          <span class="caret" aria-hidden="true">&gt;</span>
          <span class="sr-only">Token GitHub</span>
          <input name="token" type="password" placeholder="github_pat_…" autocomplete="off" spellcheck="false" ${ui.connecting ? 'disabled' : ''}>
          <button class="btn small primary" ${ui.connecting ? 'disabled' : ''}>${ui.connecting ? 'Łączę…' : 'Połącz'}</button>
        </label>
        ${ui.error ? html`<p class="form-error">${ui.error}</p>` : ''}
        <p class="prompt-hint">Token zostaje tylko w tej przeglądarce i daje dostęp wyłącznie do ${repo} — nie do reszty Twojego konta.</p>
      </form>
    `}

    <h2 class="list-section">Dane</h2>
    <div class="post-links">
      <button class="readmore" data-action="export-data">Pobierz kopię (JSON) ⟶</button>
    </div>
  `;
}

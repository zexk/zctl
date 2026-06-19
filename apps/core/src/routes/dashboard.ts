import type { FastifyInstance } from 'fastify';

const dashboardHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>zctl dashboard</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #eeeeee;
        --panel: #ffffff;
        --ink: #111111;
        --muted: #555555;
        --line: #888888;
        --soft-line: #cccccc;
        --head: #dddddd;
        --accent: #003366;
        --accent-ink: #ffffff;
        --danger: #990000;
        --ok: #006600;
      }

      html[data-theme="dark"] {
        --bg: #111111;
        --panel: #1b1b1b;
        --ink: #eeeeee;
        --muted: #bbbbbb;
        --line: #777777;
        --soft-line: #444444;
        --head: #2a2a2a;
        --accent: #8ab4f8;
        --accent-ink: #000000;
        --danger: #ff7777;
        --ok: #7fd37f;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background: var(--bg);
        color: var(--ink);
        font-family: Arial, Helvetica, sans-serif;
        font-size: 15px;
      }

      button,
      input,
      select {
        font: inherit;
      }

      .shell {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: min(1200px, calc(100% - 48px));
        margin: 0 auto;
        padding: 24px 0;
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border: 1px solid var(--line);
        border-bottom: 0;
        background: var(--head);
        padding: 14px 24px;
      }

      h1 {
        margin: 0;
        font-size: 26px;
        line-height: 1;
      }

      .panel {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--line);
        background: var(--panel);
        padding: 24px;
      }

      .auth {
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: 12px;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid var(--soft-line);
      }

      input,
      select {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 0;
        background: var(--panel);
        color: var(--ink);
        padding: 10px 12px;
      }

      button {
        border: 1px solid #001d3a;
        border-radius: 0;
        background: var(--accent);
        color: var(--accent-ink);
        cursor: pointer;
        padding: 8px 16px;
        font-weight: 600;
      }

      button.secondary {
        border: 1px solid var(--line);
        background: var(--panel);
        color: var(--ink);
      }

      button:disabled {
        cursor: wait;
        opacity: 0.65;
      }

      .grid {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: 420px 1fr;
        gap: 24px;
      }

      .grid > section {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .machine-list {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
        display: grid;
        align-content: start;
        gap: 0;
        border-top: 1px solid var(--soft-line);
        border-left: 1px solid var(--soft-line);
      }

      .machine {
        width: 100%;
        border: 0;
        border-right: 1px solid var(--soft-line);
        border-bottom: 1px solid var(--soft-line);
        border-radius: 0;
        background: var(--panel);
        color: var(--ink);
        text-align: left;
        padding: 10px 14px;
      }

      .machine .meta {
        font-size: 11px;
        min-height: 1.2em;
      }

      .machine.active {
        background: color-mix(in srgb, var(--accent) 18%, var(--panel));
        outline: 1px solid var(--accent);
        outline-offset: -1px;
      }

      .machine-name {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        font-weight: 700;
      }

      .meta,
      .status,
      .error,
      .empty {
        color: var(--muted);
        font-size: 13px;
        margin: 0;
      }

      .empty {
        padding: 16px;
      }

      .executions .empty {
        padding: 12px 16px;
      }

      .status {
        border: 1px solid var(--soft-line);
        border-radius: 0;
        padding: 2px 8px;
        background: var(--panel);
        font-size: 12px;
        text-transform: uppercase;
      }

      .machine .status {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        border: none;
        padding: 0;
        text-indent: -9999px;
        overflow: hidden;
        background: var(--muted);
      }

      .machine .status.online {
        background: var(--ok);
      }

      .machine .status.offline {
        background: var(--danger);
      }

      .status.online {
        background: color-mix(in srgb, var(--ok) 14%, var(--panel));
        color: var(--ok);
      }

      .status.offline {
        background: color-mix(in srgb, var(--danger) 14%, var(--panel));
        color: var(--danger);
      }

      .detail-head {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 8px;
        border: 1px solid var(--line);
        background: var(--panel);
        padding: 14px 18px;
        margin-bottom: 20px;
      }

      h2,
      h3 {
        margin: 0 0 14px;
        font-size: 17px;
      }

      .section-head {
        display: flex;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 16px;
      }

      .section-head h2 {
        margin: 0;
        font-size: 18px;
      }

      .counts {
        font-size: 13px;
        color: var(--muted);
      }

      .counts strong {
        font-size: 15px;
        color: var(--ink);
      }

      .exec-form {
        display: grid;
        grid-template-columns: 1.5fr 140px auto;
        gap: 12px;
        margin-bottom: 8px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--soft-line);
      }

      .exec-form input,
      .exec-form button {
        font-size: 16px;
      }

      .output {
        display: none;
        overflow: auto;
        border: 1px solid var(--line);
        border-radius: 0;
        background: #111111;
        color: #eeeeee;
        padding: 16px;
        font-family: "Courier New", Courier, monospace;
        font-size: 12px;
        white-space: pre-wrap;
        margin: 0 0 20px;
      }

      .executions {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
        display: grid;
        align-content: start;
        gap: 0;
        border-top: 1px solid var(--soft-line);
        border-left: 1px solid var(--soft-line);
      }

      .execution {
        border-right: 1px solid var(--soft-line);
        border-bottom: 1px solid var(--soft-line);
        border-radius: 0;
        background: var(--panel);
        padding: 12px 16px;
      }

      .execution code {
        display: block;
        overflow: hidden;
        margin-bottom: 6px;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: "Courier New", Courier, monospace;
        font-size: 12px;
      }

      .error {
        min-height: 4px;
        margin: 0 0 4px;
        color: var(--danger);
      }

      @media (max-width: 780px) {
        header,
        .detail-head {
          display: block;
        }

        .auth,
        .grid,
        .exec-form,
        .stats {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <header>
                <h1>zctl dashboard</h1>
        <div>
          <button id="refresh" type="button" class="secondary" aria-label="Refresh"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg></button>
          <button id="theme-toggle" type="button" class="secondary" aria-label="Switch to dark mode"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button>
        </div>
      </header>

      <section class="panel">
        <form id="exec-form" class="exec-form">
          <input id="command" name="command" autocomplete="off" placeholder="Command, e.g. uname -a" />
          <input id="timeout" name="timeout" inputmode="numeric" value="30" placeholder="Timeout (s)" />
          <button id="run" type="submit">Run</button>
        </form>

        <p id="error" class="error" role="alert"></p>

        <div class="section-head">
          <h2>Machines</h2>
          <span class="counts">
            <strong id="total">0</strong> total ·
            <strong id="online">0</strong> online ·
            <strong id="offline">0</strong> offline
          </span>
        </div>

        <div class="grid">
          <section>
            <div id="machines" class="machine-list" aria-live="polite"></div>
          </section>

          <section>
            <div class="detail-head">
              <div>
                <h2 id="machine-title">Select a machine</h2>
                <div id="machine-meta" class="meta"></div>
              </div>
              <span id="machine-status" class="status">unknown</span>
            </div>

            <pre id="output" class="output"></pre>

            <h3>Command history</h3>
            <div id="executions" class="executions" aria-live="polite"></div>
          </section>
        </div>

        <div class="auth">
          <input id="token" type="password" autocomplete="off" placeholder="Operator bearer token" />
          <button id="save-token" type="button">Use token</button>
          <button id="clear-token" type="button" class="secondary">Clear</button>
        </div>
      </section>
    </main>

    <script>
      const state = {
        machines: [],
        selected: null,
        token: localStorage.getItem('zctl.operatorToken') || ''
      };

      const el = {
        token: document.querySelector('#token'),
        saveToken: document.querySelector('#save-token'),
        clearToken: document.querySelector('#clear-token'),
        themeToggle: document.querySelector('#theme-toggle'),
        refresh: document.querySelector('#refresh'),
        error: document.querySelector('#error'),
        total: document.querySelector('#total'),
        online: document.querySelector('#online'),
        offline: document.querySelector('#offline'),
        machines: document.querySelector('#machines'),
        machineTitle: document.querySelector('#machine-title'),
        machineMeta: document.querySelector('#machine-meta'),
        machineStatus: document.querySelector('#machine-status'),
        execForm: document.querySelector('#exec-form'),
        command: document.querySelector('#command'),
        timeout: document.querySelector('#timeout'),
        run: document.querySelector('#run'),
        output: document.querySelector('#output'),
        executions: document.querySelector('#executions')
      };

      el.token.value = state.token;

      function systemTheme() {
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      function currentTheme() {
        return localStorage.getItem('zctl.theme') || systemTheme();
      }

      function applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
        const dark = theme === 'dark';
        el.themeToggle.innerHTML = dark
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
        el.themeToggle.ariaLabel = dark ? 'Switch to light mode' : 'Switch to dark mode';
      }

      applyTheme(currentTheme());

      function setError(message) {
        el.error.textContent = message || '';
      }

      function authHeaders() {
        if (!state.token) throw new Error('Enter an operator bearer token.');
        return { authorization: 'Bearer ' + state.token };
      }

      async function api(path, options = {}) {
        const res = await fetch(path, {
          ...options,
          headers: {
            ...authHeaders(),
            ...(options.body ? { 'content-type': 'application/json' } : {}),
            ...(options.headers || {})
          }
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || res.status + ' ' + res.statusText);
        }
        return res.json();
      }

      function formatDate(value) {
        if (!value) return 'never';
        return new Date(value).toLocaleString();
      }

      function renderMachines() {
        const online = state.machines.filter((m) => m.status === 'online').length;
        el.total.textContent = String(state.machines.length);
        el.online.textContent = String(online);
        el.offline.textContent = String(state.machines.length - online);

        if (state.machines.length === 0) {
          el.machines.innerHTML = '<p class="empty">No machines registered.</p>';
          return;
        }

        el.machines.replaceChildren(
          ...state.machines.map((machine) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'machine' + (state.selected?.hostname === machine.hostname ? ' active' : '');
            button.innerHTML =
              '<div class="machine-name"><span></span><span class="status"></span></div>' +
              '<div class="meta"></div>';
            button.querySelector('.machine-name span').textContent = machine.hostname;
            const status = button.querySelector('.status');
            status.className = 'status ' + machine.status;
            button.querySelector('.meta').textContent =
              machine.status === 'offline' ? 'last seen ' + formatDate(machine.lastSeen) : '';
            button.addEventListener('click', () => selectMachine(machine.hostname));
            return button;
          })
        );
      }

      function renderSelected() {
        const machine = state.selected;
        el.output.style.display = 'none';
        el.output.textContent = '';

        if (!machine) {
          el.machineTitle.textContent = 'Select a machine';
          el.machineMeta.textContent = '';
          el.machineStatus.textContent = 'unknown';
          el.machineStatus.className = 'status';
          el.executions.innerHTML = '<p class="empty">No machine selected.</p>';
          return;
        }

        el.machineTitle.textContent = machine.hostname;
        el.machineMeta.textContent =
          [machine.os, machine.arch].filter(Boolean).join(' / ') +
          ' | registered ' +
          formatDate(machine.createdAt) +
          ' | last seen ' +
          formatDate(machine.lastSeen);
        el.machineStatus.textContent = machine.status;
        el.machineStatus.className = 'status ' + machine.status;
      }

      function renderExecutions(executions) {
        if (executions.length === 0) {
          el.executions.innerHTML = '<p class="empty">No command history yet.</p>';
          return;
        }

        el.executions.replaceChildren(
          ...executions.slice(0, 12).map((execution) => {
            const item = document.createElement('article');
            item.className = 'execution';
            item.innerHTML = '<code></code><div class="meta"></div>';
            item.querySelector('code').textContent = execution.command;
            item.querySelector('.meta').textContent =
              execution.status +
              ' | exit ' +
              (execution.exitCode ?? '-') +
              ' | ' +
              formatDate(execution.createdAt);
            return item;
          })
        );
      }

      async function loadExecutions(hostname) {
        const executions = await api('/machines/' + encodeURIComponent(hostname) + '/executions');
        renderExecutions(executions);
      }

      async function selectMachine(hostname) {
        state.selected = state.machines.find((m) => m.hostname === hostname) || null;
        renderMachines();
        renderSelected();
        if (state.selected) await loadExecutions(state.selected.hostname);
      }

      async function refresh() {
        setError('');
        el.refresh.disabled = true;
        try {
          state.machines = await api('/machines');
          state.machines.sort((a, b) => a.status === 'online' ? -1 : b.status === 'online' ? 1 : 0);
          if (state.selected) {
            state.selected = state.machines.find((m) => m.hostname === state.selected.hostname) || null;
          }
          if (!state.selected && state.machines.length > 0) state.selected = state.machines[0];
          renderMachines();
          renderSelected();
          if (state.selected) await loadExecutions(state.selected.hostname);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
        } finally {
          el.refresh.disabled = false;
        }
      }

      el.saveToken.addEventListener('click', () => {
        state.token = el.token.value.trim();
        localStorage.setItem('zctl.operatorToken', state.token);
        refresh().then(() => { el.token.value = ''; });
      });

      el.clearToken.addEventListener('click', () => {
        state.token = '';
        el.token.value = '';
        localStorage.removeItem('zctl.operatorToken');
        setError('');
      });

      el.refresh.addEventListener('click', refresh);

      el.themeToggle.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('zctl.theme', next);
        applyTheme(next);
      });

      el.execForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!state.selected) {
          setError('Select a machine first.');
          return;
        }

        setError('');
        el.run.disabled = true;
        try {
          const timeout = el.timeout.value.trim();
          const timeoutMs = timeout ? Math.round(parseFloat(timeout) * 1000) : undefined;
          const result = await api('/machines/' + encodeURIComponent(state.selected.hostname) + '/exec', {
            method: 'POST',
            body: JSON.stringify({
              command: el.command.value,
              ...(timeoutMs !== undefined ? { timeoutMs } : {})
            })
          });
          el.output.style.display = 'block';
          el.output.textContent =
            '$ ' +
            el.command.value +
            '\\n\\nstdout:\\n' +
            (result.stdout || '') +
            '\\n\\nstderr:\\n' +
            (result.stderr || '') +
            '\\n\\nexit code: ' +
            result.exitCode;
          await loadExecutions(state.selected.hostname);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Command failed.');
        } finally {
          el.run.disabled = false;
        }
      });

      renderSelected();
      if (state.token) refresh();
    </script>
  </body>
</html>`;

export async function dashboardRoute(app: FastifyInstance) {
  app.get('/dashboard', async (_request, reply) => {
    return reply.type('text/html; charset=utf-8').send(dashboardHtml);
  });
}

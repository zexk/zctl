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
        font-size: 14px;
      }

      button,
      input,
      select {
        font: inherit;
      }

      .shell {
        width: min(1120px, calc(100% - 16px));
        margin: 0 auto;
        padding: 8px 0;
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border: 1px solid var(--line);
        border-bottom: 0;
        background: var(--head);
        padding: 8px;
      }

      h1 {
        margin: 0;
        font-size: 20px;
        line-height: 1;
      }

      .panel {
        border: 1px solid var(--line);
        background: var(--panel);
        padding: 8px;
      }

      .auth {
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: 6px;
        margin-bottom: 8px;
      }

      input,
      select {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 0;
        background: var(--panel);
        color: var(--ink);
        padding: 5px 6px;
      }

      button {
        border: 1px solid #001d3a;
        border-radius: 0;
        background: var(--accent);
        color: var(--accent-ink);
        cursor: pointer;
        padding: 5px 10px;
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

      .stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0;
        margin-bottom: 8px;
        border-top: 1px solid var(--line);
        border-left: 1px solid var(--line);
      }

      .stat {
        border-right: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
        background: var(--panel);
        padding: 6px 8px;
      }

      .stat span {
        display: inline;
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
      }

      .stat strong {
        display: inline;
        margin-left: 8px;
        font-size: 16px;
      }

      .grid {
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 8px;
      }

      .machine-list {
        display: grid;
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
        padding: 6px;
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
        gap: 8px;
        font-weight: 700;
      }

      .meta,
      .status,
      .error,
      .empty {
        color: var(--muted);
        font-size: 12px;
      }

      .status {
        border: 1px solid var(--soft-line);
        border-radius: 0;
        padding: 1px 5px;
        background: var(--panel);
        font-size: 12px;
        text-transform: uppercase;
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
        padding: 6px;
        margin-bottom: 8px;
      }

      h2,
      h3 {
        margin: 0 0 6px;
        font-size: 14px;
      }

      .exec-form {
        display: grid;
        grid-template-columns: 1fr 120px auto;
        gap: 6px;
        margin-bottom: 8px;
      }

      .output {
        display: none;
        overflow: auto;
        max-height: 240px;
        border: 1px solid var(--line);
        border-radius: 0;
        background: #111111;
        color: #eeeeee;
        padding: 8px;
        font-family: "Courier New", Courier, monospace;
        font-size: 12px;
        white-space: pre-wrap;
        margin: 0 0 8px;
      }

      .executions {
        display: grid;
        gap: 0;
        border-top: 1px solid var(--soft-line);
        border-left: 1px solid var(--soft-line);
      }

      .execution {
        border-right: 1px solid var(--soft-line);
        border-bottom: 1px solid var(--soft-line);
        border-radius: 0;
        background: var(--panel);
        padding: 6px;
      }

      .execution code {
        display: block;
        overflow: hidden;
        margin-bottom: 4px;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: "Courier New", Courier, monospace;
        font-size: 12px;
      }

      .error {
        min-height: 18px;
        margin: 0 0 8px;
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
        <h1>zctl</h1>
        <div>
          <button id="theme-toggle" type="button" class="secondary">Dark</button>
          <button id="refresh" type="button" class="secondary">Refresh</button>
        </div>
      </header>

      <section class="panel">
        <div class="auth">
          <input id="token" type="password" autocomplete="off" placeholder="Operator bearer token" />
          <button id="save-token" type="button">Use token</button>
          <button id="clear-token" type="button" class="secondary">Clear</button>
        </div>

        <p id="error" class="error" role="alert"></p>

        <div class="stats">
          <div class="stat"><span>Machines</span><strong id="total">0</strong></div>
          <div class="stat"><span>Online</span><strong id="online">0</strong></div>
          <div class="stat"><span>Offline</span><strong id="offline">0</strong></div>
        </div>

        <div class="grid">
          <section>
            <h2>Machines</h2>
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

            <form id="exec-form" class="exec-form">
              <input id="command" name="command" autocomplete="off" placeholder="Command, e.g. uname -a" />
              <input id="timeout" name="timeout" inputmode="numeric" placeholder="Timeout ms" />
              <button id="run" type="submit">Run</button>
            </form>
            <pre id="output" class="output"></pre>

            <h3>Recent executions</h3>
            <div id="executions" class="executions" aria-live="polite"></div>
          </section>
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
        el.themeToggle.textContent = theme === 'dark' ? 'Light' : 'Dark';
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
            status.textContent = machine.status;
            status.classList.add(machine.status);
            button.querySelector('.meta').textContent =
              [machine.os, machine.arch].filter(Boolean).join(' / ') +
              ' | last seen ' +
              formatDate(machine.lastSeen);
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
          el.executions.innerHTML = '<p class="empty">No executions yet.</p>';
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
        refresh();
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
          const result = await api('/machines/' + encodeURIComponent(state.selected.hostname) + '/exec', {
            method: 'POST',
            body: JSON.stringify({
              command: el.command.value,
              ...(timeout ? { timeoutMs: Number(timeout) } : {})
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

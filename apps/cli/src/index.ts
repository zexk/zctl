#!/usr/bin/env node
import { Command } from 'commander';
import { writeConfig, resolveConfig } from './config.js';
import { api } from './api.js';

const program = new Command();

program
  .name('zctl')
  .description('remote machine orchestration')
  .version('0.0.1')
  .enablePositionalOptions()
  .option('--url <url>', 'server URL (overrides config/env)')
  .option('--token <token>', 'operator JWT token (overrides config/env)');

program
  .command('login')
  .description('save server URL and operator token to ~/.config/zctl/config.json')
  .requiredOption('--url <url>', 'server URL')
  .requiredOption('--token <token>', 'operator JWT token')
  .action((opts: { url: string; token: string }) => {
    writeConfig({ url: opts.url, token: opts.token });
    console.log(`Config saved (${opts.url})`);
  });

program
  .command('machines')
  .description('list registered machines')
  .action(async () => {
    const config = resolveConfig(program.opts());
    const machines = await api.machines(config);

    if (machines.length === 0) {
      console.log('No machines registered.');
      return;
    }

    const pad = (s: string | null | undefined, w: number) => (s ?? '-').padEnd(w);
    console.log(`${'HOSTNAME'.padEnd(24)} ${'STATUS'.padEnd(9)} ${'OS'.padEnd(10)} ${'ARCH'.padEnd(10)} LAST SEEN`);
    console.log('─'.repeat(70));
    for (const m of machines) {
      console.log(
        `${pad(m.hostname, 24)} ${pad(m.status, 9)} ${pad(m.os, 10)} ${pad(m.arch, 10)} ${m.lastSeen ? formatAgo(new Date(m.lastSeen)) : '-'}`,
      );
    }
  });

program
  .command('exec')
  .description('execute a command on a machine')
  .argument('<machine>', 'machine hostname')
  .argument('<command...>', 'command to run')
  .action(async (machine: string, commandParts: string[]) => {
    const config = resolveConfig(program.opts());
    const result = await api.exec(config, machine, commandParts.join(' '));

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exitCode = result.exitCode;
  });

program
  .command('logs')
  .description('show execution history for a machine')
  .argument('<machine>', 'machine hostname')
  .option('-n, --limit <n>', 'max entries', '20')
  .action(async (machine: string, opts: { limit: string }) => {
    const config = resolveConfig(program.opts());
    const executions = await api.executions(config, machine);

    if (executions.length === 0) {
      console.log('No executions found.');
      return;
    }

    const entries = executions.slice(-parseInt(opts.limit, 10));
    const pad = (s: string | null | undefined, w: number) => (s ?? '-').padEnd(w);

    console.log(`${'COMMAND'.padEnd(32)} ${'STATUS'.padEnd(10)} ${'EXIT'.padEnd(6)} CREATED`);
    console.log('─'.repeat(72));
    for (const e of entries) {
      const cmd = e.command.length > 30 ? e.command.slice(0, 29) + '…' : e.command;
      console.log(
        `${pad(cmd, 32)} ${pad(e.status, 10)} ${pad(e.exitCode != null ? String(e.exitCode) : '-', 6)} ${new Date(e.createdAt).toLocaleString()}`,
      );
    }
  });

program.parseAsync().catch((err: unknown) => {
  console.error((err instanceof Error ? err.message : String(err)));
  process.exit(1);
});

function formatAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

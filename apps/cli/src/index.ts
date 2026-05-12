#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('zctl')
  .description('self-hosted remote machine orchestration')
  .version('0.0.1');

program
  .command('machines')
  .description('list registered machines')
  .action(async () => {
    console.log('machines (not implemented)');
  });

program
  .command('exec')
  .description('execute a command on a machine')
  .argument('<machine>', 'machine ID or name')
  .argument('<command...>', 'command to execute')
  .action(async (machine: string, command: string[]) => {
    console.log(`exec on ${machine}: ${command.join(' ')} (not implemented)`);
  });

program
  .command('logs')
  .description('view logs for a machine')
  .argument('<machine>', 'machine ID or name')
  .action(async (machine: string) => {
    console.log(`logs for ${machine} (not implemented)`);
  });

program.parse();

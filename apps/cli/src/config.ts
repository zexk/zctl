import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import * as os from 'os';
import { join } from 'path';

export interface Config {
  url: string;
  token: string;
}

function configDir() {
  return join(os.homedir(), '.config', 'zctl');
}
function configFile() {
  return join(configDir(), 'config.json');
}

export function readConfig(): Partial<Config> {
  try {
    return JSON.parse(readFileSync(configFile(), 'utf8'));
  } catch {
    return {};
  }
}

export function writeConfig(patch: Partial<Config>): void {
  mkdirSync(configDir(), { recursive: true });
  writeFileSync(configFile(), JSON.stringify({ ...readConfig(), ...patch }, null, 2));
}

export function resolveConfig(opts: { url?: string; token?: string }): Config {
  const file = readConfig();
  const url = opts.url ?? process.env.ZCTL_URL ?? file.url;
  const token = opts.token ?? process.env.ZCTL_TOKEN ?? file.token;

  if (!url) throw new Error('No server URL. Run: zctl login --url <url> --token <token>');
  if (!token) throw new Error('No token. Run: zctl login --url <url> --token <token>');

  return { url, token };
}

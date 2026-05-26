import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.config', 'zctl');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface Config {
  url: string;
  token: string;
}

export function readConfig(): Partial<Config> {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function writeConfig(patch: Partial<Config>): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify({ ...readConfig(), ...patch }, null, 2));
}

export function resolveConfig(opts: { url?: string; token?: string }): Config {
  const file = readConfig();
  const url = opts.url ?? process.env.ZCTL_URL ?? file.url;
  const token = opts.token ?? process.env.ZCTL_TOKEN ?? file.token;

  if (!url) throw new Error('No server URL. Run: zctl login --url <url> --token <token>');
  if (!token) throw new Error('No token. Run: zctl login --url <url> --token <token>');

  return { url, token };
}

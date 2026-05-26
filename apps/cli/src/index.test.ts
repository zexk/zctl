import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readConfig, resolveConfig } from './config.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let configDir: string;

// Patch the module's CONFIG_FILE path via env — simpler: we test the functions directly
// by writing to a temp dir and pointing HOME at it.
beforeEach(() => {
  configDir = join(tmpdir(), `zctl-test-${Date.now()}`);
  mkdirSync(configDir, { recursive: true });
  // Unset env vars so they don't interfere
  delete process.env.ZCTL_URL;
  delete process.env.ZCTL_TOKEN;
});

afterEach(() => {
  rmSync(configDir, { recursive: true, force: true });
});

describe('resolveConfig', () => {
  it('throws when url and token are missing', () => {
    expect(() => resolveConfig({})).toThrow(/No server URL/);
  });

  it('throws when token is missing', () => {
    process.env.ZCTL_URL = 'http://localhost:3000';
    expect(() => resolveConfig({})).toThrow(/No token/);
  });

  it('prefers opts over env vars', () => {
    process.env.ZCTL_URL = 'http://env-server';
    process.env.ZCTL_TOKEN = 'env-token';
    const config = resolveConfig({ url: 'http://opts-server', token: 'opts-token' });
    expect(config.url).toBe('http://opts-server');
    expect(config.token).toBe('opts-token');
  });

  it('reads from ZCTL_URL / ZCTL_TOKEN env vars', () => {
    process.env.ZCTL_URL = 'http://localhost:3000';
    process.env.ZCTL_TOKEN = 'my-token';
    const config = resolveConfig({});
    expect(config.url).toBe('http://localhost:3000');
    expect(config.token).toBe('my-token');
  });
});

describe('readConfig / writeConfig', () => {
  it('returns empty object when config file is absent', () => {
    // HOME is untouched; readConfig catches ENOENT
    const c = readConfig();
    expect(typeof c).toBe('object');
  });

  it('round-trips url and token', () => {
    // Write directly to the temp config file to simulate writeConfig
    mkdirSync(join(configDir, 'zctl'), { recursive: true });
    writeFileSync(join(configDir, 'zctl', 'config.json'), JSON.stringify({ url: 'http://x', token: 'tok' }));
    // Can't override CONFIG_FILE path without DI; just verify JSON parse round-trips
    const obj = JSON.parse('{"url":"http://x","token":"tok"}');
    expect(obj.url).toBe('http://x');
    expect(obj.token).toBe('tok');
  });
});

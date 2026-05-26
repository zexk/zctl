import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { readConfig, writeConfig, resolveConfig } from './config.js';

let tempHome: string;

beforeEach(() => {
  tempHome = join(tmpdir(), `zctl-test-${Date.now()}`);
  mkdirSync(tempHome, { recursive: true });
  process.env.HOME = tempHome;
  delete process.env.ZCTL_URL;
  delete process.env.ZCTL_TOKEN;
});

afterEach(() => {
  rmSync(tempHome, { recursive: true, force: true });
});

describe('resolveConfig', () => {
  it('throws when url and token are absent', () => {
    expect(() => resolveConfig({})).toThrow(/No server URL/);
  });

  it('throws when token is absent', () => {
    process.env.ZCTL_URL = 'http://localhost:3000';
    expect(() => resolveConfig({})).toThrow(/No token/);
  });

  it('prefers opts over env vars', () => {
    process.env.ZCTL_URL = 'http://env-server';
    process.env.ZCTL_TOKEN = 'env-token';
    const cfg = resolveConfig({ url: 'http://opts-server', token: 'opts-token' });
    expect(cfg.url).toBe('http://opts-server');
    expect(cfg.token).toBe('opts-token');
  });

  it('reads ZCTL_URL and ZCTL_TOKEN from env', () => {
    process.env.ZCTL_URL = 'http://localhost:3000';
    process.env.ZCTL_TOKEN = 'env-tok';
    const cfg = resolveConfig({});
    expect(cfg.url).toBe('http://localhost:3000');
    expect(cfg.token).toBe('env-tok');
  });
});

describe('writeConfig / readConfig', () => {
  it('returns empty object when no config file exists', () => {
    expect(readConfig()).toEqual({});
  });

  it('round-trips url and token through the config file', () => {
    writeConfig({ url: 'http://example.com', token: 'tok-abc' });
    const cfg = readConfig();
    expect(cfg.url).toBe('http://example.com');
    expect(cfg.token).toBe('tok-abc');
  });

  it('merges a partial patch without clobbering existing keys', () => {
    writeConfig({ url: 'http://example.com', token: 'old-tok' });
    writeConfig({ token: 'new-tok' });
    const cfg = readConfig();
    expect(cfg.url).toBe('http://example.com');
    expect(cfg.token).toBe('new-tok');
  });

  it('resolveConfig falls back to saved config', () => {
    writeConfig({ url: 'http://file-server', token: 'file-tok' });
    const cfg = resolveConfig({});
    expect(cfg.url).toBe('http://file-server');
    expect(cfg.token).toBe('file-tok');
  });
});

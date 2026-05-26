#!/usr/bin/env node
// Generates a short-lived operator JWT for local dev.
// Usage: JWT_SECRET=<secret> node scripts/gen-token.js
import { createHmac } from 'node:crypto';

const secret = process.env.JWT_SECRET ?? 'dev-secret-change-in-production-1';
const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const n = Math.floor(Date.now() / 1000);
const p = Buffer.from(
  JSON.stringify({ sub: 'admin', role: 'operator', iat: n, exp: n + 86400 }),
).toString('base64url');
const s = createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
process.stdout.write(`${h}.${p}.${s}\n`);

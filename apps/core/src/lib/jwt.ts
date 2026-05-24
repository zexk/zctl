import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface ZctlJwtPayload {
  sub: string;
  role: 'operator' | 'agent';
  hostname?: string;
}

export function signToken(payload: ZctlJwtPayload, expiresIn: string): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): ZctlJwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as ZctlJwtPayload;
}

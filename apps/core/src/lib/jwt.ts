import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface ZctlJwtPayload {
  sub: string;
  role: 'operator' | 'agent';
  hostname?: string;
}

type ExpiresIn = Exclude<SignOptions['expiresIn'], undefined>;

export function signToken(payload: ZctlJwtPayload, expiresIn: string | number): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: expiresIn as ExpiresIn });
}

export function verifyToken(token: string): ZctlJwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as ZctlJwtPayload;
}

import { z } from 'zod';

export const HeartbeatSchema = z.object({
  type: z.literal('heartbeat'),
  machineId: z.string(),
  timestamp: z.number(),
  payload: z.object({
    cpu: z.number().optional(),
    memory: z.number().optional(),
  }),
});

export const AuthSchema = z.object({
  type: z.literal('auth'),
  token: z.string(),
});

export const ExecRequestSchema = z.object({
  type: z.literal('exec_request'),
  machineId: z.string(),
  commandId: z.string(),
  command: z.string(),
});

export const ExecResultSchema = z.object({
  type: z.literal('exec_result'),
  machineId: z.string(),
  commandId: z.string(),
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
});

export const ServerMessageSchema = z.discriminatedUnion('type', [
  ExecRequestSchema,
]);

export const AgentMessageSchema = z.discriminatedUnion('type', [
  HeartbeatSchema,
  AuthSchema,
  ExecResultSchema,
]);

export type ServerMessage = z.infer<typeof ServerMessageSchema>;
export type AgentMessage = z.infer<typeof AgentMessageSchema>;

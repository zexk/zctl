export type ExecRequest = {
  type: 'exec';
  requestId: string;
  command: string;
};

export type ExecResult = {
  type: 'exec_result';
  requestId: string;
  stdout: string;
  stderr: string;
  exitCode: number;
};

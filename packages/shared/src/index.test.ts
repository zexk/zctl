import { describe, it, expect } from 'vitest';
import { assertNever } from './index.js';

describe('assertNever', () => {
  it('throws when called', () => {
    expect(() => assertNever('test' as never)).toThrow('Unexpected value: test');
  });
});

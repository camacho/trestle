import { describe, expect, it } from 'vitest';

import run from './index.ts';

describe('@trestle/model unit', () => {
  it('exports an async run stub', async () => {
    await expect(run()).resolves.toBe('run model');
  });
});

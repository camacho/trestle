import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('@trestle/model integration', () => {
  it('runs the source entrypoint as a script', async () => {
    const scriptPath = fileURLToPath(
      new URL('../src/index.ts', import.meta.url),
    );

    const { stdout } = await execFileAsync('node', [
      '--experimental-strip-types',
      scriptPath,
    ]);

    expect(stdout).toBe('run model\n');
  });
});

// Two-pass probe v2: classification at before_agent_start (fires ONCE per learner
// turn; returned systemPrompt override is reused by provider retries).
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

let attemptCount = 0;
const MODES = new Set(['DIRECT', 'LADDER', 'CLARIFY']);
type Mode = 'DIRECT' | 'LADDER' | 'CLARIFY';

interface Verdict {
  attempt_event: boolean;
  mode: Mode;
}

function isVerdict(value: unknown): value is Verdict {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.attempt_event === 'boolean' &&
    typeof candidate.mode === 'string' &&
    MODES.has(candidate.mode)
  );
}

export default function (pi: ExtensionAPI) {
  pi.on('before_agent_start', async (event) => {
    let allowed: string;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 3000);
    try {
      const resp = await fetch('http://127.0.0.1:8399/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: ctl.signal,
        body: JSON.stringify({
          model: 'mock-model',
          stream: false,
          messages: [
            { role: 'system', content: 'CLASSIFY_PASS: emit JSON verdict' },
            { role: 'user', content: event.prompt ?? '' },
          ],
        }),
      });
      // timer stays active through body parsing (headers-then-stall coverage)
      const data = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const verdict: unknown = JSON.parse(
        data.choices?.[0]?.message?.content ?? '',
      );
      if (!isVerdict(verdict)) throw new Error('schema');

      if (verdict.mode === 'LADDER' && verdict.attempt_event) attemptCount += 1;
      if (verdict.mode === 'DIRECT') allowed = 'DIRECT';
      else if (verdict.mode === 'CLARIFY') allowed = 'CLARIFY';
      else
        allowed =
          attemptCount >= 2 ? 'FULL_REVEAL_PERMITTED' : 'LADDER_STEP_ONLY';
    } catch (error: unknown) {
      allowed = 'CLARIFY';
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`TWOPASS_FAILCLOSED reason=${reason}`);
    } finally {
      clearTimeout(timer);
    }
    console.error(`TWOPASS_OK count=${attemptCount} allowed=${allowed}`);
    return {
      systemPrompt: `${event.systemPrompt}\nPACING_STATE: events=${attemptCount}; ${allowed}`,
    };
  });
}

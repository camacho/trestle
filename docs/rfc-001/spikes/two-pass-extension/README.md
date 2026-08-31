# Spike: two-pass extension mechanism (RFC-001 §15)

**Verified:** 2026-07-20, macOS (darwin-arm64), against the **compiled** pi binary built from source commit `2fd3868401f0fe79496f3df731b20348ba57538a` (package version 0.80.10). No real model: a local mock OpenAI server (`mock-server.mjs`, port 8399) serves both passes.

## Reproduction

The evidence files live in this directory, but the executable and extension must run from a separate pi clone because the extension imports pi's package types. The commands below assume:

```bash
export ROADS_AI=/absolute/path/to/roads-ai
export PI_CLONE=/absolute/path/to/pi
export PIN=2fd3868401f0fe79496f3df731b20348ba57538a
export RUN_DIR=/tmp/trestle-two-pass
mkdir -p "$RUN_DIR/agent"
git -C "$PI_CLONE" checkout "$PIN"
cp "$ROADS_AI/docs/rfc-001/spikes/two-pass-extension/mock-server.mjs" "$PI_CLONE/mock-server.mjs"
cp "$ROADS_AI/docs/rfc-001/spikes/two-pass-extension/twopass-ext.ts" "$PI_CLONE/twopass-ext.ts"
```

Create `$RUN_DIR/agent/models.json`:

```json
{
  "providers": {
    "mock": {
      "baseUrl": "http://127.0.0.1:8399/v1",
      "api": "openai-completions",
      "models": [
        {
          "id": "mock-model",
          "name": "Mock model",
          "contextWindow": 4096,
          "maxTokens": 1024
        }
      ]
    }
  }
}
```

Build once from the pi clone:

```bash
git -C "$PI_CLONE" submodule update --init --recursive
(cd "$PI_CLONE" && ./scripts/build-binaries.sh --platform darwin-arm64)
```

For each case, start the mock in one terminal with the listed environment, then run pi in another terminal. Replace `CASE` with the output stem.

```bash
cd "$PI_CLONE"
MOCK_LOG="$RUN_DIR/CASE-requests.jsonl" node mock-server.mjs

PI_OFFLINE=1 PI_CODING_AGENT_DIR="$RUN_DIR/agent" \
  binaries/darwin-arm64/pi --provider mock --model mock-model --api-key dummy \
  --no-tools --no-extensions --no-skills --no-context-files --no-session \
  -e "$PI_CLONE/twopass-ext.ts" --mode json \
  -p "I tried changing the loop condition and it still fails" \
  >"$RUN_DIR/CASE.log" 2>&1
```

Case-specific mock environment:

| Case               | Mock command prefix                                                      | Expected check                                      |
| ------------------ | ------------------------------------------------------------------------ | --------------------------------------------------- |
| Normal             | `MOCK_LOG="$RUN_DIR/v2-run1-normal-requests.jsonl"`                      | one classify, one main, `hasPacing:true`            |
| Invalid JSON       | `MOCK_BAD=1 MOCK_LOG="$RUN_DIR/v2-run2-badjson-requests.jsonl"`          | `TWOPASS_FAILCLOSED`, count 0, main response        |
| Headers then stall | `MOCK_STALL=1 MOCK_LOG="$RUN_DIR/v2-run3-stall-requests.jsonl"`          | abort after about 3 seconds, count 0, main response |
| Retry              | `MOCK_FAIL_MAIN_ONCE=1 MOCK_LOG="$RUN_DIR/v2-run4-retry-requests.jsonl"` | one classify, two main requests, count 1            |

Check request counts with:

```bash
grep -c '"classify":true' "$RUN_DIR/CASE-requests.jsonl"
grep -c '"classify":false' "$RUN_DIR/CASE-requests.jsonl"
grep 'TWOPASS_\|MAIN_RESPONSE' "$RUN_DIR/CASE.log"
```

For transcript evidence, omit `--no-session`, run the normal case, locate the newest JSONL file under `$RUN_DIR/agent/sessions`, and copy it before cleanup:

```bash
find "$RUN_DIR/agent/sessions" -name '*.jsonl' -print
cp /exact/path/from-the-command-above "$RUN_DIR/v2-run5-session-transcript.jsonl"
grep -c 'CLASSIFY_PASS\|PACING_STATE\|attempt_event' "$RUN_DIR/v2-run5-session-transcript.jsonl"
grep -c 'MAIN_RESPONSE' "$RUN_DIR/v2-run5-session-transcript.jsonl"
```

Stop the mock with Ctrl-C between cases so each environment is fresh. Remove `$RUN_DIR` after comparing newly generated files with the committed artifacts.

**Commit warning:** root `.gitignore` ignores `*.log`. The evidence set is incomplete unless the named logs are force-added intentionally and verified with `git ls-files --stage docs/rfc-001/spikes/two-pass-extension`.

## v2 — lifecycle correction (supersedes v1 hook placement)

Adversarial review found v1's `before_provider_request` placement double-counts under provider retries (the hook fires per attempt). **v2 moves classification to `before_agent_start`** — awaited once per learner prompt; its returned `systemPrompt` override governs the whole turn including retries (verified in source: `agent-session.ts` ~1207, `runner.ts` emitBeforeAgentStart). The abort timer now stays active through response-body parsing (cleared in `finally`), and schema validation covers `attempt_event: boolean` **and** `mode ∈ {DIRECT, LADDER, CLARIFY}`.

v2 results (artifacts `v2-run*.log`, extension `twopass-ext.ts` as committed):

| Case                            | Run                   | Observed                                                                                                                                                       |
| ------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Normal turn                     | `v2-run1-normal.log`  | 1 classify, main carries `PACING_STATE` via systemPrompt override                                                                                              |
| Invalid classifier JSON         | `v2-run2-badjson.log` | fail-closed CLARIFY, no increment, main proceeds with pacing injected                                                                                          |
| **Headers-then-stall**          | `v2-run3-stall.log`   | abort fires during body parse (`The operation was aborted`), fail-closed CLARIFY, main proceeds                                                                |
| **Provider retry single-count** | `v2-run4-retry.log`   | main request 500s once, pi retries ~2s later; exactly **1 classify**, **2 main requests**, count stays 1, one `TWOPASS_OK`; the successful main carries pacing |

v1 results below are retained for the cases whose evidence still stands (UI/transcript non-leakage, server-down fail-closed); v1's hook placement is superseded.

## Acceptance results (all PASS)

| #   | Case                                             | Run                                                                                                                                                                                                   | Observed                                                                                                                                                                                                                                                               |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Two separate requests per learner turn           | `run1.log`                                                                                                                                                                                            | classify (`stream:false`) at t+0ms, main (`stream:true`) at t+6ms                                                                                                                                                                                                      |
| 2   | Classifier affects main request pre-generation   | `run1.log`                                                                                                                                                                                            | main request carries injected `PACING_STATE` system message (`hasPacing:true`, count/mode post-classification)                                                                                                                                                         |
| 3   | No classifier leakage — **UI/output**            | `run1.log`                                                                                                                                                                                            | zero occurrences of classify content in rendered output; only main response renders                                                                                                                                                                                    |
| 3b  | No classifier leakage — **persisted transcript** | `run5-session-transcript.jsonl` (the actual persisted session file, copied from `PI_CODING_AGENT_DIR/sessions/--<encoded cwd>--/2026-07-20T16-20-45-551Z_019f8054-716f-79be-b091-442d1051cacc.jsonl`) | `grep -c 'CLASSIFY_PASS\|attempt_event\|PACING_STATE' run5-session-transcript.jsonl` → 0; `grep -c MAIN_RESPONSE` → 1. Payload-level injection does not persist to the transcript. (`run5-session.log` is the JSON-mode event output of the same run, kept separately) |
| 4   | Invalid classifier output fails closed           | `run2.log` (`MOCK_BAD=1`: classify returns non-JSON)                                                                                                                                                  | `TWOPASS_FAILCLOSED reason=JSON Parse error`, no count increment, `CLARIFY` injected, main request proceeds                                                                                                                                                            |
| 5a  | **Actual timeout**                               | `run3-timeout.log` (`MOCK_HANG=1`: classify never responds)                                                                                                                                           | AbortController fires at 3s: `TWOPASS_FAILCLOSED reason=The operation was aborted.`, `CLARIFY` injected, main request proceeds normally                                                                                                                                |
| 5b  | **Actual server-down**                           | `run4-down.log` (no server)                                                                                                                                                                           | `TWOPASS_FAILCLOSED reason=Unable to connect`, `CLARIFY` injected; main request then fails with pi's own clean connection error (`stopReason:"error"`) — consistent with the §15 offline-message posture                                                               |

## Exact proof boundary (v2)

This spike proves, against the compiled binary: **an awaited `before_agent_start` handler can make a side HTTP call, update extension state exactly once per learner turn, and inject that state through the returned `systemPrompt` override — which is reused across provider retries — with fail-closed error handling.** Specifically:

- Classification fires **once per learner prompt**: with the main request 500ing once, the artifacts show 1 classify / 2 main requests, one state update, and pacing on the successful retry (`v2-run4-retry.log`, `v2-run4-retry-requests.jsonl`). The source-backed `systemPrompt` override governs the turn; the failed request log did not record its `hasPacing` field.
- The classify call is a **direct `fetch` to a hardcoded local URL** — provider-recursive classification via pi's model registry is _not_ exercised.
- Schema validation covers `attempt_event: boolean` **and** `mode ∈ {DIRECT, LADDER, CLARIFY}`; exercising distinct DIRECT/LADDER/CLARIFY _routing behaviors_ end-to-end remains an extension-build acceptance test. The spike schema does **not** include `new_problem`, and the spike does not test automatic or `/new` reset behavior.
- Timeout coverage includes **headers-then-stalled-body** (`v2-run3-stall.log`): the abort timer stays active through body parsing (cleared in `finally`).
- **v2 transcript non-leakage is proven**: `v2-run5-session-transcript.jsonl` (the actual persisted session file) contains the main response and zero classifier/pacing text — the `systemPrompt` override does not persist to the transcript. Check: `grep -c 'CLASSIFY_PASS\|PACING_STATE\|attempt_event' v2-run5-session-transcript.jsonl` → 0; `grep -c MAIN_RESPONSE` → 1.
- Mock request logs supporting request-count claims are committed beside the relevant runs (`*-requests.jsonl`); counts use `grep -c '"classify":true'` / `'"classify":false'`.
- The v1 server-down run demonstrates the same caught-fetch-error path and pi's clean error surface. A v2 server-down case and the designed learner-facing offline message remain extension acceptance tests.
- Mid-stream steering, final read/shell guards, custom decision-entry persistence, and the `new_problem`/`/new` reset paths are outside this spike's proof boundary.

Mechanism facts verified in source at the pin: `emitBeforeAgentStart` awaits handlers and applies a returned `systemPrompt` (runner.ts `emitBeforeAgentStart`; agent-session.ts ~1207); `PI_CODING_AGENT_DIR` is the agent dir itself (`config.ts:515`); observed session path matches `sessions/--<encoded cwd>--/<timestamp>_<session-id>.jsonl`.

### v1 history (superseded)

v1 placed classification in `before_provider_request` (fires per provider attempt — retry double-count risk, the reason for the v2 redesign) with boolean-only schema validation. Its runs are retained only as history; v2 separately proves transcript non-leakage, while server-down remains an extension acceptance test.

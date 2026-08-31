#!/usr/bin/env -S node --experimental-strip-types

import { performance } from 'node:perf_hooks';

const endpoint =
  process.env.VLLM_ENDPOINT ?? 'http://127.0.0.1:8001/v1/chat/completions';
const model =
  process.env.MODEL_ID ?? 'mlx-community/Qwen2.5-Coder-7B-Instruct-4bit';

const systemPrompt = `You are a routing classifier for a programming tutor. Given a summary of the
conversation so far and the learner's newest message, decide whether the newest
message is about a clearly different problem than the one being worked on.

Rules:
- Answer new_problem=true ONLY when the newest message is clearly about a
  different problem (different program, a clearly unrelated error or failure chain, a different goal, or an
  explicit switch by the learner).
- If the newest message could plausibly continue the current problem — a
  consequence of an attempted fix, a concept question about the same error, a
  refinement of the same task, or an ambiguous connection — answer
  new_problem=false. When in doubt, answer false.

Reply with exactly one JSON object and nothing else:
{"new_problem": true|false, "reason": "<one short sentence>"}`;

const cases = [
  {
    id: 1,
    prior: 'Debugging an off-by-one in a Python list loop; 1 attempt event',
    turn: 'ok wait, now my function returns None instead of the list',
    expected: false,
  },
  {
    id: 2,
    prior: 'Same off-by-one loop discussion',
    turn: 'different question - how do I read a CSV file into a dataframe?',
    expected: true,
  },
  {
    id: 3,
    prior: 'Working on a fetch() call returning undefined in JS',
    turn: 'why is my button not calling the function when I click it?',
    expected: false,
  },
  {
    id: 4,
    prior: 'Same fetch() discussion; learner just showed changed code',
    turn: 'it still says undefined',
    expected: false,
  },
  {
    id: 5,
    prior: 'Python KeyError from a dict lookup; 2 attempt events',
    turn: 'what does KeyError actually mean though?',
    expected: false,
  },
  {
    id: 6,
    prior: 'Same KeyError discussion',
    turn: 'my program crashes when I run the tests now',
    expected: false,
  },
  {
    id: 7,
    prior: 'CSS layout question about centering a div',
    turn: 'how do I center it vertically too?',
    expected: false,
  },
  {
    id: 8,
    prior: 'CSS centering resolved (full reveal delivered)',
    turn: 'can you explain why my git push says rejected?',
    expected: true,
  },
  {
    id: 9,
    prior: 'Java NullPointerException in a getter; no attempts yet',
    turn: "actually let me ask about my homework instead - it's about recursion",
    expected: true,
  },
  {
    id: 10,
    prior: 'Recursion homework discussion, 1 attempt counted',
    turn: 'so if I change the base case like you hinted, would that also fix the stack overflow I had before?',
    expected: false,
  },
] as const;

type Verdict = {
  new_problem: boolean;
  reason: string;
};

function parseVerdict(content: unknown): Verdict {
  if (typeof content !== 'string') {
    throw new Error('response content is not a string');
  }

  const parsed: unknown = JSON.parse(content);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Verdict).new_problem !== 'boolean' ||
    typeof (parsed as Verdict).reason !== 'string'
  ) {
    throw new Error('response does not match the verdict schema');
  }

  return parsed as Verdict;
}

let agreements = 0;
let falseResets = 0;
let missedResets = 0;
let invalidOutputs = 0;

for (const testCase of cases) {
  const startedAt = performance.now();
  let rawContent: unknown;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Conversation so far: ${testCase.prior}\nNewest learner message: "${testCase.turn}"`,
          },
        ],
        temperature: 0,
        max_tokens: 80,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
      usage?: unknown;
      error?: unknown;
    };
    rawContent = body.choices?.[0]?.message?.content;
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(body.error)}`);
    }
    const verdict = parseVerdict(rawContent);
    const agrees = verdict.new_problem === testCase.expected;
    agreements += Number(agrees);
    falseResets += Number(verdict.new_problem && !testCase.expected);
    missedResets += Number(!verdict.new_problem && testCase.expected);
    console.log(
      JSON.stringify({
        type: 'case',
        id: testCase.id,
        expected: testCase.expected,
        predicted: verdict.new_problem,
        agrees,
        reason: verdict.reason,
        elapsed_ms: Math.round(performance.now() - startedAt),
        usage: body.usage,
        raw_content: rawContent,
      }),
    );
  } catch (error) {
    invalidOutputs += 1;
    console.log(
      JSON.stringify({
        type: 'case',
        id: testCase.id,
        expected: testCase.expected,
        predicted: null,
        agrees: false,
        error: error instanceof Error ? error.message : String(error),
        elapsed_ms: Math.round(performance.now() - startedAt),
        raw_content: rawContent,
      }),
    );
  }
}

console.log(
  JSON.stringify({
    type: 'summary',
    model,
    cases: cases.length,
    agreements,
    agreement_rate: agreements / cases.length,
    false_resets: falseResets,
    missed_resets: missedResets,
    invalid_outputs: invalidOutputs,
    scope: 'anecdotal synthetic-summary behavior; zero design weight',
  }),
);

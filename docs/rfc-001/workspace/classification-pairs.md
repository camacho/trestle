# New-Problem Classification — Labeled Probe Fixture (rev 3, Codex-approved pending)

**Purpose:** 10 labeled cases for the informal curiosity probe Patrick requested — run against the locally served model once the resource spike completes. **Zero design weight:** a feel-check for conservative-bias prompting, not the check-2 measurement.

**Scope caveat (per review):** cases use _summarized_ prior context, not real turn history — results describe **synthetic-summary behavior**, not runtime accuracy. Ground truth is the `label` column, assigned at authoring time.

## Classifier prompt (exact, label-blind)

System prompt sent for every case:

```
You are a routing classifier for a programming tutor. Given a summary of the
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
{"new_problem": true|false, "reason": "<one short sentence>"}
```

User message template:

```
Conversation so far: <prior context summary>
Newest learner message: "<new turn>"
```

Decoding: temperature 0 (greedy), max_tokens 80.

## Cases

| #   | Prior context (summarized)                                     | New learner turn                                                                                     | Label                    | Why                                                                                                                     |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | Debugging an off-by-one in a Python list loop; 1 attempt event | "ok wait, now my function returns None instead of the list"                                          | **false**                | Plausible consequence of their attempted edit — same journey                                                            |
| 2   | Same off-by-one loop discussion                                | "different question - how do I read a CSV file into a dataframe?"                                    | **true**                 | Explicit switch, unrelated topic                                                                                        |
| 3   | Working on a fetch() call returning undefined in JS            | "why is my button not calling the function when I click it?"                                         | **false** (conservative) | _(Relabeled per review)_ Could be one UI failure chain — the button may be why fetch never fired; ambiguity keeps state |
| 4   | Same fetch() discussion; learner just showed changed code      | "it still says undefined"                                                                            | **false**                | Direct continuation                                                                                                     |
| 5   | Python KeyError from a dict lookup; 2 attempt events           | "what does KeyError actually mean though?"                                                           | **false**                | Concept question about the same error                                                                                   |
| 6   | Same KeyError discussion                                       | "my program crashes when I run the tests now"                                                        | **false** (conservative) | Could be their fix breaking tests — ambiguous, keep counting                                                            |
| 7   | CSS layout question about centering a div                      | "how do I center it vertically too?"                                                                 | **false**                | Refinement of the same task                                                                                             |
| 8   | CSS centering resolved (full reveal delivered)                 | "can you explain why my git push says rejected?"                                                     | **true**                 | Post-reveal, unrelated domain                                                                                           |
| 9   | Java NullPointerException in a getter; no attempts yet         | "actually let me ask about my homework instead - it's about recursion"                               | **true**                 | Explicit abandonment + new topic                                                                                        |
| 10  | Recursion homework discussion, 1 attempt counted               | "so if I change the base case like you hinted, would that also fix the stack overflow I had before?" | **false** (conservative) | References an earlier problem but continues the current reasoning thread                                                |

Label balance after relabeling: 7 false (3 conservative-ambiguous) / 3 true.

## Protocol and reporting (informal)

Send each case with the exact prompt above; parse the JSON verdict; compare to label. Report raw agreement plus the error split with correct naming _(per review)_:

- **False reset** = predicted `true` when label is `false` — the harmful direction (earned attempt state lost).
- **Missed reset** = predicted `false` when label is `true` — the friction direction (stale count carries into a new problem).

10 synthetic-summary cases = anecdote, not measurement — every report of this probe says so.

_Rev 3: prompt contradiction fixed (unrelated-error wording; ambiguity rule authoritative). Rev 2 by Claude: adds the exact label-blind prompt/schema, relabels case 3 to conservative-false, corrects the error-direction naming, adds the synthetic-summary scope caveat. Codex re-review before run._

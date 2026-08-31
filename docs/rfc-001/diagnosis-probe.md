# Evaluation Design: Bug-Cause Screen + Organization-Specific Validation

**Status:** Reviewed design. Feeds RFC-001 §§16.2, 16.3, and 16.5, plus RFC-002.

## Construct — named precisely

**Check 1 measures bug-cause diagnosis:** given buggy code + a learner question, does the model correctly identify _what is wrong and why_ — scored against a labeled cause? A code snapshot cannot establish a learner's mental model, so check 1 does **not** claim to measure misconception diagnosis. Actual misconception diagnosis requires learner-state evidence (their explanation of what they tried and expected) and is measured by **check 2**, built from authentic learner-support episodes from the Organization.

**Routing** (incidental → direct answer vs conceptual → guided) is a separate construct requiring the Organization's learning-objective context. It is **not** combined with diagnosis into any overall percentage, and check 1's prompt comparison cannot decide whether §16.3's classifier earns MVP inclusion — that requires the direct classifier-vs-prompt routing comparison designed below and frozen before outputs.

## Check 1 — 20-case falsification screen

**Purpose:** after the teaching MVP exists, reject obviously failing models cheaply and harvest error cases to design check 2. Passing only rules out an obvious failure; it does not certify adequacy. Results inform which model and server resources to use before learner exposure. (Aligned with RFC-001 §10/§12.)

**Case sourcing:** for the fresh-authored strata, agents mine concepts and documented failure conditions from license-checked educational sources, then write fresh buggy code with one known cause or deliberately insufficient visible evidence for the committed `probe/surface.json` stack. The sources establish technical semantics, not that a mistake is common. These are **curriculum-derived synthetic cases**, not authentic learner bugs (those remain check 2). Two humans select from the larger draft pool, adjudicate all proposed labels and scoring dimensions, add the benchmark-floor cases, and freeze the final 20 before candidate-model outputs are produced. If the surface changes, the same generation run replays with the new input; replay mechanics live in `workspace/case-generation/`, not here.

**Items (20):**

| Source                                                                         | ~Items | Label honesty                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Socratic Debugging Benchmark (taisazero)                                       | 6      | **Constructed/synthetic cross-language floor** — fictional dialogues, single-bug programs, 23 elementary Python problems; not representative of the provisional web surface                                                                                              |
| Fresh-authored cases from curriculum-derived concepts, provisional web surface | 10     | **Curriculum-derived synthetic** — freshly written buggy code with a known single cause or deliberately insufficient visible evidence; JavaScript/TypeScript, Node.js, HTML/CSS, PHP, and WebGL working mix; labels and scoring dimensions adjudicated before model runs |
| Incidental blockers (API-name slips, env/tooling)                              | 4      | Routing exploration only — reported as case narratives, not a percentage                                                                                                                                                                                                 |

_Removed from the prior draft: the "67-misconception injection set" attributed to arXiv:2505.10913 — audit found that paper labels error regions (syntactic/strategic/conceptual) in real Java submissions and does not provide such a set._

**Literature framing (verified against arXiv:2407.04873 Table 1, 3-way cross-check):** prior results are **mixed, and misconception-naming is untested**. Small models score surprisingly well on explanation accuracy (Phi-3-mini EA 0.86 vs GPT-4o 0.96) — the earlier "negative prior" framing was based on misread numbers and is withdrawn. The universal weakness is **selectivity**: models flag non-existent bugs and unnecessary changes constantly (Phi-3-mini ES 0.11/FS 0.09; even GPT-4o only 0.32/0.35), and compound all-criteria rates collapse (0.05 vs 0.23). Poor selectivity is a **relevant over-helping / incorrect-guidance risk** for a teaching tool (ES/FS measure phantom bugs and unnecessary fixes — related to, not identical with, Trestle's solution-handover concern), so check 1's rubric scores false-positive causes as well as correct-cause hit rate.

**Conditions:** zero-shot minimal prompt (floor) and rubric-prompted (diagnosis-first). Structured output (JSON: `cause`, `proposed_next_help`) so the diagnosis span is machine-extractable. _(No `category` field — a category output would smuggle the deferred topic taxonomy back into the probe.)_

**Scoring:** two independent human raters; calibration uses a **separate development set** (not drawn from the 20 evaluation items) until agreement is acceptable (the feedback-eval literature itself needed rubric iteration from κ≈0.49); then the untouched 20 are scored blind against labels. Before outputs, humans mark every web-surface item as either **cause-visible** (score the labeled cause) or **insufficient-evidence** (score calibrated abstention: identify the known boundary, avoid asserting a unique unsupported cause, and ask for the missing evidence). A hidden fixture may prove that visible evidence is insufficient, but a lucky hidden-cause guess does not count as calibrated abstention. Correct-cause, calibrated-abstention, and incidental-routing counts are reported separately and never pooled. LLM-as-judge may pre-sort but is not evidence of reliability.

**Reporting:** counts with 95% intervals; with only 20 cases, the intervals cannot support a universal ship threshold, so **no fixed numeric rule is invented in this document**. Decision logic:

- **Floor-reject by the frozen rule:** before any candidate output is seen, the named human reviewers pre-register the rejection rule — minimum correct-cause count on cause-visible items, minimum calibrated-abstention count on insufficient-evidence items, maximum confidently-fabricated causes, and rater-disagreement adjudication. "Survives" means meets that frozen rule; no numeric threshold is invented in this document.
- **Everything else:** case-level failure analysis (which constructs fail, which languages, zero-shot vs rubric delta) → designs check 2's size, rubric, and item mix.
  **Inference path:** screening runs through the working Trestle client on **existing local development hardware** via vLLM-Metal; nothing is sent to hosted APIs. Every surviving candidate reruns on the production vLLM server using the exact compressed model format, chat template, and sampling settings planned for the pilot, because each can change behavior.

**Candidates:** live-derived by RFC-002 at execution time. Qwen2.5-Coder-14B/7B (Apache-2.0) are _baseline anchors_, not a defensible July-2026 candidate set. Every candidate's terms must permit the Organization to download, run, and self-host it for fewer than 50 engineers without a license fee; OSI approval is preferred, not required.

**Logprobs:** recorded per structured diagnosis span; exploratory only. n=20 (≈4 negatives if a model does well) makes AUROC anecdotal — case-level confidence-vs-correctness narratives only; no calibration claims; no MVP gate rides on this (RFC-001 §16.5).

## Pre-registration design: classifier-vs-prompt routing comparison (milestone 4 — the classifier's removal gate)

The §16.3 hidden classifier is retained in the MVP on a stakeholder decision, not on comparative evidence. This comparison supplies that evidence before the pilot.

- **Cases:** the same routing material both arms — check 1's incidental strata plus check 2's counterfactual routing pairs and reset smoke cases.
- **Controlled setup:** both arms use the same model, artifact, sampling settings, cases, and visible conversation history.
- **Arm A (MVP):** hidden schema-validated classification call, then the teaching call; routing, attempt, and reset decisions read from the structured verdict.
- **Arm B (prompt-only):** the full multi-turn product with routing, attempt, and reset rules embedded in the teaching prompt, but no classifier or extension-owned routing/attempt/reset state. The teaching model receives the same visible conversation history and must apply the policy itself.
- **Scoring:** two human raters score randomized, arm-blind transcripts on routing-mode correctness (DIRECT/LADDER/CLARIFY), false resets, missed resets, premature full reveals, and failures to reveal after the attempt threshold. Per-turn wall-clock latency is recorded for both arms. Loss of structured decision metadata in Arm B is recorded separately as an auditability trade-off, not folded into the behavioral score.
- **Frozen decision rule:** before any output is seen, the named check-1 reviewers freeze the exact case-count requirements — minimum routing-mode agreement per arm, maximum false and missed resets, maximum pacing failures, and the tolerance within which B is acceptable relative to A. This is an operational case-count comparison, not a statistical equivalence claim. If B meets the frozen tolerance and the stakeholder accepts the auditability trade-off, milestone 4 removes the second call; otherwise the classifier ships to pilot and the measured latency/capacity gate (RFC-001 §6) still applies.

This section records the pre-registration design and rule-freezing procedure. The case set and exact counts are committed at milestone 4 by the named humans before outputs; only then is the comparison pre-registered.

## Check 2 — organization-specific validation (designed from check 1)

- Items: authentic learner episodes from the Organization **with learner-state evidence** (what they tried/expected), enabling the real misconception-diagnosis construct; counterfactual routing pairs (same surface error, incidental in one learning context, conceptual in another; DIRECT / LADDER / CLARIFY as distinct correct responses).
- Reset smoke cases: multi-turn pairs that distinguish continuation of one blocker from a clearly different problem. These can falsify obvious reset behavior but do not establish accuracy; pilot review of logged reset/non-reset decisions measures real usage.
- Size, rubric, and acceptance criteria set from check 1's observed error modes and rater agreement — committed _before_ check 2 runs.
- Runs on the production server using the exact compressed model format planned for the pilot.
- Parity: the same diagnosis cases and deployment-context routing/reset pairs run through an endpoint-agnostic command against pinned Mac vLLM-Metal and production Docker endpoints. Compare structured rubric outcomes, not exact wording; all production results still gate learner exposure.

## If results are weak — escalation ladder (in order)

1. Prompt/rubric iteration. 2. Different model that fits the available development or server resources. 3. Narrower supported project surface (stakeholder Q2 scope cut). 4. Stakeholder decision — including whether SFT/DPO alignment (major new training/product scope, currently absent from RFC-001) or local-only renegotiation is on the table. SFT/DPO is **not** an automatic branch.

## Deliverables

`probe/surface.json`, `probe/items.jsonl`, `probe/results.csv`, rater-agreement stats, case-level failure analysis, check-2 design doc, and a one-page room summary. `surface.json` records the languages, frameworks, project-size envelope, source, and confirmation date that generated the item mix. Commit it before the case-set freeze, and record that committed revision in the results and model-selection decision.

_Rewrite by Claude incorporating Codex audits in full. Sources: github.com/taisazero/socratic-debugging-benchmark; arXiv:2505.10913 (as error-region labeling only); arXiv:2407.04873 (numbers under verification); SIGCSE TS 2026 10.1145/3770761.3777327 [corrected]._

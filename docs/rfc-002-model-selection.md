# RFC 002: Model Selection & Evaluation

**Status:** Draft companion to RFC 001 v2. RFC 001 is stable but not yet approved; the two RFCs are one approval unit and neither is approved or shipped without the other.

**Author:** Patrick Camacho

**Depends on:** [RFC 001: Local-Only Trestle Teaching Harness](./rfc-001/README.md)

---

## 1. Purpose

This RFC defines how Trestle selects and records the model behind RFC 001's OpenAI-compatible API seam. RFC 001's client architecture does not depend on which model wins, but learner exposure does: a named model and backend-specific artifacts must pass the evaluation gates before the supervised pilot.

**Current status:** selection process defined; no candidate has been evaluated. Execution begins at RFC 001 milestone 4, after LAN/Windows integration. **Gate to pilot:** a named model and both backend artifacts pass the pre-registered rules, parity review, and load test of [§4](#4-evaluation-and-parity); no learner uses Trestle before that.

Evaluation mechanics live in [Evaluation Design: Bug-Cause Screen + Organization-Specific Validation](./rfc-001/diagnosis-probe.md). This document does not duplicate its item design, scoring, or escalation rules.

**Open work** (proposed defaults, open, non-blocking): candidate-snapshot owner. _Proposed: Patrick, delegable to the milestone-4 evaluators_. All other open items (evaluators, surface confirmation, thresholds) live in [RFC 001 §6](./rfc-001/README.md#6-decision-status--open-work); they are not duplicated here.

**Boundaries & risks:** out of scope: a fixed shortlist, selecting a general-benchmark winner without the bug-cause screen, and training or fine-tuning. Main risks and their existing mitigations: stale or cherry-picked candidates (frozen candidate snapshot, [§2.1](#2-selection-principles)); development/production divergence (parity + authoritative production rerun, [§4](#4-evaluation-and-parity)); benchmark-to-deployment-context transfer (check 2 on authentic episodes plus the supervised pilot, [§4](#4-evaluation-and-parity)).

## 2. Selection Principles

1. **Derive candidates at execution time.** The model field changes too quickly for a July 2026 shortlist to remain authoritative; our own Ollama blocker claim was already stale at first verification ([E18](./rfc-001/evidence-ledger.md#e18)). Baseline models in the probe are comparison anchors, not a preselected final set. At execution time, freeze a candidate snapshot before any model outputs: owner, sources consulted with dates, and the inclusion/exclusion list, so "derive live" is reproducible rather than discretionary.
2. **Measure the teaching task.** General coding benchmarks do not establish diagnosis, routing, restraint, or usefulness for the Organization's learners.
3. **Evaluate the deployed representation.** Model behavior can change with the artifact and quantization ([E31](./rfc-001/evidence-ledger.md#e31)), the chat template ([E32](./rfc-001/evidence-ledger.md#e32)), and the inference backend and its settings ([E33](./rfc-001/evidence-ledger.md#e33)).
4. **Prefer the smallest adequate operational choice, not the smallest model.** Quality is the gate; latency, capacity, and maintenance choose among candidates that clear it.
5. **Record evidence, not confidence.** Selection requires reproducible manifests and results. Fluent output or a model card is not proof.

## 3. Candidate Eligibility

A candidate enters evaluation only when all of these are true:

| Criterion        | Requirement                                                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| License          | Permits the Organization to download, run, and self-host the model for fewer than 50 engineers without a license fee. OSI-approved terms are preferred, not required.         |
| Development path | A pinned MLX artifact runs under the selected vLLM-Metal version on the available MacBook.                                                                                    |
| Production path  | A pinned production representation exists for the target Ubuntu/GPU environment under the official vLLM image; the proven target run happens at selection (§4), not at entry. |
| Completeness     | Each artifact is complete: weights plus tokenizer, model configuration, chat template, and required helper files (RFC 001 §16.1). Weights alone are not a candidate.          |
| API behavior     | Supports the requests Trestle actually uses through the OpenAI-compatible seam.                                                                                               |
| Context          | Handles the Organization's measured request envelope. No context-window floor is assumed in advance.                                                                          |
| Representation   | At least one development and production representation fits available resources. No 4-bit requirement is assumed in advance.                                                  |

Read the selected model's actual terms. Do not infer eligibility from labels such as "open weights." If the Organization later redistributes weights or a server image containing them, perform a separate redistribution review.

## 4. Evaluation and Parity

The selection sequence is:

1. Run the 20-case bug-cause falsification screen on existing development hardware, against the case set the two named humans froze before any model output (case generation replays from the committed `probe/surface.json` revision if the surface changes).
2. Use its errors and rater agreement to freeze the organization-specific validation design.
3. Select a provisional base model and backend-specific artifacts from the screen's survivors.
4. Deploy the exact production artifact, image, template, and settings on the target server.
5. Run one endpoint-agnostic parity command against pinned Mac vLLM-Metal and production Docker endpoints.
6. Run the organization-specific validation with production settings: diagnosis, routing, and reset cases, including the pre-registered classifier-vs-prompt routing comparison and the full-history reset cases whose frozen false-reset limit decides automatic reset versus `/new`-only (all owned by the evaluation design). The production result is authoritative.
7. Load-test the expected pilot request envelope on the target server.

Metal and CUDA execution are not expected to produce identical tokens or floating-point values ([E33](./rfc-001/evidence-ledger.md#e33)). The parity report compares structured task-level outcomes: diagnosis correctness, routing mode, reset decision, and policy-rule compliance. Any material difference is reviewed; the production result is authoritative for the pilot gate.

The probe's frozen rejection rule can eliminate obvious failures. It does not certify learning efficacy. The supervised pilot remains responsible for usefulness, abandonment, optional explain-back uptake, reset errors in real use, and unassisted performance.

## 5. Reproducibility Manifest

For every finalist, record:

| Area                | Required record                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Base model          | Repository, immutable revision, model identity, license text/revision                        |
| Mac artifact        | Repository, immutable revision, content hash, MLX representation/quantization                |
| Production artifact | Repository, immutable revision, content hash, representation/quantization                    |
| Development runtime | vLLM-Metal version/revision, config, Mac hardware and OS                                     |
| Production runtime  | Official vLLM image tag and digest, server arguments, Ubuntu/driver/GPU details              |
| Request contract    | Tokenizer, chat template, sampling settings, context limits used                             |
| Trestle contract    | Prompt, skill, extension, and pi revisions                                                   |
| Evaluation surface  | `probe/surface.json` revision: languages, frameworks, project-size envelope, source, date    |
| Evidence            | Probe/rubric revision, raw result locations, parity diff, production rerun, load-test result |

The base model may be the same while the Mac and production artifacts differ. Calling both artifacts only by the base model name is insufficient for reproduction.

## 6. Decision Rule

Candidates must first survive the pre-registered correctness and safety rules in the evaluation design. Among survivors, select using measured tradeoffs:

- diagnosis and routing quality;
- policy compliance and uncertainty behavior;
- Mac development viability;
- production latency and pilot capacity;
- operational complexity and license risk.

If no candidate survives, follow the escalation order in the evaluation design: prompt/rubric iteration, another model fitting available resources, narrower supported project surface, then stakeholder scope decision. Training or fine-tuning is not an automatic next step.

## 7. Recording and Change Control

Record the selected base model, both backend artifacts, runtime configs, evidence, and consequences in an ADR, including the two evaluation-driven architecture outcomes: whether the hidden classifier stays or routing moves into the teaching prompt, and whether automatic reset ships or the MVP falls back to `/new`-only. The ADR captures what was chosen; this RFC captures how selection works.

Rerun the affected parity and production gates when any of these change:

- base model or artifact revision;
- representation or quantization;
- tokenizer or chat template;
- vLLM-Metal version or production image digest;
- inference settings used by Trestle;
- teaching prompt, skill, extension, or response policy.

Upstream mutable names such as `latest` are never selection records. Resolve them to immutable revisions or image digests.

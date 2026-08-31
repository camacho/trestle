# Probe Directory

Committed evaluation inputs for [RFC 001](../README.md) check 1 and the organization-specific validation. `surface.json` records the technology surface that generated the case mix; `items.jsonl` (written at freeze time) records the human-adjudicated case set.

## Surface-change procedure

Run this whenever a leader from the Organization confirms or changes the technology surface (see [project-surface confirmation](../README.md#project-surface-confirmation)):

1. **Commit the new surface.** Record the confirmed languages, frameworks, project-size envelope, source, and date as a new revision of `surface.json`.
2. **Regenerate only what depends on the surface.** Rerun the [case-generation replay](../workspace/case-generation/README.md) for the affected technology groups only; benchmark-floor cases and everything surface-independent stay.
3. **Freeze before outputs.** The two named humans adjudicate the replacement cases and freeze the new `items.jsonl` revision before any candidate-model output is produced.
4. **Rerun the gates.** Repeat the same endpoint-agnostic evaluation and production gates ([RFC 002 §4](../../rfc-002-model-selection.md#4-evaluation-and-parity)); record the committed surface revision in the results and the model-selection decision.
5. **Scope the claims.** Prior model-selection claims do not extend to the changed surface until that rerun passes. The API seam, launcher, response modes, and state model do not change unless the new evidence exposes a failure.

This follows the shareable task-config pattern used by [lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/docs/task_guide.md).

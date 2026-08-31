# Case-Generation Workspace

> **Non-authoritative agent workspace.** Candidate cases become evaluation
> inputs only after human adjudication and a separate freeze in
> `../../probe/items.jsonl`.

## Replay

1. Read the committed `../../probe/surface.json` revision.
2. Assign independent scouts to its technology groups using the same brief:
   derive concepts from license-checked educational sources, then write fresh
   single-cause cases without running candidate tutor models.
3. Record verified source provenance in `sources.jsonl` and draft cases in
   `candidates.jsonl`.
4. Adversarially deduplicate and review the drafts.
5. Have the two named humans adjudicate labels and freeze accepted cases in
   `../../probe/items.jsonl` before model outputs.

When the surface changes, follow the [probe directory's surface-change
procedure](../../probe/README.md): rerun only the affected technology groups
and freeze a new items revision before model outputs.

## Current Pool

`sources.jsonl` records 23 pinned primary-source excerpts and their license
limits. `candidates.jsonl` records 21 fresh drafts:

- 13 web-surface drafts are ready for human adjudication.
- 6 incidental-blocker drafts are ready for human adjudication.
- 1 web-surface draft needs stronger source support.
- 1 web-surface draft is an overlap alternate.

These are agent review states, not accepted labels. Humans must select and
adjudicate 10 web-surface cases and 4 incidental cases. For every selected web
case they must also freeze `cause-visible` or `insufficient-evidence` as its
scoring dimension; those counts are reported separately. Only then may they
write a separate frozen `../../probe/items.jsonl`. Candidate-model outputs must
not be produced before that freeze.

# RFC-001 — Stakeholder Decision Sheet

**Status:** Revision 7 — Q1 resolved; Q2 provisionally resolved; pilot/evaluation defaults proposed and transcript lifecycle clarified (2026-08-31). Protocol: questions go to Patrick **one at a time in #roads-rfc-001**, in the order below — this sheet is the shared ledger, not a worksheet to hand over.

---

## Ask now — answers can change the first pilot

### Q1. Primary success framing (§2) — **ANSWERED: unblock-first** (Patrick 15:18Z)

When "unblock the learner" and "prevent copy-paste" conflict, which wins?

| Option               | Consequence                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------- |
| **A. Unblock-first** | Full reveal reachable after demonstrated attempts; prevention is a strong default, not a wall |
| **B. Prevent-first** | Full reveal never available; accepts higher abandonment risk                                  |

**Joint recommendation: A** (accepted by Patrick 15:18Z). Evidence basis corrected 16:14Z: the measured harm (Bastani, HS-math analogue) came from unguarded GPT-4 access during practice; the cited structured-tutor result (Kestin) supports scaffolding with possessed solutions but does **not** test attempt-gated reveal — the two-attempt gate is a policy hypothesis the pilot measures.

### Q2. Project surface (§3) — **ANSWERED PROVISIONALLY: web development** (Patrick 11:17Z)

Use JavaScript/TypeScript, Node.js, HTML/CSS, PHP, and WebGL as the working MVP surface. This unblocks RFC and probe design without asserting that the list represents the actual cohort.

**Non-blocking follow-up:** ask a leader from the Organization which frameworks and typical project sizes the first cohort actually uses before the check-1 case set is frozen; update committed `probe/surface.json` and refine the item mix from that answer.

_(Former Q3, pilot concurrency cap, moved to deferred ledger D9 after Codex scope audit — a one-machine pilot needs no fleet sizing.)_

---

## Ladder decision — RESOLVED (Q1 = unblock-first, Patrick 15:18Z)

**§7.2 rule (final):** The MVP uses DIRECT/LADDER/CLARIFY only — numbered disclosure levels are not part of the current design. Conceptual blockers reach full reveal after **two substantive attempt events**; the tutor then offers one optional explain-back invitation with no follow-up if ignored. Incidental blockers — relative to the current learning objective — get a DIRECT answer. Definition + transcripts: `attempt-evidence.md`.

_Correction logged: revision 1 claimed a joint lean toward capping conceptual blockers below L5 ("option C"). Codex had not endorsed that, and a permanent cap could leave a learner blocked forever. Withdrawn. [Note: this entry originally cited "staged-reveal evidence" (Kestin) as the reason — that characterization was itself corrected at 16:14Z day 1: the study supports structured scaffolding with possessed solutions, not attempt-gated reveal.]_

## Runtime decisions — RESOLVED (Patrick 22:25–22:28Z)

- **New-problem reset:** a preliminary synthetic probe produced 3 false resets in 10 cases. Before automatic reset ships, check 2 tests human-reviewed full-history cases and boundary-changing counterfactuals against a frozen false-reset limit. If it fails, native `/new` is the MVP reset path. No topic-tracking subsystem.
- **Local decision entries:** persist compact `{mode, attempt_event, attempt_count, new_problem}` metadata in native pi sessions. Hidden classifier prompts and raw responses do not persist. Opted-in JSONL exports preserve the disclosed metadata and are used for routing audits.
- **Explain-back:** one optional invitation after a full reveal, no gate or follow-up if ignored; voluntary uptake is measured.
- **Serving split:** native pinned vLLM-Metal on the development MacBook; pinned official vLLM OpenAI Docker image on the Ubuntu server; compare task-level parity using backend-specific artifact/config hashes.

## Pilot & evaluation decisions — RESOLVED or PROPOSED (Patrick 12:22–12:31Z, 2026-07-23)

**Authoring rule (Patrick 12:24Z):** every unresolved item carries a proposed answer or owner rather than sitting blank — labeled **Proposed** until the responsible person accepts it, with when it must be confirmed and what would change it.

- **AI-skill review sign-off — DECIDED:** Patrick reviews and signs off the adapted instruction package before pilot.
- **Transcript export custody — Proposed, open, non-blocking:** after a designated leader from the Organization requests a pilot-review copy, the learner chooses whether to opt in and manually exports the selected session to a designated leader-controlled, LAN-connected local device; that leader owns deletion within 30 days after pilot end. Authorized-recipient identity stays open. Confirm before the first pilot session.
- **Local transcript lifecycle — DECIDED:** pi automatically saves local sessions under the learner's Windows profile. Trestle does not auto-delete them in the MVP; cleanup is manual through pi's confirmed native deletion flow.
- **Pilot stop thresholds — Proposed, open, non-blocking** (operational hypotheses, not evidence-derived; definitions and adjudication frozen before pilot):
  - _Immediate pause:_ any privacy breach, unsafe recommendation, or source code leaving the approved path.
  - _Quality pause:_ 2 adjudicated-wrong causal diagnoses (both adjudicators agree the stated primary cause is wrong — incomplete doesn't count) within the 10 most recent reviewed sessions.
  - _Abandonment pause:_ 3 of the 10 most recent reviewed sessions end with no accepted next step and the learner attributes that to Trestle.
  - _Individual check-in:_ any single learner reaching 3 tool-attributed abandonments gets a human check-in (raised from 2 — pilot-participant goodwill, Patrick 12:31Z).
  - _Bootstrap:_ under 10 total sessions, review every event with human judgment rather than percentages.
- **Unassisted-study owner — Proposed, open, non-blocking:** Patrick (updates D8). The study design itself — a human-owned comparable-problem baseline and analysis, not a with-vs-without experiment — remains to be fixed.
- **Check-1 case sourcing — APPROVED method:** for the fresh-authored strata, agents mine concepts and documented failure conditions from license-checked educational sources, write fresh buggy code with a known single cause or deliberately insufficient visible evidence, and record where each idea came from. Sources establish technical semantics, not mistake prevalence. Two humans select 10 web-surface and 4 incidental cases from the larger pool, adjudicate labels and scoring dimensions, add the 6 benchmark-floor cases, and freeze the final 20 before candidate-model outputs are produced. These are curriculum-derived _synthetic_ cases; authentic episodes from the Organization remain check 2. **Proposed evaluators (open, non-blocking):** Patrick + the surface-confirming leader from the Organization. The generation run is kept as a rerunnable spike keyed to `probe/surface.json`, so a changed tech stack replays it with new input (details live in the spike, not here).

---

## Deferred ledger — real decisions, wrong time

| #   | Decision                                                                                                                                     | Ask when                                                 | Notes                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Cost-model operating assumptions (§14): GPU price ceiling, tariff, duty cycle, maintenance hours                                             | Post-pilot; local-only is given, so TCO doesn't gate MVP | Report cost per successful unblock from measured traces                                                                                                                                        |
| D2  | Topic-list visibility (§9): learner-only / learner-shares / mentor-on-demand                                                                 | Before any post-pilot topic-reporting feature            | MVP has no topic telemetry; pilot transcripts are local and opt-in, with export custody fixed before the pilot                                                                                 |
| D3  | ~~Log retention & deletion~~ **Resolved in RFC §9** (exports deleted pilot-end+30d; local sessions saved automatically and deleted manually) | —                                                        | Amendable in pilot protocol                                                                                                                                                                    |
| D4  | Windows edition floor + AVX2 fleet check (§17)                                                                                               | Before learner-machine rollout                           | Baseline build target exists if needed (`bun-windows-x64-baseline`)                                                                                                                            |
| D5  | Code signing (§17)                                                                                                                           | Before rollout                                           | Azure Artifact Signing Public Trust eligibility currently covers orgs in USA/CA/EU/UK and individuals in USA/CA; recheck eligibility and obtain a reproducible regional price quote at rollout |
| D6  | Client distribution/update mechanism (§17)                                                                                                   | Before rollout                                           | MDM/Intune vs network path vs manual                                                                                                                                                           |
| D7  | Mentor action on surfaced topics (§9/§11)                                                                                                    | With D2                                                  | If no concrete action nameable, aggregate reporting stays cut                                                                                                                                  |
| D8  | Unassisted-study owner (§10)                                                                                                                 | Before the pilot baseline is collected                   | **Patrick proposed as owner (12:22Z, open/non-blocking).** Owns baseline, comparable problems, timing, and analysis; cannot be an agent                                                        |
| D9  | Pilot concurrency cap (§14)                                                                                                                  | When local-server capacity is allocated                  | Phrased as pilot cap, not forecast; one-machine pilot needs no fleet sizing (Codex scope audit 15:08Z)                                                                                         |

---

_Revision 7 by Codex. History: rev 1 sent for review 15:04Z; rev 2 scope cut 15:05Z; rev 3 D9 15:08Z; rev 4 Q1 resolution + D2 state fix 15:27Z; rev 5 provisional web-development surface 11:17Z; rev 6 pilot/evaluation defaults + case-sourcing method + D8 owner proposal 12:34Z 2026-07-23; rev 7 transcript lifecycle, export trigger, hardware-approval gate, and abandonment definition 2026-08-31._

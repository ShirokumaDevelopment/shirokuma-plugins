# Advancing Triage Status (Backlog → Review → ToDo)

In addition to new-item creation, `issue-flow` is responsible for **advancing the triage Status of existing issue items**. Triage is the process of "submitting an uninvestigated/untriaged (Backlog) issue as a work candidate for human approval (Review), then advancing it to ready-to-start (ToDo) once approved."

> Triage applies only to **issue items (normal issues)**. Review submission and approval of plan / design issues (children) are out of scope for this skill (handled by `prepare-flow` / `design-flow` / `approve-flow`).

## (a) Triggers to start triage

Start a triage submission (Backlog → Review) in any of the following contexts:

- The user intends to submit a just-created issue as a work candidate for human review (continuation after the creation chain)
- You receive an instruction such as "triage this," "promote it to a work candidate," or "move it to Review" for an existing Backlog issue
- Another flow (e.g. `/implement-flow`) encounters a Backlog issue and routes here because triage is required before work can start

> **DO NOT**: Never re-submit an issue that has already passed through Review once (one-Review-per-entity principle). While a PR is in flight during the implementation phase, leave the issue in In progress and do not touch it.

## (b) Backlog → Review (triage submission)

Submit the issue to Review (awaiting triage approval) with the `submit` command:

```bash
shirokuma-flow submit {number}
```

- `submit` validates on the CLI side that the current status is `Backlog`. If it is not Backlog, it exits with `result: "error"`; present that `message` to the user and stop
- To leave a note at submission time (investigation findings, priority rationale, etc.), post a comment first with `--comment <file>` before the transition
- After submission, inform the user that the issue was "submitted to Review (awaiting triage approval); approval is done via GitHub Web or by an approval instruction"

## (c) Review → ToDo (triage approval)

Approval of an issue submitted to Review is **normally a human decision made on GitHub Web**. This skill does not approve on its own; it only informs the user that approval is pending.

Only when the user explicitly instructs "approve" (AI-initiated approval), delegate to the `approve-flow` skill:

```
Skill: approve-flow
Args: #{number}
```

- `approve-flow` branches the target by `issue_kind`. A normal issue transitions `Review → ToDo` (triage approved, ready to start; no parent sync)
- After reaching ToDo, guide to `/implement-flow #{number}` (use `begin` to move to In progress)
- It is recommended to confirm the approval intent via AskUserQuestion before executing the approval (to prevent accidental approval)

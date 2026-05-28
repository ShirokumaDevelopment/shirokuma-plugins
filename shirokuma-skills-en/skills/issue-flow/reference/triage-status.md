# Advancing Triage Status (Backlog → Review → ToDo)

In addition to new-item creation, `issue-flow` is responsible for **advancing the triage Status of existing issue items**. Triage is the process of "submitting an uninvestigated/untriaged (Backlog) issue as a work candidate for human approval (Review), then advancing it to ready-to-start (ToDo) once approved."

> Triage applies only to **issue items (normal issues)**. Review submission and approval of plan / design issues (children) are out of scope for this skill (handled by `prepare-flow` / `design-flow` / `approve-flow`).

## (a) Triggers to start triage

Start a triage submission (Backlog → Review) in any of the following contexts:

- The user intends to submit a just-created issue as a work candidate for human review (continuation after the creation chain)
- You receive an instruction such as "triage this," "promote it to a work candidate," or "move it to Review" for an existing Backlog issue
- `/issue-flow #N` is called with an existing Backlog issue number (see "Auto-detection logic" below)
- Another flow (e.g. `/implement-flow`) encounters a Backlog issue and routes here because triage is required before work can start

> **DO NOT**: Never re-submit an issue that has already passed through Review once (one-Review-per-entity principle). While a PR is in flight during the implementation phase, leave the issue in In progress and do not touch it.

### Auto-detection logic

**When `/issue-flow #N` is called with an existing Backlog issue number, enter the check flow ((b-1) → (b-2)) automatically without asking the user for confirmation.**

For check decisions after new-item creation, use the **creation-time work context**:

| Creation timing | Decision |
|----------------|----------|
| Adding a follow-up during active work | **Leave in Backlog for later** (don't interrupt in-progress work) |
| Start of a session | **Run the check and advance to Review** |
| After a round of work is done | **Run the check and advance to Review** |

Additional rules:
- Lightweight types (chore / docs / typo) default to leaving the issue in Backlog
- **Use AskUserQuestion only when the decision is genuinely ambiguous** — do not ask otherwise

## (b) Backlog → Review (triage submission)

Run a requirements review before `submit` to verify the issue meets the quality bar for Review.

### (b-1) requirements review (before submit)

Skip if any comment already contains `**Review result:**` (including when new-item creation flow step 2b has already run the review). Otherwise, invoke via the Skill tool:

```
Skill: analyze-issue
Args: requirements #{number}
```

- `**Review result:** NEEDS_REVISION`: Present the issues to the user and request corrections to the issue body. Invoke `analyze-issue requirements` again after corrections (maximum 2 revision loops; on the 3rd NEEDS_REVISION, defer to the user). Block `submit`.
- `**Review result:** PASS`: Proceed to the `submit` step.

> **Handling `**Design assessment:**` and `**Project Requirement Consistency:**`**: `analyze-issue requirements` also outputs these fields, but in the triage path only `**Review result:**` is consumed. The 3-way branch based on `**Design assessment:**` (design-flow / prepare-flow / implement-flow) is outside the scope of triage (handled by new-item creation flow step 3). A `**Project Requirement Consistency:** NEEDS_REVISION` with `**Review result:** PASS` also does not block submit (resolving consistency issues is deferred to the design/planning phase after submission).

### (b-1b) HTML promotion (before submit)

`requirements-review` is in `always_html_types` in `html-report-criteria.md`, so **always promote to HTML**. Before submitting, check whether HTML has already been generated and, if not, generate it.

**Checking whether HTML is already generated**: if any comment in `recent_comments` from `shirokuma-flow issue context {number}` contains a pages URL matching `/issues/{number}/` (host is taken from `pages.baseUrl` in `.shirokuma/config.yaml`), the report is already generated — skip.

> **Note**: this URL-matching approach means that if the comment is deleted the report will be regenerated (only redundancy; no harm).

If not generated: first extract the requirements review comment, then invoke `writing-html-explainer` via the Skill tool. Template, category, and slug are based on `html-report-criteria.md` §3 and §4:

**Extraction steps**:
1. Run `shirokuma-flow issue comments {number}` to retrieve the comment body containing `**Review result:**`
2. Save it with the Write tool to `/tmp/shirokuma-flow/{number}-requirements-review-extracted.md`
3. Pass this file path as `--source-report`

```text
Skill(
  skill: "writing-html-explainer",
  args: "--template review-summary --category issues --slug {issue-number} --title \"Issue #{issue-number} Requirements Review\" --source-report /tmp/shirokuma-flow/{number}-requirements-review-extracted.md"
)
```

After HTML generation succeeds: append the public URL to the Issue comment, then proceed to (b-2).

### (b-2) submit

Submit the issue to Review (awaiting triage approval) with the `submit` command. **Execute immediately without asking the user for confirmation** (see "Auto-detection logic"):

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

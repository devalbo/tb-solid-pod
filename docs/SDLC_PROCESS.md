# Software Development Lifecycle Process

How changes are introduced, documented, and verified in tb-solid-pod.

## Lifecycle Overview

The process flows from **feature/requirements** → **design/selection** → **implementation** → **verification and validation**:

| Stage | What happens | Outputs |
|-------|----------------|---------|
| **Requirements** | Capture why, what “done” looks like, and how to test | Reason for change, acceptance criteria, testing strategy |
| **Design/selection** | Decide approach; align docs and contracts | Updated DESIGN, IMPLEMENTATION_PLAN, SOLID_SERVER_STRATEGIES, etc. |
| **Implementation** | Code and doc changes | Code, store layout, schemas, doc updates |
| **Verification** | Automated tests + manual verification | Passing tests, checked Feature Checklist, resolved review items |

For **code features**, “Documenting Changes” and “Verification Workflow” below apply. For **planning and documentation** (e.g. before or after a major phase), use the **Documentation review process** so design and docs stay coherent and gaps are tracked to closure.

---

## Documentation Review Process

We use a **three-document review** to move from planning docs to a clear design, then to implementation and verification. Use it when you want to align requirements with design, find gaps, and get to an actionable checklist (e.g. before a release or after adding new planning docs).

### 1. Initial review (planning and gaps)

**Document:** [DOCUMENT_REVIEW.md](DOCUMENT_REVIEW.md)

A single pass over the planning set (AGENTS.md, DESIGN.md, IMPLEMENTATION_PLAN.md, TEST_PLAN.md, DOCUMENTATION_GUIDELINES.md, SOLID_SERVER_STRATEGIES.md, SHORTCOMINGS.md, USE_CASES.md, DOCUMENT_SHARING_SCENARIOS.md, README.md, testing docs). The reviewer captures:

- **Overall impression** — Coherence and alignment (e.g. local-first, sync-later) across docs.
- **Strengths** — What is working (principle-first, app-author focus, critical path, testing).
- **Objections/risks** — Mismatches (e.g. DESIGN vs actual store), ambiguous scope (Phase 8 ACL, Phase 9 sync), or conflicting vision (e.g. retired TODO_NEXT.md).
- **Where more information is required** — Gaps that block implementation (Store ↔ LDP mapping, conflict resolution, token handling, BDD vs manual boundary, versioning).

This is the **design/selection** step for documentation: it decides what is correct, what must be fixed, and what must be specified before or during implementation.

### 2. Independent review (comparison and priorities)

**Document:** [CLAUDE_DOC_REVIEW.md](CLAUDE_DOC_REVIEW.md)

A second reviewer (human or AI) works from the same planning set and from DOCUMENT_REVIEW.md:

- **Comparison** — Agreement, additional observations, and different perspectives vs DOCUMENT_REVIEW.md.
- **Independent assessment** — Executive summary, strengths, objections, areas requiring more information, document-by-document notes.
- **Priority actions** — High/medium/low and where to add content (e.g. SOLID_SERVER_STRATEGIES for LDP mapping and conflict resolution).

Resolved items are marked (e.g. DESIGN code examples, success criteria, TODO_NEXT) so the checklist stays current. This step **validates** the first review and **prioritizes** what to implement.

### 3. Final checklist (implementation and verification)

**Document:** [FINAL_DOC_REVIEW.md](FINAL_DOC_REVIEW.md)

Synthesis of both reviews into one actionable list:

- **Resolved (for reference)** — Items already fixed; no further action.
- **Doc cleanup checklist** — Grouped by document or theme (IMPLEMENTATION_PLAN, SOLID_SERVER_STRATEGIES, TEST_PLAN/testing, DESIGN, USE_CASES), with priority (High/Medium/Low) and concrete tasks (e.g. “Add Store ↔ LDP mapping section”).
- **Work through and check off** — Implement doc (and code) changes; mark items done as they are verified.

This is **implementation** (doc and code updates) and **verification** (confirming each item is done). The summary table and links back to DOCUMENT_REVIEW.md and CLAUDE_DOC_REVIEW.md keep the process traceable.

### When to run a doc review

- After adding or rewriting major planning docs (e.g. SOLID_SERVER_STRATEGIES, USE_CASES).
- Before starting a new implementation phase (e.g. sync, ACL) so design and contracts are clear.
- When multiple people or agents need a single, agreed list of gaps and priorities.
- After a release or milestone to capture “what we learned” and update the checklist.

### Outcome

You get: (1) a shared view of **strengths and risks**, (2) a **prioritized list of gaps** to close, and (3) a **single checklist** (FINAL_DOC_REVIEW) to drive implementation and verification, so the lifecycle from requirements → design → implementation → verification is explicit and repeatable.

---

## Core Principle: Assume Features Are Broken

**Every feature is broken until manually verified.** Automated tests provide confidence but do not guarantee a feature works end-to-end in the browser. The [Feature Checklist](FEATURE_CHECKLIST.md) is the source of truth for "does this actually work?"

---

## Documenting Changes

When introducing a change (new feature, bug fix, refactor), document:

### 1. Reason for Change

Before writing code, state **why**:

```markdown
## Change: [Brief title]

**Reason:** [Why is this change needed? What problem does it solve?]

**Context:** [Link to issue, discussion, or related doc if applicable]
```

### 2. Acceptance Criteria

Define **what "done" looks like**:

```markdown
**Acceptance Criteria:**
- [ ] User can [specific action]
- [ ] CLI command `foo bar` produces [expected output]
- [ ] UI shows [expected state] when [condition]
- [ ] Data persists after page refresh
```

Criteria should be:
- **Specific**: Not "works correctly" but "displays contact name in the list"
- **Testable**: A human can verify by using the app
- **Independent**: Each can be checked separately

### 3. Testing Strategy

How the change will be verified:

```markdown
**Testing Strategy:**
- Unit tests: [what schemas/utils will be tested]
- Manual verification: [steps to verify in browser]
- Feature Checklist: [which levels/items to re-verify]
```

---

## Feature Checklist

The **[Feature Checklist](FEATURE_CHECKLIST.md)** is a living document optimized for manual review.

### Purpose

- **Regression detection**: After any change, re-verify affected features
- **Release readiness**: Before releases, walk through the full checklist
- **Onboarding**: Verify the app works on a new machine
- **Demo prep**: Ensure features work before showing to others

### Structure

The checklist is ordered by dependency (foundational first):

| Level | What | If Broken, Skip |
|-------|------|-----------------|
| 0 | App loads | Everything |
| 1 | Store/persistence | All features |
| 2 | Navigation | Feature UIs |
| 3 | CLI terminal | CLI commands |
| 4 | Personas | Contacts, groups, authorship |
| 5 | Contacts | Groups (membership) |
| 6 | Groups | — |
| 7 | Files | — |
| 8 | Settings | — |
| 9 | Type indexes | WebID profile |
| 10 | WebID profile | — |

Within each level, items are grouped by CLI / UI / Data where it makes sense.

### Maintenance

- **Add items** when new features are implemented
- **Remove items** when features are removed
- **Uncheck items** when something breaks
- **Add `[BROKEN]` notes** for known issues with details

---

## Verification Workflow

### For New Features

1. **Document**: Reason, acceptance criteria, testing strategy
2. **Implement**: Write the code
3. **Test**: Unit tests, Storybook stories if UI
4. **Verify**: Manual verification against acceptance criteria
5. **Update Feature Checklist**: Add new items, mark as checked
6. **Update IMPLEMENTATION_PLAN.md**: If part of a phase

### For Bug Fixes

1. **Document**: What's broken and expected behavior
2. **Reproduce**: Verify the bug manually
3. **Fix**: Write the fix
4. **Verify**: Confirm fix works manually
5. **Re-verify**: Check related items in Feature Checklist
6. **Add test**: If regression is possible

### For Refactors

1. **Document**: Why the refactor is needed
2. **Snapshot**: Note current Feature Checklist state
3. **Refactor**: Change the code
4. **Re-verify**: All affected levels in Feature Checklist
5. **Confirm**: No regressions

---

## When to Do Full Manual Verification

- Before merging significant PRs
- Before releases or demos
- After upgrading dependencies
- After changes to core infrastructure (store, persistence, routing)
- When automated tests pass but something seems wrong

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [PRINCIPLES_AND_GOALS.md](PRINCIPLES_AND_GOALS.md) | Core principles and project goals |
| [FEATURE_CHECKLIST.md](FEATURE_CHECKLIST.md) | Manual verification checklist |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Phase roadmap |
| [CODING_GUIDELINES.md](CODING_GUIDELINES.md) | Code style |
| [testing/](testing/) | Automated test docs |

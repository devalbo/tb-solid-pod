# Principles and Goals

This document consolidates the core principles and goals of **tb-solid-pod**: why we use TinyBase for local-first architecture and Solid concepts for data sovereignty.

---

## Vision

Give users ownership of their social data in web applications—starting from the first page load with no server required, with a clear path to sync to a Solid pod when they're ready.

---

## Core Principles

### 1. Local-First from Day One

**The app works without any server or account from the first page load.**

- Users can create personas, contacts, groups, and documents immediately—no signup, no login, no network request.
- All data lives in the browser (TinyBase + LocalStorage).
- The user experience is instant and reliable; the app never waits for a server.

This is a **hard requirement**, not a fallback. Local-first is the default and only required path to start.

### 2. User Data Ownership (Data Sovereignty)

**Users control their data. It lives where they choose.**

- Data is stored in the user's browser by default—not on our servers.
- Data can be exported as portable JSON (JSON-LD compatible) at any time.
- When users connect a Solid pod, their data syncs to their pod, which they own.
- No vendor lock-in: standard vocabularies mean data is portable to any RDF/Solid-aware system.

### 3. Sync Later (Not Never)

**Local-first does not mean local-only.**

The design supports a later step: the user connects a Solid pod and synchronizes existing local data to it. This gives them:

- A permanently online, resolvable copy (WebID, document URLs)
- Multi-device access (sync between browser and pod)
- Optional server-as-authority mode (pod becomes source of truth)

The sync layer is a must-have capability—not an afterthought. See [SOLID_SERVER_STRATEGIES.md](SOLID_SERVER_STRATEGIES.md) for the design.

### 4. Interoperable by Default

**Data uses established vocabularies so it works beyond this app.**

| Vocabulary | Used for |
|------------|----------|
| **FOAF** | Personas (identity profiles) |
| **vCard** | Contacts and groups |
| **Dublin Core** | File metadata (title, description, creator) |
| **Schema.org** | Extended metadata |
| **W3C Org** | Organizations, teams, roles |
| **Solid Terms** | Type indexes, OIDC issuer, inbox, preferences |

When data leaves this app (export, sync, or federation), it is understandable by other Solid apps and any RDF-aware system.

### 5. Offline-First

**The app works entirely offline.**

- No network requests for core functionality.
- TinyBase with LocalStorage provides reactive persistence.
- Users can work on a plane, in a tunnel, or with no network—data is always available.

### 6. Minimal Setup for App Authors

**Using the library should be easy.**

- One install (`npm install github:devalbo/tb-solid-pod`), no backend or database.
- Schemas, factory functions, and React components are ready to use.
- You can use only schemas, add the CLI, or drop in full UI components—no all-or-nothing.
- Types and JSON Schema included; no manual typing or schema authoring.

### 7. Friendly to Vibe Coding and AI-Augmented Development

**This project welcomes experimentation, hacking, and building with AI assistance.**

- **Low barrier to trying things**: No accounts, no deploy, no config—open the app and start creating data. Break nothing by experimenting.
- **Vibe coding welcome**: You don't need to be an expert. Have a vision? Start building. The schemas, components, and CLI give you structure; you bring the idea.
- **AI-friendly codebase**: Clear types, consistent patterns, and well-documented APIs make it easy for coding agents and LLMs to understand and extend the code. Use Claude, Copilot, or your tool of choice to augment your work.
- **Iterate fast**: LocalStorage persistence means you can reload, tweak, and try again without setup. Export your data if you want to save a snapshot; import it back when you're ready.
- **Vision over polish**: The goal is to help people with ideas—not just professional developers—ship something that works. Rough edges are fine; working software that solves your problem is the point.

This principle is about **democratizing development**: if you have a vision for user-owned social data, this library should help you get there—whether you're a seasoned developer, a designer learning to code, or someone using AI tools to turn ideas into reality.

### 8. Unified CLI for Browser and Terminal

**The same commands work everywhere—browser console, terminal app, and AI agent API.**

The library includes a shared CLI built on [Ink](https://github.com/vadimdemedes/ink) (for Node terminal) and web-ink (for browser). This gives you:

- **One command set**: `create-persona`, `list-contacts`, `add-to-group`, `export` work identically in the browser console and terminal.
- **Human and agent interface**: The CLI is not just for developers—it's a stable API for AI coding agents to interact with the store programmatically.
- **Interactive or scripted**: Use the CLI interactively for exploration, or script it for automation and testing.
- **Full reactivity**: CLI commands mutate the TinyBase store; changes immediately reflect in the UI and vice versa.

This design supports multiple use patterns:

| Environment | Use Case |
|-------------|----------|
| **Browser console** | Developers and power users inspect and manipulate data live. |
| **Terminal app** | Headless operation, CI pipelines, scripted workflows. |
| **AI agents** | LLMs and coding agents issue CLI commands to manage data—no custom API integration needed. |
| **E2E tests** | Same commands drive browser and Node tests, reducing test duplication. |

The CLI is the **control surface** for the store. By exposing the same commands in every environment, we avoid the fragmentation of "browser SDK vs. server SDK vs. API" that plagues many libraries. An AI agent can learn the CLI once and use it everywhere.

### 9. CLI Commands as Composable Building Blocks

**Operations can be modeled as commands—providing composable building blocks that work in browser, terminal, and for AI agents.**

By decomposing app interactions into commands, you get reusable pieces that can be:
- Called from UI event handlers
- Typed interactively in a terminal
- Invoked programmatically by AI agents or scripts
- Chained together for complex workflows

**Decomposability leads to testability.** When an operation is a standalone command, you can test it in isolation without spinning up UI, mocking browsers, or setting up complex fixtures. If it's easier to test in a small environment, it's easier to reason about the ramifications of changes. A command that works in a unit test will work the same way when called from a button click or an AI agent.

This is a **foundational pattern**, not a mandate. Direct store access is fine for simple cases or when you need fine control. But the command layer gives you a stable, composable, testable API when you need it.

This architectural approach is documented in detail in [CLI_COMMAND_UNIFICATION.md](../CLI_COMMAND_UNIFICATION.md) and [VALID_PATHS.md](../VALID_PATHS.md). The key principles are:

#### App Authors Can Decompose Interactions to Commands

When building an app with tb-solid-pod, authors can model their app/document/data interactions as **commands**. Instead of calling `pod.handleRequest()` directly from UI code, the UI can call the CLI executor:

```typescript
// Instead of:
await pod.handleRequest(url, { method: 'PUT', body: content });

// Use:
const { createFile } = useCliExecutor();
await createFile(name, content, contentType);
```

This ensures:
- **Consistent validation**: The same path and input validation applies everywhere.
- **Unified error handling**: Standard error codes and messages across all entry points.
- **Single audit trail**: All operations pass through one place for logging and debugging.
- **Programmatic and interactive parity**: The same operation works from UI click, CLI command, or API call.

#### Environment-Agnostic Logic

The CLI command logic is **agnostic to whether we are running in browser or Node**:

- Commands use the same `CliContext` interface regardless of environment.
- Platform-specific behavior (e.g., file download vs. clipboard) is isolated to adapters.
- The core command logic never checks `typeof window` or `process.env`.

This means:
- **Test once, run everywhere**: Command tests written for Node work identically in browser.
- **Portable by design**: An app built with the CLI works without modification in Node, browser, or future environments (Electron, React Native, etc.).

#### Structured Command Results

Commands return structured results for programmatic consumption:

```typescript
interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: ErrorCode; message: string; };
}
```

This enables:
- **Silent mode**: UI code can call commands without terminal output.
- **JSON output**: Commands support `--json` for machine-readable output.
- **Chaining**: One command's result can feed into another programmatically.

#### Single Source of Truth for Path Resolution

All path handling flows through a centralized module (`src/cli/path.ts`):
- Path validation rules are defined once and enforced everywhere.
- URL encoding/decoding is consistent.
- Invalid states (malformed URLs, escape attempts) are caught at the command layer.

See [VALID_PATHS.md](../VALID_PATHS.md) for the full path resolution specification.

---

## Why TinyBase

TinyBase is the reactive store and persistence layer that makes local-first practical.

| TinyBase Feature | How It Helps |
|------------------|--------------|
| **Reactive state** | Hooks (`useRow`, `useTable`, `useSliceRowIds`) keep UI in sync automatically. Changes in CLI reflect immediately in UI and vice versa. |
| **Persisters** | LocalStorage persistence out of the box; same API for future sync to Solid pods (custom persister). |
| **Indexes** | Fast queries (e.g. `byParent` for folder contents, `byType` for group filtering). |
| **MergeableStore** | Enables conflict-aware sync when we add multi-device or collaboration. |
| **Small footprint** | No heavy dependencies; works in the browser with no server. |

TinyBase lets us deliver offline-first, reactive UX today and provides the foundation for sync and collaboration later—all with a consistent API.

---

## Why Solid

Solid (Social Linked Data) is the design vision for user-owned, interoperable data.

| Solid Concept | How We Use It |
|---------------|---------------|
| **WebID** | Personas are WebID-style profile documents with identity, inbox, type indexes. |
| **Pods** | The browser store is a "local pod"; sync to a real pod gives it URLs and permanence. |
| **Vocabularies** | FOAF, vCard, Dublin Core, Solid terms—data is portable and federation-ready. |
| **Type Indexes** | Map RDF types to storage locations for data discovery. |
| **WAC (planned)** | Access control at document level—public read / owner write first, finer sharing later. |

We simulate Solid concepts locally; adding a sync target gives full Solid protocol benefits (resolvable URLs, federation, authentication).

---

## Design Goals

### For Users

1. **Immediate value**: Create and manage identity, contacts, groups, and files from the first page load.
2. **No lock-in**: Export data anytime; sync to your own pod when ready.
3. **Privacy**: Data stays in your browser until you choose otherwise.
4. **Reliability**: Works offline; no server dependency for core features.

### For App Authors

1. **Minimal integration**: Use schemas only, add CLI, or drop in React components.
2. **Stable contracts**: Store layout (table and index names) and value keys are stable.
3. **Extensible**: Add new data types following the schema pattern.
4. **Future-proof**: Data model aligns with Solid; adding sync is an extension, not a rewrite.
5. **Agent-ready**: The CLI works as an API for AI coding agents—no custom integration required.

### For the Project

1. **Principle-first**: Design documents start with principles and requirements, not implementation details.
2. **Critical path**: Sync layer → public read/owner write → finer sharing.
3. **Verification**: Every feature is broken until manually verified ([SDLC_PROCESS.md](SDLC_PROCESS.md)).
4. **Documentation**: Design, implementation, and test docs stay coherent through doc review process.

---

## Technical Principles: Testability and Maintainability

**If it's hard to test, it's hard to maintain.** These principles enable the project to live for a long time with minimal cost, and make it feasible for new participants to make changes without high levels of risk.

### Testability Drives Design

1. **Unit tests required for all features.** Every feature must have unit tests. No exceptions.
2. **Refactor over complex tests.** If a test requires extensive setup, mocking, or is hard to write, that's a signal to refactor the code—not to write a more complex test.
3. **Small, isolated units.** Code that's easy to test in isolation is easy to understand, change, and reuse.
4. **Tests as documentation.** Tests show how code is meant to be used. If the test is hard to read, the API is probably hard to use.

### Maintainability Enables Longevity

1. **Low barrier to change.** New contributors should be able to make changes confidently. Good tests catch mistakes before they ship.
2. **Refactoring is safe.** Comprehensive tests let you restructure code without fear. If you can't refactor safely, the project calcifies.
3. **Cost stays low over time.** Projects without tests accumulate risk with every change. Projects with tests can grow indefinitely.

### How This Connects to Project Goals

| Goal | How Testability/Maintainability Supports It |
|------|---------------------------------------------|
| **Vibe coding friendly** | New contributors can experiment knowing tests will catch regressions |
| **Agent-ready** | AI agents can modify code and verify correctness via tests |
| **Minimal setup for app authors** | Well-tested library code means fewer bugs for consumers to work around |
| **CLI as composable building blocks** | Commands tested in isolation work reliably when composed |

See [TEST_PLAN.md](TEST_PLAN.md) for testing requirements and [SDLC_PROCESS.md](SDLC_PROCESS.md) for the verification workflow.

---

## What We Commit To

| Commitment | What It Means |
|------------|---------------|
| **Local-first always works** | No future change will require a server for first use. |
| **Export/import always available** | Users can always get their data out as portable JSON. |
| **Vocabularies stay standard** | We use FOAF, vCard, Dublin Core, Solid terms—no custom-only predicates. |
| **Store layout is stable** | Table names, index names, and value keys are the library's API; they won't break without migration. |
| **Sync is additive** | Adding a pod does not break local-only use; local-first is the foundation, not a fallback. |

---

## What We Do Not Commit To (Yet)

- **Full Solid protocol**: LDP, WebID-TLS, DPoP, SPARQL, and federation are not implemented.
- **Multi-user collaboration**: Planned but not present.
- **Real-time sync**: Planned; requires a sync layer and possibly WebSockets.
- **WAC enforcement**: Planned (Phase 8); no permission enforcement today.
- **Large file storage**: LocalStorage limits apply; chunking/streaming not implemented.

See [SHORTCOMINGS.md](SHORTCOMINGS.md) for the full list.

---

## Summary

| Principle | One-liner |
|-----------|-----------|
| **Local-first** | Works from first page load, no server required. |
| **Data sovereignty** | Users own and control their data. |
| **Sync later** | Connect a pod when ready; local data syncs to it. |
| **Interoperable** | Standard vocabularies; data is portable beyond this app. |
| **Offline-first** | No network needed for core features. |
| **Minimal setup** | One install, no backend, use what you need. |
| **Vibe coding friendly** | Experiment, hack, use AI tools—vision over polish. |
| **Unified CLI** | Same commands in browser, terminal, and AI agents. |
| **Testability = maintainability** | If it's hard to test, refactor. Tests enable safe change. |

TinyBase makes local-first reactive and practical. Solid provides the vision for user-owned, interoperable data. The unified CLI gives humans and AI agents the same command surface in browser and terminal. Together, they let users start immediately and grow into full data sovereignty—whether you're a seasoned developer, someone with an idea and an AI assistant, or an AI agent driving the library programmatically.

---

## Related Documents

- **[SOLID_SERVER_STRATEGIES.md](SOLID_SERVER_STRATEGIES.md)** — Sync design, authority modes, and implementation order.
- **[SHORTCOMINGS.md](SHORTCOMINGS.md)** — What the library does not provide today.
- **[DOCUMENT_SHARING_SCENARIOS.md](DOCUMENT_SHARING_SCENARIOS.md)** — How the library supports sharing use cases.
- **[USE_CASES.md](USE_CASES.md)** — How app authors access users, groups, and documents.
- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** — How to integrate into your app.
- **[CODING_GUIDELINES.md](CODING_GUIDELINES.md)** — Code style and practices.
- **[SDLC_PROCESS.md](SDLC_PROCESS.md)** — How changes are documented and verified.

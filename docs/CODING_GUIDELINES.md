# Coding guidelines

Keep the codebase maintainable: strict types, small units of work, and simple React components.

## React

- **Use the latest stable React** and follow current React best practices. Prefer modern APIs (e.g. hooks, concurrent features where applicable) over legacy patterns.
- **Effects and event logic:** When a `useEffect` needs to call a callback (e.g. a prop like `onOutputLines`) that should not be in the dependency array—to avoid re-running the effect when the parent passes a new function reference—use **`useEffectEvent`** (React 19+) to wrap that callback. The Effect Event always sees the latest props/state when it runs but does not trigger the effect to re-run when it changes. This keeps the effect’s dependencies minimal and avoids stale closures.
- **Custom hooks for stateful logic.** If a component has non-trivial state or effects, move that logic into a `useSomething` hook and keep the component mostly presentational.
- **Composition over complexity.** Prefer many small components and clear data flow over large components with many branches.

## TypeScript

- **Strict types only.** The project uses `strict: true` in `tsconfig.json`. Do not relax it.
- **Avoid `any`.** Use `unknown` and narrow with type guards, or define proper interfaces. If you must escape types, use a minimal cast and comment why.
- **Prefer explicit types** for function parameters and return values in public APIs (exports, component props). Let inference do the work inside small, local functions when it’s obvious.
- **Model data with interfaces or types.** Use Zod schemas as the source of truth for domain shapes; align TypeScript types with them (e.g. `z.infer<typeof MySchema>`).
- **No sloppy object types.** Avoid `Record<string, unknown>` in public APIs unless you’re truly handling arbitrary data; prefer named properties and interfaces.

## Functions

- **Keep functions short.** Aim for a single level of abstraction and one clear responsibility. If a function is long or doing several things, split it.
- **Extract helpers** for repeated logic or non-trivial calculations. Put them in a small, testable function or a shared util.
- **Limit parameters.** If a function takes more than a few arguments, consider an options object or a small typed config.

## React components

- **Keep components small.** If a component is long or has many branches, extract subcomponents or custom hooks.
- **Avoid overly complex components.** Prefer many small components over one large one. Use composition.
- **Props: typed and minimal.** Define a clear props interface; avoid spreading large objects “just in case.”

## CLI commands as a composable layer

- **Model operations as commands.** When adding new app functionality, consider whether it can be expressed as a CLI command. Commands provide a composable foundation that works in browser, terminal, and for AI agents.
- **Environment-agnostic logic.** Command implementations should not check `typeof window` or rely on browser/Node-specific APIs. Isolate platform differences in adapters.
- **Structured results.** Commands should return structured `CommandResult` objects for programmatic consumption, not just render output.
- **Decomposability enables testability.** A command that can be tested in isolation—without UI, browser mocks, or complex fixtures—is easier to reason about. If you can test it in a small environment, you can predict how changes will affect it.

This pattern is foundational, not mandatory—direct store access is fine for simple cases. See [CLI_COMMAND_UNIFICATION.md](../CLI_COMMAND_UNIFICATION.md) for the full architecture.

## General

- **Naming:** Use clear, consistent names. Prefer `handleSubmit` over `onClick` for handlers passed as props; keep event handlers and callbacks obvious.
- **File length:** If a file grows past roughly 200–300 lines, consider splitting (e.g. by component, by feature, or into a small folder).
- **Comments:** Comment *why* when it’s not obvious from the code; avoid restating what the code does.
- **Tests:** New behavior should have unit tests where practical. Follow existing patterns in `tests/unit/` and use the test helpers (e.g. `renderWithProviders`, `createTestStore`).

## Dependencies

- **When picking a library, prefer ones written in TypeScript with strict typing conventions.** Good type definitions (or first-party TypeScript) reduce runtime bugs and make refactors safer; avoid libraries that rely on loose or hand-maintained `@types` if a better-typed alternative exists.

## Process

- **When a refactor or code change breaks a test, do not automatically fix the test.** The developer who made the change is responsible for resolving the failure: either update the code so the test passes again, or change the test only after deciding that the new behavior is correct and the test’s expectations were wrong. Do not silently adjust tests to match new behavior without that decision.

These guidelines apply to `src/` and `tests/`; tooling and config can be more permissive where needed.

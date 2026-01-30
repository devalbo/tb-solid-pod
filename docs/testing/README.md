# Testing

Overview of the test suite and where results live.

## Quick start

| Type | Command | Results / artifacts |
|------|---------|----------------------|
| **Unit (Vitest)** | `npm test` or `npm run test:run` | Terminal; coverage: `npm run test:coverage` → `coverage/` |
| **BDD / E2E (Playwright)** | `npm run test:e2e` or `npx bddgen && npx playwright test` | [BDD test results](#bdd-e2e-results) below |
| **Storybook** | `npm run storybook` | Browser at http://localhost:6006 |

See [Unit tests](unit-tests.md), [BDD tests](bdd-tests.md), and [Storybook](storybook.md) for details.

## BDD / E2E results

Playwright (BDD) test results and artifacts are written to these directories (all in [.gitignore](../../.gitignore)):

| Path | Contents |
|------|----------|
| **`playwright-report/`** | HTML report. Open with `npx playwright show-report` or open `playwright-report/index.html` in a browser. |
| **`test-results/`** | Raw run artifacts: `.last-run.json`, and per-test folders (traces, screenshots for failures). |
| **`.features-gen/`** | Generated Playwright spec files from Gherkin (from `npx bddgen`). Not “results” but generated output; also gitignored. |

After a run, view the latest report:

```bash
npx playwright show-report
```

Or open the file directly: `open playwright-report/index.html` (macOS).

## Other result locations

- **Unit test coverage:** `npm run test:coverage` writes to `coverage/` (typically gitignored via `coverage/` or similar).
- **Storybook build:** `npm run build-storybook` (or `storybook build`) outputs to `storybook-static/` (gitignored).

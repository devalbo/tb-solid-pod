# BDD / E2E tests (Playwright + playwright-bdd)

E2E tests are written in Gherkin (`.feature` files) and run with [Playwright](https://playwright.dev/) via [playwright-bdd](https://vitalets.github.io/playwright-bdd/).

## Commands

- **Generate specs and run:** `npx bddgen && npx playwright test` (or `npm run test:e2e` / `npm run test:bdd`)
- **With browser visible:** `npm run test:e2e:headed`
- **View last report:** `npx playwright show-report`

After changing `.feature` files or step definitions, run `npx bddgen` before `npx playwright test`.

## Where BDD test results are stored

All of these are in the project root and listed in [.gitignore](../../.gitignore):

| Path | Contents |
|------|----------|
| **`playwright-report/`** | HTML report for the last run. Open with `npx playwright show-report` or open `playwright-report/index.html` in a browser. |
| **`test-results/`** | Raw artifacts: `.last-run.json` (run status, failed test ids), and one folder per failed (or configured) test with traces, screenshots, etc. |
| **`.features-gen/`** | Generated Playwright spec files from Gherkin. Created by `npx bddgen`; do not edit by hand. |

To inspect the latest run: open the HTML report, or look at `test-results/.last-run.json` and the subfolders in `test-results/` for failures.

## Layout

- **Config:** `playwright.config.ts` (defineBddConfig, baseURL, webServer)
- **Features:** `tests/features/*.feature` (Gherkin)
- **Steps:** `tests/features/steps/*.ts` (Given/When/Then)
- **Generated specs:** `.features-gen/` (output of `npx bddgen`)

## Running with the app already up

If E2E hangs when Playwright starts the dev server, run the app yourself and reuse it:

1. **Terminal 1:** `npm run dev` (leave running; app at http://localhost:5173).
2. **Terminal 2:** `npx bddgen && npx playwright test`.

Playwright will reuse the server on 5173 when not in CI. For a different port, set `E2E_BASE_URL` (e.g. `E2E_BASE_URL=http://localhost:3000 npx playwright test`).

## Manual BDD steps

See the main [README Testing section](../../README.md#testing) for a “Try the BDD steps manually” checklist you can follow in the browser without running Playwright.

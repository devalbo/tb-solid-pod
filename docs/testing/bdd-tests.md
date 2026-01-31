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

- **Config:** `playwright.config.ts` (defineBddConfig, baseURL; no webServer — start the app yourself)
- **Features:** `tests/features/*.feature` (Gherkin)
- **Steps:** `tests/features/steps/*.ts` (Given/When/Then)
- **Generated specs:** `.features-gen/` (output of `npx bddgen`)

## Starting the app (required)

The BDD/E2E command does **not** start the dev server. Start the app first, then run the tests:

1. **Terminal 1:** `npm run dev` (leave running; app at http://localhost:5173).
2. **Terminal 2:** `npx bddgen && npx playwright test`.

For a different port, set `E2E_BASE_URL` (e.g. `E2E_BASE_URL=http://localhost:3000 npx playwright test`).

## Testing boundary: automated vs manual

The BDD suite has a fixed scope. Knowing what is automated and what is left for manual verification avoids confusion and guides where to add scenarios later.

### Scenarios covered (automated)

These are implemented in `tests/features/*.feature` and run with Playwright.

| Area | Scenarios |
|------|-----------|
| **App shell** | App loads; page title contains "tb-solid-pod"; switch to Terminal tab and see CLI prompt/welcome. |
| **Tab navigation** | Home, Contacts, Personas, Terminal tabs visible; switch to Contacts/Personas and see the corresponding view. |
| **Contacts UI** | Open Contacts tab; see either a contacts list or empty state ("No contacts" / "Add"). |
| **Personas UI** | Open Personas tab; see personas view; navigation tabs present on load. |
| **CLI – help & navigation** | Main `help` lists contact, persona, etc.; `clear` clears terminal output. |
| **CLI – contact** | `contact add`, `contact list`, `contact` (help/subcommands). |
| **CLI – persona** | `persona create`, `persona list`, `persona` (help/subcommands). |

**Total:** Six feature files; scenarios above are the current automated boundary. The dev server must be running (see [Starting the app](#starting-the-app)); BDD does not start it.

### CLI in browser vs terminal (Scenario Outline)

The same CLI scenarios run **in the browser** (Terminal tab) and **in the terminal** (Node CLI spawned with piped stdin). One feature file per area (e.g. `cli-contacts.feature`) uses a **Scenario Outline** with `Examples: | context | browser | terminal |`. The step "Given I have the CLI in the &lt;context&gt;" either opens the Terminal tab (browser) or spawns `npx tsx src/cli/run-node.tsx` with a unique temp store path (terminal). "When I run the command" and "Then I should see ... in the output" branch on context. Run with the same command as other E2E: `npm run test:e2e` (dev server must be running for browser; terminal runs without it). In Node, `exit` quits the process; `export` prints JSON (or `--download` writes a file). See README and [INTEGRATION_GUIDE.md](../INTEGRATION_GUIDE.md) for full CLI usage.

### Not yet automated (manual verification)

These are either out of scope for the current BDD suite or not yet implemented as Gherkin scenarios. Verify them manually (or extend the feature files later).

| Area | What to verify manually |
|------|--------------------------|
| **CLI – other commands** | `group`, `file`, `files`, `config`, `data`, `typeindex`, `navigation` (subcommands, list/add/show, help). |
| **Groups UI** | Groups tab, list, create/edit group, membership manager. |
| **Forms and flows** | Create/edit persona, contact, or group in the UI; validation; linking contact to persona; agent contacts. |
| **File metadata** | File browser (if present in the demo app), file metadata panel, virtual filesystem. |
| **Settings** | Config/settings UI, theme, preferences. |
| **Export / import** | Export store to JSON/JSON-LD; import data (if the app exposes it). |
| **Type index** | Type index UI (if any); default registrations on first load. |
| **Future / not implemented** | Connect pod, Solid auth, sync operations, ACL, real LDP. |

When you add new BDD scenarios (e.g. for `group` or Groups tab), add them to the “Scenarios covered” list and move the corresponding row out of “Not yet automated” so the boundary stays explicit.

## Manual BDD steps

See the main [README Testing section](../../README.md#testing) for a “Try the BDD steps manually” checklist you can follow in the browser without running Playwright.

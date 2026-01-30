# Test Suite Implementation Plan

## Status: Complete

### Completed
- [x] Phase 1: Unit Tests with Vitest
- [x] Phase 2: BDD Tests with Cucumber/Gherkin + Playwright
- [x] Phase 3: Storybook for UI Components (partial - all stories created)
- [x] Phase 4: Documentation Updates

---

## Phase 1: Unit Tests with Vitest (COMPLETED)

### Dependencies Installed
- vitest
- @vitest/coverage-v8
- @vitest/ui
- @testing-library/react
- @testing-library/jest-dom
- @testing-library/user-event
- jsdom

### Configuration Files Created
- `vitest.config.ts` - Vitest configuration with jsdom environment, coverage thresholds (80%)
- `tests/setup.ts` - Global test setup with jest-dom matchers, localStorage mock, crypto.randomUUID mock

### Test Helpers Created
- `tests/helpers/store-factory.ts` - TinyBase store factory with sample data
- `tests/helpers/render-with-providers.tsx` - React Testing Library wrapper with TinyBase Provider

### Tests Written

#### Schema Tests (252 tests)
| File | Tests | Status |
|------|-------|--------|
| tests/unit/schemas/base.test.ts | ~30 | Passing |
| tests/unit/schemas/persona.test.ts | ~40 | Passing |
| tests/unit/schemas/contact.test.ts | ~45 | Passing |
| tests/unit/schemas/group.test.ts | ~40 | Passing |
| tests/unit/schemas/file.test.ts | ~35 | Passing |
| tests/unit/schemas/typeIndex.test.ts | ~30 | Passing |
| tests/unit/schemas/preferences.test.ts | ~32 | Passing |

#### Utility Tests (114 tests)
| File | Tests | Status |
|------|-------|--------|
| tests/unit/utils/validation.test.ts | ~30 | Passing |
| tests/unit/utils/storeExport.test.ts | ~35 | Passing |
| tests/unit/utils/typeIndex.test.ts | ~25 | Passing |
| tests/unit/utils/settings.test.ts | ~24 | Passing |

#### Component Tests (19 tests)
| File | Tests | Status |
|------|-------|--------|
| tests/unit/components/ContactList.test.tsx | 19 | Passing |

### npm Scripts Added
```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:coverage": "vitest --coverage",
"test:run": "vitest run"
```

**Total: 385 tests passing**

---

## Phase 3: Storybook for UI Components (COMPLETED)

### Dependencies Installed
- @storybook/react-vite (via `npx storybook@latest init`)
- @storybook/addon-a11y
- @storybook/addon-interactions
- @storybook/test

### Configuration Files Created
- `.storybook/main.ts` - Storybook main config
- `.storybook/preview.tsx` - Global decorators with TinyBase Provider and sample data

### Stories Created
| Component | Stories | Variants |
|-----------|---------|----------|
| ContactList.stories.tsx | 6 | Default, WithSelection, Empty, MixedTypes, OnlyAgents, ManyContacts |
| ContactForm.stories.tsx | 4 | CreateNew, EditExisting, CreateAgent, EditAgent |
| PersonaList.stories.tsx | 6 | Default, WithSelection, Empty, SinglePersona, ManyPersonas, NoDefault |
| PersonaForm.stories.tsx | 2 | CreateNew, EditExisting |
| GroupList.stories.tsx | 6 | Default, WithSelection, Empty, MixedTypes, OnlyOrganizations, ManyGroups |
| GroupForm.stories.tsx | 3 | CreateNew, EditOrganization, EditTeam |
| MembershipManager.stories.tsx | 5 | WithMembers, NoMembers, AllMembersAdded, NoContacts, ManyMembers |
| FileMetadataPanel.stories.tsx | 6 | TextFile, ImageFile, NoMetadata, LargeFile, WithMultipleAuthors, JsonFile |

### npm Scripts Added
```json
"storybook": "storybook dev -p 6006",
"storybook:build": "storybook build"
```

**Total: 8 components with 38 story variants**

---

## Phase 2: BDD Tests with Cucumber/Gherkin + Playwright (COMPLETED)

### Dependencies Installed
- @playwright/test, playwright-bdd; `npx playwright install` (chromium)

### Configuration
- `playwright.config.ts` — Playwright config with defineBddConfig, baseURL; no webServer (start dev server manually)

### Feature Files and Steps
- `tests/features/*.feature` — app, cli-contacts, cli-personas, cli-navigation, contacts, personas
- `tests/features/steps/common.steps.ts`, `cli.steps.ts`

### BDD Test Results (where they are stored)
- **`playwright-report/`** — HTML report; open with `npx playwright show-report` or `playwright-report/index.html`
- **`test-results/`** — `.last-run.json`, per-test folders (traces, screenshots)
- **`.features-gen/`** — generated Playwright specs from `npx bddgen` (gitignored)

See [docs/testing/bdd-tests.md](testing/bdd-tests.md) for full details.

**Testing boundary:** The same doc defines [what is automated vs manual](testing/bdd-tests.md#testing-boundary-automated-vs-manual): app shell, tab navigation, Contacts/Personas UI, CLI help/clear/contact/persona are covered by BDD; CLI group/file/files/config/data/typeindex, Groups UI, forms, file browser, settings, export/import, and future features (pod connect, sync, ACL) are left for manual verification until scenarios are added.

### npm Scripts Added
```json
"test:e2e": "npx bddgen && playwright test",
"test:e2e:headed": "npx bddgen && playwright test --headed",
"test:bdd": "npx bddgen && playwright test"
```

---

## Phase 4: Documentation Updates (COMPLETED)

### Documentation Created
- **docs/testing/README.md** — Testing overview, quick start, where results are stored (unit, BDD, Storybook)
- **docs/testing/unit-tests.md** — Unit test commands and layout
- **docs/testing/bdd-tests.md** — BDD commands, **where BDD test results are stored** (playwright-report, test-results, .features-gen), layout, manual server, manual steps
- **docs/testing/storybook.md** — Storybook commands and layout

### Files Updated
- **README.md** — Testing section with commands and manual BDD steps; link to docs/testing/
- **docs/TEST_PLAN.md** — Status and phases marked complete

---

## Verification Checklist

- [x] `npm test` - All unit tests pass (385 tests)
- [x] `npm run test:coverage` - Coverage meets 80% threshold
- [x] `npm run storybook` - All stories render without errors
- [ ] `npm run test:e2e` - All BDD scenarios pass (run with server on 5173; see docs/testing/bdd-tests.md)
- [x] Documentation is clear and complete (docs/testing/)

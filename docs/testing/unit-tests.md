# Unit tests (Vitest)

Unit tests use [Vitest](https://vitest.dev/) with [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) and jsdom.

## Commands

- **Run (watch):** `npm test`
- **Run once:** `npm run test:run`
- **Coverage:** `npm run test:coverage` → report in `coverage/`
- **UI:** `npm run test:ui`

## Layout

- **Config:** `vitest.config.ts` (jsdom, coverage thresholds 80%)
- **Setup:** `tests/setup.ts` (jest-dom matchers, localStorage mock, `crypto.randomUUID` mock)
- **Helpers:** `tests/helpers/store-factory.ts`, `tests/helpers/render-with-providers.tsx`
- **Tests:** `tests/unit/` — `schemas/`, `utils/`, `components/`

## Writing tests

- Use `renderWithProviders()` from `tests/helpers/render-with-providers.tsx` for components that need TinyBase `Provider`.
- Use `createTestStore()` from `tests/helpers/store-factory.ts` when you need a store with sample data.
- Schemas and utils are tested in isolation; component tests use the helpers above.

# Storybook

[Storybook](https://storybook.js.org/) is used for developing and reviewing UI components in isolation.

## Commands

- **Dev server:** `npm run storybook` → http://localhost:6006
- **Build static:** `npm run build-storybook` (or `storybook build`) → output in `storybook-static/` (gitignored)

## Layout

- **Config:** `.storybook/main.ts`, `.storybook/preview.tsx`
- **Stories:** Next to components, e.g. `src/components/ContactList.stories.tsx`

Preview uses a global decorator with TinyBase `Provider` and sample data so stories render with a real store.

## Stories covered

PersonaList, PersonaForm, ContactList, ContactForm, GroupList, GroupForm, MembershipManager, FileMetadataPanel — multiple variants per component (default, empty, many items, etc.). See `src/components/*.stories.tsx`.

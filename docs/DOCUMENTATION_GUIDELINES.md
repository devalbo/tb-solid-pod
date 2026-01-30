# Documentation guidelines

How to write and maintain documentation in this repo (README, design docs, plans, and other markdown).

## Acronyms and terms

- **Introduce all acronyms at the top of the document.** In any doc where an acronym is used, define it near the beginning (e.g. in an intro paragraph or a short **Terms** section). Use the form: **ACRONYM** (Full Name) is … Example: **LDP** (Linked Data Platform) is a W3C standard for …
- **First use:** Spell out the full term and give the acronym in parentheses, or give the acronym and define it in one sentence. After that, the acronym alone is fine.
- **Cross-docs:** If a term is defined in another doc (e.g. in SOLID_SERVER_STRATEGIES.md), you can link to that doc instead of redefining, but the *current* doc should still introduce any acronym it uses so the reader doesn’t have to jump away to understand the first mention.

## Structure and clarity

- **Start with purpose.** The first paragraph should state what the doc is for and who it’s for (e.g. “This doc lays out …” or “This guide explains …”).
- **Use headings to create a clear hierarchy.** Prefer `##` for main sections and `###` for subsections; keep depth reasonable so the table of contents stays scannable.
- **One idea per paragraph.** Keep paragraphs short; use lists or tables when listing options, steps, or comparisons.
- **Tables for comparisons.** Use markdown tables when comparing strategies, options, or behaviors (e.g. browser vs server authority, or sync targets).

## Links and references

- **Link to external specs and resources.** Use markdown links for W3C specs, Solid docs, library docs, and other external URLs so readers can follow up.
- **Link to other project docs.** When you refer to another file in the repo (e.g. DESIGN.md, SOLID_SERVER_STRATEGIES.md), use a relative link: `[DESIGN.md](DESIGN.md)` or `[Strategy 3](SOLID_SERVER_STRATEGIES.md#strategy-3-sync-layer)`.
- **Avoid bare URLs in prose.** Prefer `[link text](url)` over pasting the URL alone, except in code or config examples where the URL is the value.

## Code and examples

- **Use fenced code blocks with a language.** Specify the language for syntax highlighting (e.g. ` ```ts `, ` ```bash `).
- **Keep examples minimal and runnable.** Trim examples to the relevant part; if something must be changed for a real deployment (e.g. URLs, secrets), say so in a comment or note.
- **Pseudocode is fine for design docs.** If you’re sketching flow or APIs, label it as pseudocode or “example” so readers don’t expect it to run as-is.

## Tone and audience

- **Write for a future reader (including yourself).** Assume the reader has basic context (e.g. knows what Solid or TinyBase is) but not the details of this project. Avoid jargon that isn’t defined.
- **Prefer active voice and present tense.** “The sync layer pushes …” not “The sync layer will push …” unless you’re describing a future or conditional case.
- **Be consistent with the rest of the repo.** Match terms used elsewhere (e.g. “pod,” “sync target,” “authority”) and the same level of formality as DESIGN.md and SOLID_SERVER_STRATEGIES.md.

## Where these guidelines apply

- **docs/** — All markdown (DESIGN.md, IMPLEMENTATION_PLAN.md, SOLID_SERVER_STRATEGIES.md, TEST_PLAN.md, testing/*.md, etc.).
- **README.md** — Project overview and getting started; acronyms used there should be introduced in README or linked to a doc that defines them.
- **AGENTS.md** — Instructions for AI assistants; same acronym rule so agents and humans can read it without guessing.

Code comments and inline JSDoc follow the codebase style (see [CODING_GUIDELINES.md](CODING_GUIDELINES.md)); this file is about standalone documentation.

# Step 1: GitHub-ready

Use this when doing **Step 1** from [GITHUB_AND_LIBRARY_PLAN.md](GITHUB_AND_LIBRARY_PLAN.md).

## Already done locally

- **LICENSE** is in the repo (AGPL-3.0-or-later).
- You are on branch **main** with a clean working tree.
- Code is ready to push.

## What you need to do

### 1. Create the repo on GitHub

1. Go to [github.com/new](https://github.com/new).
2. **Repository name**: e.g. `tb-solid-pod` (or your preferred name). You’ll use this for the GitHub Pages URL and Vite `base` later.
3. **Owner**: your user or org.
4. **Do not** check “Add a README”, “Add .gitignore”, or “Choose a license” (you already have them locally).
5. Create the repository.

### 2. Add remote and push

From the project root:

```bash
git remote add origin https://github.com/<owner>/<repo>.git
git push -u origin main
```

Replace `<owner>` with your GitHub username (or org) and `<repo>` with the repo name (e.g. `tb-solid-pod`).

### 3. Set description and topics

1. On the repo page, click **Settings** (or the gear next to “About”).
2. **Description**: e.g. “Browser-based Solid-style data pod with TinyBase – personas, contacts, groups, type indexes, WebID profile. Runnable demo + use as library.”
3. **Topics**: e.g. `solid`, `tinybase`, `pod`, `webid`, `linked-data`, `react`, `typescript` (add with Enter).

### 4. Note the repo name

You’ll need the repo name for:

- **Step 4**: Vite `base: '/<repo>/'` in `vite.config.js`.
- **Step 4**: “Live demo” link in README: `https://<owner>.github.io/<repo>/`.

---

When this is done, step 1 is complete. Continue with **Step 2: Runnable on checkout** in the plan.

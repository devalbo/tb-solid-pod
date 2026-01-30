# Strategies for Instantiating a Persistent Solid Server

This doc lays out practical strategies for running a **persistent Solid server** as a **sync target** (or, when the user chooses, **source of truth**) for the browser-based pod, so data can eventually be always-online, resolvable (WebID), and optionally federated. A **required workflow** is that users can add Solid-style data from **first page load** with no server or account; **later**, they can connect a pod and synchronize that data to a permanently online server. The doc builds on [DESIGN.md](DESIGN.md) (Future: Add Always-Online Sync Target) and our current data model (personas, contacts, groups, type indexes, file metadata) and export format.

**Terms:** **LDP** (Linked Data Platform) is a [W3C standard](https://www.w3.org/TR/ldp/) for read-write linked data over HTTP. Resources (documents) and containers (folders) are identified by URLs; clients use **GET** (read), **PUT** (create/overwrite), **POST** (create in container), **PATCH** (partial update), and **DELETE** on those URLs, with RDF payloads (e.g. `application/ld+json` or `text/turtle`). Solid pods implement LDP (plus auth and conventions); in this doc, “LDP” means this HTTP+RDF interface.

---

## Required workflow: start local, sync later

**It is critical** that when a user first lands on the page where this site is hosted, they can **add Solid-style data immediately** — no account, no pod, no server. Personas, contacts, groups, and other data are created and stored **locally** (TinyBase + localStorage). **Later**, when the user wants a permanent, always-online copy, they can **connect a Solid pod** and **synchronize** that local data to it.

- **First use (required):** On first load, the app works without any Solid server or login. The user can create and edit personas, contacts, groups, etc. All data lives in the browser. This is the default and only required path to start.
- **Sync later (required capability):** The design must support a **later** step: the user connects a pod (e.g. signs up at a hosted provider or points to a self-hosted pod), authenticates once, and the app **synchronizes** existing local data to that pod. From then on, sync can be continuous or on-demand.
- **Authority after the server is established:** Once the online server (pod) is connected, the user may want **the server to become the authority** instead of the browser. The design must account for this: support a **user choice** (e.g. “Use pod as main storage” / “Server is source of truth”) so that the pod can be the system of record and the browser a cache or offline mirror. When server is authority, the sync layer pulls from the server first, pushes local changes to the server, and resolves conflicts in favor of the server. See [Authority mode: browser vs server](#authority-mode-browser-vs-server).
- All recommendations and technical choices in this doc assume **local-first from first page load**, **sync to a permanently online server** when the user is ready, and **optional server-as-authority** once the pod is established.

---

## Design principle: sync is a must-have; authority is configurable once pod is connected

- **First use is local-only.** No pod or login is required for the user to create data (see [Required workflow: start local, sync later](#required-workflow-start-local-sync-later)). Connecting a pod and syncing is something the user does **later**, when they want a permanent, always-online copy. The app must support this from first page load.
- **Syncing is critical** once the user connects a pod. Any persistent Solid server must be designed and chosen in the context of **sync**: getting changes between the browser and the server in a reliable, understandable way. One-off “publish” or “backup” is a stepping stone; **continuous or on-demand sync is a must-have** when a pod is connected.
- **Authority is configurable once the pod is established.** By default (and for “start local, sync later”), the **browser (TinyBase) is the source of truth** and the remote Solid server is a **sync target**. Once the online server is established, the user may choose to make the **server the authority** so the pod is the system of record and the browser is a cache or offline mirror. The sync layer, conflict policy, and persistence behavior must support both modes. See [Authority mode: browser vs server](#authority-mode-browser-vs-server).
- Implications: we need a **sync layer** that activates when the user has connected a pod; it must support **browser authority** (push from local, optional pull, conflicts per policy) and **server authority** (pull from server first, push changes, server wins on conflict). Server choice is “where does the sync target (or source of truth) live?” — hosted pod (minimal config) or self-hosted. Auth and push/pull semantics are part of the core design; **conflict policy depends on authority mode**.

---

## Authority mode: browser vs server

Once the online server (pod) is connected, the user may choose who is the **authority** (source of truth). The design must support both modes and re-evaluate sync and persistence behavior accordingly.

### Browser as authority (default)

- **Source of truth:** TinyBase (browser). The pod is a **sync target** (mirror).
- **Sync:** Push local state to the server (required when pod connected); optionally pull and merge. Conflicts: **browser wins** or last-write-wins (local timestamp takes precedence).
- **Persistence:** `getPersisted` reads from localStorage; `setPersisted` writes to localStorage and pushes to the pod. On load (e.g. app open), local is used; pull from server is optional (e.g. to merge other devices’ changes).
- **Use case:** User wants to work offline-first and treat the pod as a backup or shareable copy. Edits are made in the app; the server is updated from the browser.

### Server as authority (user choice once pod is established)

- **Source of truth:** The pod (remote Solid server). The browser is a **cache** or offline mirror.
- **Sync:** **Pull from server first** (on load or when coming online) to populate or refresh local state. Push local changes to the server; after push, **server wins on conflict** (e.g. pull again to accept server state, or use server response as canonical). If the user edited on another device or another app wrote to the pod, that data is treated as truth when pulling.
- **Persistence:** `getPersisted` can **fetch from the pod** (when pod connected and server-authority mode), transform LDP → Store, and optionally merge with or overwrite local cache. `setPersisted` writes to localStorage and pushes to the pod; in server-authority mode, consider **pulling after write** (or using server response) so the store reflects server state (e.g. normalized IRIs or server-side updates).
- **Use case:** User wants the pod to be the single source of truth (e.g. multi-device, or they use other Solid apps that write to the same pod). The app treats local as a working copy that syncs to the server; conflicts resolve in favor of the server.

### Re-evaluated decisions

| Decision | Browser authority | Server authority |
|----------|-------------------|-------------------|
| **Who is source of truth** | Browser (TinyBase) | Pod (Solid server) |
| **getPersisted (load)** | Read from localStorage; optional pull to merge | Fetch from pod (when online), transform to Store; use as canonical or merge into local cache |
| **setPersisted (save)** | Write localStorage, push to pod | Write localStorage, push to pod; optionally pull after write to accept server state |
| **Conflict policy** | Browser wins (or last-write-wins local) | Server wins (pull overwrites or merge with server priority) |
| **Offline** | Local is full copy; queue pushes when back online | Local is cache; show “offline” or stale indicator; reconcile when back online (pull from server) |
| **UX** | “Synced to pod” / “Pod is a copy” | “Using pod as main storage” / “Server is source of truth” |

The app should **store the user’s authority choice** (e.g. in settings or a small config resource) and drive sync and persistence behavior from it. Switching from browser authority to server authority (or back) should be explicit and documented (e.g. “If you switch to server as authority, next sync will pull from the pod and may overwrite local changes.”).

---

## Minimal configuration (preferred for the sync target)

When the user is **ready to sync** (they already have local data from first use), use a **hosted Solid pod** as the sync target — no server to run, no Docker, no env vars.

1. **When they want a permanent copy:** User signs up at a pod provider (e.g. [solidcommunity.net](https://solidcommunity.net/) or [pod.inrupt.com](https://pod.inrupt.com/)). They get a WebID and a pod URL (e.g. `https://yourname.solidcommunity.net/`). Until then, all data stays local; no account is required.
2. **No server setup.** The provider runs the Solid server; the user just uses their pod as the **sync target** once they’ve connected it in the app (e.g. “Connect pod” or “Sync to pod”).
3. **Sync layer (must-have once pod is connected):** The app syncs with this pod (see **Strategy 3: Sync layer**). Initial sync is full export → transform → PUT. By default the browser remains the authority; the user can optionally switch to **server as authority** (e.g. “Use pod as main storage”) so the pod becomes the source of truth. No reverse proxy, no TLS, no containers on the user’s side.

**Next step up (still minimal):** If the user needs to *self-host* the sync target, they can use a **PaaS** that runs a pre-built Solid server (e.g. Community Solid Server on Railway, Render, Fly.io). One app, one or two env vars, pod URL. The same sync layer in the browser targets that URL.

The rest of this doc details sync design, where the target can live, and implementation order — all in the context of **start local, sync later**.

---

## What We Have to Work With

- **Vocabularies:** FOAF, vCard, Dublin Core, W3C Org, Solid (`@inrupt/vocab-*`) — already aligned with Solid/JSON-LD.
- **Export:** `exportStore()` produces a JSON snapshot (tables + values) that can be validated and transformed.
- **Data shape:** Rows keyed by `@id` (IRIs); cells use vocabulary URIs. Easy to map to LDP resources (Turtle or JSON-LD) with a fixed base URL (e.g. `https://pod.example.com/`).
- **No LDP today:** The app does not implement LDP HTTP (GET/PUT/POST/DELETE on resources and containers). Adding a server gives you that.

---

## Technical paths using TinyBase persisters and synchronizers

TinyBase provides [persisters](https://tinybase.org/api/persisters/) (save/load Store data) and [synchronizers](https://tinybase.org/api/synchronizers/) (sync MergeableStore between peers). Solid servers speak **LDP** (GET/PUT/POST on RDF resources), not TinyBase’s native JSON format, so we need either a **custom persister** that talks LDP from the browser, or an **adapter** that speaks TinyBase protocol and translates to/from LDP. Below are viable paths; all assume **start local** (local persistence from first load), then **sync later** when the user connects a pod. Authority is **configurable**: browser is the default; the user can make the server the authority once the pod is established. Sync is a must-have once a pod is connected.

How **authority mode** affects each path (see [Authority mode: browser vs server](#authority-mode-browser-vs-server)):

- **getPersisted (load):** Browser authority → read local first; optional pull to merge (browser wins). Server authority → fetch from pod when online and use as canonical; offline → fall back to local cache.
- **setPersisted (save):** Both write local and push to pod; server authority may pull after write so local reflects server state.
- **Underlying changes (pull / listener):** Browser authority → merge into local with browser wins. Server authority → overwrite or merge with server priority; show offline/stale when not in sync.

---

### Path A: Custom persister (browser → LDP, no adapter server)

Use [createCustomPersister](https://tinybase.org/api/persisters/functions/creation/createcustompersister/) so that the **single** persistence layer is "local storage + sync to Solid". One persister implements both local read/write and LDP push/pull; **authority mode is fully under your control** in the same code path.

**Mechanics:**

- **getPersisted:** **First use (no pod):** read from localStorage only. **Pod connected — browser authority:** read from localStorage; optionally poll pod (e.g. ETag/manifest), merge into local with conflict policy browser wins. **Pod connected — server authority:** when online, fetch from pod (LDP GET), transform LDP → Store, use as canonical and optionally refresh local cache; when offline, read from localStorage cache and treat as stale.
- **setPersisted:** Always write to localStorage (first use needs no pod). When pod connected, also transform Store → RDF and LDP PUT (or PATCH) to the pod. **Server authority:** after push, optionally fetch pod again and update local from response so store reflects server state (normalized IRIs, server-side changes).
- **addPersisterListener / delPersisterListener:** Only when pod connected: poll pod (or manifest), compare ETag/hash; if changed, fetch full state from Solid, transform to Store. **Browser authority:** merge into local (browser wins or last-write-wins). **Server authority:** overwrite local or merge with server priority, then call `listener()`. Clear interval in `delPersisterListener`.

**Effect of authority flows:** Switching authority is a single branch in the persister: who is read on getPersisted, who wins on merge, and whether pull-after-push runs on setPersisted. No second persister to coordinate; offline behavior (local full copy vs cache + stale) is explicit in the same logic.

**Pros:** No extra server; one persister; first use is local-only; supports both authority modes in one place; CORS/auth only when pod configured. **Cons:** CORS and auth must work from the browser to the Solid pod; you implement Store ↔ LDP transform and authority-aware get/set/listener. **Ref:** [Custom Persistence](https://tinybase.org/guides/persistence/custom-persistence/).

### Path B: LocalPersister + RemotePersister to an adapter (two persisters)

TinyBase can attach [multiple persisters](https://tinybase.org/api/persisters/) to the same store. [LocalPersister](https://tinybase.org/api/persister-browser/) (localStorage) plus [createRemotePersister](https://tinybase.org/api/persister-remote/functions/creation/createremotepersister/) pointing at **your adapter backend**. The adapter exposes **loadUrl** (GET → Store JSON) and **saveUrl** (POST Store JSON), and translates to/from the Solid pod (LDP). **Authority affects which persister drives load and how auto-load interacts with local.**

**Mechanics:**

- **LocalPersister:** Always attached for local read/write (first use and offline). Load/save order and conflict behavior depend on authority and whether RemotePersister auto-load is on.
- **RemotePersister:** `startAutoSave()` pushes local changes to the adapter (and thus to the pod). Adapter **loadUrl:** GET from Solid pod, RDF → Store JSON, return. **saveUrl:** receive Store JSON, map to RDF, LDP PUT to pod. See [RemotePersister](https://tinybase.org/api/persister-remote/interfaces/persister/remotepersister/).
- **Browser authority:** Local is source of truth. Use `startAutoLoad()` only if you want pull (e.g. multi-tab or seed-from-pod); when remote load runs, merge into store with browser wins (or ignore if local is newer). Adapter is a mirror of what the browser pushes.
- **Server authority:** Adapter (and thus pod) is source of truth. On app load, **load from remote first** (or ensure RemotePersister load runs before or overrides local): adapter fetches pod, returns Store JSON; that becomes the initial store content. Use `startAutoLoad()` so periodic pull from adapter refreshes local; when remote and local differ, **server wins** — overwrite or merge with server priority. After save, optional extra GET from adapter so local sees server state.

**Effect of authority flows:** With two persisters, **load order and conflict policy** must be explicit. Browser authority: local loads first; remote is optional pull, browser wins. Server authority: remote must be the canonical source on load (e.g. load from remote when online first); auto-load must overwrite/merge with server priority. The **browser** decides whether to prefer local or remote on load and on conflict (e.g. by attaching persisters in an order or by controlling when load results are applied). If the RemotePersister API does not let you express "load from remote first, then use as canonical," you may need a thin wrapper or a custom load sequence that fetches from adapter and sets store content before LocalPersister runs.

**Pros:** Uses built-in RemotePersister; adapter is a small, well-defined service (Store JSON ↔ LDP). **Cons:** You run and host the adapter; two persisters require clear load/conflict rules per authority mode; browser must authenticate to adapter (adapter to Solid). **Ref:** [RemotePersister](https://tinybase.org/api/persister-remote/interfaces/persister/remotepersister/).

### Path C: MergeableStore + createCustomSynchronizer (peer sync via custom transport)

[Synchronizers](https://tinybase.org/api/synchronizers/) work with [MergeableStore](https://tinybase.org/api/mergeable-store/interfaces/mergeable/mergeablestore/) only (not plain Store) and use a message-based protocol ([Message](https://tinybase.org/api/synchronizers/enumerations/synchronization/message/) enum, [Send](https://tinybase.org/api/synchronizers/type-aliases/synchronization/send/) / Receive). Use [createCustomSynchronizer](https://tinybase.org/api/synchronizers/functions/creation/createcustomsynchronizer/) to send/receive over your own transport (e.g. HTTP long-poll or WebSocket to your backend). The backend holds a representation of the store (or talks to the pod) and participates in the TinyBase sync protocol. **Authority determines where the backend sources truth (browser vs pod) and who wins on conflict.**

**Mechanics:**

- **Browser:** MergeableStore + LocalPersister (local persistence). Custom synchronizer: `send(toClientId, requestId, message, body)` posts to backend; `registerReceive(receive)` gets responses. Backend implements TinyBase sync protocol: applies incoming changes to its state, writes to Solid (LDP); sends back changes from its state (or from pod) via `receive(...)`.
- **Browser authority:** Backend is a **mirror** of browser state. Backend accepts browser updates, writes them to the pod, and may send back acknowledgments or merged state; conflict resolution in the sync protocol can favor the browser (e.g. last-write-wins from browser). Pull from backend is optional (e.g. other tabs/devices); when backend sends state, merge with browser wins.
- **Server authority:** Backend (and pod) is **source of truth**. On connect (or when coming online), backend loads from pod and sends full state (or deltas) to the browser via `receive(...)`; MergeableStore applies with **server priority** on conflict. Local edits are pushed to backend → pod; after push, backend may send updated state from pod so browser reflects server. If another app or device wrote to the pod, backend fetches pod and pushes to browser; server wins on conflict.

**Effect of authority flows:** The sync protocol is symmetric (messages both ways); authority is implemented **in the backend and in conflict resolution**. Browser authority: backend persists what the browser sends and writes to pod; conflicts resolved so browser wins. Server authority: backend sources state from the pod, pushes to browser on connect and when pod changes; conflicts resolved so server wins. MergeableStore metadata helps with merge; your sync layer must map "server wins" or "browser wins" into the protocol (e.g. which side's state is applied when both changed).

**Pros:** Built-in merge/conflict metadata (MergeableStore); multi-device / multi-tab sync; both authority modes possible by backend behavior and conflict policy. **Cons:** Requires MergeableStore; implement full TinyBase sync protocol on backend and LDP mapping; backend must handle two modes (mirror vs pod-as-truth). **Ref:** [Synchronization](https://tinybase.org/guides/synchronization/), [Using A Synchronizer](https://tinybase.org/guides/synchronization/using-a-synchronizer/).

### Summary

| Path | TinyBase API | Extra server? | Store type | Authority: how flows affect the path |
|------|--------------|---------------|------------|--------------------------------------|
| **A** | createCustomPersister | No | Store | Single persister; authority = branch in getPersisted/setPersisted/listener (who is read, who wins, pull-after-push). |
| **B** | LocalPersister + createRemotePersister | Yes (adapter) | Store | Two persisters; authority = load order and conflict policy (local first vs remote first, browser vs server wins); may need explicit load sequence for server authority. |
| **C** | createCustomSynchronizer + (e.g.) LocalPersister | Yes (protocol server) | MergeableStore | Sync protocol; authority = where backend sources truth (local vs pod) and who wins in merge; backend implements both modes. |

For **minimal configuration**, Path A needs no extra server and supports both authority modes in one persister. Path B requires an adapter and clear load/conflict rules for each mode. Path C requires a sync-protocol server and MergeableStore; authority is expressed in backend behavior and conflict resolution.

---

## Server integration and access: provider expectations and examples

Auth and LDP access are needed **only when the user has chosen to connect a pod** (see [Required workflow: start local, sync later](#required-workflow-start-local-sync-later)). Until then, the app uses only local storage. When the user does connect a pod, the browser (or an adapter) integrates as follows; provider expectations depend on the provider. All Solid-compliant pods expect **Solid-OIDC** (Authorization Code + PKCE, DPoP for requests) and **LDP** (GET/PUT/POST/PATCH/DELETE on resources and containers). Content types: `application/ld+json` or `text/turtle`. CORS must allow your app origin for authenticated requests (hosted providers typically do; self-hosted may require config).

### Common expectations (all providers)

- **Auth:** [Solid-OIDC](https://solid.github.io/solid-oidc/primer/): user logs in at an **OpenID Provider (OP)**; app gets an **ID token** and **access token** (and optionally **refresh token**). Requests to the pod include a **DPoP** proof (signed JWT per request) and `Authorization: Bearer <access_token>`. The OP URL is either user-entered or read from the user’s WebID profile (`GET <webid-doc>`, then parse `solid:oidcIssuer`).
- **Redirect URL:** Must be a **static** URL (same for every login). Do not use `window.location.href` if it varies by route; use e.g. `new URL('/callback', window.location.origin).toString()`.
- **LDP:** Resources have URLs; containers have trailing slash. Create: `PUT <pod>/path/to/resource` or `POST <pod>/container/` (server assigns URL). Read: `GET <pod>/path/to/resource` with `Accept: application/ld+json` or `text/turtle`. Update: `PUT` (overwrite) or `PATCH`. Delete: `DELETE`. The pod root and standard paths (e.g. `/profile/card`, `/contacts/`) follow [Solid pod layout](https://solidproject.org/TR/protocol#storage).

### Inrupt (pod.inrupt.com / login.inrupt.com)

**Expectations:** Inrupt hosts the IdP and pod storage. Use [@inrupt/solid-client-authn-browser](https://docs.inrupt.com/developer-tools/api/javascript/solid-client-authn-browser/) for login and an authenticated `fetch`; use [@inrupt/solid-client](https://inrupt.github.io/solid-client-js/) for LDP read/write (or raw `fetch` with the same tokens).

**OIDC issuer:** `https://login.inrupt.com` (or discover from WebID: `GET <webid>`, parse `solid:oidcIssuer`).

**Example — start login (browser):**

```ts
import { login, getDefaultSession } from '@inrupt/solid-client-authn-browser';

async function startLogin() {
  if (!getDefaultSession().info.isLoggedIn) {
    await login({
      oidcIssuer: 'https://login.inrupt.com',
      redirectUrl: new URL('/callback', window.location.origin).toString(),
      clientName: 'tb-solid-pod',
    });
  }
}
```

**Example — complete login on redirect (callback page):**

```ts
import { handleIncomingRedirect } from '@inrupt/solid-client-authn-browser';

await handleIncomingRedirect();
```

**Example — read/write pod (authenticated):**

```ts
import { getDefaultSession } from '@inrupt/solid-client-authn-browser';
import { getSolidDataset, saveSolidDatasetAt, createSolidDataset, createThing, setThing } from '@inrupt/solid-client';

const { fetch } = getDefaultSession();
const podRoot = 'https://storage.inrupt.com/<username>/';  // or getPodUrlAll(webId)

// Read a resource (e.g. profile or a custom doc)
const profile = await getSolidDataset(`${podRoot}profile/card`, { fetch });

// Create/update and save (e.g. a contacts index)
const dataset = createSolidDataset();
const thing = createThing({ url: `${podRoot}contacts/index.ttl#contact-1` });
// ... add properties with addStringNoLocale etc.
const updated = setThing(dataset, thing);
await saveSolidDatasetAt(`${podRoot}contacts/index.ttl`, updated, { fetch });
```

**Pod URL:** User gets it after signup (e.g. `https://storage.inrupt.com/<username>/`). You can also resolve from WebID with `getPodUrlAll(webId)` from `@inrupt/solid-client`.

---

### solidcommunity.net (and similar community pods)

**Expectations:** Same Solid-OIDC and LDP as above. The **OIDC issuer** is often the pod host itself (e.g. `https://<username>.solidcommunity.net`) or a shared IdP; discover it from the user’s WebID document: `GET https://<username>.solidcommunity.net/profile/card` (or the WebID URL), parse `solid:oidcIssuer`.

**Example — discover issuer from WebID:**

```ts
// User provides WebID, e.g. https://alice.solidcommunity.net/profile/card#me
const webId = 'https://alice.solidcommunity.net/profile/card#me';
const profileUrl = webId.split('#')[0];  // https://alice.solidcommunity.net/profile/card
const res = await fetch(profileUrl, { headers: { Accept: 'application/ld+json' } });
const json = await res.json();
// In JSON-LD, oidcIssuer is typically under @graph or as a property of the profile node
const issuer = json['http://www.w3.org/ns/solid/terms#oidcIssuer']?.['@id']
  ?? json.oidcIssuer?.id ?? new URL(webId).origin;  // fallback: pod root
```

**Example — login with discovered issuer:**

```ts
await login({
  oidcIssuer: issuer,  // e.g. https://alice.solidcommunity.net
  redirectUrl: new URL('/callback', window.location.origin).toString(),
  clientName: 'tb-solid-pod',
});
```

**Pod URL:** Base URL of the WebID document, e.g. `https://alice.solidcommunity.net/`. LDP paths: `/profile/card`, `/contacts/`, `/settings/`, etc.

---

### Community Solid Server (self-hosted)

**Expectations:** CSS can run with a built-in Identity Provider or an external one. The **OIDC issuer** is the server’s base URL (e.g. `https://solid.example.com`) or the configured IdP URL. Browser flow is the same: `login({ oidcIssuer, redirectUrl })`, then use session `fetch` for LDP.

**Requirements:** Your app’s origin must be allowed for CORS. CSS config (e.g. Components.js or env) may need to list your app origin. For **server-side adapter** (Path B), the adapter must obtain a token (e.g. client credentials or a stored refresh token) and send it when calling the pod; see [CSS client credentials](https://communitysolidserver.github.io/CommunitySolidServer/7.x/usage/client-credentials/) for non-browser access.

**Example — browser talking to self-hosted CSS:**

Same as above: use `oidcIssuer: 'https://solid.example.com'` (or your CSS URL), then `getSolidDataset` / `saveSolidDatasetAt` with session `fetch` and pod root `https://solid.example.com/<username>/`.

---

### Adapter backend (Path B: RemotePersister → Solid)

If you use **Path B** (adapter that speaks TinyBase protocol and LDP), the adapter runs on your infrastructure and must:

1. **Expose TinyBase-expected endpoints:**  
   - **GET** *loadUrl* → return Store JSON (tables + values).  
   - **POST** *saveUrl* (or **PUT**) → accept Store JSON in the body.

2. **Authenticate to the user’s pod:**  
   - Option A: Browser sends a token (e.g. access token or refresh token) to the adapter (e.g. in a header or cookie); adapter uses it for LDP requests to the pod (with DPoP if the pod requires it).  
   - Option B: Adapter uses client credentials or a service account that has access to the user’s pod (less common for multi-tenant).

3. **Translate Store JSON ↔ LDP:**  
   - On GET loadUrl: adapter fetches from the pod (e.g. GET `/profile/card`, GET `/contacts/index.ttl`, GET `/groups/index.ttl`, etc.), maps RDF to your Store shape, returns `[tables, values]` as JSON.  
   - On POST saveUrl: adapter receives Store JSON, maps tables/values to RDF, PUTs to the corresponding pod URLs.

**Example — adapter GET loadUrl (pseudocode):**

```ts
// GET /api/pod/load
const podRoot = userPodUrl;  // from session or config
const fetch = getAuthenticatedFetch(userAccessToken);  // DPoP-aware fetch
const [profile, contacts, groups] = await Promise.all([
  getSolidDataset(`${podRoot}profile/card`, { fetch }),
  getSolidDataset(`${podRoot}contacts/index.ttl`, { fetch }).catch(() => null),
  getSolidDataset(`${podRoot}groups/index.ttl`, { fetch }).catch(() => null),
]);
const tables = { personas: {...}, contacts: {...}, groups: {...}, ... };  // RDF → Store shape
const values = { defaultPersonaId: '...' };
res.json([tables, values]);  // TinyBase load format
```

**Example — adapter POST saveUrl (pseudocode):**

```ts
// POST /api/pod/save
const [tables, values] = req.body;  // TinyBase content
const podRoot = userPodUrl;
const fetch = getAuthenticatedFetch(userAccessToken);
// Map tables to RDF datasets, then:
await saveSolidDatasetAt(`${podRoot}profile/card`, personaDataset, { fetch });
await saveSolidDatasetAt(`${podRoot}contacts/index.ttl`, contactDataset, { fetch });
// ...
res.sendStatus(204);
```

---

### LDP URL layout (mapping our data to the pod)

Use a consistent layout so the same mapping works for one-off publish and for the sync layer (Path A or B). Example:

| Our table / concept | LDP URL (example) |
|---------------------|-------------------|
| Default persona (profile) | `{podRoot}profile/card` |
| Other personas | `{podRoot}personas/{id}.ttl` or in one doc with fragments |
| Contacts | `{podRoot}contacts/index.ttl` (one dataset) or `{podRoot}contacts/{id}.ttl` per contact |
| Groups | `{podRoot}groups/index.ttl` or `{podRoot}groups/{id}.ttl` |
| Type indexes | `{podRoot}settings/type-index.ttl` or Solid-standard type index URLs |
| Values (e.g. defaultPersonaId) | Store in a small settings resource, e.g. `{podRoot}settings/preferences.ttl` |

Use `Accept: application/ld+json` or `text/turtle` and `Content-Type: application/ld+json` or `text/turtle` when reading/writing so the server returns and accepts RDF.

---

## Strategy 1: Sync target — self-hosted Solid server

Run a **Community Solid Server (CSS)** or **Node Solid Server (NSS)** on a host. This is the **sync target** (or, if the user chooses server as authority, the **source of truth**). By default the browser (TinyBase) is the authority; the user can optionally switch to server as authority (Strategy 3). The sync layer pushes (and optionally pulls) to this server.

| Option | Pros | Cons |
|--------|------|------|
| **Community Solid Server (CSS)** | Actively maintained, multi-user, WAC, configurable storage backends | Heavier; need to map our data model to LDP container/resource layout |
| **Node Solid Server (NSS)** | Mature, single-user or multi-user, well-documented | Older codebase; some migration to CSS in the ecosystem |

**Where to run:**

- **VPS / cloud VM:** e.g. DigitalOcean, Hetzner, AWS EC2, GCP Compute. Install Node, run CSS/NSS, reverse proxy (Caddy/Nginx) for TLS and optional custom domain.
- **Docker / Compose:** Official or community images for CSS; any host (VPS, home server, NAS). Persist volume for pod data.
- **Kubernetes:** Multi-tenant or HA; CSS + persistent volume + Ingress.
- **PaaS:** Railway, Render, Fly.io; attach persistent storage. Minimal config; same sync layer in the browser targets this URL.

**Data flow (start local, sync later):** The user works locally first (no server). When they connect this server as their pod, the sync layer (Strategy 3) runs: initial seed is export from browser → transform → LDP PUTs; ongoing sync pushes changes from TinyBase to the server and optionally pulls and merges (with a defined conflict policy). Use standard Solid pod layout (e.g. `/profile/card`, `/contacts/`, `/groups/`, type index URLs) so the mapping is consistent and federation works.

---

## Strategy 2: Sync target — hosted pod (minimal config)

Use a **hosted Solid pod provider** so the user doesn’t run a server. **This is the minimal-config sync target when the user is ready to sync:** they sign up, get a WebID and pod URL; the sync layer (Strategy 3) then pushes existing local data (and ongoing changes) from the browser to this pod. By default the browser remains the authority; the user can optionally make the pod the authority (Strategy 3).

| Option | Pros | Cons |
|--------|------|------|
| **solidcommunity.net** (and similar) | Free pods, WebID, LDP; good for trying federation | Shared infrastructure; limits and policies apply |
| **Inrupt Enterprise Solid Server (ESS)** | Enterprise support, SLA | Commercial; overkill for personal/side projects |
| **Other community pod providers** | No server maintenance | Trust and data residency; check their terms |

**Workflow (start local, sync later):** The user uses the app locally first (no account). When they want a permanent copy, they create a pod (e.g. at solidcommunity.net → `https://user.solidcommunity.net/`) and get a WebID. In the app, they choose “Connect pod” (or similar), log in, and the **sync layer (Strategy 3)** runs: initial sync is full export → transform → LDP PUTs; ongoing sync pushes (and optionally pulls) between TinyBase and this pod. By default the hosted pod is the sync target; the user can optionally make it the source of truth (server authority). Benefit: persistent, resolvable pod with zero server admin, **when they’re ready**.

---

## Strategy 3: Sync layer (must-have) — supports browser or server authority

The **sync layer** is the core piece that, **once the user has connected a pod**, keeps the browser and the persistent Solid server in sync. **It is a must-have** for the design so that “sync later” works. It must support **both** [browser authority](#authority-mode-browser-vs-server) and [server authority](#authority-mode-browser-vs-server) (user choice once the pod is established).

**Workflow:** From first page load, the user works locally only (no sync layer active). When they choose to connect a pod (e.g. “Connect pod” / “Sync to Solid”), the app prompts for login (Solid-OIDC); after successful auth, the sync layer is enabled. **Default:** browser remains authority; sync pushes existing local data to the pod, then keeps pushing (and optionally pulling). **Optional:** User can switch to **server as authority** (e.g. “Use pod as main storage”); then the sync layer pulls from the server first, pushes local changes, and resolves conflicts in favor of the server. The user can disconnect, change pod, or switch authority mode later.

**Responsibilities:**

- **Authority-aware:** When **browser is authority:** push local state to the pod (required when pod connected); optionally pull and merge with conflict policy “browser wins” (or last-write-wins). When **server is authority:** pull from pod first (on load or when coming online); push local changes to the pod; on conflict, server wins (pull to refresh local from server).
- **Push (required when pod connected):** On a schedule, on demand (e.g. “Sync now”), or on change (debounced): read store state, map tables/values to LDP resources (same mapping as export → LDP scripts), PUT/POST to the configured Solid server base URL (hosted pod or self-hosted — Strategy 1 or 2).
- **Pull:** In browser-authority mode, pull is optional (e.g. to merge other devices’ changes). In server-authority mode, pull is **required** on load (or when coming online) so local reflects the server; after push, optionally pull again to accept server state.
- **Auth:** DPoP / OIDC (or provider-specific) when the user connects a pod, so the browser can authenticate to their pod. Design for this from the start so sync is secure and reliable when enabled.

**Sync target / source:** Any LDP-compliant Solid server — hosted pod (Strategy 2, minimal config) or self-hosted (Strategy 1). When browser is authority, the server is the sync target; when server is authority, the server is the source of truth and the browser is a cache.

**Design considerations to factor in:**

- **First sync:** When the user first connects a pod, the “initial seed” is full export → transform → LDP PUTs (all existing local data). If the user later switches to server authority, the next sync should pull from the server and may overwrite or merge with local (with clear UX: “Server will become source of truth”).
- **Push frequency:** On save, on interval, or manual “Sync now.” Trade off freshness vs. request volume and offline behavior.
- **Conflict policy:** Depends on authority mode — see [Authority mode: browser vs server](#authority-mode-browser-vs-server). Document and implement explicitly for both modes.
- **Offline / backpressure:** Queue pushes when offline; retry and reconcile when back online. In server-authority mode, show offline or stale state when local cache is not in sync with server. Server errors (4xx/5xx) should not drop data; retry or surface to user.

---

## Strategy 4: Sync target — thin LDP server (custom)

Implement a **minimal LDP-compliant server** as a **sync target** (or source of truth if the user chooses server authority) that stores and serves data in a shape close to our current model. The same sync layer (Strategy 3) pushes from the browser to this server; by default the browser is the authority, and the user can optionally switch to server as authority.

**Idea:**

- HTTP server (Node, Deno, etc.) implementing LDP Basic Container + Resource (GET, PUT, POST, DELETE; Turtle or JSON-LD).
- Storage: filesystem (one file per resource) or DB (SQLite/Postgres). Map our tables to URLs: e.g. `personas` → `/personas/<id>`, `contacts` → `/contacts/<id>`, `groups` → `/groups/<id>`, with a container per type.
- v1: optional “API key” or cookie for single-user auth; no WAC/OIDC. Add later if needed.

**Where to run:** Same as Strategy 1 (VPS, Docker, PaaS). **Pros:** Full control; storage can mirror our TinyBase/export shape; easy “import from tb-solid-pod export” endpoint. **Cons:** You own security and spec gaps. **Best for:** A dedicated sync target that matches this app’s data model exactly.

---

---
## Strategy 6: Sync target — managed DB (Supabase, SQLite/Fly.io, PocketBase)

Use a **managed database or backend-as-a-service** as the **persistence layer** for your sync target. These are **not** LDP/Solid servers out of the box; there are no turnkey "Solid server backed by Supabase/PocketBase" packages. You either (1) build an **adapter** that speaks your app's sync protocol (e.g. Store JSON) and talks to the managed DB's REST API, or (2) run a **thin LDP server** (Strategy 4) that uses the managed DB as its storage backend. The same [authority and sync concepts](#authority-mode-browser-vs-server) apply: browser or server as authority, push/pull, conflict policy.

### Options

| Backend | Storage | API | Realtime | Libraries / hosting | LDP? |
|--------|---------|-----|----------|--------------------|------|
| **Supabase** | Postgres (hosted or self-hosted) | REST (PostgREST), Auth | Yes (websockets) | [Supabase JS client](https://supabase.com/docs/reference/javascript); deploy on Supabase Cloud or self-host | No; use as adapter backend or thin LDP storage |
| **SQLite (e.g. Fly.io)** | SQLite file | Your server's API (LDP or custom) | Your choice | [Fly.io](https://fly.io/) — [Machines](https://fly.io/), [Volumes](https://fly.io/docs/volumes/) for persistent disk; run CSS (file backend), PocketBase, or your thin LDP server | Only if you run an LDP server on top (e.g. Strategy 4) |
| **PocketBase** | SQLite (single file) | REST + Realtime (SSE) | Yes (SSE subscriptions) | [PocketBase](https://pocketbase.io/) — single Go binary, [JS SDK](https://pocketbase.io/docs/api-realtime/); deploy on [Fly.io](https://fly.io/), Railway, Render, VPS | No; use as adapter backend or thin LDP storage |

### Adapter approach (no LDP)

- **Flow:** Browser ↔ TinyBase ↔ sync layer ↔ **your adapter backend** ↔ managed DB (Supabase / PocketBase / SQLite-backed API). The adapter exposes load/save (e.g. TinyBase RemotePersister-style or custom REST). It maps Store JSON (or table-shaped JSON) to the provider's API: Supabase tables, PocketBase collections, or your own SQLite schema.
- **PocketBase:** Define collections (e.g. `personas`, `contacts`, `groups`); adapter receives Store JSON, maps to records, uses [PocketBase JS SDK](https://pocketbase.io/docs/) to create/update/delete. On load, adapter reads collections and returns Store JSON. Optional: use PocketBase Realtime (SSE) to push server changes to the browser. Single binary + SQLite file; persist with a volume on [Fly.io](https://fly.io/) or similar.
- **Supabase:** Same idea: adapter maps Store → Postgres tables via [Supabase client](https://supabase.com/docs/reference/javascript); optional Realtime for push. Hosted Supabase or self-hosted.
- **Pros:** No LDP/WebID to implement; use familiar REST/SDK; managed DB handles scaling, backups, auth (provider auth, not Solid-OIDC). **Cons:** Not a Solid pod; no federation or WebID resolution unless you add a separate LDP layer.

### Thin LDP server backed by managed DB

- **Flow:** Browser ↔ sync layer ↔ **thin LDP server** (Strategy 4 style) ↔ managed DB. The server implements LDP GET/PUT/POST/DELETE and stores resources in Supabase (e.g. one row per resource, or JSON/JSONB), PocketBase (e.g. one collection per resource type, or one collection with path as key), or SQLite. You implement the LDP ↔ DB mapping; no off-the-shelf Solid server uses PocketBase/Supabase as a storage backend today.
- **LDP/RDF-to-SQL and Solid server + DB:** In the broader ecosystem there are RDF-to-SQL storage libraries (e.g. [RDFLib-SQLAlchemy](https://github.com/RDFLib/rdflib-sqlalchemy) for persisting RDF triples in a SQL DB via SQLAlchemy). These give you an RDF store over SQL, not a full LDP server by themselves—you’d build a thin LDP server that uses such a store. [Community Solid Server (CSS)](https://communitysolidserver.github.io/CommunitySolidServer/7.x/usage/starting-server/) supports file-based, in-memory, and SPARQL backends and allows custom storage components; community adapters exist for [Dgraph](https://github.com/comake/solid-dgraph) and [Redis](https://github.com/comake/solid-redis). There is no official or widely used CSS (or other Solid) storage backend for Supabase, PocketBase, or generic Postgres/SQLite. No documented rationale was found for why CSS does not ship official SQL/Postgres/SQLite backends (the default set is file, in-memory, and SPARQL). So for those you either use the **adapter approach** (no LDP) or **build a thin LDP server** (or a custom CSS storage component) that uses the provider’s client/SDK or an RDF-to-SQL store.

### Hosting (Fly.io, Railway, Render, etc.)

- **[Fly.io](https://fly.io/):** Run your adapter or thin LDP server as a [Fly Machine](https://fly.io/); attach a [Volume](https://fly.io/docs/volumes/) for SQLite (e.g. PocketBase or your own server). No special "Solid + Fly" library; you deploy your Node/Go/etc. app and persist the DB file on the volume. [Fly Postgres](https://fly.io/docs/postgres/) is an option if you prefer Postgres over SQLite.
- **Railway / Render:** Same idea: deploy the adapter or thin server; attach Postgres (Railway/Render offer managed Postgres) or persist a SQLite file (if the platform supports writable disk or external storage).
- **PocketBase on Fly.io:** One common setup: run PocketBase binary, mount a volume for `pb_data` (SQLite); expose HTTP. Your adapter (separate service or same host) talks to PocketBase API and to the browser (Store JSON load/save).

### Summary

- **Managed DB (Supabase, SQLite/Fly.io, PocketBase)** gives you persistent, scalable storage without running a full Solid stack. **Back-and-forth** is implemented by **you**: either an adapter (Store JSON ↔ provider API) or a thin LDP server that uses the DB as storage. RDF-to-SQL libraries (e.g. RDFLib-SQLAlchemy) and CSS custom backends (Dgraph, Redis) exist, but there is no turnkey LDP/Solid server backed by Supabase, PocketBase, or generic Postgres/SQLite; you’d implement a custom storage component or thin LDP server.
- **PocketBase** is a good fit for a simple, single-file backend with SQLite and Realtime; use it as the persistence layer behind your adapter or behind a thin LDP server. **Supabase** fits if you want Postgres and a rich REST/Realtime API. **Fly.io** is a practical place to host the server (adapter or thin LDP) and, if you use SQLite, to attach a volume for the DB file.

---
## Strategy 5: Stepping stone — one-off “Publish to pod”

Before implementing full sync (Strategy 3), a **one-off “Publish to pod”** (or “Back up to Solid server”) action is a useful stepping stone: same export → transform → LDP PUTs, but no continuous sync.

**Flow:** User has been working locally; when they want a permanent copy, they click “Publish to pod” (or “Connect pod”). App exports store, prompts for pod URL + auth; client (or small backend) transforms to LDP and PUTs to the user’s pod (hosted or self-hosted). Each run is a snapshot; optionally “Overwrite” or “Merge.” **Where the server lives:** Any (Strategy 1 or 2). This validates the mapping and auth path when the user first connects; then add the sync layer (Strategy 3) for ongoing sync.

---

## Comparison

| Strategy | Role | Ops burden | Standards | Notes |
|----------|------|------------|-----------|--------|
| **3. Sync layer** | **Must-have** (browser ↔ server; supports browser or server authority) | N/A (in-app) | Full (LDP client) | Core design; push required; pull and conflict policy depend on authority mode. |
| 2. Hosted pod | Sync target | None | Full | Minimal-config target; preferred. |
| 1. Self-hosted server | Sync target | Medium | Full | When you need to own the server. |
| 4. Thin LDP server | Sync target | Medium (build + host) | LDP only | Custom target, same data model. |
| 6. Managed DB (Supabase, SQLite/Fly.io, PocketBase) | Sync target (adapter or thin LDP) | Low–medium (adapter + host, or thin LDP + DB) | Custom or LDP | No turnkey Solid+DB; adapter (Store JSON ↔ API) or thin LDP backed by DB; PocketBase/Supabase/Fly.io. |
| 5. One-off publish | Stepping stone | Low | Full | Validates mapping/auth before full sync. |

---

## Suggested order (start local, sync later)

1. **First use: no pod required (required workflow)** — From first page load, the user can add personas, contacts, groups, and other Solid-style data. Everything is stored locally (TinyBase + localStorage). No account, no login, no Solid server. The app must support this from day one.
2. **When the user wants a permanent copy: choose the sync target (Strategy 2 preferred)** — User signs up at a hosted pod (e.g. solidcommunity.net) and gets a WebID and pod URL. In the app, they use “Connect pod” (or similar) and log in once.
3. **Validate mapping with one-off publish (Strategy 5)** — Before or alongside full sync, implement export → transform → LDP PUTs (e.g. “Publish to pod” in the app). Confirms vocabularies and auth against the chosen target when the user first connects.
4. **Implement the sync layer (Strategy 3, must-have)** — Once a pod is connected, the sync module pushes existing local data (initial seed) and then ongoing changes to the pod (on demand, on interval, or on change). Auth (DPoP/OIDC) is used when the user connects. Support **browser authority** (default) and **server authority** (user choice): define conflict policy for each mode (browser wins vs server wins); add pull and authority-aware getPersisted/setPersisted when server is authority.
5. **Harden and optimize** — Offline queue, retries, incremental sync (e.g. track last-synced state), and clear UX (e.g. “Synced just now” / “Sync failed” / “Not connected to a pod” / “Using pod as main storage”).

Self-hosting the target (Strategy 1, 4, or 6) is optional and can replace the hosted pod (Strategy 2) if the user wants to run the server themselves; for Strategy 6 (managed DB), the sync layer talks to your adapter or thin LDP server, not to an LDP pod directly, unless you implement LDP on top. The critical path remains: **use the app locally first, then connect a pod (or managed DB backend) and sync when ready; optionally let the user make the server the authority once the pod is established.**

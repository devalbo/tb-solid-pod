# Document-sharing scenarios

This doc describes how **tb-solid-pod** supports applications where users share document-oriented data. It covers Solid-style sharing (pod URLs, WAC) and ad hoc peer-to-peer (export/import). For core principles (local-first, data sovereignty, interoperability), see [PRINCIPLES_AND_GOALS.md](PRINCIPLES_AND_GOALS.md). For what the library does *not* provide, see [SHORTCOMINGS.md](SHORTCOMINGS.md).

**Terms:** **Document-oriented data** = files, folders, and metadata (title, author, description). **P2P** = ad hoc sharing without a server (export/import, QR, messenger).

---

## What enables sharing

The library's data model supports sharing scenarios (see [PRINCIPLES_AND_GOALS.md](PRINCIPLES_AND_GOALS.md) for why):

| Data | Sharing role |
|------|--------------|
| **Personas** | Author attribution; designating share targets by identity. |
| **Contacts** | Natural recipients; map to WebIDs when syncing to a pod. |
| **Groups** | "Share with team"; membership defines the audience. |
| **Resources** | Documents with metadata; same shape locally and on LDP. |
| **Export/import** | Portable JSON for ad hoc sharing. |
| **Vocabularies** | Interoperable data (FOAF, vCard, etc.). |

**Not provided:** WAC, "shared with me" views, resolvable URLs (until synced), p2p transport. See [SHORTCOMINGS.md](SHORTCOMINGS.md).

---

## Scenario 1: Single user today—authoring and organizing for future sharing

**Goal:** User creates and organizes documents; they have a clear notion of “author” (persona) and “who I might share with” (contacts, groups). No server yet.

**What the library provides:**

- **Default persona** as “current user” for authoring. When creating a document (resource), set metadata `author` to the default persona’s `@id`. Attribution is consistent and ready for when you add sharing or sync.
- **Contacts and groups** as the future share targets. The user maintains an address book and groups; your UI can offer “Share with…” later (today you might only show “Share with: [not yet implemented]” or use these for ad hoc export).
- **Resources table** and **file metadata** (title, description, author, MIME type). Use `FileMetadataPanel` or the file schema to display and edit metadata. Documents are stored in the same shape that can later be pushed to an LDP server.
- **Folders** via `parentId` and a `byParent` index. User can organize documents in folders; structure is preserved on export and (after mapping) when syncing to a pod.

**What the app author does:**

- Use the library’s store layout (personas, contacts, groups, resources) and set document `author` from `defaultPersonaId`.
- Build UI for “my documents” and “my folders” using the resources table and index. Optionally show “Share with…” disabled or as “Export for now” (see Scenario 3).
- When you add sync (Scenario 2), the same data maps to LDP resources; when you add WAC (future), contacts/groups map to agents/groups in ACLs.

**Shortcomings:** No actual sharing or permissions yet. See [SHORTCOMINGS.md](SHORTCOMINGS.md#no-access-control-or-sharing).

---

## Scenario 2: With a Solid server—documents get URLs; share link (when WAC exists)

**Goal:** User’s data syncs to a Solid pod so documents have **resolvable URLs**. User shares a document by sending the URL to a contact. The contact opens the link; access is enforced by the **pod** (WAC) once the app or pod supports it.

**What the library provides:**

- **Same data model** (personas, contacts, groups, resources). A sync layer (not in the library; see [SOLID_SERVER_STRATEGIES.md](SOLID_SERVER_STRATEGIES.md)) can transform the store to LDP and push to the user’s pod. After sync, each document has a pod URL (e.g. `https://user.pod.example/documents/report.pdf`).
- **Contacts** may have a WebID or profile URL. When the user chooses “Share with Alice,” your app can look up Alice’s contact and use her WebID to set WAC on the pod (when your stack supports WAC). The library does not implement WAC; the pod server does.
- **Export format** is compatible with transforming to RDF/JSON-LD for LDP PUT. So the library feeds the sync layer; the sync layer is responsible for auth and LDP.

**What the app author does:**

- Implement or adopt a **sync layer** (browser → pod) as in [SOLID_SERVER_STRATEGIES.md](SOLID_SERVER_STRATEGIES.md). After sync, document URLs are known.
- **“Share” action:** Copy document URL to clipboard or open a “Share” dialog that (when WAC is available) calls the pod’s ACL API to add read/write for a contact’s WebID or a group. Today many Solid apps do “share link” and rely on the pod to enforce access when the recipient loads the URL.
- Use **groups** as “share with team”: map group membership to WebIDs or a group URL and set ACL for that group on the pod (when supported).

**Shortcomings:** The library does not implement sync, LDP, or WAC. You need a separate sync target and pod; WAC is on the pod. See [SHORTCOMINGS.md](SHORTCOMINGS.md#no-access-control-or-sharing) and [SHORTCOMINGS.md](SHORTCOMINGS.md#no-resolvable-urls-until-synced).

---

## Scenario 3: Ad hoc p2p—export and send; recipient imports

**Goal:** No Solid server (or not yet). User wants to share a document with someone **ad hoc**: export the document (or a folder) and send it via email, messenger, or link; the recipient imports it into their own pod/store.

**What the library provides:**

- **`exportStore()`** (and optional “export single document” if you implement it from the same data). Export produces JSON (tables + values) that can be validated and re-imported. The recipient can **import** into their store so the document appears in their `resources` (and metadata in their store).
- **Same schemas** on both sides. Sender and recipient both use tb-solid-pod; the imported document has the same shape (title, author, description, body/content type). You can re-map `author` to the recipient’s default persona on import if you want “imported from Alice” to become “my copy.”
- **Contacts** can be used to record “I received this from X”; you could add a custom field or a separate “shared with me” table (see shortcomings) keyed by contact.

**What the app author does:**

- **Sender:** “Share” → “Export document” (or “Export folder”) that either exports the whole store or a subset (e.g. one resource + metadata). Deliver via file download, copy-paste, or your own channel (QR, messenger, etc.).
- **Recipient:** “Import” → select file or paste JSON; call the library’s import and merge into the store. Optionally show “Imported from …” and link to a contact if you store that.
- **Optional:** If you add a simple “share link” (e.g. a data URL or a link to your app with an embedded payload), the recipient opens the link and your app imports. That’s still ad hoc p2p from the library’s perspective—no LDP, no WAC.

**Shortcomings:** No built-in p2p transport (WebRTC, etc.); no “shared with me” view; no live sync. See [SHORTCOMINGS.md](SHORTCOMINGS.md#no-built-in-p2p-transport) and [SHORTCOMINGS.md](SHORTCOMINGS.md#no-shared-with-me-view).

---

## Scenario 4: “Shared with me” and “Shared with group” (ideal; not implemented)

**Goal:** Recipient sees a list of “documents shared with me” or “documents shared with my team.” Updates (e.g. from the owner) appear when the user refreshes or when real-time sync exists.

**What the library does *not* provide:**

- **No “shared with me” table or view.** The library does not track which documents were shared with the current user by someone else. You can build a **custom table** (e.g. `sharedWithMe`: document URL, owner WebID or contact id, date) and populate it when the user imports (Scenario 3) or when you integrate with a pod’s ACL/inbox (Scenario 2). The library’s contacts and personas are still useful to show “shared by Alice” if you store Alice as a contact.
- **No WAC.** The library cannot “list documents where I have read access” from a remote pod; that would require querying the pod (or an inbox). So “shared with me” today is either: (a) local only (you recorded it on import), or (b) implemented by your app against a Solid server that supports it.
- **No real-time or multi-device sync.** So “updates appear” means: after the owner updates and syncs, the recipient would need to re-fetch or re-import (or your app implements a sync/poll step). See [SHORTCOMINGS.md](SHORTCOMINGS.md#single-user-single-device).

**What the app author can do:**

- **Local “shared with me”:** On import (Scenario 3), add a row to a custom `sharedWithMe` (or similar) table: document id, sender contact id, timestamp. Show a “Shared with me” view that reads from this table and the `resources` table. The library’s contacts give you a name/avatar for “shared by X.”
- **With a Solid server:** When your app reads from the user’s pod (e.g. inbox or ACL listing), you get “documents shared with me” from the server. The library’s store can **cache** those documents (as resources) and link them to contacts (owner) for display. The library helps with the local cache shape and with contacts/personas for attribution.

---

## Scenario summary

| Scenario | Library helps with | App author adds | Shortcomings (see SHORTCOMINGS.md) |
|----------|--------------------|-----------------|------------------------------------|
| **1. Single user, organize for later** | Personas (author), contacts/groups (future share targets), resources + metadata, folders | UI for “my docs,” “Share” placeholder or “Export” | No WAC; no sharing yet |
| **2. Solid server; share link** | Same data model; export feeds sync; contacts/groups for WebID/ACL mapping | Sync layer, “Share” (copy URL + optional WAC), pod auth | No LDP/sync/WAC in library; URLs only after sync |
| **3. Ad hoc p2p; export/import** | Export/import, same schemas both sides, contacts for “from X” | Export single doc/folder, delivery channel, import UI | No p2p transport; no “shared with me” |
| **4. “Shared with me” / “Shared with group”** | Contacts (owner), resources (cache), personas | Custom “shared with me” table or pod integration, “Shared with me” view | No built-in “shared with me”; no WAC; no real-time |

---

## Related docs

- **[PRINCIPLES_AND_GOALS.md](PRINCIPLES_AND_GOALS.md)** – Core principles: local-first, data sovereignty, interoperability.
- **[USE_CASES.md](USE_CASES.md)** – How to access and manage users, groups, and documents.
- **[SHORTCOMINGS.md](SHORTCOMINGS.md)** – What the library does *not* provide.
- **[SOLID_SERVER_STRATEGIES.md](SOLID_SERVER_STRATEGIES.md)** – How to add a sync target for resolvable URLs.

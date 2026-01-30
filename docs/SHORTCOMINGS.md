# Shortcomings for document sharing and collaboration

This document lists **shortcomings** of **tb-solid-pod** for applications where **users share document-oriented data** with one another—whether via **Solid** principles (pod URLs, access control, federation) or **ad hoc peer-to-peer** (export/import, link, custom channel). It is written for app authors who need to know what the library does *not* provide so they can plan workarounds or complementary systems.

**Terms used here:** **WAC** (Web Access Control) is Solid’s model for per-resource permissions (read/write/append for agents and groups). **LDP** (Linked Data Platform) is the W3C standard for HTTP read/write of linked data; Solid pods expose LDP. **Pod** here means a personal data store (in this library, the TinyBase store in the browser; in Solid, an online server). For scenario-level context (how the library helps despite these shortcomings), see [DOCUMENT_SHARING_SCENARIOS.md](DOCUMENT_SHARING_SCENARIOS.md).

Shortcomings are grouped below by **likely application-author desired feature sets**. For each feature set, the Solid scenarios that our implementation does *not* fulfill are listed. A cross-cutting view of **benefit to app authors** and **difficulty to implement** is in [SOLID_SERVER_STRATEGIES.md – Missing features: benefit vs difficulty](SOLID_SERVER_STRATEGIES.md#missing-features-benefit-to-app-authors-vs-difficulty-to-implement).

---

## Simplified security: Solid supports “public read, owner write”

**Yes.** Solid’s [Web Access Control (WAC)](https://solid.github.io/web-access-control-spec/) supports a **subset** that simplifies security: **publicly readable documents that only the author can update**.

- **Public read:** Grant **read** to the **public** by using the agent class **`foaf:Agent`** in an Authorization (WAC: “Allows access to any agent, i.e., the public”). Anyone can GET the resource; no authentication required for read.
- **Owner write (and control):** Grant **write** (and typically **control**) only to the **resource owner** by using **`acl:agent`** with the owner’s WebID. Only that agent can create, update, or delete the resource and its ACL.

So you do *not* need full “share with contact X” or “share with group Y” to get a useful sharing story. If your app only needs “this document is public to read; only I can edit it,” that is a standard, supported WAC pattern. The library does not implement WAC or ACLs; when you add a Solid server (see [SOLID_SERVER_STRATEGIES.md](SOLID_SERVER_STRATEGIES.md)), your sync or app layer can set ACLs to this pattern (public read + owner write) and avoid more complex permission scenarios.

---

## Solid scenarios not fulfilled, by application-author feature set

The following groups correspond to **feature sets** app authors often want. Under each, we list the **Solid (or related) scenarios that our implementation does not fulfill**.

---

### Feature set: Sharing & access control

**What app authors often want:** “Share this document with specific people or groups,” “mark as public or private,” “see what was shared with me.”

**Not fulfilled in our implementation:**

- **No WAC (Web Access Control).** The library does not implement or enforce permissions. There is no “share this document with contact X” or “share with group Y” that writes ACLs or restricts access. The data model (contacts, groups, resources) supports *designating* share targets; enforcing access is not implemented.
- **No “share with contact” or “share with group” action.** Your app can offer a “Share” button and use contacts/groups as a *list* of recipients, but the library does not perform the actual sharing (no ACL writes, no pod API calls). You must implement that when you add a Solid server or your own backend.
- **No public/private distinction.** Resources are not marked as public or private; there is no visibility flag or default ACL. If you need that, add a custom field or table and enforce it in your UI or (when available) on the server.
- **No “shared with me” view.** The library does not track which documents were shared with the current user by someone else. There is no table or API that returns “documents I have read access to” or “documents shared with me.”
- **No inbox or notification of shares.** There is no inbox, outbox, or notification mechanism for “Alice shared a document with you.” If you want a “Shared with me” list, you must implement it (e.g. a custom table populated on import, or a query to your Solid pod when you have one).

**Implication:** For “user A shares a document with user B,” you need either: (1) a Solid pod + your own sync and ACL logic, or (2) an ad hoc flow (export → send → import) that the library supports via export/import only. For “shared with me,” build a local table on import or integrate with a pod’s ACL/inbox when your stack supports it.

---

### Feature set: Link-based sharing & resolvable URLs

**What app authors often want:** “Share a link; anyone with the link can open the document,” “document has a stable URL on the web.”

**Not fulfilled in our implementation:**

- **Documents do not have HTTP URLs in the browser-only setup.** Resource rows are keyed by an internal URL/path (e.g. `https://myapp.com/pod/documents/report.pdf`), but that URL does not resolve on the public web. Nobody else can “open” it until the data is synced to an LDP server that serves that URL.
- **Sharing a “link” only works after sync.** To share a document by link, you need a sync layer that pushes the store to a Solid pod (or another server) so the document has a real, resolvable URL. The library does not provide that server or sync.
- **No LDP HTTP protocol.** The app does not implement LDP (GET/PUT/POST/DELETE on resources and containers). Resolvable URLs and link-based sharing require a server that exposes LDP (or equivalent); the library only provides the data shape and export format.

**Implication:** For link-based sharing (Solid style), you must add a sync target and implement sync; see [SOLID_SERVER_STRATEGIES.md](SOLID_SERVER_STRATEGIES.md).

---

### Feature set: Multi-device & multi-user

**What app authors often want:** “Same data on my phone and laptop,” “work offline and sync when back online,” “multiple people edit the same document.”

**Not fulfilled in our implementation:**

- **Data lives in one browser’s LocalStorage.** There is no built-in sync between devices or browsers. The same user on another device or browser does not see the same documents unless you implement sync (e.g. to a Solid pod or your own backend) or the user exports on one device and imports on another.
- **No multi-user collaboration.** Multiple users cannot edit the same document in real time through the library. Collaboration would require a server (or p2p layer) that the library does not provide.
- **No server-side component.** The app cannot receive webhooks or run background sync when the browser is closed. No server-side rendering or API; everything is client-side and in-browser.

**Implication:** For multi-device or multi-user collaboration, you need an external sync or collaboration layer; the library’s store is single-instance and local.

---

### Feature set: Ad hoc / serverless sharing

**What app authors often want:** “Share without setting up a server,” “send document to a contact via messenger or QR,” “p2p or local-network sharing.”

**Not fulfilled in our implementation:**

- **No WebRTC, no peer discovery, no ad hoc channel.** The library does not include a peer-to-peer transport (e.g. WebRTC data channel, local network discovery, or mesh). Sharing without a server is “worst case” in the sense that *you* must provide the channel: export → send via email/messenger/QR/copy-paste → recipient imports.
- **Export/import is the only built-in “p2p” mechanism.** You get portable JSON (full store or subset) that the recipient can import. The library does not push or pull over a p2p connection.

**Implication:** Ad hoc sharing is supported only by your app’s flow: export document (or store), deliver by any means (file, link, messenger), recipient imports. The library gives you the export/import format and schemas so both sides stay compatible.

---

### Feature set: Scale & storage

**What app authors often want:** “Store many or large documents,” “stream large files,” “avoid hitting browser storage limits.”

**Not fulfilled in our implementation:**

- **LocalStorage typically 5–10 MB.** Large document sets or binary blobs can hit browser limits. The library does not chunk or stream; file content is stored in the store (e.g. base64 or string). Large files are not ideal.
- **No chunking or streaming for large files.** There is no API for streaming upload/download or partial read/write. Export/import is full store (or what you pass); no incremental or range requests.
- **Base64 image storage is inefficient.** Storing binary as base64 increases size and is not suitable for large media.

**Implication:** Document-sharing apps that need large files or many documents should plan for a server-side or external storage path; the library is best for metadata and moderate-sized content.

---

### Feature set: Real-time & live updates

**What app authors often want:** “See when someone else updates a document,” “live sync indicator,” “notifications when shared with me.”

**Not fulfilled in our implementation:**

- **No WebSockets or push.** The library does not open a connection to a server or peer for live updates. If someone else updates a document (e.g. after sync to a pod), the current user does not see the change until they refresh, re-import, or your app implements a poll/sync step.
- **No “document updated” notification.** There is no event or callback for “this document was updated by another user or device.” That would require a real-time layer outside the library.
- **No inbox/outbox for notifications.** Solid-style inbox/outbox for “Alice shared X with you” or similar is not implemented.

**Implication:** For “see updates as they happen,” you need to add a real-time or polling layer (e.g. Solid notifications, your own WebSocket, or periodic sync).

---

### Feature set: Solid protocol & federation

**What app authors often want:** “Interoperate with other Solid apps and pods,” “authenticate with WebID,” “query across pods.”

**Not fulfilled in our implementation:**

- **No LDP HTTP protocol.** The app does not implement LDP (GET/PUT/POST/DELETE on resources and containers). Adding a server gives you that; the library only provides the data shape and export.
- **No WebID-TLS or DPoP authentication.** Solid-style authentication (WebID-TLS, DPoP) is not implemented. The library does not authenticate users against a pod.
- **No Solid OIDC authentication.** Solid OIDC (e.g. login with a pod provider) is not implemented; you would add it when integrating with a real Solid server.
- **No SPARQL queries.** The library does not expose or query RDF via SPARQL; data is in TinyBase tables and JSON-LD shape.
- **No remote pod federation.** The app cannot act as a client to other pods (e.g. read from another user’s pod by URL and auth). Federation would require LDP client + auth in your app.

**Implication:** This library simulates Solid concepts locally; full protocol and federation require a Solid server and auth layer as described in [SOLID_SERVER_STRATEGIES.md](SOLID_SERVER_STRATEGIES.md).

---

## Summary table (by feature set)

| Feature set | Solid scenarios not fulfilled | Possible workaround |
|-------------|-------------------------------|----------------------|
| **Sharing & access control** | No WAC; no “share with contact/group”; no public/private; no “shared with me”; no inbox/notification of shares | Add Solid pod + ACL logic; or ad hoc export/import; custom “shared with me” table on import |
| **Link-based sharing & resolvable URLs** | No resolvable document URLs (browser-only); no sync; no LDP | Sync to LDP pod (see SOLID_SERVER_STRATEGIES) |
| **Multi-device & multi-user** | Single browser/LocalStorage; no sync across devices; no multi-user edit; no server-side/background sync | Sync layer to pod or backend; or export/import for manual copy |
| **Ad hoc / serverless sharing** | No p2p transport (WebRTC, etc.); export/import only | Use export → your channel (email, messenger, QR) → import |
| **Scale & storage** | LocalStorage limits; no chunking/streaming; base64 inefficiency | Server-side or external storage for large content |
| **Real-time & live updates** | No WebSockets/push; no “document updated” notification; no inbox/outbox | Add polling, WebSocket, or Solid notifications |
| **Solid protocol & federation** | No LDP; no WebID-TLS/DPoP; no Solid OIDC; no SPARQL; no remote pod federation | Add Solid server + auth (see SOLID_SERVER_STRATEGIES) |

---

## Related docs

- **[DOCUMENT_SHARING_SCENARIOS.md](DOCUMENT_SHARING_SCENARIOS.md)** – How the library *does* help in each sharing scenario and what the app author adds.
- **[SOLID_SERVER_STRATEGIES.md](SOLID_SERVER_STRATEGIES.md)** – How to add a Solid server as a sync target; includes [Missing features: benefit vs difficulty](SOLID_SERVER_STRATEGIES.md#missing-features-benefit-to-app-authors-vs-difficulty-to-implement).
- **[README – Limitations](../README.md#limitations--where-it-falls-short)** – High-level project limitations (no LDP, single-user, no WAC, etc.).

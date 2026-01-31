/**
 * VirtualPod – in-app pod backend that implements GET/PUT/DELETE on URLs
 * using the TinyBase store (resources table). Used by the CLI file commands
 * and the file browser/editor. Interface is in cli/types.ts.
 */

import type { Store } from 'tinybase';
import type { Indexes } from 'tinybase';
import { STORE_TABLES, STORE_INDEXES } from './storeLayout';
import { validateName } from './cli/path';

export interface ResourceRow {
  type?: string;
  body?: string | null;
  contentType?: string;
  parentId?: string;
  updated?: string;
}

export interface RequestOptions {
  method?: string;
  body?: string | null;
  headers?: Record<string, string>;
}

export interface RequestResult {
  status: number;
  body: string | null;
  headers?: Record<string, string>;
}

const RESOURCES = STORE_TABLES.RESOURCES;
const BY_PARENT = STORE_INDEXES.BY_PARENT;

export class VirtualPod {
  store: Store;
  indexes: Indexes;
  baseUrl: string;

  constructor(store: Store, indexes: Indexes, baseUrl: string) {
    this.store = store;
    this.indexes = indexes;
    this.baseUrl = baseUrl;

    this.store.setTables({ [RESOURCES]: {} });
    this.indexes.setIndexDefinition(BY_PARENT, RESOURCES, 'parentId');

    if (!this.store.hasRow(RESOURCES, this.baseUrl)) {
      this.store.setRow(RESOURCES, this.baseUrl, {
        type: 'Container',
        contentType: 'text/turtle',
        updated: new Date().toISOString(),
      });
    }
  }

  async handleRequest(
    url: string,
    options: RequestOptions = { method: 'GET' }
  ): Promise<RequestResult> {
    const normalized = this._normalizeUrl(url);
    if (!normalized.ok) {
      return normalized.result;
    }
    const normalizedUrl = normalized.url;

    const method = (options.method ?? 'GET').toUpperCase();
    if (method === 'GET') return this._get(normalizedUrl);
    if (method === 'PUT') return this._put(normalizedUrl, options.body, options.headers);
    if (method === 'DELETE') return this._delete(normalizedUrl);
    return { status: 405, body: 'Method Not Allowed' };
  }

  _normalizeUrl(url: string): { ok: true; url: string } | { ok: false; result: RequestResult } {
    // Must be a valid absolute URL under baseUrl.
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return { ok: false, result: { status: 400, body: 'Invalid URL' } };
    }

    const base = new URL(this.baseUrl).toString();
    const full = u.toString();
    if (!full.startsWith(base)) {
      return { ok: false, result: { status: 403, body: 'Access denied: path outside pod' } };
    }

    // Validate each decoded segment name (safety net).
    const rel = full.slice(base.length);
    const segments = rel.split('/').filter((s) => s.length > 0);
    for (const seg of segments) {
      let decoded: string;
      try {
        decoded = decodeURIComponent(seg);
      } catch {
        return { ok: false, result: { status: 400, body: 'Invalid URL encoding' } };
      }
      if (decoded === '.' || decoded === '..') {
        return { ok: false, result: { status: 400, body: 'Invalid path segment' } };
      }
      const err = validateName(decoded);
      if (err) {
        return { ok: false, result: { status: 400, body: err.error } };
      }
    }

    return { ok: true, url: full };
  }

  _get(url: string): RequestResult {
    if (!this.store.hasRow(RESOURCES, url)) {
      return { status: 404, body: 'Not Found' };
    }
    const row = this.store.getRow(RESOURCES, url) as ResourceRow;
    return {
      status: 200,
      body: row.body ?? null,
      headers: { 'Content-Type': row.contentType || 'text/plain' },
    };
  }

  _put(url: string, body?: string | null, headers: Record<string, string> = {}): RequestResult {
    const isContainer = url.endsWith('/');
    const parentUrl = isContainer
      ? new URL('..', url).href
      : new URL('.', url).href;

    if (url !== this.baseUrl && !this.store.hasRow(RESOURCES, parentUrl)) {
      return { status: 409, body: 'Parent folder missing' };
    }

    this.store.setRow(RESOURCES, url, {
      type: isContainer ? 'Container' : 'Resource',
      body: body ?? null,
      contentType: headers['Content-Type'] || 'text/plain',
      parentId: parentUrl,
      updated: new Date().toISOString(),
    });
    return { status: 201, body: 'Created' };
  }

  _delete(url: string): RequestResult {
    if (url === this.baseUrl) {
      return { status: 405, body: 'Cannot delete root' };
    }
    this.store.delRow(RESOURCES, url);
    return { status: 204, body: 'Deleted' };
  }
}

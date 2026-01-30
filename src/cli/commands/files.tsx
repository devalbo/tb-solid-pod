import React from 'react';
import type { Command } from '../types';
import { parseCliArgs, getOptionString } from '../parse-args';

/**
 * Resolve a path relative to the current URL
 */
const resolvePath = (currentUrl: string, path: string, baseUrl: string): string => {
  if (path.startsWith('/')) {
    return baseUrl + path.slice(1);
  }
  if (path === '..' || path === '../') {
    const url = new URL(currentUrl);
    const parent = new URL('..', url).href;
    return parent.startsWith(baseUrl) ? parent : baseUrl;
  }
  const base = currentUrl.endsWith('/') ? currentUrl : currentUrl + '/';
  return new URL(path, base).href;
};

/**
 * cat - Display file contents
 */
export const catCommand: Command = {
  name: 'cat',
  description: 'Display file contents',
  usage: 'cat <file>',
  execute: (args, context) => {
    const { currentUrl, baseUrl, store, addOutput } = context;
    const path = args[0];

    if (!path) {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>cat: missing file operand</span>,
        'error'
      );
      return;
    }

    const targetUrl = resolvePath(currentUrl, path, baseUrl);
    const row = store.getRow('resources', targetUrl);

    if (!row) {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>cat: {path}: No such file</span>,
        'error'
      );
      return;
    }

    if (row.type === 'Container') {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>cat: {path}: Is a directory</span>,
        'error'
      );
      return;
    }

    const body = row.body;
    const contentType = row.contentType || 'text/plain';

    // Handle images
    if (contentType.startsWith('image/')) {
      addOutput(
        <div>
          <div style={{ color: '#888', marginBottom: 4 }}>
            [{contentType}] (base64 image data)
          </div>
          <img
            src={`data:${contentType};base64,${body}`}
            alt={path}
            style={{ maxWidth: 300, maxHeight: 200 }}
          />
        </div>
      );
      return;
    }

    // Handle text content
    if (!body) {
      addOutput(<span style={{ color: '#666' }}>(empty file)</span>);
      return;
    }

    addOutput(
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {body}
      </pre>
    );
  },
};

/**
 * touch - Create a new file
 */
export const touchCommand: Command = {
  name: 'touch',
  description: 'Create a new file',
  usage: 'touch <filename> [--content=<text>] [--type=<mime>]',
  execute: async (args, context) => {
    const { currentUrl, baseUrl, pod, addOutput } = context;
    const { positional, options } = parseCliArgs(args);
    const filename = positional[0];

    if (!filename) {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>touch: missing file operand</span>,
        'error'
      );
      return;
    }

    // Ensure we're in a container
    const row = context.store.getRow('resources', currentUrl);
    if (!row || row.type !== 'Container') {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>touch: current location is not a directory</span>,
        'error'
      );
      return;
    }

    const content = getOptionString(options, 'content') || '';
    const contentType = getOptionString(options, 'type') || 'text/plain';
    const targetUrl = resolvePath(currentUrl, filename, baseUrl);

    const result = await pod.handleRequest(targetUrl, {
      method: 'PUT',
      body: content,
      headers: { 'Content-Type': contentType },
    });

    if (result.status === 201) {
      addOutput(
        <span style={{ color: '#2ecc71' }}>Created: {filename}</span>,
        'success'
      );
    } else {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>touch: failed to create {filename}: {result.body}</span>,
        'error'
      );
    }
  },
};

/**
 * mkdir - Create a new directory
 */
export const mkdirCommand: Command = {
  name: 'mkdir',
  description: 'Create a new directory',
  usage: 'mkdir <name>',
  execute: async (args, context) => {
    const { currentUrl, baseUrl, pod, addOutput } = context;
    const name = args[0];

    if (!name) {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>mkdir: missing operand</span>,
        'error'
      );
      return;
    }

    // Ensure we're in a container
    const row = context.store.getRow('resources', currentUrl);
    if (!row || row.type !== 'Container') {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>mkdir: current location is not a directory</span>,
        'error'
      );
      return;
    }

    // Ensure name ends with /
    const folderName = name.endsWith('/') ? name : name + '/';
    const targetUrl = resolvePath(currentUrl, folderName, baseUrl);

    const result = await pod.handleRequest(targetUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/turtle' },
    });

    if (result.status === 201) {
      addOutput(
        <span style={{ color: '#2ecc71' }}>Created directory: {name}</span>,
        'success'
      );
    } else {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>mkdir: failed to create {name}: {result.body}</span>,
        'error'
      );
    }
  },
};

/**
 * rm - Remove a file or empty directory
 */
export const rmCommand: Command = {
  name: 'rm',
  description: 'Remove a file or empty directory',
  usage: 'rm <path>',
  execute: async (args, context) => {
    const { currentUrl, baseUrl, store, pod, addOutput } = context;
    const path = args[0];

    if (!path) {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>rm: missing operand</span>,
        'error'
      );
      return;
    }

    const targetUrl = resolvePath(currentUrl, path, baseUrl);
    const row = store.getRow('resources', targetUrl);

    if (!row) {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>rm: {path}: No such file or directory</span>,
        'error'
      );
      return;
    }

    // Check if directory is empty
    if (row.type === 'Container') {
      const allRows = store.getTable('resources') || {};
      const children = Object.values(allRows).filter(
        (r) => r.parentId === targetUrl
      );
      if (children.length > 0) {
        addOutput(
          <span style={{ color: '#ff6b6b' }}>rm: {path}: Directory not empty</span>,
          'error'
        );
        return;
      }
    }

    const result = await pod.handleRequest(targetUrl, { method: 'DELETE' });

    if (result.status === 204) {
      addOutput(
        <span style={{ color: '#2ecc71' }}>Removed: {path}</span>,
        'success'
      );
    } else if (result.status === 405) {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>rm: cannot remove root directory</span>,
        'error'
      );
    } else {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>rm: failed to remove {path}: {result.body}</span>,
        'error'
      );
    }
  },
};

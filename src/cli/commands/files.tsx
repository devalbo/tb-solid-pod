import React from 'react';
import { Box, Text } from 'ink';
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
      addOutput(<Text color="red">cat: missing file operand</Text>, 'error');
      return;
    }

    const targetUrl = resolvePath(currentUrl, path, baseUrl);
    const row = store.getRow('resources', targetUrl);

    if (!row) {
      addOutput(<Text color="red">cat: {path}: No such file</Text>, 'error');
      return;
    }

    if (row.type === 'Container') {
      addOutput(<Text color="red">cat: {path}: Is a directory</Text>, 'error');
      return;
    }

    const body = row.body;
    const contentType = typeof row.contentType === 'string' ? row.contentType : 'text/plain';

    if (typeof contentType === 'string' && contentType.startsWith('image/')) {
      addOutput(
        <Box flexDirection="column">
          <Text dimColor>[{contentType}] (base64 image data - view in Data Browser)</Text>
        </Box>
      );
      return;
    }

    if (!body) {
      addOutput(<Text dimColor>(empty file)</Text>);
      return;
    }

    addOutput(<Text>{String(body)}</Text>);
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
      addOutput(<Text color="red">touch: missing file operand</Text>, 'error');
      return;
    }

    const row = context.store.getRow('resources', currentUrl);
    if (!row || row.type !== 'Container') {
      addOutput(<Text color="red">touch: current location is not a directory</Text>, 'error');
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
      addOutput(<Text color="green">Created: {filename}</Text>, 'success');
    } else {
      addOutput(
        <Text color="red">touch: failed to create {filename}: {result.body}</Text>,
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
      addOutput(<Text color="red">mkdir: missing operand</Text>, 'error');
      return;
    }

    const row = context.store.getRow('resources', currentUrl);
    if (!row || row.type !== 'Container') {
      addOutput(<Text color="red">mkdir: current location is not a directory</Text>, 'error');
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
      addOutput(<Text color="green">Created directory: {name}</Text>, 'success');
    } else {
      addOutput(
        <Text color="red">mkdir: failed to create {name}: {result.body}</Text>,
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
      addOutput(<Text color="red">rm: missing operand</Text>, 'error');
      return;
    }

    const targetUrl = resolvePath(currentUrl, path, baseUrl);
    const row = store.getRow('resources', targetUrl);

    if (!row) {
      addOutput(<Text color="red">rm: {path}: No such file or directory</Text>, 'error');
      return;
    }

    if (row.type === 'Container') {
      const allRows = store.getTable('resources') || {};
      const children = Object.values(allRows).filter(
        (r) => r.parentId === targetUrl
      );
      if (children.length > 0) {
        addOutput(<Text color="red">rm: {path}: Directory not empty</Text>, 'error');
        return;
      }
    }

    const result = await pod.handleRequest(targetUrl, { method: 'DELETE' });

    if (result.status === 204) {
      addOutput(<Text color="green">Removed: {path}</Text>, 'success');
    } else if (result.status === 405) {
      addOutput(<Text color="red">rm: cannot remove root directory</Text>, 'error');
    } else {
      addOutput(
        <Text color="red">rm: failed to remove {path}: {result.body}</Text>,
        'error'
      );
    }
  },
};

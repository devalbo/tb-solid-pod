import React from 'react';
import type { Command } from '../types';

/**
 * pwd - Print current working directory
 */
export const pwdCommand: Command = {
  name: 'pwd',
  description: 'Print current working directory (URL)',
  usage: 'pwd',
  execute: (_args, context) => {
    const { currentUrl, addOutput } = context;
    addOutput(<span style={{ color: '#4ecdc4' }}>{currentUrl}</span>);
  },
};

/**
 * Resolve a path relative to the current URL
 */
const resolvePath = (currentUrl: string, path: string, baseUrl: string): string => {
  // Handle absolute paths (starting with /)
  if (path.startsWith('/')) {
    return baseUrl + path.slice(1);
  }

  // Handle .. (parent directory)
  if (path === '..' || path === '../') {
    const url = new URL(currentUrl);
    const parent = new URL('..', url).href;
    // Don't go above baseUrl
    return parent.startsWith(baseUrl) ? parent : baseUrl;
  }

  // Handle relative paths
  // Ensure currentUrl ends with / for proper resolution
  const base = currentUrl.endsWith('/') ? currentUrl : currentUrl + '/';
  return new URL(path, base).href;
};

/**
 * cd - Change directory
 */
export const cdCommand: Command = {
  name: 'cd',
  description: 'Change current directory',
  usage: 'cd <path>',
  execute: (args, context) => {
    const { currentUrl, setCurrentUrl, baseUrl, store, addOutput } = context;
    const path = args[0];

    if (!path) {
      // cd with no args goes to root
      setCurrentUrl(baseUrl);
      return;
    }

    let targetUrl = resolvePath(currentUrl, path, baseUrl);

    // Check if target exists - try with trailing slash first (containers are stored with trailing slashes)
    if (!store.hasRow('resources', targetUrl) && !targetUrl.endsWith('/')) {
      const withSlash = targetUrl + '/';
      if (store.hasRow('resources', withSlash)) {
        targetUrl = withSlash;
      }
    }

    if (!store.hasRow('resources', targetUrl)) {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>cd: no such directory: {path}</span>,
        'error'
      );
      return;
    }

    const row = store.getRow('resources', targetUrl);
    if (row.type !== 'Container') {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>cd: not a directory: {path}</span>,
        'error'
      );
      return;
    }

    setCurrentUrl(targetUrl);
  },
};

/**
 * ls - List directory contents
 */
export const lsCommand: Command = {
  name: 'ls',
  description: 'List directory contents',
  usage: 'ls [path]',
  execute: (args, context) => {
    const { currentUrl, baseUrl, store, addOutput } = context;
    const path = args[0];

    const targetUrl = path ? resolvePath(currentUrl, path, baseUrl) : currentUrl;

    // Check if target exists
    const row = store.getRow('resources', targetUrl);
    if (!row) {
      addOutput(
        <span style={{ color: '#ff6b6b' }}>ls: no such file or directory: {path || targetUrl}</span>,
        'error'
      );
      return;
    }

    // If it's a file, just show the file
    if (row.type !== 'Container') {
      const name = targetUrl.split('/').filter(Boolean).pop() || targetUrl;
      addOutput(<span>{name}</span>);
      return;
    }

    // List container contents
    const allRows = store.getTable('resources') || {};
    const children = Object.entries(allRows)
      .filter(([, r]) => r.parentId === targetUrl)
      .sort(([urlA, rowA], [urlB, rowB]) => {
        // Containers first, then alphabetically
        if (rowA.type === 'Container' && rowB.type !== 'Container') return -1;
        if (rowA.type !== 'Container' && rowB.type === 'Container') return 1;
        return urlA.localeCompare(urlB);
      });

    if (children.length === 0) {
      addOutput(<span style={{ color: '#666' }}>(empty)</span>);
      return;
    }

    addOutput(
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
        {children.map(([url, r]) => {
          const name = url.split('/').filter(Boolean).pop() || url;
          const isDir = r.type === 'Container';
          return (
            <span
              key={url}
              style={{
                color: isDir ? '#4ecdc4' : '#f5f5f5',
                fontWeight: isDir ? 'bold' : 'normal',
              }}
            >
              {name}
              {isDir ? '/' : ''}
            </span>
          );
        })}
      </div>
    );
  },
};

import { Box, Text } from 'ink';
import type { Command } from '../types';
import type { CommandResult } from '../types';
import { parseCliArgs, hasJsonFlag } from '../parse-args';
import { STORE_TABLES } from '../../storeLayout';
import { decodeSegment, ensureTrailingSlash, resolvePath } from '../path';

/**
 * pwd - Print current working directory
 */
export const pwdCommand: Command = {
  name: 'pwd',
  description: 'Print current working directory (URL)',
  usage: 'pwd',
  supportsJson: true,
  execute: (_args, context, options): CommandResult<{ url: string }> => {
    const { currentUrl, addOutput } = context;

    const result: CommandResult<{ url: string }> = {
      success: true,
      data: { url: currentUrl },
    };

    if (options?.json) {
      if (!options.silent) addOutput(<Text>{JSON.stringify(result.data, null, 2)}</Text>);
      return result;
    }

    if (!options?.silent) addOutput(<Text color="cyan">{currentUrl}</Text>);
    return result;
  },
};

/**
 * cd - Change directory
 */
export const cdCommand: Command = {
  name: 'cd',
  description: 'Change current directory',
  usage: 'cd <path>',
  supportsJson: true,
  execute: (args, context, options): CommandResult<{ url: string; previousUrl: string }> => {
    const { currentUrl, setCurrentUrl, baseUrl, store, addOutput } = context;
    const { positional, options: cmdOptions } = parseCliArgs(args);
    const path = positional[0];
    const jsonMode = options?.json || hasJsonFlag(cmdOptions);
    const previousUrl = currentUrl;

    if (!path) {
      // cd with no args goes to root
      setCurrentUrl(baseUrl);
      const result: CommandResult<{ url: string; previousUrl: string }> = {
        success: true,
        data: { url: baseUrl, previousUrl },
      };
      if (jsonMode && !options?.silent) addOutput(<Text>{JSON.stringify(result.data, null, 2)}</Text>);
      return result;
    }

    const resolved = resolvePath(currentUrl, path, baseUrl);
    if (!resolved.valid) {
      const msg = `cd: ${resolved.error}`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: resolved.code, message: msg } };
    }

    const targetUrl = ensureTrailingSlash(resolved.url);
    if (!store.hasRow(STORE_TABLES.RESOURCES, targetUrl)) {
      const msg = `cd: no such directory: ${path}`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'PATH_NOT_FOUND', message: msg } };
    }

    const row = store.getRow(STORE_TABLES.RESOURCES, targetUrl) as { type?: string } | undefined;
    if (!row || row.type !== 'Container') {
      const msg = `cd: not a directory: ${path}`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'NOT_A_DIRECTORY', message: msg } };
    }

    setCurrentUrl(targetUrl);
    const result: CommandResult<{ url: string; previousUrl: string }> = {
      success: true,
      data: { url: targetUrl, previousUrl },
    };
    if (jsonMode && !options?.silent) addOutput(<Text>{JSON.stringify(result.data, null, 2)}</Text>);
    return result;
  },
};

/**
 * ls - List directory contents
 */
export const lsCommand: Command = {
  name: 'ls',
  description: 'List directory contents',
  usage: 'ls [path]',
  supportsJson: true,
  execute: (args, context, options): CommandResult<{
    url: string;
    children: Array<{
      url: string;
      name: string;
      type: 'Container' | 'Resource';
      contentType?: string;
      updated?: string;
    }>;
  }> => {
    const { currentUrl, baseUrl, store, addOutput } = context;
    const { positional, options: cmdOptions } = parseCliArgs(args);
    const path = positional[0];
    const jsonMode = options?.json || hasJsonFlag(cmdOptions);

    const target = path ? resolvePath(currentUrl, path, baseUrl) : { valid: true as const, url: currentUrl, isContainer: currentUrl.endsWith('/') };
    if (!target.valid) {
      const msg = `ls: ${target.error}`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: target.code, message: msg } };
    }
    const targetUrl = target.url;

    // Check if target exists
    const row = store.getRow(STORE_TABLES.RESOURCES, targetUrl) as { type?: string; contentType?: string; updated?: string; parentId?: string } | undefined;
    if (!row) {
      const msg = `ls: no such file or directory: ${path || targetUrl}`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'PATH_NOT_FOUND', message: msg } };
    }

    const toName = (url: string): string => {
      const parts = url.split('/').filter(Boolean);
      const raw = parts[parts.length - 1] ?? url;
      return decodeSegment(raw);
    };

    const children: Array<{
      url: string;
      name: string;
      type: 'Container' | 'Resource';
      contentType?: string;
      updated?: string;
    }> = [];

    if (row.type === 'Container') {
      const allRows = (store.getTable(STORE_TABLES.RESOURCES) || {}) as Record<
        string,
        { type?: string; contentType?: string; updated?: string; parentId?: string }
      >;
      Object.entries(allRows)
        .filter(([, r]) => r.parentId === targetUrl)
        .sort(([urlA, rowA], [urlB, rowB]) => {
          if (rowA.type === 'Container' && rowB.type !== 'Container') return -1;
          if (rowA.type !== 'Container' && rowB.type === 'Container') return 1;
          return urlA.localeCompare(urlB);
        })
        .forEach(([url, r]) => {
          children.push({
            url,
            name: toName(url.endsWith('/') ? url.slice(0, -1) : url),
            type: r.type === 'Container' ? 'Container' : 'Resource',
            contentType: r.contentType,
            updated: r.updated,
          });
        });
    } else {
      children.push({
        url: targetUrl,
        name: toName(targetUrl),
        type: 'Resource',
        contentType: row.contentType,
        updated: row.updated,
      });
    }

    const result: CommandResult<{
      url: string;
      children: typeof children;
    }> = { success: true, data: { url: targetUrl, children } };

    if (jsonMode) {
      if (!options?.silent) addOutput(<Text>{JSON.stringify(result.data, null, 2)}</Text>);
      return result;
    }

    if (!options?.silent) {
      if (row.type !== 'Container') {
        addOutput(<Text>{toName(targetUrl)}</Text>);
        return result;
      }

      if (children.length === 0) {
        addOutput(<Text dimColor>(empty)</Text>);
        return result;
      }

      addOutput(
        <Box flexWrap="wrap" gap={1}>
          {children.map((c) => {
            const isDir = c.type === 'Container';
            return (
              <Text key={c.url} color={isDir ? 'cyan' : undefined} bold={isDir}>
                {c.name}
                {isDir ? '/' : ''}
              </Text>
            );
          })}
        </Box>
      );
    }

    return result;
  },
};

import { Box, Text } from 'ink';
import type { Command } from '../types';
import type { CommandResult } from '../types';
import { parseCliArgs, getOptionBoolean, getOptionString, hasJsonFlag } from '../parse-args';
import { STORE_TABLES } from '../../storeLayout';
import { ensureTrailingSlash, getParentUrl, resolvePath, validateName } from '../path';

/**
 * cat - Display file contents
 */
export const catCommand: Command = {
  name: 'cat',
  description: 'Display file contents',
  usage: 'cat <file>',
  supportsJson: true,
  execute: (args, context, options): CommandResult<{ url: string; content: string; contentType: string }> => {
    const { currentUrl, baseUrl, store, addOutput } = context;
    const { positional, options: cmdOptions } = parseCliArgs(args);
    const path = positional[0];
    const jsonMode = options?.json || hasJsonFlag(cmdOptions);

    if (!path) {
      const msg = 'cat: missing file operand';
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
    }

    const target = resolvePath(currentUrl, path, baseUrl);
    if (!target.valid) {
      const msg = `cat: ${target.error}`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: target.code, message: msg } };
    }
    const targetUrl = target.url;
    const row = store.getRow(STORE_TABLES.RESOURCES, targetUrl) as { type?: string; body?: string | null; contentType?: string } | undefined;

    if (!row) {
      const msg = `cat: ${path}: No such file`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'PATH_NOT_FOUND', message: msg } };
    }

    if (row.type === 'Container') {
      const msg = `cat: ${path}: Is a directory`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'NOT_A_FILE', message: msg } };
    }

    const body = row.body ?? '';
    const contentType = typeof row.contentType === 'string' ? row.contentType : 'text/plain';

    const result: CommandResult<{ url: string; content: string; contentType: string }> = {
      success: true,
      data: { url: targetUrl, content: String(body), contentType },
    };

    if (jsonMode) {
      if (!options?.silent) addOutput(<Text>{JSON.stringify(result.data, null, 2)}</Text>);
      return result;
    }

    if (!options?.silent) {
      if (contentType.startsWith('image/')) {
        addOutput(
          <Box flexDirection="column">
            <Text dimColor>[{contentType}] (base64 image data - view in Data Browser)</Text>
          </Box>
        );
        return result;
      }

      if (!body) {
        addOutput(<Text dimColor>(empty file)</Text>);
        return result;
      }

      addOutput(<Text>{String(body)}</Text>);
    }

    return result;
  },
};

/**
 * touch - Create a new file
 */
export const touchCommand: Command = {
  name: 'touch',
  description: 'Create a new file',
  usage: 'touch <filename> [--content=<text>] [--type=<mime>]',
  supportsJson: true,
  execute: async (args, context, options): Promise<CommandResult<{ url: string; created: boolean }>> => {
    const { currentUrl, baseUrl, pod, addOutput } = context;
    const { positional, options: cmdOptions } = parseCliArgs(args);
    const filename = positional[0];
    const jsonMode = options?.json || hasJsonFlag(cmdOptions);

    if (!filename) {
      const msg = 'touch: missing file operand';
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
    }

    const nameError = validateName(filename);
    if (nameError) {
      const msg = `touch: ${nameError.error}`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: nameError.code, message: msg } };
    }

    const row = context.store.getRow(STORE_TABLES.RESOURCES, currentUrl) as { type?: string } | undefined;
    if (!row || row.type !== 'Container') {
      const msg = 'touch: current location is not a directory';
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'NOT_A_DIRECTORY', message: msg } };
    }

    const content = getOptionString(cmdOptions, 'content') || '';
    const contentType = getOptionString(cmdOptions, 'type') || 'text/plain';
    const isBase64 = getOptionBoolean(cmdOptions, 'base64');

    const target = resolvePath(currentUrl, filename, baseUrl);
    if (!target.valid) {
      const msg = `touch: ${target.error}`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: target.code, message: msg } };
    }
    const targetUrl = target.url;

    if (context.store.hasRow(STORE_TABLES.RESOURCES, targetUrl)) {
      const msg = `touch: cannot create ${filename}: already exists`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'ALREADY_EXISTS', message: msg } };
    }

    const parentUrl = getParentUrl(targetUrl, baseUrl);
    if (!context.store.hasRow(STORE_TABLES.RESOURCES, parentUrl)) {
      const msg = `touch: cannot create ${filename}: parent folder missing`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'PARENT_NOT_FOUND', message: msg } };
    }

    const result = await pod.handleRequest(targetUrl, {
      method: 'PUT',
      body: content,
      headers: {
        'Content-Type': contentType,
        ...(isBase64 ? { 'Content-Transfer-Encoding': 'base64' } : {}),
      },
    });

    if (result.status === 201) {
      const successResult: CommandResult<{ url: string; created: boolean }> = {
        success: true,
        data: { url: targetUrl, created: true },
      };
      if (jsonMode) {
        if (!options?.silent) addOutput(<Text>{JSON.stringify(successResult.data, null, 2)}</Text>);
        return successResult;
      }
      if (!options?.silent) addOutput(<Text color="green">Created: {filename}</Text>, 'success', `Created: ${filename}`);
      return successResult;
    } else {
      const msg = `touch: failed to create ${filename}: ${result.body ?? ''}`.trim();
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'OPERATION_FAILED', message: msg } };
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
  supportsJson: true,
  execute: async (args, context, options): Promise<CommandResult<{ url: string; created: boolean }>> => {
    const { currentUrl, baseUrl, pod, addOutput } = context;
    const { positional, options: cmdOptions } = parseCliArgs(args);
    const rawName = positional[0];
    const jsonMode = options?.json || hasJsonFlag(cmdOptions);

    if (!rawName) {
      const msg = 'mkdir: missing operand';
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
    }

    // Accept "name" or "name/"
    const name = rawName.endsWith('/') ? rawName.slice(0, -1) : rawName;
    const nameError = validateName(name);
    if (nameError) {
      const msg = `mkdir: ${nameError.error}`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: nameError.code, message: msg } };
    }

    const row = context.store.getRow(STORE_TABLES.RESOURCES, currentUrl) as { type?: string } | undefined;
    if (!row || row.type !== 'Container') {
      const msg = 'mkdir: current location is not a directory';
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'NOT_A_DIRECTORY', message: msg } };
    }

    const target = resolvePath(currentUrl, `${name}/`, baseUrl);
    if (!target.valid) {
      const msg = `mkdir: ${target.error}`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: target.code, message: msg } };
    }
    const targetUrl = ensureTrailingSlash(target.url);

    if (context.store.hasRow(STORE_TABLES.RESOURCES, targetUrl)) {
      const msg = `mkdir: cannot create directory ${rawName}: already exists`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'ALREADY_EXISTS', message: msg } };
    }

    const parentUrl = getParentUrl(targetUrl, baseUrl);
    if (!context.store.hasRow(STORE_TABLES.RESOURCES, parentUrl)) {
      const msg = `mkdir: cannot create directory ${rawName}: parent folder missing`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'PARENT_NOT_FOUND', message: msg } };
    }

    const result = await pod.handleRequest(targetUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/turtle' },
    });

    if (result.status === 201) {
      const successResult: CommandResult<{ url: string; created: boolean }> = {
        success: true,
        data: { url: targetUrl, created: true },
      };
      if (jsonMode) {
        if (!options?.silent) addOutput(<Text>{JSON.stringify(successResult.data, null, 2)}</Text>);
        return successResult;
      }
      if (!options?.silent) addOutput(<Text color="green">Created directory: {rawName}</Text>, 'success', `Created directory: ${rawName}`);
      return successResult;
    } else {
      const msg = `mkdir: failed to create ${rawName}: ${result.body ?? ''}`.trim();
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'OPERATION_FAILED', message: msg } };
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
  supportsJson: true,
  execute: async (args, context, options): Promise<CommandResult<{ url?: string; urls?: string[]; deleted: boolean }>> => {
    const { currentUrl, baseUrl, store, pod, addOutput } = context;
    const { positional, options: cmdOptions } = parseCliArgs(args);
    const path = positional[0];
    const recursive = getOptionBoolean(cmdOptions, 'recursive') || getOptionBoolean(cmdOptions, 'r');
    const force = getOptionBoolean(cmdOptions, 'force') || getOptionBoolean(cmdOptions, 'f');
    const jsonMode = options?.json || hasJsonFlag(cmdOptions);

    if (!path) {
      const msg = 'rm: missing operand';
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'MISSING_ARGUMENT', message: msg } };
    }

    const target = resolvePath(currentUrl, path, baseUrl);
    if (!target.valid) {
      const msg = `rm: ${target.error}`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: target.code, message: msg } };
    }
    let targetUrl = target.url;

    // For convenience, if user types a directory name without trailing slash and the container exists, prefer it.
    if (!targetUrl.endsWith('/')) {
      const maybeDir = `${targetUrl}/`;
      const maybeRow = store.getRow(STORE_TABLES.RESOURCES, maybeDir) as { type?: string } | undefined;
      if (maybeRow?.type === 'Container') {
        targetUrl = maybeDir;
      }
    }

    const row = store.getRow(STORE_TABLES.RESOURCES, targetUrl) as { type?: string; parentId?: string } | undefined;

    if (!row) {
      const msg = `rm: ${path}: No such file or directory`;
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'PATH_NOT_FOUND', message: msg } };
    }

    if (targetUrl === baseUrl) {
      const msg = 'rm: cannot remove root directory';
      if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
      return { success: false, error: { code: 'PERMISSION_DENIED', message: msg } };
    }

    const allRows = (store.getTable(STORE_TABLES.RESOURCES) || {}) as Record<
      string,
      { type?: string; parentId?: string }
    >;

    const deleteUrls: string[] = [];
    if (row.type === 'Container') {
      const directChildren = Object.entries(allRows).filter(([, r]) => r.parentId === targetUrl);
      if (directChildren.length > 0 && !recursive) {
        const msg = `rm: ${path}: Directory not empty`;
        if (!options?.silent) addOutput(<Text color="red">{msg}</Text>, 'error', msg);
        return { success: false, error: { code: 'DIRECTORY_NOT_EMPTY', message: msg } };
      }

      if (directChildren.length > 0 && recursive) {
        // Delete all descendants depth-first.
        const descendants = Object.keys(allRows).filter((u) => u !== baseUrl && (u === targetUrl || u.startsWith(targetUrl)));
        descendants.sort((a, b) => b.length - a.length);
        deleteUrls.push(...descendants);
      } else {
        deleteUrls.push(targetUrl);
      }
    } else {
      deleteUrls.push(targetUrl);
    }

    // NOTE: force is accepted for future UI confirm flows; currently no interactive prompt.
    void force;

    for (const u of deleteUrls) {
      await pod.handleRequest(u, { method: 'DELETE' });
    }

    const successResult: CommandResult<{ url?: string; urls?: string[]; deleted: boolean }> =
      deleteUrls.length <= 1
        ? { success: true, data: { url: deleteUrls[0], deleted: true } }
        : { success: true, data: { urls: deleteUrls, deleted: true } };

    if (jsonMode) {
      if (!options?.silent) addOutput(<Text>{JSON.stringify(successResult.data, null, 2)}</Text>);
      return successResult;
    }

    if (!options?.silent) {
      const display = deleteUrls.length <= 1 ? path : `${path} (${deleteUrls.length} items)`;
      addOutput(<Text color="green">Removed: {display}</Text>, 'success', `Removed: ${display}`);
    }

    return successResult;
  },
};

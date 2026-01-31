import { z } from 'zod';
import type { Store } from 'tinybase';
import type { VirtualPod } from './types';
import { commands } from './registry';
import { exec } from './executor';
import {
  commandErrorSchema,
  type CliContext,
  type CommandError,
  type CommandResult,
} from './types';

/**
 * Programmatic CLI API
 * --------------------
 * Apps should be able to call CLI commands as *typed data APIs*.
 *
 * This module provides:
 * - `createApiContext(...)`: headless CliContext (no Ink/terminal UI required)
 * - Zod input/output schemas for the most important commands
 * - thin wrappers (`api.touch(...)`, etc.) returning `CommandResult<T>`
 *
 * Notes:
 * - Commands still share the same implementation as the interactive CLI.
 * - Outputs are validated with Zod to keep the surface stable/testable.
 */

export function createApiContext(params: {
  store: Store;
  pod: VirtualPod;
  baseUrl: string;
  currentUrl: string;
  setCurrentUrl?: (url: string) => void;
}): CliContext {
  return {
    addOutput: () => {},
    clearOutput: () => {},
    setBusy: () => {},
    currentUrl: params.currentUrl,
    setCurrentUrl: params.setCurrentUrl ?? (() => {}),
    baseUrl: params.baseUrl,
    store: params.store,
    pod: params.pod,
    commands,
  };
}

function asError(err: unknown): CommandError {
  const parsed = commandErrorSchema.safeParse(err);
  if (parsed.success) return parsed.data;
  return { code: 'OPERATION_FAILED', message: 'Unknown error', details: err };
}

async function execTyped<T>(
  ctx: CliContext,
  command: string,
  args: string[],
  dataSchema: z.ZodType<T>
): Promise<CommandResult<T>> {
  const result = await exec(command, args, ctx, { silent: true, json: true });
  if (!result.success) {
    return { success: false, error: asError(result.error) };
  }
  const parsed = dataSchema.safeParse(result.data);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'OPERATION_FAILED',
        message: `Invalid ${command} result data`,
        details: parsed.error.flatten(),
      },
    };
  }
  return { success: true, data: parsed.data };
}

// -----------------------
// Output data structures
// -----------------------

export const pwdDataSchema = z.object({ url: z.string() });
export type PwdData = z.infer<typeof pwdDataSchema>;

export const cdDataSchema = z.object({ url: z.string(), previousUrl: z.string() });
export type CdData = z.infer<typeof cdDataSchema>;

export const lsChildSchema = z.object({
  url: z.string(),
  name: z.string(),
  type: z.enum(['Container', 'Resource']),
  contentType: z.string().optional(),
  updated: z.string().optional(),
});
export const lsDataSchema = z.object({
  url: z.string(),
  children: z.array(lsChildSchema),
});
export type LsData = z.infer<typeof lsDataSchema>;

export const catDataSchema = z.object({
  url: z.string(),
  content: z.string(),
  contentType: z.string(),
});
export type CatData = z.infer<typeof catDataSchema>;

export const touchDataSchema = z.object({
  url: z.string(),
  created: z.boolean(),
});
export type TouchData = z.infer<typeof touchDataSchema>;

export const mkdirDataSchema = z.object({
  url: z.string(),
  created: z.boolean(),
});
export type MkdirData = z.infer<typeof mkdirDataSchema>;

export const rmDataSchema = z
  .object({
    url: z.string().optional(),
    urls: z.array(z.string()).optional(),
    deleted: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!v.url && (!v.urls || v.urls.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected url or urls',
      });
    }
  });
export type RmData = z.infer<typeof rmDataSchema>;

export const fileInfoDataSchema = z.object({
  url: z.string(),
  name: z.string(),
  contentType: z.string(),
  size: z.number(),
  updated: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  created: z.string().optional(),
  modified: z.string().optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
  image: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
      location: z.string().optional(),
    })
    .optional(),
});
export type FileInfoData = z.infer<typeof fileInfoDataSchema>;

export const fileSetDataSchema = z.object({
  url: z.string(),
  updated: z.array(z.string()),
});
export type FileSetData = z.infer<typeof fileSetDataSchema>;

// -----------------------
// Input schemas
// -----------------------

export const touchInputSchema = z.object({
  name: z.string().min(1),
  content: z.string().optional(),
  contentType: z.string().optional(),
  base64: z.boolean().optional(),
});
export type TouchInput = z.infer<typeof touchInputSchema>;

export const mkdirInputSchema = z.object({
  name: z.string().min(1),
});
export type MkdirInput = z.infer<typeof mkdirInputSchema>;

export const rmInputSchema = z.object({
  path: z.string().min(1),
  recursive: z.boolean().optional(),
  force: z.boolean().optional(),
});
export type RmInput = z.infer<typeof rmInputSchema>;

export const pathInputSchema = z.object({ path: z.string().min(1) });

// -----------------------
// API surface
// -----------------------

export const cliApi = {
  pwd: (ctx: CliContext) => execTyped(ctx, 'pwd', [], pwdDataSchema),

  cd: (ctx: CliContext, path?: string) =>
    execTyped(ctx, 'cd', path ? [path] : [], cdDataSchema),

  ls: (ctx: CliContext, path?: string) =>
    execTyped(ctx, 'ls', path ? [path] : [], lsDataSchema),

  cat: async (ctx: CliContext, input: { path: string }) => {
    const parsed = pathInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: { code: 'INVALID_ARGUMENT', message: 'Invalid cat input', details: parsed.error.flatten() } };
    }
    return execTyped(ctx, 'cat', [parsed.data.path], catDataSchema);
  },

  touch: async (ctx: CliContext, input: TouchInput) => {
    const parsed = touchInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: { code: 'INVALID_ARGUMENT', message: 'Invalid touch input', details: parsed.error.flatten() } };
    }
    const args: string[] = [parsed.data.name];
    if (parsed.data.contentType) args.push('--type', parsed.data.contentType);
    if (parsed.data.content != null) args.push('--content', parsed.data.content);
    if (parsed.data.base64) args.push('--base64');
    return execTyped(ctx, 'touch', args, touchDataSchema);
  },

  mkdir: async (ctx: CliContext, input: MkdirInput) => {
    const parsed = mkdirInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: { code: 'INVALID_ARGUMENT', message: 'Invalid mkdir input', details: parsed.error.flatten() } };
    }
    return execTyped(ctx, 'mkdir', [parsed.data.name], mkdirDataSchema);
  },

  rm: async (ctx: CliContext, input: RmInput) => {
    const parsed = rmInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: { code: 'INVALID_ARGUMENT', message: 'Invalid rm input', details: parsed.error.flatten() } };
    }
    const args: string[] = [parsed.data.path];
    if (parsed.data.recursive) args.push('-r');
    if (parsed.data.force) args.push('-f');
    return execTyped(ctx, 'rm', args, rmDataSchema);
  },

  fileInfo: async (ctx: CliContext, input: { path: string }) => {
    const parsed = pathInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: { code: 'INVALID_ARGUMENT', message: 'Invalid fileInfo input', details: parsed.error.flatten() } };
    }
    return execTyped(ctx, 'file', ['info', parsed.data.path], fileInfoDataSchema);
  },

  fileSetTitle: async (ctx: CliContext, input: { path: string; title: string }) => {
    const schema = z.object({ path: z.string().min(1), title: z.string().min(1) });
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: { code: 'INVALID_ARGUMENT', message: 'Invalid fileSetTitle input', details: parsed.error.flatten() } };
    }
    return execTyped(ctx, 'file', ['set-title', parsed.data.path, parsed.data.title], fileSetDataSchema);
  },

  fileSetDescription: async (ctx: CliContext, input: { path: string; description: string }) => {
    const schema = z.object({ path: z.string().min(1), description: z.string().min(1) });
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: { code: 'INVALID_ARGUMENT', message: 'Invalid fileSetDescription input', details: parsed.error.flatten() } };
    }
    return execTyped(ctx, 'file', ['set-description', parsed.data.path, parsed.data.description], fileSetDataSchema);
  },

  fileSetAuthor: async (ctx: CliContext, input: { path: string; persona: string }) => {
    const schema = z.object({ path: z.string().min(1), persona: z.string().min(1) });
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: { code: 'INVALID_ARGUMENT', message: 'Invalid fileSetAuthor input', details: parsed.error.flatten() } };
    }
    return execTyped(ctx, 'file', ['set-author', parsed.data.path, parsed.data.persona], fileSetDataSchema);
  },

  // -----------------------
  // Scripts (repeatability)
  // -----------------------

  scriptList: (ctx: CliContext) =>
    execTyped(
      ctx,
      'script',
      ['list'],
      z.object({ count: z.number(), names: z.array(z.string()) })
    ),

  scriptShow: async (ctx: CliContext, input: { name: string }) => {
    const schema = z.object({ name: z.string().min(1) });
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: { code: 'INVALID_ARGUMENT', message: 'Invalid scriptShow input', details: parsed.error.flatten() } };
    }
    return execTyped(
      ctx,
      'script',
      ['show', parsed.data.name],
      z.object({ name: z.string(), script: z.string(), lines: z.array(z.string()) })
    );
  },

  scriptSave: async (ctx: CliContext, input: { name: string; line: string }) => {
    const schema = z.object({ name: z.string().min(1), line: z.string().min(1) });
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: { code: 'INVALID_ARGUMENT', message: 'Invalid scriptSave input', details: parsed.error.flatten() } };
    }
    return execTyped(
      ctx,
      'script',
      ['save', parsed.data.name, parsed.data.line],
      z.object({ name: z.string(), saved: z.literal(true), lineCount: z.number() })
    );
  },

  scriptAppend: async (ctx: CliContext, input: { name: string; line: string }) => {
    const schema = z.object({ name: z.string().min(1), line: z.string().min(1) });
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: { code: 'INVALID_ARGUMENT', message: 'Invalid scriptAppend input', details: parsed.error.flatten() } };
    }
    return execTyped(
      ctx,
      'script',
      ['append', parsed.data.name, parsed.data.line],
      z.object({ name: z.string(), saved: z.literal(true), lineCount: z.number() })
    );
  },

  scriptDelete: async (ctx: CliContext, input: { name: string }) => {
    const schema = z.object({ name: z.string().min(1) });
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: { code: 'INVALID_ARGUMENT', message: 'Invalid scriptDelete input', details: parsed.error.flatten() } };
    }
    return execTyped(
      ctx,
      'script',
      ['delete', parsed.data.name],
      z.object({ name: z.string(), deleted: z.literal(true) })
    );
  },

  scriptRun: async (ctx: CliContext, input: { name: string; continueOnError?: boolean }) => {
    const schema = z.object({ name: z.string().min(1), continueOnError: z.boolean().optional() });
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: { code: 'INVALID_ARGUMENT', message: 'Invalid scriptRun input', details: parsed.error.flatten() } };
    }
    const args = ['run', parsed.data.name, ...(parsed.data.continueOnError ? ['--continue'] : [])];
    return execTyped(
      ctx,
      'script',
      args,
      z.object({ name: z.string(), ran: z.literal(true), count: z.number(), failures: z.number() })
    );
  },
} as const;


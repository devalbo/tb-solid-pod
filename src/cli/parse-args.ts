import type { ParsedArgs } from './types';

/**
 * Parse CLI arguments into positional args and options
 *
 * Supports:
 * - Positional arguments: `cmd arg1 arg2`
 * - Long options with values: `--name=value` or `--name value`
 * - Long boolean flags: `--flag`
 * - Short boolean flags: `-f`
 *
 * @example
 * parseCliArgs(['add', 'file.txt', '--force', '--name=test'])
 * // { positional: ['add', 'file.txt'], options: { force: true, name: 'test' } }
 */
export const parseCliArgs = (args: string[]): ParsedArgs => {
  const positional: string[] = [];
  const options: Record<string, string | boolean> = {};

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      // Long option: --name=value or --flag
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        options[key] = value;
      } else {
        const key = arg.slice(2);
        // Check if next arg is the value (doesn't start with -)
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          options[key] = args[++i];
        } else {
          options[key] = true;
        }
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      // Short option: -f
      const key = arg.slice(1);
      options[key] = true;
    } else {
      positional.push(arg);
    }
    i++;
  }

  return { positional, options };
};

/**
 * Get a string option value
 */
export const getOptionString = (
  options: Record<string, string | boolean>,
  key: string
): string | undefined => {
  const value = options[key];
  return typeof value === 'string' ? value : undefined;
};

/**
 * Get a boolean option value
 */
export const getOptionBoolean = (
  options: Record<string, string | boolean>,
  key: string
): boolean => {
  return options[key] === true || options[key] === 'true';
};

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// CLI Infrastructure
export { CliTerminal } from './CliTerminal';
export { commands } from './registry';
// Back-compat: keep `executeCommand` name, now returns a structured result.
export { executeCommandLine as executeCommand, exec } from './executor';
export { cliApi, createApiContext } from './api';
export { useCliInput } from './use-cli-input';
export { parseCliArgs, getOptionString, getOptionBoolean, generateId } from './parse-args';
export type { Command, CliContext, VirtualPod, OutputEntry, ParsedArgs } from './types';

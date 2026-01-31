/**
 * Spawn the Node CLI, send commands via stdin, collect stdout.
 * Used by terminal BDD tests.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const cliEntry = path.join(projectRoot, 'src/cli/run-node.tsx');

const DEFAULT_WAIT_MS = 2000;

export interface RunCliOptions {
  /** Commands to send (one per line). */
  commands: string[];
  /** Max ms to wait for output after sending commands. Default 2000. */
  waitMs?: number;
}

export interface RunCliResult {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: NodeJS.Signals | null;
}

/**
 * Run the Node CLI with the given commands on stdin; collect stdout/stderr and return.
 * Kills the process after waitMs. Requires tsx on PATH (npm run cli uses it).
 */
export function runCli({ commands, waitMs = DEFAULT_WAIT_MS }: RunCliOptions): Promise<RunCliResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['tsx', cliEntry], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.on('close', (code, signal) => {
      resolve({ stdout, stderr, code, signal });
    });

    // Send commands (each followed by newline)
    const input = commands.map((c) => c.trim() + '\n').join('');
    proc.stdin?.write(input, (err) => {
      if (err) {
        proc.kill('SIGTERM');
        reject(err);
        return;
      }
      proc.stdin?.end();
    });

    // Kill after wait so we get output; Ink may strip ANSI, we still get text
    setTimeout(() => {
      if (proc.kill('SIGTERM') === false) {
        proc.kill('SIGKILL');
      }
    }, waitMs);
  });
}

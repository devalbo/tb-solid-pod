/**
 * Terminal-only CLI E2E tests. Runs without Playwright (no browser).
 * Run with: npm run test:e2e:terminal
 *
 * Browser CLI scenarios run in Playwright (test:e2e) with grep for Example #1.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const cliEntry = path.join(projectRoot, 'src/cli/run-node.tsx');

const STARTUP_MS = 800;
const POLL_MS = 30;
const WAIT_TIMEOUT_MS = 5000;

type Session = {
  proc: ChildProcess;
  stdout: () => string;
  write: (cmd: string) => Promise<void>;
  waitForOutput: (needle: string, timeoutMs?: number) => Promise<void>;
  cleanup: () => void;
};

function startCli(): Session {
  const tmpDir = mkdtempSync(path.join(tmpdir(), 'tb-solid-pod-e2e-'));
  const storePath = path.join(tmpDir, 'store.json');
  const proc = spawn('npx', ['tsx', cliEntry], {
    cwd: projectRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false,
    env: { ...process.env, TB_SOLID_POD_DATA_PATH: storePath },
  });
  let stdout = '';
  proc.stdout?.on('data', (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  const getStdoutRef = () => stdout;
  const write = async (cmd: string) => {
    if (proc.stdin?.writable) {
      proc.stdin.write(cmd.trim() + '\n');
      if (cmd.trim() === 'clear') stdout = '';
    }
  };
  const waitForOutput = async (needle: string, timeoutMs = WAIT_TIMEOUT_MS) => {
    const lower = needle.toLowerCase();
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (getStdoutRef().toLowerCase().includes(lower)) return;
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    throw new Error(`Timeout ${timeoutMs}ms waiting for output containing "${needle}". Got:\n${getStdoutRef().slice(-500)}`);
  };
  const cleanup = () => {
    proc.kill('SIGTERM');
  };
  return { proc, stdout: getStdoutRef, write, waitForOutput, cleanup };
}

describe('CLI terminal E2E (no browser)', () => {
  let session: ReturnType<typeof startCli> | null = null;

  async function givenCli() {
    session = startCli();
    await new Promise((r) => setTimeout(r, STARTUP_MS));
  }

  function getStdout(): string {
    return session!.stdout();
  }

  afterEach(() => {
    if (session) session.cleanup();
    session = null;
  });

  it('Add a new contact via CLI', async () => {
    await givenCli();
    await session!.write('contact add JohnDoe --email=john@example.com');
    await session!.waitForOutput('added contact');
    expect(getStdout().toLowerCase()).toContain('added contact: johndoe');
  });

  it('State maintained: add contact then list shows the contact', async () => {
    await givenCli();
    await session!.write('contact add JaneSmith');
    await session!.waitForOutput('added contact');
    await session!.write('contact list');
    await session!.waitForOutput('janesmith');
    expect(getStdout().toLowerCase()).toContain('janesmith');
  });

  it('Show contact help', async () => {
    await givenCli();
    await session!.write('contact');
    await session!.waitForOutput('usage: contact');
    const out = getStdout().toLowerCase();
    expect(out).toContain('usage: contact');
    expect(out).toContain('subcommands');
    expect(out).toContain('add');
    expect(out).toContain('list');
  });

  it('Add a persona via CLI', async () => {
    await givenCli();
    await session!.write('persona create TestUser --email=test@example.com');
    await session!.waitForOutput('created persona');
    expect(getStdout().toLowerCase()).toContain('created persona: testuser');
  });

  it('List personas via CLI', async () => {
    await givenCli();
    await session!.write('persona list');
    await session!.waitForOutput('persona');
    expect(getStdout().toLowerCase()).toContain('persona');
  });

  it('State maintained: add persona then list shows the persona', async () => {
    await givenCli();
    await session!.write('persona create TestUser --email=test@example.com');
    await session!.waitForOutput('created persona');
    await session!.write('persona list');
    await session!.waitForOutput('testuser');
    expect(getStdout().toLowerCase()).toContain('testuser');
  });

  it('Show persona help', async () => {
    await givenCli();
    await session!.write('persona');
    await session!.waitForOutput('usage: persona');
    const out = getStdout().toLowerCase();
    expect(out).toContain('usage: persona');
    expect(out).toContain('subcommands');
    expect(out).toContain('create');
  });

  it('Show main help', async () => {
    await givenCli();
    await session!.write('help');
    await session!.waitForOutput('help');
    const out = getStdout().toLowerCase();
    expect(out).toContain('help');
    expect(out).toContain('contact');
    expect(out).toContain('persona');
  });

  it('Clear terminal output', async () => {
    await givenCli();
    await session!.write('contact list');
    await session!.waitForOutput('contact'); // "Contacts (" or "No contacts found"
    await session!.write('clear');
    await new Promise((r) => setTimeout(r, 100));
    const out = getStdout();
    expect(out).not.toContain('Contacts (');
    expect(out).not.toContain('No contacts found');
  });
});

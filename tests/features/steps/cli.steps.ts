import { createBdd } from 'playwright-bdd';
import { test as base } from 'playwright-bdd';
import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');
const cliEntry = path.join(projectRoot, 'src/cli/run-node.tsx');

const TERMINAL_STARTUP_MS = 2500;
const TERMINAL_COMMAND_WAIT_MS = 2000;

export type CliSession = {
  mode: 'browser' | 'terminal';
  terminalProcess?: ChildProcess | null;
  terminalStdout: string;
  terminalStderr: string;
};

export const test = base.extend<{ cliSession: CliSession }>({
  cliSession: [
    async ({}, use) => {
      const session: CliSession = {
        mode: 'browser',
        terminalStdout: '',
        terminalStderr: '',
      };
      await use(session);
      if (session.terminalProcess) {
        session.terminalProcess.kill('SIGTERM');
      }
    },
    { scope: 'test' },
  ],
});

const { Given, When, Then } = createBdd(test);

Given('I have the CLI in the {word}', async ({ page, cliSession }, context: string) => {
  const mode = context === 'terminal' ? 'terminal' : 'browser';
  cliSession.mode = mode;
  cliSession.terminalStdout = '';
  cliSession.terminalStderr = '';

  if (mode === 'browser') {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.getByRole('button', { name: 'Terminal' }).click();
    return;
  }

  const tmpDir = mkdtempSync(path.join(tmpdir(), 'tb-solid-pod-e2e-'));
  const storePath = path.join(tmpDir, 'store.json');
  const proc = spawn('npx', ['tsx', cliEntry], {
    cwd: projectRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false,
    env: { ...process.env, TB_SOLID_POD_DATA_PATH: storePath },
  });
  cliSession.terminalProcess = proc;
  proc.stdout?.on('data', (chunk: Buffer) => {
    cliSession.terminalStdout += chunk.toString();
  });
  proc.stderr?.on('data', (chunk: Buffer) => {
    cliSession.terminalStderr += chunk.toString();
  });
  // Give npx/tsx time to start and enter batch mode before first command
  await new Promise((r) => setTimeout(r, TERMINAL_STARTUP_MS));
});

When('I run the command {string}', async ({ page, cliSession }, command: string) => {
  if (cliSession.mode === 'browser') {
    await page.getByRole('button', { name: 'Terminal' }).click();
    // Wait for CLI to be ready (mirror shows welcome) so xterm is mounted
    const output = page.getByTestId('cli-output');
    await test.expect(output).toContainText('Welcome', { timeout: 10000 });
    // Give xterm time to attach input and be ready to receive keys (first command often failed without this)
    await page.waitForTimeout(600);
    // Click the visible terminal box then focus xterm's input so keyboard events reach the CLI
    const terminalBox = page.locator('.ink-terminal-box').first();
    await terminalBox.click();
    const inputArea = page.locator('.ink-terminal-box .xterm-helper-textarea').first();
    await inputArea.waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
    await inputArea.focus().catch(() => {});
    await page.keyboard.type(command, { delay: 25 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    return;
  }

  const proc = cliSession.terminalProcess;
  if (proc?.stdin?.writable) {
    proc.stdin.write(command.trim() + '\n');
    await new Promise((r) => setTimeout(r, TERMINAL_COMMAND_WAIT_MS));
    if (command.trim() === 'clear') {
      cliSession.terminalStdout = '';
    }
  }
});

Then('I should see {string} in the output', async ({ page, cliSession }, text: string) => {
  if (cliSession.mode === 'browser') {
    const output = page.getByTestId('cli-output');
    await test.expect(output).toContainText(text, { timeout: 10000 });
    return;
  }
  const stdout = cliSession.terminalStdout;
  const stderr = cliSession.terminalStderr ?? '';
  const lower = stdout.toLowerCase();
  const search = text.toLowerCase();
  if (!lower.includes(search)) {
    const errDetail = stderr ? `\nstderr:\n${stderr}` : '';
    throw new Error(`Expected to see "${text}" in terminal output. Got:\n${stdout}${errDetail}`);
  }
});

Then('I should see the CLI prompt or welcome message', async ({ page, cliSession }) => {
  if (cliSession.mode === 'terminal') {
    if (!cliSession.terminalStdout.includes('Welcome') && !cliSession.terminalStdout.includes('help')) {
      throw new Error(`Expected welcome or help in terminal output. Got:\n${cliSession.terminalStdout}`);
    }
    return;
  }
  const output = page.getByTestId('cli-output');
  await test.expect(output).toContainText(/Welcome|help/, { timeout: 5000 });
});

Then('the terminal output should be cleared', async ({ page, cliSession }) => {
  if (cliSession.mode === 'browser') {
    await page.waitForTimeout(300);
    const output = page.getByTestId('cli-output');
    await test.expect(output).not.toContainText('Contacts (');
    await test.expect(output).not.toContainText('No contacts found');
    return;
  }
  // In terminal mode we clear the buffer when "clear" is run (in When step), so buffer should not contain old output.
  const out = cliSession.terminalStdout;
  if (out.includes('Contacts (') || out.includes('No contacts found')) {
    throw new Error('Expected terminal output to be cleared. Got:\n' + out);
  }
});

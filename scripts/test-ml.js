import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const mlDir = path.join(rootDir, 'ml-service');

const venvPytestWin = path.join(mlDir, '.venv', 'Scripts', 'pytest.exe');
const venvPytestUnix = path.join(mlDir, '.venv', 'bin', 'pytest');
const venvPythonWin = path.join(mlDir, '.venv', 'Scripts', 'python.exe');
const venvPythonUnix = path.join(mlDir, '.venv', 'bin', 'python');

let cmd;
let args = [];

if (fs.existsSync(venvPytestWin)) {
  cmd = venvPytestWin;
} else if (fs.existsSync(venvPytestUnix)) {
  cmd = venvPytestUnix;
} else if (fs.existsSync(venvPythonWin)) {
  cmd = venvPythonWin;
  args = ['-m', 'pytest'];
} else if (fs.existsSync(venvPythonUnix)) {
  cmd = venvPythonUnix;
  args = ['-m', 'pytest'];
} else {
  cmd = process.platform === 'win32' ? 'python' : 'python3';
  args = ['-m', 'pytest'];
}

const child = spawn(cmd, args, { cwd: mlDir, stdio: 'inherit', shell: false });

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('[ML Test Runner Error]:', err.message);
  process.exit(1);
});

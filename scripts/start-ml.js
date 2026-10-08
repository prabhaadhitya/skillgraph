import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const mlDir = path.join(rootDir, 'ml-service');

const venvWin = path.join(mlDir, '.venv', 'Scripts', 'python.exe');
const venvUnix = path.join(mlDir, '.venv', 'bin', 'python');

let cmd;
let args;

if (fs.existsSync(venvWin)) {
  cmd = venvWin;
  args = ['-m', 'uvicorn', 'app.main:app', '--port', '8000', '--reload'];
} else if (fs.existsSync(venvUnix)) {
  cmd = venvUnix;
  args = ['-m', 'uvicorn', 'app.main:app', '--port', '8000', '--reload'];
} else {
  cmd = process.platform === 'win32' ? 'python' : 'python3';
  args = ['-m', 'uvicorn', 'app.main:app', '--port', '8000', '--reload'];
}

const child = spawn(cmd, args, { cwd: mlDir, stdio: 'inherit', shell: false });

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('[ML Service Starter Error]:', err.message);
  process.exit(1);
});

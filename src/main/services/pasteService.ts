import { spawn } from 'node:child_process';
import { platform } from 'node:os';

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `Paste command failed with exit code ${code}.`));
    });
  });
}

export async function attemptPaste(): Promise<{ ok: boolean; needsPermission?: boolean; error?: string }> {
  try {
    if (platform() === 'darwin') {
      await run('osascript', ['-e', 'tell application "System Events" to keystroke "v" using command down']);
    } else if (platform() === 'win32') {
      await run('powershell.exe', [
        '-NoProfile',
        '-WindowStyle',
        'Hidden',
        '-Command',
        'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")'
      ]);
    } else {
      await run('xdotool', ['key', 'ctrl+v']);
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      needsPermission: platform() === 'darwin',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}


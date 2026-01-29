import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

export interface PythonLspServerOptions {
  /** Root URI for the workspace (the Python project directory) */
  rootUri: string;
  /** Directory containing the pylsp installation (with poetry) */
  serverDir: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to pylsp */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for pylsp (Python Language Server).
 *
 * Requires pylsp to be installed via poetry in the serverDir:
 *   cd serverDir && poetry add python-lsp-server
 *
 * @see https://github.com/python-lsp/python-lsp-server
 */
export function createPythonLspClient(options: PythonLspServerOptions): LSPClient {
  const { rootUri, serverDir, logger, serverArgs = ['-v'] } = options;

  if (!fs.existsSync(serverDir)) {
    throw new Error(`Server directory not found: ${serverDir}`);
  }

  return new LSPClient({
    serverCommand: 'poetry',
    serverArgs: ['run', 'pylsp', ...serverArgs],
    rootUri,
    logger,
    cwd: serverDir,
  });
}

/**
 * Recursively find all Python files in a directory.
 */
export function findPythonFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['node_modules', 'venv', '.venv', '__pycache__', 'build', 'dist'].includes(entry.name)) {
      files.push(...findPythonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.py')) {
      files.push(fullPath);
    }
  }
  return files;
}

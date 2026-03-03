import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

const PICKBASIC_EXTENSIONS = ['.bp', '.b', '.bas', '.basic'];
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', 'out', '.venv', 'venv', '__pycache__'];

export interface PickbasicLspServerOptions {
  /** Root URI for the workspace */
  rootUri: string;
  /** Directory containing the pickbasic-lsp installation (with poetry) */
  serverDir: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to pickbasic-lsp */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for pickbasic-lsp (Pick BASIC Language Server).
 *
 * Requires pickbasic-lsp to be installed via poetry in the serverDir:
 *   cd serverDir && poetry install
 *
 * @see https://github.com/avishek-sen-gupta/pickbasic-grammar
 */
export function createPickbasicLspClient(options: PickbasicLspServerOptions): LSPClient {
  const { rootUri, serverDir, logger, serverArgs = [] } = options;

  if (!fs.existsSync(serverDir)) {
    throw new Error(`Server directory not found: ${serverDir}`);
  }

  return new LSPClient({
    serverCommand: 'poetry',
    serverArgs: ['run', 'pickbasic-lsp', ...serverArgs],
    rootUri,
    logger,
    cwd: serverDir,
  });
}

/**
 * Recursively find all Pick BASIC files in a directory.
 */
export function findPickbasicFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !EXCLUDED_DIRS.includes(entry.name)) {
      files.push(...findPickbasicFiles(fullPath));
    } else if (entry.isFile() && PICKBASIC_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

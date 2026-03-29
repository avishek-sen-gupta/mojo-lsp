import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

const SERVER_COMMAND = 'poetry';
const HLASM_EXTENSIONS = ['.hlasm', '.asm', '.mac', '.copy', '.s'];
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', 'out', '.venv', 'venv', '__pycache__'];

export interface HlasmLspServerOptions {
  /** Root URI for the workspace */
  rootUri: string;
  /** Directory containing the hlasm-lsp installation (with poetry) */
  serverDir: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to hlasm-lsp */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for hlasm-lsp (HLASM Language Server).
 *
 * Requires hlasm-lsp to be installed via poetry in the serverDir:
 *   cd serverDir && poetry install
 */
export function createHlasmLspClient(options: HlasmLspServerOptions): LSPClient {
  const { rootUri, serverDir, logger, serverArgs = [] } = options;

  if (!fs.existsSync(serverDir)) {
    throw new Error(`Server directory not found: ${serverDir}`);
  }

  return new LSPClient({
    serverCommand: SERVER_COMMAND,
    serverArgs: ['run', 'python', '-m', 'hlasm_lsp', ...serverArgs],
    rootUri,
    logger,
    cwd: serverDir,
  });
}

/**
 * Recursively find all HLASM files in a directory.
 */
export function findHlasmFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !EXCLUDED_DIRS.includes(entry.name)) {
      files.push(...findHlasmFiles(fullPath));
    } else if (entry.isFile() && HLASM_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

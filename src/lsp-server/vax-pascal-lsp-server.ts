import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

const SERVER_COMMAND = 'poetry';
const VAX_PASCAL_EXTENSIONS = ['.pas', '.p'];
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', 'out', '.venv', 'venv', '__pycache__'];

export interface VaxPascalLspServerOptions {
  /** Root URI for the workspace */
  rootUri: string;
  /** Directory containing the vax-pascal-lsp installation (with poetry) */
  serverDir: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to vax-pascal-lsp */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for vax-pascal-lsp (VAX Pascal Language Server).
 *
 * Requires vax-pascal-lsp to be installed via poetry in the serverDir:
 *   cd serverDir && poetry install
 */
export function createVaxPascalLspClient(options: VaxPascalLspServerOptions): LSPClient {
  const { rootUri, serverDir, logger, serverArgs = [] } = options;

  if (!fs.existsSync(serverDir)) {
    throw new Error(`Server directory not found: ${serverDir}`);
  }

  return new LSPClient({
    serverCommand: SERVER_COMMAND,
    serverArgs: ['run', 'vax-pascal-lsp', ...serverArgs],
    rootUri,
    logger,
    cwd: serverDir,
  });
}

/**
 * Recursively find all VAX Pascal files in a directory.
 */
export function findVaxPascalFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !EXCLUDED_DIRS.includes(entry.name)) {
      files.push(...findVaxPascalFiles(fullPath));
    } else if (entry.isFile() && VAX_PASCAL_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as fs from 'fs';
import { findFilesByExtension } from './find-files';

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
  return findFilesByExtension(dir, HLASM_EXTENSIONS, EXCLUDED_DIRS);
}

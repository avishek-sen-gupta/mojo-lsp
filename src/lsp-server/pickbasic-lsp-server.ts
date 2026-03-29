import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as fs from 'fs';
import { findFilesByExtension } from './find-files';

const SERVER_COMMAND = 'poetry';
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
    serverCommand: SERVER_COMMAND,
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
  return findFilesByExtension(dir, PICKBASIC_EXTENSIONS, EXCLUDED_DIRS);
}

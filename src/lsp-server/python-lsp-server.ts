import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as fs from 'fs';
import { findFilesByExtension } from './find-files';

const SERVER_COMMAND = 'poetry';
const DEFAULT_ARGS = ['-v'];
const PYTHON_EXTENSIONS = ['.py'];
const EXCLUDED_DIRS = ['node_modules', 'venv', '.venv', '__pycache__', 'build', 'dist'];

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
  const { rootUri, serverDir, logger, serverArgs = DEFAULT_ARGS } = options;

  if (!fs.existsSync(serverDir)) {
    throw new Error(`Server directory not found: ${serverDir}`);
  }

  return new LSPClient({
    serverCommand: SERVER_COMMAND,
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
  return findFilesByExtension(dir, PYTHON_EXTENSIONS, EXCLUDED_DIRS);
}

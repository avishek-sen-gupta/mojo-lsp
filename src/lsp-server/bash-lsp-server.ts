import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import { findFilesByExtension } from './find-files';

const SERVER_COMMAND = 'bash-language-server';
const DEFAULT_ARGS = ['start'];
const BASH_EXTENSIONS = ['.sh', '.bash'];
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', 'out', 'vendor'];

export interface BashLspServerOptions {
  /** Root URI for the workspace */
  rootUri: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to bash-language-server */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for bash-language-server.
 *
 * Requires bash-language-server to be installed:
 *   npm install -g bash-language-server
 *
 * @see https://github.com/bash-lsp/bash-language-server
 */
export function createBashLspClient(options: BashLspServerOptions): LSPClient {
  const { rootUri, logger, serverArgs = DEFAULT_ARGS } = options;

  return new LSPClient({
    serverCommand: SERVER_COMMAND,
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all Bash script files in a directory.
 */
export function findBashFiles(dir: string): string[] {
  return findFilesByExtension(dir, BASH_EXTENSIONS, EXCLUDED_DIRS);
}

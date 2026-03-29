import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import { findFilesByExtension } from './find-files';

const SERVER_COMMAND = 'intelephense';
const DEFAULT_ARGS = ['--stdio'];
const PHP_EXTENSIONS = ['.php', '.phtml'];
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', 'out', 'vendor'];

export interface PhpLspServerOptions {
  /** Root URI for the workspace */
  rootUri: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to intelephense */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for intelephense (PHP).
 *
 * Requires intelephense to be installed:
 *   npm install -g intelephense
 *
 * @see https://github.com/bmewburn/intelephense-docs
 */
export function createPhpLspClient(options: PhpLspServerOptions): LSPClient {
  const { rootUri, logger, serverArgs = DEFAULT_ARGS } = options;

  return new LSPClient({
    serverCommand: SERVER_COMMAND,
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all PHP files in a directory.
 */
export function findPhpFiles(dir: string): string[] {
  return findFilesByExtension(dir, PHP_EXTENSIONS, EXCLUDED_DIRS);
}

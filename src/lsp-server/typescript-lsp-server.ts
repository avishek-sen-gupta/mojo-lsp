import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import { findFilesByExtension } from './find-files';

const SERVER_COMMAND = 'typescript-language-server';
const DEFAULT_ARGS = ['--stdio'];
const TYPESCRIPT_EXTENSIONS = ['.ts', '.tsx'];
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', 'out'];

export interface TypescriptLspServerOptions {
  /** Root URI for the workspace */
  rootUri: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to typescript-language-server */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for typescript-language-server.
 *
 * Requires typescript-language-server to be installed:
 *   npm install -g typescript-language-server typescript
 *
 * @see https://github.com/typescript-language-server/typescript-language-server
 */
export function createTypescriptLspClient(options: TypescriptLspServerOptions): LSPClient {
  const { rootUri, logger, serverArgs = DEFAULT_ARGS } = options;

  return new LSPClient({
    serverCommand: SERVER_COMMAND,
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all TypeScript files in a directory.
 */
export function findTypescriptFiles(dir: string): string[] {
  return findFilesByExtension(dir, TYPESCRIPT_EXTENSIONS, EXCLUDED_DIRS);
}

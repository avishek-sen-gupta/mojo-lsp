import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import { fileURLToPath } from 'url';
import { findFilesByExtension } from './find-files';

const SERVER_COMMAND = 'solargraph';
const DEFAULT_ARGS = ['stdio'];
const RUBY_EXTENSIONS = ['.rb'];
const EXCLUDED_DIRS = ['node_modules', 'vendor', 'tmp', 'log'];

export interface RubyLspServerOptions {
  /** Root URI for the workspace (the Ruby project directory) */
  rootUri: string;
  /** Optional logger */
  logger?: Logger;
  /** Working directory for the server process (defaults to project directory) */
  cwd?: string;
  /** Additional arguments to pass to solargraph */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for Solargraph (Ruby Language Server).
 *
 * Requires solargraph to be installed:
 *   gem install solargraph
 *
 * @see https://solargraph.org/
 */
export function createRubyLspClient(options: RubyLspServerOptions): LSPClient {
  const { rootUri, logger, serverArgs = DEFAULT_ARGS } = options;

  const projectDir = options.cwd || fileURLToPath(rootUri);

  return new LSPClient({
    serverCommand: SERVER_COMMAND,
    serverArgs,
    rootUri,
    cwd: projectDir,
    logger,
  });
}

/**
 * Recursively find all Ruby files in a directory.
 */
export function findRubyFiles(dir: string): string[] {
  return findFilesByExtension(dir, RUBY_EXTENSIONS, EXCLUDED_DIRS);
}

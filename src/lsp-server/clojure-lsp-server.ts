import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import { findFilesByExtension } from './find-files';

const SERVER_COMMAND = 'clojure-lsp';
const CLOJURE_EXTENSIONS = ['.clj', '.cljs', '.cljc', '.edn'];
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', 'out', 'target', '.cpcache'];

export interface ClojureLspServerOptions {
  /** Root URI for the workspace */
  rootUri: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to clojure-lsp */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for clojure-lsp.
 *
 * Requires clojure-lsp to be installed:
 *   brew install clojure-lsp/brew/clojure-lsp-native
 *
 * @see https://github.com/clojure-lsp/clojure-lsp
 */
export function createClojureLspClient(options: ClojureLspServerOptions): LSPClient {
  const { rootUri, logger, serverArgs = [] } = options;

  return new LSPClient({
    serverCommand: SERVER_COMMAND,
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all Clojure files in a directory.
 */
export function findClojureFiles(dir: string): string[] {
  return findFilesByExtension(dir, CLOJURE_EXTENSIONS, EXCLUDED_DIRS);
}

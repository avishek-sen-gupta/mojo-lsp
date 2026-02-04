import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

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
    serverCommand: 'clojure-lsp',
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all Clojure files in a directory.
 */
export function findClojureFiles(dir: string): string[] {
  const files: string[] = [];
  const clojureExtensions = ['.clj', '.cljs', '.cljc', '.edn'];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['node_modules', 'dist', 'build', 'out', 'target', '.cpcache'].includes(entry.name)) {
      files.push(...findClojureFiles(fullPath));
    } else if (entry.isFile() && clojureExtensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

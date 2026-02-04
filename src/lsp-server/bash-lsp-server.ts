import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

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
  const { rootUri, logger, serverArgs = ['start'] } = options;

  return new LSPClient({
    serverCommand: 'bash-language-server',
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all Bash script files in a directory.
 */
export function findBashFiles(dir: string): string[] {
  const files: string[] = [];
  const bashExtensions = ['.sh', '.bash'];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['node_modules', 'dist', 'build', 'out', 'vendor'].includes(entry.name)) {
      files.push(...findBashFiles(fullPath));
    } else if (entry.isFile() && bashExtensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export interface GoLspServerOptions {
  /** Root URI for the workspace */
  rootUri: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to gopls */
  serverArgs?: string[];
  /** Path to gopls executable (default: ~/go/bin/gopls) */
  serverPath?: string;
}

/**
 * Creates an LSPClient configured for gopls.
 *
 * Requires gopls to be installed:
 *   go install golang.org/x/tools/gopls@latest
 *
 * @see https://github.com/golang/tools/tree/master/gopls
 */
export function createGoLspClient(options: GoLspServerOptions): LSPClient {
  const { rootUri, logger, serverArgs = [] } = options;
  const serverPath = options.serverPath || path.join(os.homedir(), 'go', 'bin', 'gopls');

  if (!fs.existsSync(serverPath)) {
    throw new Error(`gopls not found at: ${serverPath}. Install with: go install golang.org/x/tools/gopls@latest`);
  }

  return new LSPClient({
    serverCommand: serverPath,
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all Go files in a directory.
 */
export function findGoFiles(dir: string): string[] {
  const files: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['node_modules', 'dist', 'build', 'out', 'vendor'].includes(entry.name)) {
      files.push(...findGoFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.go')) {
      files.push(fullPath);
    }
  }

  return files;
}

import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { findFilesByExtension } from './find-files';

const DEFAULT_SERVER_PATH = 'gopls';
const GO_EXTENSIONS = ['.go'];
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', 'out', 'vendor'];

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
  const serverPath = options.serverPath || path.join(os.homedir(), 'go', 'bin', DEFAULT_SERVER_PATH);

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
  return findFilesByExtension(dir, GO_EXTENSIONS, EXCLUDED_DIRS);
}

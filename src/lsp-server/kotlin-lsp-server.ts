import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

export interface KotlinLspServerOptions {
  /** Root URI for the workspace */
  rootUri: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to kotlin-lsp */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for kotlin-lsp.
 *
 * Requires kotlin-lsp to be installed:
 *   brew install kotlin-lsp
 *
 * @see https://github.com/fwcd/kotlin-language-server
 */
export function createKotlinLspClient(options: KotlinLspServerOptions): LSPClient {
  const { rootUri, logger, serverArgs = ['--stdio'] } = options;

  return new LSPClient({
    serverCommand: 'kotlin-lsp',
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all Kotlin files in a directory.
 */
export function findKotlinFiles(dir: string): string[] {
  const files: string[] = [];
  const kotlinExtensions = ['.kt', '.kts'];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['node_modules', 'dist', 'build', 'out', 'target', '.gradle'].includes(entry.name)) {
      files.push(...findKotlinFiles(fullPath));
    } else if (entry.isFile() && kotlinExtensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

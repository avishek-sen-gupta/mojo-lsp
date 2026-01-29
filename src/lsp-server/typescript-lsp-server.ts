import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

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
  const { rootUri, logger, serverArgs = ['--stdio'] } = options;

  return new LSPClient({
    serverCommand: 'typescript-language-server',
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all TypeScript files in a directory.
 */
export function findTypescriptFiles(dir: string): string[] {
  const files: string[] = [];
  const tsExtensions = ['.ts', '.tsx'];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['node_modules', 'dist', 'build', 'out'].includes(entry.name)) {
      files.push(...findTypescriptFiles(fullPath));
    } else if (entry.isFile() && tsExtensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

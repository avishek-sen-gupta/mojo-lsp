import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

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
  const { rootUri, logger, serverArgs = ['--stdio'] } = options;

  return new LSPClient({
    serverCommand: 'intelephense',
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all PHP files in a directory.
 */
export function findPhpFiles(dir: string): string[] {
  const files: string[] = [];
  const phpExtensions = ['.php', '.phtml'];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['node_modules', 'dist', 'build', 'out', 'vendor'].includes(entry.name)) {
      files.push(...findPhpFiles(fullPath));
    } else if (entry.isFile() && phpExtensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

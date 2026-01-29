import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

export interface PerlLspServerOptions {
  /** Path to the PerlNavigator executable */
  serverPath: string;
  /** Root URI for the workspace */
  rootUri: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to PerlNavigator */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for PerlNavigator.
 *
 * Requires PerlNavigator to be installed:
 *   Download from https://github.com/bscan/PerlNavigator/releases
 *
 * @see https://github.com/bscan/PerlNavigator
 */
export function createPerlLspClient(options: PerlLspServerOptions): LSPClient {
  const { serverPath, rootUri, logger, serverArgs = ['--stdio'] } = options;

  if (!fs.existsSync(serverPath)) {
    throw new Error(`PerlNavigator not found: ${serverPath}`);
  }

  return new LSPClient({
    serverCommand: serverPath,
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all Perl files in a directory.
 */
export function findPerlFiles(dir: string): string[] {
  const files: string[] = [];
  const perlExtensions = ['.pl', '.pm', '.t'];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['node_modules', 'blib', 'local'].includes(entry.name)) {
      files.push(...findPerlFiles(fullPath));
    } else if (entry.isFile() && perlExtensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

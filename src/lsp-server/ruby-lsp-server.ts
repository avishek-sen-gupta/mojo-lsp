import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

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
  const { rootUri, logger, serverArgs = ['stdio'] } = options;

  // Extract project directory from rootUri for cwd
  const projectDir = options.cwd || rootUri.replace('file://', '');

  return new LSPClient({
    serverCommand: 'solargraph',
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
  const files: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['node_modules', 'vendor', 'tmp', 'log'].includes(entry.name)) {
      files.push(...findRubyFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.rb')) {
      files.push(fullPath);
    }
  }

  return files;
}

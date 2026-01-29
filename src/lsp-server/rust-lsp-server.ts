import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

export interface RustLspServerOptions {
  /** Root URI for the workspace (the Rust project directory) */
  rootUri: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to rust-analyzer */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for rust-analyzer.
 *
 * Requires rust-analyzer to be installed:
 *   - macOS: brew install rust-analyzer
 *   - Or via rustup: rustup component add rust-analyzer
 *   - Or download from https://rust-analyzer.github.io/
 *
 * @see https://rust-analyzer.github.io/
 */
export function createRustLspClient(options: RustLspServerOptions): LSPClient {
  const { rootUri, logger, serverArgs = [] } = options;

  return new LSPClient({
    serverCommand: 'rust-analyzer',
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all Rust files in a directory.
 */
export function findRustFiles(dir: string): string[] {
  const files: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['target', 'node_modules', 'vendor'].includes(entry.name)) {
      files.push(...findRustFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.rs')) {
      files.push(fullPath);
    }
  }

  return files;
}

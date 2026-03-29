import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import { findFilesByExtension } from './find-files';

const SERVER_COMMAND = 'rust-analyzer';
const RUST_EXTENSIONS = ['.rs'];
const EXCLUDED_DIRS = ['target', 'node_modules', 'vendor'];

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
    serverCommand: SERVER_COMMAND,
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all Rust files in a directory.
 */
export function findRustFiles(dir: string): string[] {
  return findFilesByExtension(dir, RUST_EXTENSIONS, EXCLUDED_DIRS);
}

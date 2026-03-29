import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import { findFilesByExtension } from './find-files';

const SERVER_COMMAND = 'kotlin-lsp';
const DEFAULT_ARGS = ['--stdio'];
const KOTLIN_EXTENSIONS = ['.kt', '.kts'];
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', 'out', 'target', '.gradle'];

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
  const { rootUri, logger, serverArgs = DEFAULT_ARGS } = options;

  return new LSPClient({
    serverCommand: SERVER_COMMAND,
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all Kotlin files in a directory.
 */
export function findKotlinFiles(dir: string): string[] {
  return findFilesByExtension(dir, KOTLIN_EXTENSIONS, EXCLUDED_DIRS);
}

import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import { findFilesByExtension } from './find-files';

const SERVER_COMMAND = 'jdtls';
const JAVA_EXTENSIONS = ['.java'];
const EXCLUDED_DIRS = ['node_modules', 'target', 'build', 'bin', '.gradle'];

export interface JavaLspServerOptions {
  /** Root URI for the workspace (the Java project directory) */
  rootUri: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to jdtls */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for Eclipse JDT Language Server (jdtls).
 *
 * Requires jdtls to be installed:
 *   - macOS: brew install jdtls
 *   - Or download from https://download.eclipse.org/jdtls/snapshots/
 *
 * @see https://github.com/eclipse-jdtls/eclipse.jdt.ls
 */
export function createJavaLspClient(options: JavaLspServerOptions): LSPClient {
  const { rootUri, logger, serverArgs = [] } = options;

  return new LSPClient({
    serverCommand: SERVER_COMMAND,
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all Java files in a directory.
 */
export function findJavaFiles(dir: string): string[] {
  return findFilesByExtension(dir, JAVA_EXTENSIONS, EXCLUDED_DIRS);
}

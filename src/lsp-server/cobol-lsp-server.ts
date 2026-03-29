import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as fs from 'fs';
import { findFilesByExtension } from './find-files';

const SERVER_COMMAND = 'java';
const ALLOWED_HOSTS = ['localhost', '127.0.0.1', '::1'];
const DEFAULT_PORT = 1044;
const COBOL_EXTENSIONS = ['.cob', '.cbl', '.cobol', '.CBL', '.COB', '.COBOL'];
const EXCLUDED_DIRS = ['node_modules', 'target', 'build', 'dist'];

export interface CobolLspServerOptions {
  /** Path to the Che4z COBOL LSP server JAR file */
  serverJar: string;
  /** Root URI for the workspace */
  rootUri: string;
  /** Optional logger */
  logger?: Logger;
  /** Socket port (default: 1044) */
  port?: number;
  /** Socket host (default: localhost) */
  host?: string;
}

/**
 * Creates an LSPClient configured for the Che4z COBOL Language Server.
 *
 * The Che4z COBOL Language Server is a Java-based LSP server that uses socket communication.
 *
 * @see https://github.com/eclipse-che4z/che-che4z-lsp-for-cobol
 */
export function createCobolLspClient(options: CobolLspServerOptions): LSPClient {
  const { serverJar, rootUri, logger, port = DEFAULT_PORT, host = 'localhost' } = options;
  if (!ALLOWED_HOSTS.includes(host)) {
    throw new Error(`Socket host must be one of ${ALLOWED_HOSTS.join(', ')}. Got: ${host}`);
  }

  if (!fs.existsSync(serverJar)) {
    throw new Error(`Server JAR not found: ${serverJar}`);
  }

  return new LSPClient({
    serverCommand: SERVER_COMMAND,
    serverArgs: ['-jar', serverJar],
    rootUri,
    logger,
    socket: { port, host },
  });
}

/**
 * Recursively find all COBOL files in a directory.
 */
export function findCobolFiles(dir: string): string[] {
  return findFilesByExtension(dir, COBOL_EXTENSIONS, EXCLUDED_DIRS);
}

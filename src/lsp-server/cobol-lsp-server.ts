import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

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
  const { serverJar, rootUri, logger, port = 1044, host = 'localhost' } = options;

  if (!fs.existsSync(serverJar)) {
    throw new Error(`Server JAR not found: ${serverJar}`);
  }

  return new LSPClient({
    serverCommand: 'java',
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
  const files: string[] = [];
  const cobolExtensions = ['.cob', '.cbl', '.cobol', '.CBL', '.COB', '.COBOL'];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['node_modules', 'target', 'build', 'dist'].includes(entry.name)) {
      files.push(...findCobolFiles(fullPath));
    } else if (entry.isFile() && cobolExtensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

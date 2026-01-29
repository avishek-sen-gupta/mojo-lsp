import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

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
    serverCommand: 'jdtls',
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all Java files in a directory.
 */
export function findJavaFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['node_modules', 'target', 'build', 'bin', '.gradle'].includes(entry.name)) {
      files.push(...findJavaFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.java')) {
      files.push(fullPath);
    }
  }

  return files;
}

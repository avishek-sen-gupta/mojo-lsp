import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as fs from 'fs';

export interface SqlLspServerOptions {
  /** Path to the sql-language-server executable */
  serverPath: string;
  /** Root URI for the workspace */
  rootUri: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to sql-language-server */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for sql-language-server.
 *
 * Requires sql-language-server to be installed:
 *   npm install sql-language-server
 *
 * @see https://github.com/joe-re/sql-language-server
 */
export function createSqlLspClient(options: SqlLspServerOptions): LSPClient {
  const { serverPath, rootUri, logger, serverArgs = ['up', '--method', 'stdio'] } = options;

  if (!fs.existsSync(serverPath)) {
    throw new Error(`SQL language server not found: ${serverPath}`);
  }

  return new LSPClient({
    serverCommand: serverPath,
    serverArgs,
    rootUri,
    logger,
  });
}

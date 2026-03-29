import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as fs from 'fs';
import { findFilesByExtension } from './find-files';

const DEFAULT_ARGS = ['--stdio'];
const PERL_EXTENSIONS = ['.pl', '.pm', '.t'];
const EXCLUDED_DIRS = ['node_modules', 'blib', 'local'];

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
  const { serverPath, rootUri, logger, serverArgs = DEFAULT_ARGS } = options;

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
  return findFilesByExtension(dir, PERL_EXTENSIONS, EXCLUDED_DIRS);
}

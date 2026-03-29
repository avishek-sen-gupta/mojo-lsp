import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import { findFilesByExtension } from './find-files';

const SERVER_COMMAND = 'csharp-ls';
const DEFAULT_LOG_LEVEL = 'INFO';
const CSHARP_EXTENSIONS = ['.cs'];
const EXCLUDED_DIRS = ['bin', 'obj'];

export interface CsharpLspServerOptions {
  /** Root URI for the workspace (the C# project/solution directory) */
  rootUri: string;
  /** Path to the .sln solution file */
  solutionPath: string;
  /** Optional logger */
  logger?: Logger;
  /** Log level (default: 'INFO') */
  logLevel?: string;
  /** Additional arguments to pass to csharp-ls */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for csharp-ls (C# Language Server).
 *
 * Requires csharp-ls to be installed:
 *   dotnet tool install --global csharp-ls
 *
 * @see https://github.com/razzmatazz/csharp-language-server
 */
export function createCsharpLspClient(options: CsharpLspServerOptions): LSPClient {
  const { rootUri, solutionPath, logger, logLevel = DEFAULT_LOG_LEVEL, serverArgs = [] } = options;

  return new LSPClient({
    serverCommand: SERVER_COMMAND,
    serverArgs: ['--loglevel', logLevel, '--solution', solutionPath, ...serverArgs],
    rootUri,
    logger,
  });
}

/**
 * Recursively find all C# files in a directory.
 */
export function findCsharpFiles(dir: string): string[] {
  return findFilesByExtension(dir, CSHARP_EXTENSIONS, EXCLUDED_DIRS);
}

import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

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
  const { rootUri, solutionPath, logger, logLevel = 'INFO', serverArgs = [] } = options;

  return new LSPClient({
    serverCommand: 'csharp-ls',
    serverArgs: ['--loglevel', logLevel, '--solution', solutionPath, ...serverArgs],
    rootUri,
    logger,
  });
}

/**
 * Recursively find all C# files in a directory.
 */
export function findCsharpFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        entry.name !== 'bin' && entry.name !== 'obj') {
      files.push(...findCsharpFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.cs')) {
      files.push(fullPath);
    }
  }

  return files;
}

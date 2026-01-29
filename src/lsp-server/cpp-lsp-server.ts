import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

export interface CppLspServerOptions {
  /** Root URI for the workspace (the C++ project directory) */
  rootUri: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to clangd (default: ['--log=error']) */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for clangd (C/C++ Language Server).
 *
 * Requires clangd to be installed:
 *   - macOS: brew install llvm (clangd is included)
 *   - Ubuntu: apt install clangd
 *   - Or download from https://clangd.llvm.org/installation
 *
 * For best results, generate compile_commands.json in your project:
 *   cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON .
 *
 * @see https://clangd.llvm.org/
 */
export function createCppLspClient(options: CppLspServerOptions): LSPClient {
  const { rootUri, logger, serverArgs = ['--log=error'] } = options;

  return new LSPClient({
    serverCommand: 'clangd',
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all C/C++ files in a directory.
 */
export function findCppFiles(dir: string): string[] {
  const files: string[] = [];
  const cppExtensions = ['.cpp', '.cc', '.cxx', '.c', '.hpp', '.h', '.hxx'];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['build', 'cmake-build-debug', 'cmake-build-release', 'node_modules', 'third_party'].includes(entry.name)) {
      files.push(...findCppFiles(fullPath));
    } else if (entry.isFile() && cppExtensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

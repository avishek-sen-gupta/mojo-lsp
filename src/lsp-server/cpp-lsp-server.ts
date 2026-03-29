import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import { findFilesByExtension } from './find-files';

const SERVER_COMMAND = 'clangd';
const DEFAULT_ARGS = ['--log=error'];
const CPP_EXTENSIONS = ['.cpp', '.cc', '.cxx', '.c', '.hpp', '.h', '.hxx'];
const EXCLUDED_DIRS = ['build', 'cmake-build-debug', 'cmake-build-release', 'node_modules', 'third_party'];

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
  const { rootUri, logger, serverArgs = DEFAULT_ARGS } = options;

  return new LSPClient({
    serverCommand: SERVER_COMMAND,
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all C/C++ files in a directory.
 */
export function findCppFiles(dir: string): string[] {
  return findFilesByExtension(dir, CPP_EXTENSIONS, EXCLUDED_DIRS);
}

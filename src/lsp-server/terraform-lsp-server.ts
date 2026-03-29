import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import { findFilesByExtension } from './find-files';

const SERVER_COMMAND = 'terraform-ls';
const DEFAULT_ARGS = ['serve'];
const TERRAFORM_EXTENSIONS = ['.tf', '.tfvars'];
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', 'out', '.terraform'];

export interface TerraformLspServerOptions {
  /** Root URI for the workspace */
  rootUri: string;
  /** Optional logger */
  logger?: Logger;
  /** Additional arguments to pass to terraform-ls */
  serverArgs?: string[];
}

/**
 * Creates an LSPClient configured for terraform-ls.
 *
 * Requires terraform-ls to be installed:
 *   brew install hashicorp/tap/terraform-ls
 *
 * @see https://github.com/hashicorp/terraform-ls
 */
export function createTerraformLspClient(options: TerraformLspServerOptions): LSPClient {
  const { rootUri, logger, serverArgs = DEFAULT_ARGS } = options;

  return new LSPClient({
    serverCommand: SERVER_COMMAND,
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all Terraform files in a directory.
 */
export function findTerraformFiles(dir: string): string[] {
  return findFilesByExtension(dir, TERRAFORM_EXTENSIONS, EXCLUDED_DIRS);
}

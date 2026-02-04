import { LSPClient } from '../lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

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
  const { rootUri, logger, serverArgs = ['serve'] } = options;

  return new LSPClient({
    serverCommand: 'terraform-ls',
    serverArgs,
    rootUri,
    logger,
  });
}

/**
 * Recursively find all Terraform files in a directory.
 */
export function findTerraformFiles(dir: string): string[] {
  const files: string[] = [];
  const terraformExtensions = ['.tf', '.tfvars'];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['node_modules', 'dist', 'build', 'out', '.terraform'].includes(entry.name)) {
      files.push(...findTerraformFiles(fullPath));
    } else if (entry.isFile() && terraformExtensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

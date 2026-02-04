import { createTerraformLspClient } from '../lsp-server/terraform-lsp-server';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const logger: Logger = {
  error: (message: string) => console.error(`[ERROR] ${message}`),
  warn: (message: string) => console.warn(`[WARN] ${message}`),
  info: (message: string) => console.info(`[INFO] ${message}`),
  log: (message: string) => console.log(`[LOG] ${message}`),
};

const sampleTerraformCode = `# Configure the AWS Provider
provider "aws" {
  region = "us-west-2"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}

variable "instance_name" {
  description = "Name tag for the instance"
  type        = string
  default     = "example-instance"
}

resource "aws_instance" "example" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.instance_type

  tags = {
    Name = var.instance_name
  }
}

output "instance_id" {
  description = "The ID of the EC2 instance"
  value       = aws_instance.example.id
}
`;

async function main() {
  // Create a temporary Terraform project
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terraform-lsp-'));
  const tempFile = path.join(tempDir, 'main.tf');
  fs.writeFileSync(tempFile, sampleTerraformCode);

  console.log('Terraform LSP Example');
  console.log('=====================\n');
  console.log('Temp file:', tempFile);

  const client = createTerraformLspClient({
    rootUri: `file://${tempDir}`,
    logger,
  });

  try {
    console.log('Starting Terraform language server...');
    const initResult = await client.start();
    console.log('Server initialized!');
    console.log('Capabilities:', JSON.stringify(initResult.capabilities, null, 2).slice(0, 200) + '...\n');

    const fileUri = `file://${tempFile}`;
    await client.openDocument(fileUri, 'terraform', sampleTerraformCode);
    console.log('Opened document\n');

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get document symbols
    console.log('=== Document Symbols ===');
    const symbols = await client.getDocumentSymbols(fileUri);
    if (symbols && symbols.length > 0) {
      symbols.forEach((sym: any) => {
        console.log(`  - ${sym.name} (${sym.kind})`);
      });
    } else {
      console.log('  No symbols found');
    }

    // Get hover on 'provider' block
    console.log('\n=== Hover (line 2, "provider") ===');
    const hover = await client.getHover(fileUri, 1, 0);
    if (hover?.contents) {
      console.log('  ', JSON.stringify(hover.contents).slice(0, 300));
    } else {
      console.log('  No hover info');
    }

    // Get completions
    console.log('\n=== Completions (inside resource block) ===');
    const completions = await client.getCompletion(fileUri, 19, 2);
    if (completions) {
      const items = Array.isArray(completions) ? completions : completions.items;
      console.log(`  Found ${items?.length || 0} completions`);
      items?.slice(0, 5).forEach((item: any) => {
        console.log(`    - ${item.label}`);
      });
    }

    // Get definition for variable reference
    console.log('\n=== Definition (var.instance_type on line 20) ===');
    const definition = await client.getDefinition(fileUri, 19, 20);
    if (definition) {
      const defs = Array.isArray(definition) ? definition : [definition];
      defs.forEach((def: any) => {
        if (def.uri || def.targetUri) {
          const range = def.range || def.targetRange;
          console.log(`  Defined at line ${range?.start?.line + 1 || '?'}`);
        }
      });
    } else {
      console.log('  No definition found');
    }

    // Get references for variable
    console.log('\n=== References (instance_type variable) ===');
    const references = await client.getReferences(fileUri, 5, 10, true);
    if (references && references.length > 0) {
      references.forEach((ref: any) => {
        console.log(`  - Line ${ref.range.start.line + 1}`);
      });
    } else {
      console.log('  No references found');
    }

    await client.closeDocument(fileUri);
    await client.stop();
    console.log('\nServer stopped');
  } catch (error) {
    console.error('Error:', error);
    await client.stop();
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
}

main();

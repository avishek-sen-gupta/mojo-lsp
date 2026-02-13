import { createPhpLspClient } from '../lsp-server/php-lsp-server';
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

const samplePhpScript = `<?php

class Greeter {
    private string $name;

    public function __construct(string $name) {
        $this->name = $name;
    }

    public function greet(): string {
        return "Hello, " . $this->name . "!";
    }
}

function add(int $a, int $b): int {
    return $a + $b;
}

$greeter = new Greeter("World");
echo $greeter->greet();
echo add(1, 2);
`;

async function main() {
  // Create a temporary PHP file
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'php-lsp-'));
  const tempFile = path.join(tempDir, 'demo.php');
  fs.writeFileSync(tempFile, samplePhpScript);

  console.log('PHP LSP Example (Intelephense)');
  console.log('==============================\n');
  console.log('Temp file:', tempFile);

  const client = createPhpLspClient({
    rootUri: `file://${tempDir}`,
    logger,
  });

  try {
    console.log('Starting Intelephense language server...');
    const initResult = await client.start();
    console.log('Server initialized!');
    console.log('Capabilities:', JSON.stringify(initResult.capabilities, null, 2).slice(0, 200) + '...\n');

    const fileUri = `file://${tempFile}`;
    await client.openDocument(fileUri, 'php', samplePhpScript);
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

    // Get hover on 'Greeter' class
    console.log('\n=== Hover (line 2, "Greeter") ===');
    const hover = await client.getHover(fileUri, 2, 6);
    if (hover?.contents) {
      console.log('  ', JSON.stringify(hover.contents).slice(0, 200));
    } else {
      console.log('  No hover info');
    }

    // Get completions
    console.log('\n=== Completions ===');
    const completions = await client.getCompletion(fileUri, 21, 16);
    if (completions) {
      const items = Array.isArray(completions) ? completions : completions.items;
      console.log(`  Found ${items?.length || 0} completions`);
      items?.slice(0, 5).forEach((item: any) => {
        console.log(`    - ${item.label}`);
      });
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

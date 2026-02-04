import { createBashLspClient } from '../lsp-server/bash-lsp-server';
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

const sampleBashScript = `#!/bin/bash

# A sample Bash script for LSP demo

greet() {
  local name="\$1"
  echo "Hello, \$name!"
}

MESSAGE="Welcome to the demo"
COUNT=42

main() {
  greet "World"
  echo "\$MESSAGE"
  echo "Count: \$COUNT"
}

main "\$@"
`;

async function main() {
  // Create a temporary Bash file
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bash-lsp-'));
  const tempFile = path.join(tempDir, 'demo.sh');
  fs.writeFileSync(tempFile, sampleBashScript);

  console.log('Bash LSP Example');
  console.log('================\n');
  console.log('Temp file:', tempFile);

  const client = createBashLspClient({
    rootUri: `file://${tempDir}`,
    logger,
  });

  try {
    console.log('Starting Bash language server...');
    const initResult = await client.start();
    console.log('Server initialized!');
    console.log('Capabilities:', JSON.stringify(initResult.capabilities, null, 2).slice(0, 200) + '...\n');

    const fileUri = `file://${tempFile}`;
    await client.openDocument(fileUri, 'shellscript', sampleBashScript);
    console.log('Opened document\n');

    await new Promise((resolve) => setTimeout(resolve, 1000));

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

    // Get hover on 'greet' function
    console.log('\n=== Hover (line 5, "greet") ===');
    const hover = await client.getHover(fileUri, 4, 0);
    if (hover?.contents) {
      console.log('  ', JSON.stringify(hover.contents).slice(0, 200));
    } else {
      console.log('  No hover info');
    }

    // Get completions
    console.log('\n=== Completions ===');
    const completions = await client.getCompletion(fileUri, 14, 2);
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

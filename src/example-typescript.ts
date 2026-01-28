import { LSPClient } from './lsp-client';
import { Logger } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

// Simple console logger
const logger: Logger = {
  error: (message: string) => console.error(`[ERROR] ${message}`),
  warn: (message: string) => console.warn(`[WARN] ${message}`),
  info: (message: string) => console.info(`[INFO] ${message}`),
  log: (message: string) => console.log(`[LOG] ${message}`),
};

async function main() {
  // Example: Connect to TypeScript language server
  // You need to have typescript-language-server installed:
  // npm install -g typescript-language-server typescript

  const workspaceRoot = process.cwd();

  const client = new LSPClient({
    // Replace with your language server command
    serverCommand: 'typescript-language-server',
    serverArgs: ['--stdio'],
    rootUri: `file://${workspaceRoot}`,
    logger,
  });

  try {
    // Start the client and initialize the server
    console.log('Starting language server...');
    const initResult = await client.start();
    console.log('Server initialized with capabilities:', JSON.stringify(initResult.capabilities, null, 2));

    // Set up diagnostics handler
    client.onDiagnostics((params) => {
      console.log(`\nDiagnostics for ${params.uri}:`);
      for (const diag of params.diagnostics) {
        console.log(`  [${diag.severity}] Line ${diag.range.start.line}: ${diag.message}`);
      }
    });

    // Example: Open a document
    const testFile = path.join(workspaceRoot, 'test.ts');
    const testContent = `
const greeting: string = "Hello";
const number: number = greeting; // Type error
console.log(greeting);
`;

    // Write test file
    fs.writeFileSync(testFile, testContent);

    const fileUri = `file://${testFile}`;
    await client.openDocument(fileUri, 'typescript', testContent);
    console.log('\nOpened document:', fileUri);

    // Wait a moment for diagnostics
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get hover info
    const hover = await client.getHover(fileUri, 1, 6); // hover over 'greeting'
    if (hover) {
      console.log('\nHover info:', JSON.stringify(hover, null, 2));
    }

    // Get completions
    const completions = await client.getCompletion(fileUri, 3, 8); // after 'console.'
    if (completions) {
      const items = Array.isArray(completions) ? completions : completions.items;
      console.log('\nCompletions (first 5):');
      items.slice(0, 5).forEach((item) => {
        console.log(`  - ${item.label}`);
      });
    }

    // Get document symbols
    const symbols = await client.getDocumentSymbols(fileUri);
    if (symbols && symbols.length > 0) {
      console.log('\nDocument symbols:');
      for (const sym of symbols) {
        console.log(`  - ${JSON.stringify(sym)}`);
      }
    }

    // Close document
    await client.closeDocument(fileUri);

    // Clean up test file
    fs.unlinkSync(testFile);

    // Stop the server
    await client.stop();
    console.log('\nServer stopped');
  } catch (error) {
    console.error('Error:', error);
    await client.stop();
  }
}

main();

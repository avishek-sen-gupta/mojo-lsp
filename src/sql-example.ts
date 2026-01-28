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
  // Example: Connect to sql-language-server
  //
  // Setup:
  //   cd ../sql-lsp
  //   npm install sql-language-server

  const workspaceRoot = process.cwd();
  const serverPath = path.resolve(workspaceRoot, '../sql-lsp/node_modules/.bin/sql-language-server');

  if (!fs.existsSync(serverPath)) {
    console.error('SQL language server not found:', serverPath);
    console.error('Please run: cd ../sql-lsp && npm install sql-language-server');
    return;
  }

  // Use a sample SQL content for demonstration
  const sampleSql = `
-- Sample SQL file for testing
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP
);

CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT,
    total DECIMAL(10, 2),
    status VARCHAR(50)
);

SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.name
ORDER BY order_count DESC;
`.trim();

  const client = new LSPClient({
    serverCommand: serverPath,
    serverArgs: ['up', '--method', 'stdio'],
    rootUri: `file://${workspaceRoot}`,
    logger,
  });

  try {
    console.log('Starting SQL language server...');
    const initResult = await client.start();
    console.log('Server initialized!');
    console.log('Hover support:', initResult.capabilities.hoverProvider);
    console.log('Completion support:', initResult.capabilities.completionProvider ? 'yes' : 'no');
    console.log('Document symbol support:', initResult.capabilities.documentSymbolProvider);

    // Set up diagnostics handler
    client.onDiagnostics((params) => {
      if (params.diagnostics.length > 0) {
        console.log(`\nDiagnostics for ${path.basename(params.uri)}:`);
        for (const diag of params.diagnostics.slice(0, 5)) {
          const severity = ['', 'Error', 'Warning', 'Info', 'Hint'][diag.severity || 1];
          console.log(`  [${severity}] Line ${diag.range.start.line + 1}: ${diag.message}`);
        }
      }
    });

    // Open a virtual SQL document
    const fileUri = `file://${workspaceRoot}/sample.sql`;
    await client.openDocument(fileUri, 'sql', sampleSql);
    console.log('\nOpened SQL document');
    console.log('Content:\n' + sampleSql.split('\n').map((l, i) => `  ${i + 1}: ${l}`).join('\n'));

    // Wait for analysis and diagnostics
    console.log('\nWaiting for server to analyze...');
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Close and stop
    await client.closeDocument(fileUri);
    await client.stop();
    console.log('\nServer stopped');
  } catch (error) {
    console.error('Error:', error);
    await client.stop();
  }
}

main();

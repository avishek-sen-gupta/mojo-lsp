import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createSqlLspClient } from '../lsp-server/sql-lsp-server';
import { LSPClient } from '../lsp-client';
import { Diagnostic } from 'vscode-languageserver-protocol';
import { silentLogger, wait, safeStop, directoryExists, fileExists } from './test-helpers';

describe('SQL LSP', () => {
  let client: LSPClient;
  let fileUri: string;
  let diagnostics: Diagnostic[] = [];

  const sqlServerDir = path.resolve(process.cwd(), '../sql-lsp');
  const sqlServerPath = path.join(sqlServerDir, 'node_modules/.bin/sql-language-server');
  const workspaceRoot = process.cwd();

  const sqlContent = `-- Sample SQL file
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE
);

-- This statement has a syntax error (missing column type)
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id,
    total DECIMAL(10, 2)
);

SELECT * FROM users;
`;

  beforeAll(async () => {
    if (!directoryExists(sqlServerDir)) {
      throw new Error(`SQL server directory not found: ${sqlServerDir}`);
    }

    if (!fileExists(sqlServerPath)) {
      throw new Error(`sql-language-server not found: ${sqlServerPath}`);
    }

    client = createSqlLspClient({
      rootUri: `file://${workspaceRoot}`,
      serverPath: sqlServerPath,
      logger: silentLogger,
    });

    client.onDiagnostics((params) => {
      diagnostics = params.diagnostics;
    });

    await client.start();

    const testFile = path.join(workspaceRoot, 'test-sample.sql');
    fs.writeFileSync(testFile, sqlContent);
    fileUri = `file://${testFile}`;

    await client.openDocument(fileUri, 'sql', sqlContent);
    await wait(2000);
  });

  afterAll(async () => {
    if (client) {
      await client.closeDocument(fileUri);
      await safeStop(client);
    }
    const testFile = path.join(workspaceRoot, 'test-sample.sql');
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  it('should initialize with capabilities', async () => {
    const capabilities = client.getServerCapabilities();
    expect(capabilities).toBeDefined();
  });

  it('should detect syntax errors', async () => {
    expect(diagnostics.length).toBeGreaterThan(0);
    const hasError = diagnostics.some((d) => d.message.includes(','));
    expect(hasError).toBe(true);
  });
});

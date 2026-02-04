import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createBashLspClient } from '../lsp-server/bash-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, commandExists } from './test-helpers';

describe('Bash LSP', () => {
  let client: LSPClient;
  let testFile: string;
  let fileUri: string;
  const workspaceRoot = process.cwd();

  const testContent = `#!/bin/bash

# A greeting function
greet() {
  local name="$1"
  echo "Hello, $name!"
}

# Main script
MESSAGE="Welcome"
COUNT=42

greet "World"
echo "$MESSAGE"
`;

  beforeAll(async () => {
    const hasServer = await commandExists('bash-language-server');
    if (!hasServer) {
      throw new Error('bash-language-server not installed. Run: npm install -g bash-language-server');
    }

    client = createBashLspClient({
      rootUri: `file://${workspaceRoot}`,
      logger: silentLogger,
    });

    await client.start();

    testFile = path.join(workspaceRoot, 'test-temp.sh');
    fs.writeFileSync(testFile, testContent);
    fileUri = `file://${testFile}`;

    await client.openDocument(fileUri, 'shellscript', testContent);
    await wait(1000);
  });

  afterAll(async () => {
    if (client) {
      await client.closeDocument(fileUri);
      await safeStop(client);
    }
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  it('should initialize with capabilities', async () => {
    const capabilities = client.getServerCapabilities();
    expect(capabilities).toBeDefined();
  });

  it('should provide hover information', async () => {
    const hover = await client.getHover(fileUri, 4, 8);
    expect(hover).toBeDefined();
  });

  it('should provide completions', async () => {
    const completions = await client.getCompletion(fileUri, 14, 0);
    expect(completions).toBeDefined();

    const items = Array.isArray(completions) ? completions : completions?.items;
    expect(items).toBeDefined();
    expect(items!.length).toBeGreaterThan(0);
  });

  it('should provide document symbols', async () => {
    const symbols = await client.getDocumentSymbols(fileUri);
    expect(symbols).toBeDefined();
    expect(symbols!.length).toBeGreaterThan(0);

    const symbolNames = symbols!.map((s: any) => s.name);
    expect(symbolNames).toContain('greet');
  });

  it('should provide definition', async () => {
    const definition = await client.getDefinition(fileUri, 13, 0);
    expect(definition).toBeDefined();
  });

  it('should provide references', async () => {
    const references = await client.getReferences(fileUri, 3, 0, true);
    expect(references).toBeDefined();
  });
});

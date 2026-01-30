import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createTypescriptLspClient } from '../lsp-server/typescript-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, commandExists } from './test-helpers';

describe('TypeScript LSP', () => {
  let client: LSPClient;
  let testFile: string;
  let fileUri: string;
  const workspaceRoot = process.cwd();

  const testContent = `
const greeting: string = "Hello";
const number: number = greeting; // Type error
console.log(greeting);
`;

  beforeAll(async () => {
    const hasServer = await commandExists('typescript-language-server');
    if (!hasServer) {
      throw new Error('typescript-language-server not installed. Run: npm install -g typescript-language-server typescript');
    }

    client = createTypescriptLspClient({
      rootUri: `file://${workspaceRoot}`,
      logger: silentLogger,
    });

    await client.start();

    testFile = path.join(workspaceRoot, 'test-temp.ts');
    fs.writeFileSync(testFile, testContent);
    fileUri = `file://${testFile}`;

    await client.openDocument(fileUri, 'typescript', testContent);
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
    const hover = await client.getHover(fileUri, 1, 6);
    expect(hover).toBeDefined();
    expect(hover?.contents).toBeDefined();
  });

  it('should provide completions', async () => {
    const completions = await client.getCompletion(fileUri, 3, 8);
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
    expect(symbolNames).toContain('greeting');
    expect(symbolNames).toContain('number');
  });

  it('should provide definition', async () => {
    const definition = await client.getDefinition(fileUri, 2, 25);
    expect(definition).toBeDefined();
  });

  it('should provide references', async () => {
    const references = await client.getReferences(fileUri, 1, 6, true);
    expect(references).toBeDefined();
    expect(references!.length).toBeGreaterThan(0);
  });
});

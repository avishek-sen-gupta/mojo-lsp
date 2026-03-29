import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createHlasmLspClient } from '../lsp-server/hlasm-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, directoryExists } from './test-helpers';

const HLASM_LSP_DIR = '/Users/asgupta/code/tape-z/hlasm-lsp';

describe('HLASM LSP', () => {
  let client: LSPClient;
  let testFile: string;
  let fileUri: string;
  const workspaceRoot = process.cwd();

  const testContent = `HELLO    CSECT
         USING *,15
         WTO   'HELLO, WORLD'
         SR    15,15
         BR    14
         END   HELLO
`;

  beforeAll(async () => {
    if (!directoryExists(HLASM_LSP_DIR)) {
      throw new Error(`hlasm-lsp not found at ${HLASM_LSP_DIR}. Install it first.`);
    }

    client = createHlasmLspClient({
      rootUri: `file://${workspaceRoot}`,
      serverDir: HLASM_LSP_DIR,
      logger: silentLogger,
    });

    await client.start();

    testFile = path.join(workspaceRoot, 'test-temp.hlasm');
    fs.writeFileSync(testFile, testContent);
    fileUri = `file://${testFile}`;

    await client.openDocument(fileUri, 'hlasm', testContent);
    await wait(2000);
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
    const hover = await client.getHover(fileUri, 2, 10);
    expect(hover).toBeDefined();
  });

  it('should provide completions', async () => {
    const completions = await client.getCompletion(fileUri, 3, 10);
    expect(completions).toBeDefined();
  });

  it('should provide document symbols', async () => {
    const symbols = await client.getDocumentSymbols(fileUri);
    expect(symbols).toBeDefined();
    expect(symbols!.length).toBeGreaterThan(0);
  });

  it('should provide definition', async () => {
    const definition = await client.getDefinition(fileUri, 5, 15);
    expect(definition).toBeDefined();
  });
});

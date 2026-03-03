import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createPickbasicLspClient } from '../lsp-server/pickbasic-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, directoryExists } from './test-helpers';

const PICKBASIC_LSP_DIR = '/Users/asgupta/code/pickbasic-grammar/pickbasic-lsp';

describe('PickBASIC LSP', () => {
  let client: LSPClient;
  let testFile: string;
  let fileUri: string;
  const workspaceRoot = process.cwd();

  const testContent = `SUBROUTINE GREET(NAME, RESULT)
* Calculate a greeting message
RESULT = "Hello, " : NAME : "!"
RETURN

MAIN:
  CUSTOMER.NAME = "World"
  GREETING = ""
  CALL GREET(CUSTOMER.NAME, GREETING)
  CRT GREETING

  TOTAL = 0
  FOR I = 1 TO 10
    TOTAL = TOTAL + I
  NEXT I
  CRT "Total: " : TOTAL

  GOSUB PRINT.FOOTER
  STOP

PRINT.FOOTER:
  CRT "--- End of Program ---"
  RETURN

END
`;

  beforeAll(async () => {
    if (!directoryExists(PICKBASIC_LSP_DIR)) {
      throw new Error(`pickbasic-lsp not found at ${PICKBASIC_LSP_DIR}. Install it first.`);
    }

    client = createPickbasicLspClient({
      rootUri: `file://${workspaceRoot}`,
      serverDir: PICKBASIC_LSP_DIR,
      logger: silentLogger,
    });

    await client.start();

    testFile = path.join(workspaceRoot, 'test-temp.bp');
    fs.writeFileSync(testFile, testContent);
    fileUri = `file://${testFile}`;

    await client.openDocument(fileUri, 'pickbasic', testContent);
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
    const hover = await client.getHover(fileUri, 0, 12);
    expect(hover).toBeDefined();
  });

  it('should provide completions', async () => {
    const completions = await client.getCompletion(fileUri, 6, 5);
    expect(completions).toBeDefined();
  });

  it('should provide document symbols', async () => {
    const symbols = await client.getDocumentSymbols(fileUri);
    expect(symbols).toBeDefined();
    expect(symbols!.length).toBeGreaterThan(0);
  });

  it('should provide definition', async () => {
    const definition = await client.getDefinition(fileUri, 8, 7);
    expect(definition).toBeDefined();
  });

  it('should provide references', async () => {
    const references = await client.getReferences(fileUri, 0, 12, true);
    expect(references).toBeDefined();
  });
});

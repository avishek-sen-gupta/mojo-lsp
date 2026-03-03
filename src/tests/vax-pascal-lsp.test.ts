import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createVaxPascalLspClient } from '../lsp-server/vax-pascal-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, directoryExists } from './test-helpers';

const VAX_PASCAL_LSP_DIR = '/Users/asgupta/code/vax-pascal-treesitter-lsp/lsp';

describe('VAX Pascal LSP', () => {
  let client: LSPClient;
  let testFile: string;
  let fileUri: string;
  const workspaceRoot = process.cwd();

  const testContent = `PROGRAM Calculator(INPUT, OUTPUT);

TYPE
  OperationType = (Add, Subtract, Multiply, Divide);

VAR
  X, Y, Result : REAL;
  Op : OperationType;

PROCEDURE PrintResult(Value : REAL);
BEGIN
  WRITELN('Result: ', Value:10:2);
END;

FUNCTION Compute(A, B : REAL; Operation : OperationType) : REAL;
VAR
  Temp : REAL;
BEGIN
  CASE Operation OF
    Add      : Temp := A + B;
    Subtract : Temp := A - B;
    Multiply : Temp := A * B;
    Divide   : IF B <> 0.0 THEN
                 Temp := A / B
               ELSE
                 Temp := 0.0;
  END;
  Compute := Temp;
END;

BEGIN
  X := 10.0;
  Y := 3.0;
  Op := Add;
  Result := Compute(X, Y, Op);
  PrintResult(Result);
END.
`;

  beforeAll(async () => {
    if (!directoryExists(VAX_PASCAL_LSP_DIR)) {
      throw new Error(`vax-pascal-lsp not found at ${VAX_PASCAL_LSP_DIR}. Install it first.`);
    }

    client = createVaxPascalLspClient({
      rootUri: `file://${workspaceRoot}`,
      serverDir: VAX_PASCAL_LSP_DIR,
      logger: silentLogger,
    });

    await client.start();

    testFile = path.join(workspaceRoot, 'test-temp.pas');
    fs.writeFileSync(testFile, testContent);
    fileUri = `file://${testFile}`;

    await client.openDocument(fileUri, 'pascal', testContent);
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
    const hover = await client.getHover(fileUri, 0, 8);
    expect(hover).toBeDefined();
  });

  it('should provide completions', async () => {
    const completions = await client.getCompletion(fileUri, 33, 5);
    expect(completions).toBeDefined();
  });

  it('should provide document symbols', async () => {
    const symbols = await client.getDocumentSymbols(fileUri);
    expect(symbols).toBeDefined();
    expect(symbols!.length).toBeGreaterThan(0);
  });

  it('should provide definition', async () => {
    const definition = await client.getDefinition(fileUri, 35, 14);
    expect(definition).toBeDefined();
  });
});

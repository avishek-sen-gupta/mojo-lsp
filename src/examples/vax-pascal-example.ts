import { createVaxPascalLspClient } from '../lsp-server/vax-pascal-lsp-server';
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

const VAX_PASCAL_LSP_DIR = '/Users/asgupta/code/vax-pascal-treesitter-lsp/lsp';

const sampleVaxPascalProgram = `PROGRAM Calculator(INPUT, OUTPUT);

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

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vax-pascal-lsp-'));
  const tempFile = path.join(tempDir, 'demo.pas');
  fs.writeFileSync(tempFile, sampleVaxPascalProgram);

  console.log('VAX Pascal LSP Example');
  console.log('======================\n');
  console.log('Temp file:', tempFile);

  const client = createVaxPascalLspClient({
    rootUri: `file://${tempDir}`,
    serverDir: VAX_PASCAL_LSP_DIR,
    logger,
  });

  try {
    console.log('Starting VAX Pascal language server...');
    const initResult = await client.start();
    console.log('Server initialized!');
    console.log('Capabilities:', JSON.stringify(initResult.capabilities, null, 2).slice(0, 200) + '...\n');

    const fileUri = `file://${tempFile}`;
    await client.openDocument(fileUri, 'pascal', sampleVaxPascalProgram);
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

    // Get hover on 'Calculator' program name
    console.log('\n=== Hover (line 0, "Calculator") ===');
    const hover = await client.getHover(fileUri, 0, 8);
    if (hover?.contents) {
      console.log('  ', JSON.stringify(hover.contents).slice(0, 200));
    } else {
      console.log('  No hover info');
    }

    // Get completions
    console.log('\n=== Completions ===');
    const completions = await client.getCompletion(fileUri, 33, 5);
    if (completions) {
      const items = Array.isArray(completions) ? completions : completions.items;
      console.log(`  Found ${items?.length || 0} completions`);
      items?.slice(0, 5).forEach((item: any) => {
        console.log(`    - ${item.label}`);
      });
    }

    // Get definition
    console.log('\n=== Definition (Compute call) ===');
    const definition = await client.getDefinition(fileUri, 35, 14);
    if (definition) {
      console.log('  ', JSON.stringify(definition).slice(0, 200));
    } else {
      console.log('  No definition found');
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

import { createPickbasicLspClient } from '../lsp-server/pickbasic-lsp-server';
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

const PICKBASIC_LSP_DIR = '/Users/asgupta/code/pickbasic-grammar/pickbasic-lsp';

const samplePickbasicProgram = `SUBROUTINE GREET(NAME, RESULT)
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

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pickbasic-lsp-'));
  const tempFile = path.join(tempDir, 'demo.bp');
  fs.writeFileSync(tempFile, samplePickbasicProgram);

  console.log('PickBASIC LSP Example');
  console.log('=====================\n');
  console.log('Temp file:', tempFile);

  const client = createPickbasicLspClient({
    rootUri: `file://${tempDir}`,
    serverDir: PICKBASIC_LSP_DIR,
    logger,
  });

  try {
    console.log('Starting PickBASIC language server...');
    const initResult = await client.start();
    console.log('Server initialized!');
    console.log('Capabilities:', JSON.stringify(initResult.capabilities, null, 2).slice(0, 200) + '...\n');

    const fileUri = `file://${tempFile}`;
    await client.openDocument(fileUri, 'pickbasic', samplePickbasicProgram);
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

    // Get hover on 'GREET' subroutine
    console.log('\n=== Hover (line 0, "GREET") ===');
    const hover = await client.getHover(fileUri, 0, 12);
    if (hover?.contents) {
      console.log('  ', JSON.stringify(hover.contents).slice(0, 200));
    } else {
      console.log('  No hover info');
    }

    // Get completions
    console.log('\n=== Completions ===');
    const completions = await client.getCompletion(fileUri, 6, 5);
    if (completions) {
      const items = Array.isArray(completions) ? completions : completions.items;
      console.log(`  Found ${items?.length || 0} completions`);
      items?.slice(0, 5).forEach((item: any) => {
        console.log(`    - ${item.label}`);
      });
    }

    // Get definition
    console.log('\n=== Definition (GREET call) ===');
    const definition = await client.getDefinition(fileUri, 8, 7);
    if (definition) {
      console.log('  ', JSON.stringify(definition).slice(0, 200));
    } else {
      console.log('  No definition found');
    }

    // Get references
    console.log('\n=== References (GREET) ===');
    const references = await client.getReferences(fileUri, 0, 12, true);
    if (references && references.length > 0) {
      references.forEach((ref: any) => {
        console.log(`  - ${ref.uri}:${ref.range.start.line}:${ref.range.start.character}`);
      });
    } else {
      console.log('  No references found');
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

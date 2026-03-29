import { createHlasmLspClient } from '../lsp-server/hlasm-lsp-server';
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

const HLASM_LSP_DIR = '/Users/asgupta/code/tape-z/hlasm-lsp';

const sampleHlasmProgram = `HELLO    CSECT
         USING *,15
         WTO   'HELLO, WORLD'
         SR    15,15
         BR    14
         END   HELLO
`;

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlasm-lsp-'));
  const tempFile = path.join(tempDir, 'demo.hlasm');
  fs.writeFileSync(tempFile, sampleHlasmProgram);

  console.log('HLASM LSP Example');
  console.log('=================\n');
  console.log('Temp file:', tempFile);

  const client = createHlasmLspClient({
    rootUri: `file://${tempDir}`,
    serverDir: HLASM_LSP_DIR,
    logger,
  });

  try {
    console.log('Starting HLASM language server...');
    const initResult = await client.start();
    console.log('Server initialized!');
    console.log('Capabilities:', JSON.stringify(initResult.capabilities, null, 2).slice(0, 200) + '...\n');

    const fileUri = `file://${tempFile}`;
    await client.openDocument(fileUri, 'hlasm', sampleHlasmProgram);
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

    // Get hover on 'WTO' instruction
    console.log('\n=== Hover (line 2, "WTO") ===');
    const hover = await client.getHover(fileUri, 2, 10);
    if (hover?.contents) {
      console.log('  ', JSON.stringify(hover.contents).slice(0, 200));
    } else {
      console.log('  No hover info');
    }

    // Get completions
    console.log('\n=== Completions ===');
    const completions = await client.getCompletion(fileUri, 3, 10);
    if (completions) {
      const items = Array.isArray(completions) ? completions : completions.items;
      console.log(`  Found ${items?.length || 0} completions`);
      items?.slice(0, 5).forEach((item: any) => {
        console.log(`    - ${item.label}`);
      });
    }

    // Get definition
    console.log('\n=== Definition (HELLO label) ===');
    const definition = await client.getDefinition(fileUri, 5, 15);
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

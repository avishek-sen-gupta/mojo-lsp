import { createKotlinLspClient } from '../lsp-server/kotlin-lsp-server';
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

const sampleKotlinCode = `package example

fun greet(name: String): String {
    return "Hello, $name!"
}

val message: String = "Welcome to the demo"

fun main() {
    println(greet("World"))
    println(message)
}
`;

async function main() {
  // Create a temporary Kotlin file
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kotlin-lsp-'));
  const tempFile = path.join(tempDir, 'Main.kt');
  fs.writeFileSync(tempFile, sampleKotlinCode);

  console.log('Kotlin LSP Example');
  console.log('==================\n');
  console.log('Temp file:', tempFile);

  const client = createKotlinLspClient({
    rootUri: `file://${tempDir}`,
    logger,
  });

  try {
    console.log('Starting Kotlin language server...');
    const initResult = await client.start();
    console.log('Server initialized!');
    console.log('Capabilities:', JSON.stringify(initResult.capabilities, null, 2).slice(0, 200) + '...\n');

    const fileUri = `file://${tempFile}`;
    await client.openDocument(fileUri, 'kotlin', sampleKotlinCode);
    console.log('Opened document\n');

    // Kotlin LSP needs time to analyze
    await new Promise((resolve) => setTimeout(resolve, 5000));

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

    // Get hover on 'greet' function
    console.log('\n=== Hover (line 3, "greet") ===');
    const hover = await client.getHover(fileUri, 2, 4);
    if (hover?.contents) {
      console.log('  ', JSON.stringify(hover.contents).slice(0, 300));
    } else {
      console.log('  No hover info');
    }

    // Get completions
    console.log('\n=== Completions ===');
    const completions = await client.getCompletion(fileUri, 9, 12);
    if (completions) {
      const items = Array.isArray(completions) ? completions : completions.items;
      console.log(`  Found ${items?.length || 0} completions`);
      items?.slice(0, 5).forEach((item: any) => {
        console.log(`    - ${item.label}`);
      });
    }

    // Get definition
    console.log('\n=== Definition (greet call on line 10) ===');
    const definition = await client.getDefinition(fileUri, 9, 12);
    if (definition) {
      const defs = Array.isArray(definition) ? definition : [definition];
      defs.forEach((def: any) => {
        if (def.uri) {
          console.log(`  Defined at line ${def.range?.start?.line + 1 || '?'}`);
        }
      });
    } else {
      console.log('  No definition found');
    }

    // Get references
    console.log('\n=== References (greet function) ===');
    const references = await client.getReferences(fileUri, 2, 4, true);
    if (references && references.length > 0) {
      references.forEach((ref: any) => {
        console.log(`  - Line ${ref.range.start.line + 1}`);
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

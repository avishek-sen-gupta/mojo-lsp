import { createGoLspClient } from '../lsp-server/go-lsp-server';
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

const sampleGoCode = `package main

import "fmt"

// greet returns a greeting for the given name
func greet(name string) string {
	return "Hello, " + name + "!"
}

var message string = "Welcome to the demo"

func main() {
	fmt.Println(greet("World"))
	fmt.Println(message)
}
`;

const goModContent = `module example

go 1.21
`;

async function main() {
  // Create a temporary Go project
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'go-lsp-'));
  const tempFile = path.join(tempDir, 'main.go');
  const goModFile = path.join(tempDir, 'go.mod');
  fs.writeFileSync(tempFile, sampleGoCode);
  fs.writeFileSync(goModFile, goModContent);

  console.log('Go LSP Example');
  console.log('==============\n');
  console.log('Temp file:', tempFile);

  const client = createGoLspClient({
    rootUri: `file://${tempDir}`,
    logger,
  });

  try {
    console.log('Starting Go language server (gopls)...');
    const initResult = await client.start();
    console.log('Server initialized!');
    console.log('Capabilities:', JSON.stringify(initResult.capabilities, null, 2).slice(0, 200) + '...\n');

    const fileUri = `file://${tempFile}`;
    await client.openDocument(fileUri, 'go', sampleGoCode);
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

    // Get hover on 'greet' function
    console.log('\n=== Hover (line 6, "greet") ===');
    const hover = await client.getHover(fileUri, 5, 5);
    if (hover?.contents) {
      console.log('  ', JSON.stringify(hover.contents).slice(0, 300));
    } else {
      console.log('  No hover info');
    }

    // Get completions
    console.log('\n=== Completions (after fmt.) ===');
    const completions = await client.getCompletion(fileUri, 12, 5);
    if (completions) {
      const items = Array.isArray(completions) ? completions : completions.items;
      console.log(`  Found ${items?.length || 0} completions`);
      items?.slice(0, 5).forEach((item: any) => {
        console.log(`    - ${item.label}`);
      });
    }

    // Get definition
    console.log('\n=== Definition (greet call on line 13) ===');
    const definition = await client.getDefinition(fileUri, 12, 14);
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
    const references = await client.getReferences(fileUri, 5, 5, true);
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

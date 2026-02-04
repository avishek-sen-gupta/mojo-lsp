import { createClojureLspClient } from '../lsp-server/clojure-lsp-server';
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

const sampleClojureCode = `(ns example.core
  (:require [clojure.string :as str]))

(defn greet
  "Returns a greeting for the given name"
  [name]
  (str "Hello, " name "!"))

(def message "Welcome to the demo")

(defn main
  "Main entry point"
  []
  (println (greet "World"))
  (println message))
`;

async function main() {
  // Create a temporary Clojure file
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clojure-lsp-'));
  const tempFile = path.join(tempDir, 'core.clj');
  fs.writeFileSync(tempFile, sampleClojureCode);

  console.log('Clojure LSP Example');
  console.log('===================\n');
  console.log('Temp file:', tempFile);

  const client = createClojureLspClient({
    rootUri: `file://${tempDir}`,
    logger,
  });

  try {
    console.log('Starting Clojure language server...');
    const initResult = await client.start();
    console.log('Server initialized!');
    console.log('Capabilities:', JSON.stringify(initResult.capabilities, null, 2).slice(0, 200) + '...\n');

    const fileUri = `file://${tempFile}`;
    await client.openDocument(fileUri, 'clojure', sampleClojureCode);
    console.log('Opened document\n');

    // Clojure LSP needs more time to analyze
    await new Promise((resolve) => setTimeout(resolve, 3000));

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
    console.log('\n=== Hover (line 4, "greet") ===');
    const hover = await client.getHover(fileUri, 3, 6);
    if (hover?.contents) {
      console.log('  ', JSON.stringify(hover.contents).slice(0, 300));
    } else {
      console.log('  No hover info');
    }

    // Get definition
    console.log('\n=== Definition (greet call on line 14) ===');
    const definition = await client.getDefinition(fileUri, 13, 12);
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
    const references = await client.getReferences(fileUri, 3, 6, true);
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

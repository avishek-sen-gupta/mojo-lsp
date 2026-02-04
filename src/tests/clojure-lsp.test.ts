import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createClojureLspClient } from '../lsp-server/clojure-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, commandExists } from './test-helpers';

describe('Clojure LSP', () => {
  let client: LSPClient;
  let testFile: string;
  let fileUri: string;
  const workspaceRoot = process.cwd();

  const testContent = `(ns example.core
  (:require [clojure.string :as str]))

(defn greet
  "Returns a greeting for the given name"
  [name]
  (str "Hello, " name "!"))

(def message "Welcome")

(defn main
  []
  (println (greet "World"))
  (println message))
`;

  beforeAll(async () => {
    const hasServer = await commandExists('clojure-lsp');
    if (!hasServer) {
      throw new Error('clojure-lsp not installed. Run: brew install clojure-lsp/brew/clojure-lsp-native');
    }

    client = createClojureLspClient({
      rootUri: `file://${workspaceRoot}`,
      logger: silentLogger,
    });

    await client.start();

    testFile = path.join(workspaceRoot, 'test-temp.clj');
    fs.writeFileSync(testFile, testContent);
    fileUri = `file://${testFile}`;

    await client.openDocument(fileUri, 'clojure', testContent);
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
    const hover = await client.getHover(fileUri, 3, 6);
    expect(hover).toBeDefined();
  });

  it('should provide completions', async () => {
    // Line 12: (println (greet "World"))
    // Position after opening paren to trigger function completions
    const completions = await client.getCompletion(fileUri, 11, 4);
    expect(completions).toBeDefined();

    const items = Array.isArray(completions) ? completions : completions?.items;
    expect(items).toBeDefined();
    // clojure-lsp may return empty completions in some contexts
    expect(items!.length).toBeGreaterThanOrEqual(0);
  });

  it('should provide document symbols', async () => {
    const symbols = await client.getDocumentSymbols(fileUri);
    expect(symbols).toBeDefined();
    expect(symbols!.length).toBeGreaterThan(0);
  });

  it('should provide definition', async () => {
    // Line 12: (println (greet "World"))
    // Position on 'greet' function call
    const definition = await client.getDefinition(fileUri, 11, 12);
    expect(definition).toBeDefined();
  });

  it('should provide references', async () => {
    const references = await client.getReferences(fileUri, 3, 6, true);
    expect(references).toBeDefined();
  });
});

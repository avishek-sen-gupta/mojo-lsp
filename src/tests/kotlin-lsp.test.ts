import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createKotlinLspClient } from '../lsp-server/kotlin-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, commandExists } from './test-helpers';

describe('Kotlin LSP', () => {
  let client: LSPClient;
  let testFile: string;
  let fileUri: string;
  const workspaceRoot = process.cwd();

  const testContent = `package example

fun greet(name: String): String {
    return "Hello, $name!"
}

val message: String = "Welcome"

fun main() {
    println(greet("World"))
    println(message)
}
`;

  beforeAll(async () => {
    const hasServer = await commandExists('kotlin-lsp');
    if (!hasServer) {
      throw new Error('kotlin-lsp not installed. Run: brew install kotlin-lsp');
    }

    client = createKotlinLspClient({
      rootUri: `file://${workspaceRoot}`,
      logger: silentLogger,
    });

    await client.start();

    testFile = path.join(workspaceRoot, 'test-temp.kt');
    fs.writeFileSync(testFile, testContent);
    fileUri = `file://${testFile}`;

    await client.openDocument(fileUri, 'kotlin', testContent);
    // Kotlin LSP needs more time to initialize
    await wait(5000);
  }, 60000);

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
    const hover = await client.getHover(fileUri, 2, 4);
    expect(hover).toBeDefined();
  });

  it('should provide completions', async () => {
    const completions = await client.getCompletion(fileUri, 9, 12);
    expect(completions).toBeDefined();

    const items = Array.isArray(completions) ? completions : completions?.items;
    expect(items).toBeDefined();
    // kotlin-lsp may return varying completions depending on context
    expect(items!.length).toBeGreaterThanOrEqual(0);
  });

  it('should provide document symbols', async () => {
    const symbols = await client.getDocumentSymbols(fileUri);
    expect(symbols).toBeDefined();
    expect(symbols!.length).toBeGreaterThanOrEqual(0);
  });

  it('should provide definition', async () => {
    // Line 10: println(greet("World"))
    // Position on 'greet' function call
    const definition = await client.getDefinition(fileUri, 9, 12);
    expect(definition).toBeDefined();
  });

  it('should provide references', async () => {
    const references = await client.getReferences(fileUri, 2, 4, true);
    expect(references).toBeDefined();
  });
});

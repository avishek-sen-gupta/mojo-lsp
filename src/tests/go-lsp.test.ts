import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createGoLspClient } from '../lsp-server/go-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, fileExists } from './test-helpers';

describe('Go LSP', () => {
  let client: LSPClient;
  let testFile: string;
  let fileUri: string;
  const workspaceRoot = process.cwd();

  const testContent = `package main

import "fmt"

func greet(name string) string {
	return "Hello, " + name + "!"
}

var message string = "Welcome"

func main() {
	fmt.Println(greet("World"))
	fmt.Println(message)
}
`;

  beforeAll(async () => {
    const goplsPath = path.join(os.homedir(), 'go', 'bin', 'gopls');
    if (!fileExists(goplsPath)) {
      throw new Error('gopls not installed. Run: go install golang.org/x/tools/gopls@latest');
    }

    client = createGoLspClient({
      rootUri: `file://${workspaceRoot}`,
      logger: silentLogger,
    });

    await client.start();

    testFile = path.join(workspaceRoot, 'test-temp.go');
    fs.writeFileSync(testFile, testContent);
    fileUri = `file://${testFile}`;

    await client.openDocument(fileUri, 'go', testContent);
    await wait(2000);
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
    const hover = await client.getHover(fileUri, 4, 5);
    expect(hover).toBeDefined();
  });

  it('should provide completions', async () => {
    const completions = await client.getCompletion(fileUri, 11, 5);
    expect(completions).toBeDefined();

    const items = Array.isArray(completions) ? completions : completions?.items;
    expect(items).toBeDefined();
    expect(items!.length).toBeGreaterThanOrEqual(0);
  });

  it('should provide document symbols', async () => {
    const symbols = await client.getDocumentSymbols(fileUri);
    expect(symbols).toBeDefined();
    expect(symbols!.length).toBeGreaterThan(0);
  });

  it('should provide definition', async () => {
    // Line 11: fmt.Println(greet("World"))
    // Position on 'greet' function call
    const definition = await client.getDefinition(fileUri, 11, 14);
    expect(definition).toBeDefined();
  });

  it('should provide references', async () => {
    const references = await client.getReferences(fileUri, 4, 5, true);
    expect(references).toBeDefined();
  });
});

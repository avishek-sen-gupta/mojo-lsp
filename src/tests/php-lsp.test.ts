import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createPhpLspClient } from '../lsp-server/php-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, commandExists } from './test-helpers';

describe('PHP LSP', () => {
  let client: LSPClient;
  let testFile: string;
  let fileUri: string;
  const workspaceRoot = process.cwd();

  const testContent = `<?php

class Greeter {
    private string $name;

    public function __construct(string $name) {
        $this->name = $name;
    }

    public function greet(): string {
        return "Hello, " . $this->name . "!";
    }
}

function add(int $a, int $b): int {
    return $a + $b;
}

$greeter = new Greeter("World");
echo $greeter->greet();
`;

  beforeAll(async () => {
    const hasServer = await commandExists('intelephense');
    if (!hasServer) {
      throw new Error('intelephense not installed. Run: npm install -g intelephense');
    }

    client = createPhpLspClient({
      rootUri: `file://${workspaceRoot}`,
      logger: silentLogger,
    });

    await client.start();

    testFile = path.join(workspaceRoot, 'test-temp.php');
    fs.writeFileSync(testFile, testContent);
    fileUri = `file://${testFile}`;

    await client.openDocument(fileUri, 'php', testContent);
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
    const hover = await client.getHover(fileUri, 2, 6);
    expect(hover).toBeDefined();
  });

  it('should provide completions', async () => {
    // Trigger completions after "$greeter->" to get method suggestions
    const completions = await client.getCompletion(fileUri, 20, 12);
    expect(completions).toBeDefined();
  });

  it('should provide document symbols', async () => {
    const symbols = await client.getDocumentSymbols(fileUri);
    expect(symbols).toBeDefined();
    expect(symbols!.length).toBeGreaterThan(0);

    const symbolNames = symbols!.map((s: any) => s.name);
    expect(symbolNames).toContain('Greeter');
  });

  it('should provide definition', async () => {
    const definition = await client.getDefinition(fileUri, 19, 18);
    expect(definition).toBeDefined();
  });

  it('should provide references', async () => {
    const references = await client.getReferences(fileUri, 2, 6, true);
    expect(references).toBeDefined();
  });
});

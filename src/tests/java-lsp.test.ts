import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import { createJavaLspClient } from '../lsp-server/java-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, commandExists, directoryExists, fileExists } from './test-helpers';

describe('Java LSP', () => {
  let client: LSPClient;
  let fileUri: string;
  let fileContent: string;

  const javaProjectDir = '/Users/asgupta/code/smojol';
  const javaFile = `${javaProjectDir}/smojol-toolkit/src/main/java/org/smojol/toolkit/ast/FlowNodeServiceImpl.java`;

  beforeAll(async () => {
    const hasServer = await commandExists('jdtls');
    if (!hasServer) {
      throw new Error('jdtls not installed. Run: brew install jdtls');
    }

    if (!directoryExists(javaProjectDir)) {
      throw new Error(`Java project not found: ${javaProjectDir}`);
    }

    if (!fileExists(javaFile)) {
      throw new Error(`Java file not found: ${javaFile}`);
    }

    client = createJavaLspClient({
      rootUri: `file://${javaProjectDir}`,
      logger: silentLogger,
    });

    await client.start();

    fileContent = fs.readFileSync(javaFile, 'utf-8');
    fileUri = `file://${javaFile}`;

    await client.openDocument(fileUri, 'java', fileContent);
    await wait(3000);
  });

  afterAll(async () => {
    if (client) {
      await client.closeDocument(fileUri);
      await safeStop(client);
    }
  });

  it('should initialize with capabilities', async () => {
    const capabilities = client.getServerCapabilities();
    expect(capabilities).toBeDefined();
  });

  it('should provide document symbols', async () => {
    const symbols = await client.getDocumentSymbols(fileUri);
    expect(symbols).toBeDefined();
    expect(symbols!.length).toBeGreaterThan(0);

    const hasClass = symbols!.some((s: any) => s.name === 'FlowNodeServiceImpl');
    expect(hasClass).toBe(true);
  });

  it('should provide hover information', async () => {
    const hover = await client.getHover(fileUri, 28, 12);
    expect(hover).toBeDefined();
    expect(hover?.contents).toBeDefined();
  });

  it('should provide definition', async () => {
    const definition = await client.getDefinition(fileUri, 28, 20);
    expect(definition).toBeDefined();
  });

  it('should provide references', async () => {
    const references = await client.getReferences(fileUri, 28, 12, true);
    expect(references).toBeDefined();
    expect(references!.length).toBeGreaterThan(0);
  });
});

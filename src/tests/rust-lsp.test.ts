import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createRustLspClient } from '../lsp-server/rust-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, commandExists, directoryExists } from './test-helpers';

describe('Rust LSP', () => {
  let client: LSPClient;
  let fileUri: string;
  let fileContent: string;

  const rustProjectDir = '/Users/asgupta/code/rust-web-app';
  const targetFile = path.join(rustProjectDir, 'src/domain/error.rs');

  beforeAll(async () => {
    const hasServer = await commandExists('rust-analyzer');
    if (!hasServer) {
      throw new Error('rust-analyzer not installed. Run: brew install rust-analyzer');
    }

    if (!directoryExists(rustProjectDir)) {
      throw new Error(`Rust project not found: ${rustProjectDir}`);
    }

    client = createRustLspClient({
      rootUri: `file://${rustProjectDir}`,
      logger: silentLogger,
    });

    await client.start();

    fileContent = fs.readFileSync(targetFile, 'utf-8');
    fileUri = `file://${targetFile}`;

    await client.openDocument(fileUri, 'rust', fileContent);
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
  });

  it('should provide hover information', async () => {
    const lines = fileContent.split('\n');
    let structLine = -1;
    let structCol = 0;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\b(struct|enum)\s+(\w+)/);
      if (match && !lines[i].trim().startsWith('//')) {
        structLine = i;
        structCol = lines[i].indexOf(match[2]);
        break;
      }
    }

    if (structLine >= 0) {
      const hover = await client.getHover(fileUri, structLine, structCol);
      expect(hover).toBeDefined();
      expect(hover?.contents).toBeDefined();
    }
  });

  it('should provide completions', async () => {
    const lines = fileContent.split('\n');
    let completionLine = -1;
    let completionCol = 0;

    for (let i = 0; i < lines.length; i++) {
      const scopeIndex = lines[i].lastIndexOf('::');
      if (!lines[i].trim().startsWith('//') && scopeIndex > 0) {
        completionLine = i;
        completionCol = scopeIndex + 2;
        break;
      }
    }

    if (completionLine >= 0) {
      const completions = await client.getCompletion(fileUri, completionLine, completionCol);
      expect(completions).toBeDefined();

      const items = Array.isArray(completions) ? completions : completions?.items;
      expect(items).toBeDefined();
      expect(items!.length).toBeGreaterThan(0);
    }
  });

  it('should provide references', async () => {
    const lines = fileContent.split('\n');
    let structLine = -1;
    let structCol = 0;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\b(struct|enum)\s+(\w+)/);
      if (match && !lines[i].trim().startsWith('//')) {
        structLine = i;
        structCol = lines[i].indexOf(match[2]);
        break;
      }
    }

    if (structLine >= 0) {
      const references = await client.getReferences(fileUri, structLine, structCol, true);
      expect(references).toBeDefined();
      expect(references!.length).toBeGreaterThan(0);
    }
  });
});

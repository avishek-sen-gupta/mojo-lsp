import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import { createCppLspClient, findCppFiles } from '../lsp-server/cpp-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, commandExists, directoryExists } from './test-helpers';

describe('C++ LSP', () => {
  let client: LSPClient;
  let fileUri: string;
  let fileContent: string;

  const cppProjectDir = '/Users/asgupta/code/spdlog';

  beforeAll(async () => {
    const hasServer = await commandExists('clangd');
    if (!hasServer) {
      throw new Error('clangd not installed. Run: brew install llvm');
    }

    if (!directoryExists(cppProjectDir)) {
      throw new Error(`C++ project not found: ${cppProjectDir}`);
    }

    const cppFiles = findCppFiles(cppProjectDir);
    if (cppFiles.length === 0) {
      throw new Error('No C++ files found');
    }

    const targetFile = cppFiles[0];

    client = createCppLspClient({
      rootUri: `file://${cppProjectDir}`,
      logger: silentLogger,
    });

    await client.start();

    fileContent = fs.readFileSync(targetFile, 'utf-8');
    fileUri = `file://${targetFile}`;

    await client.openDocument(fileUri, 'cpp', fileContent);
    await wait(2000);
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
    let classLine = -1;
    let classCol = 0;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\b(class|struct)\s+(\w+)/);
      if (match && !lines[i].trim().startsWith('//')) {
        classLine = i;
        classCol = lines[i].indexOf(match[2]);
        break;
      }
    }

    if (classLine >= 0) {
      const hover = await client.getHover(fileUri, classLine, classCol);
      expect(hover).toBeDefined();
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
    }
  });
});

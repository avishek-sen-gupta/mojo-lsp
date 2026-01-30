import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import { createCsharpLspClient, findCsharpFiles } from '../lsp-server/csharp-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, commandExists, directoryExists } from './test-helpers';

describe('C# LSP', () => {
  let client: LSPClient;
  let fileUri: string;
  let fileContent: string;

  const csharpProjectDir = '/Users/asgupta/code/CleanArchitecture';
  const solutionPath = `${csharpProjectDir}/CleanArchitecture.sln`;

  beforeAll(async () => {
    const hasServer = await commandExists('csharp-ls');
    if (!hasServer) {
      throw new Error('csharp-ls not installed. Run: dotnet tool install --global csharp-ls');
    }

    if (!directoryExists(csharpProjectDir)) {
      throw new Error(`C# project not found: ${csharpProjectDir}`);
    }

    const csharpFiles = findCsharpFiles(csharpProjectDir);
    if (csharpFiles.length === 0) {
      throw new Error('No C# files found');
    }

    const targetFile = csharpFiles[0];

    client = createCsharpLspClient({
      rootUri: `file://${csharpProjectDir}`,
      solutionPath,
      logger: silentLogger,
    });

    await client.start();

    fileContent = fs.readFileSync(targetFile, 'utf-8');
    fileUri = `file://${targetFile}`;

    await client.openDocument(fileUri, 'csharp', fileContent);
    await wait(5000);
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
      const match = lines[i].match(/\bclass\s+(\w+)/);
      if (match && !lines[i].trim().startsWith('//')) {
        classLine = i;
        classCol = lines[i].indexOf(match[1]);
        break;
      }
    }

    if (classLine >= 0) {
      const hover = await client.getHover(fileUri, classLine, classCol);
      expect(hover).toBeDefined();
    }
  });
});

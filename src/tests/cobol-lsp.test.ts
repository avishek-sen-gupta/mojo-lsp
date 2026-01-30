import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import { createCobolLspClient, findCobolFiles } from '../lsp-server/cobol-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, directoryExists, fileExists } from './test-helpers';

describe('COBOL LSP', () => {
  let client: LSPClient;
  let fileUri: string;
  let fileContent: string;

  const cobolProjectDir = '/Users/asgupta/code/che-che4z-lsp-for-cobol-2.4.3/tests/test_files/Cobol85PositiveTestsSuite/positive';
  const serverJar = '/Users/asgupta/code/che-che4z-lsp-for-cobol-2.4.3/clients/cobol-lsp-vscode-extension/server/jar/server.jar';

  beforeAll(async () => {
    if (!directoryExists(cobolProjectDir)) {
      throw new Error(`COBOL project not found: ${cobolProjectDir}`);
    }

    if (!fileExists(serverJar)) {
      throw new Error(`COBOL LSP server JAR not found: ${serverJar}`);
    }

    const cobolFiles = findCobolFiles(cobolProjectDir);
    if (cobolFiles.length === 0) {
      throw new Error('No COBOL files found');
    }

    const targetFile = cobolFiles[0];

    client = createCobolLspClient({
      rootUri: `file://${cobolProjectDir}`,
      serverJar,
      logger: silentLogger,
    });

    await client.start();

    fileContent = fs.readFileSync(targetFile, 'utf-8');
    fileUri = `file://${targetFile}`;

    await client.openDocument(fileUri, 'cobol', fileContent);
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
  });

  it('should provide hover information', async () => {
    const lines = fileContent.split('\n');
    let dataLine = -1;
    let dataCol = 0;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\b(WORKING-STORAGE|DATA|PROCEDURE)\b/i);
      if (match) {
        dataLine = i;
        dataCol = lines[i].indexOf(match[1]);
        break;
      }
    }

    if (dataLine >= 0) {
      const hover = await client.getHover(fileUri, dataLine, dataCol);
      expect(hover).toBeDefined();
    }
  });
});

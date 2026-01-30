import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createPythonLspClient, findPythonFiles } from '../lsp-server/python-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, directoryExists } from './test-helpers';

describe('Python LSP', () => {
  let client: LSPClient;
  let fileUri: string;
  let fileContent: string;

  const pythonProjectDir = '/Users/asgupta/code/smol-python-project';
  const serverDir = path.resolve(process.cwd(), '../pylsp');

  beforeAll(async () => {
    if (!directoryExists(pythonProjectDir)) {
      throw new Error(`Python project not found: ${pythonProjectDir}`);
    }

    if (!directoryExists(serverDir)) {
      throw new Error(`pylsp server directory not found: ${serverDir}`);
    }

    const pythonFiles = findPythonFiles(pythonProjectDir);
    if (pythonFiles.length === 0) {
      throw new Error('No Python files found');
    }

    const targetFile = pythonFiles[0];

    client = createPythonLspClient({
      rootUri: `file://${pythonProjectDir}`,
      serverDir,
      logger: silentLogger,
    });

    await client.start();

    fileContent = fs.readFileSync(targetFile, 'utf-8');
    fileUri = `file://${targetFile}`;

    await client.openDocument(fileUri, 'python', fileContent);
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
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import { createRubyLspClient, findRubyFiles } from '../lsp-server/ruby-lsp-server';
import { LSPClient } from '../lsp-client';
import { silentLogger, wait, safeStop, commandExists, directoryExists } from './test-helpers';

describe('Ruby LSP', () => {
  let client: LSPClient;
  let fileUri: string;
  let fileContent: string;

  const rubyProjectDir = '/Users/asgupta/code/sample-ruby-project';

  beforeAll(async () => {
    const hasServer = await commandExists('solargraph');
    if (!hasServer) {
      throw new Error('solargraph not installed. Run: gem install solargraph');
    }

    if (!directoryExists(rubyProjectDir)) {
      throw new Error(`Ruby project not found: ${rubyProjectDir}`);
    }

    const rubyFiles = findRubyFiles(rubyProjectDir);
    if (rubyFiles.length === 0) {
      throw new Error('No Ruby files found');
    }

    const targetFile = rubyFiles[0];

    client = createRubyLspClient({
      rootUri: `file://${rubyProjectDir}`,
      cwd: rubyProjectDir,
      logger: silentLogger,
    });

    await client.start();

    fileContent = fs.readFileSync(targetFile, 'utf-8');
    fileUri = `file://${targetFile}`;

    await client.openDocument(fileUri, 'ruby', fileContent);
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
      const match = lines[i].match(/\bclass\s+(\w+)/);
      if (match) {
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

  it('should provide definition', async () => {
    const lines = fileContent.split('\n');
    let defLine = -1;
    let defCol = 0;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\bdef\s+(\w+)/);
      if (match) {
        defLine = i;
        defCol = lines[i].indexOf(match[1]);
        break;
      }
    }

    if (defLine >= 0) {
      const definition = await client.getDefinition(fileUri, defLine, defCol);
      expect(definition).toBeDefined();
    }
  });
});

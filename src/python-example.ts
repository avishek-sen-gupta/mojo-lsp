import { LSPClient } from './lsp-client';
import { Logger, SymbolKind } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as fs from 'fs';

// Simple console logger
const logger: Logger = {
  error: (message: string) => console.error(`[ERROR] ${message}`),
  warn: (message: string) => console.warn(`[WARN] ${message}`),
  info: (message: string) => console.info(`[INFO] ${message}`),
  log: (message: string) => console.log(`[LOG] ${message}`),
};

// Map SymbolKind enum to human-readable names
function symbolKindName(kind: SymbolKind): string {
  const names: Record<number, string> = {
    1: 'File', 2: 'Module', 3: 'Namespace', 4: 'Package', 5: 'Class',
    6: 'Method', 7: 'Property', 8: 'Field', 9: 'Constructor', 10: 'Enum',
    11: 'Interface', 12: 'Function', 13: 'Variable', 14: 'Constant',
  };
  return names[kind] || `Unknown(${kind})`;
}

// Recursively find all Python files in a directory
function findPythonFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['node_modules', 'venv', '.venv', '__pycache__', 'build', 'dist'].includes(entry.name)) {
      files.push(...findPythonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.py')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  // Example: Connect to basedpyright Language Server
  // basedpyright is a fork of pyright with additional features
  //
  // Setup:
  //   cd ../basedpyright-lsp-server
  //   poetry add basedpyright
  //
  // NOTE: basedpyright may have slower response times for document requests.
  // Consider using pylsp or pyright directly if you experience issues.

  const workspaceRoot = process.cwd();
  const serverDir = path.resolve(workspaceRoot, '../basedpyright-lsp-server');
  const pythonProjectDir = '/Users/asgupta/code/smol-python-project';

  if (!fs.existsSync(serverDir)) {
    console.error('Server directory not found:', serverDir);
    return;
  }

  // Find Python files
  const pythonFiles = findPythonFiles(pythonProjectDir);
  if (pythonFiles.length === 0) {
    console.error('No Python files found in', pythonProjectDir);
    return;
  }

  const selectedFile = pythonFiles[0];
  console.log(`Found ${pythonFiles.length} Python files. Using: ${selectedFile}`);

  const client = new LSPClient({
    serverCommand: 'poetry',
    serverArgs: ['run', 'basedpyright-langserver', '--stdio'],
    rootUri: `file://${pythonProjectDir}`,
    logger,
    cwd: serverDir,
  });

  try {
    console.log('Starting Python language server (basedpyright)...');
    const initResult = await client.start();
    console.log('Server initialized!');
    console.log('Hover support:', initResult.capabilities.hoverProvider);
    console.log('Completion support:', initResult.capabilities.completionProvider ? 'yes' : 'no');
    console.log('Document symbol support:', initResult.capabilities.documentSymbolProvider);

    // Set up diagnostics handler
    client.onDiagnostics((params) => {
      if (params.diagnostics.length > 0) {
        console.log(`\nDiagnostics for ${path.basename(params.uri)}:`);
        for (const diag of params.diagnostics.slice(0, 5)) {
          const severity = ['', 'Error', 'Warning', 'Info', 'Hint'][diag.severity || 1];
          console.log(`  [${severity}] Line ${diag.range.start.line + 1}: ${diag.message}`);
        }
      }
    });

    // Read and open document
    const fileContent = fs.readFileSync(selectedFile, 'utf-8');
    const fileUri = `file://${selectedFile}`;

    await client.openDocument(fileUri, 'python', fileContent);
    console.log('\nOpened document:', selectedFile);

    // Wait for analysis
    console.log('Waiting for server to analyze...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Get document symbols
    console.log('\n=== Document Symbols ===\n');
    try {
      const symbols = await Promise.race([
        client.getDocumentSymbols(fileUri),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      ]);

      if (symbols && symbols.length > 0) {
        const printSymbol = (sym: any, indent: number = 0): void => {
          const prefix = '  '.repeat(indent);
          const kind = symbolKindName(sym.kind);
          const line = sym.range ? `(line ${sym.range.start.line + 1})` : '';
          console.log(`${prefix}- [${kind}] ${sym.name} ${line}`);
          if (sym.children) {
            for (const child of sym.children) {
              printSymbol(child, indent + 1);
            }
          }
        };
        for (const sym of symbols) {
          printSymbol(sym);
        }
      } else {
        console.log('No symbols found');
      }
    } catch (e) {
      console.log('Document symbols request timed out');
    }

    // Close and stop
    await client.closeDocument(fileUri);
    await client.stop();
    console.log('\nServer stopped');
  } catch (error) {
    console.error('Error:', error);
    await client.stop();
  }
}

main();

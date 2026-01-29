import { createJavaLspClient } from '../lsp-server/java-lsp-server';
import { Logger, SymbolKind } from 'vscode-languageserver-protocol';
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
    1: 'File',
    2: 'Module',
    3: 'Namespace',
    4: 'Package',
    5: 'Class',
    6: 'Method',
    7: 'Property',
    8: 'Field',
    9: 'Constructor',
    10: 'Enum',
    11: 'Interface',
    12: 'Function',
    13: 'Variable',
    14: 'Constant',
    15: 'String',
    16: 'Number',
    17: 'Boolean',
    18: 'Array',
    19: 'Object',
    20: 'Key',
    21: 'Null',
    22: 'EnumMember',
    23: 'Struct',
    24: 'Event',
    25: 'Operator',
    26: 'TypeParameter',
  };
  return names[kind] || `Unknown(${kind})`;
}

async function main() {
  // Example: Connect to Eclipse JDT Language Server for Java
  // You need to have jdtls installed. On macOS with Homebrew:
  //   brew install jdtls
  //
  // Or download from: https://download.eclipse.org/jdtls/snapshots/

  const workspaceRoot = '/Users/asgupta/code/smojol';

  const client = createJavaLspClient({
    rootUri: `file://${workspaceRoot}`,
    logger,
  });

  try {
    // Start the client and initialize the server
    console.log('Starting Java language server (jdtls)...');
    const initResult = await client.start();
    console.log('Server initialized!');
    console.log('Document symbol support:', initResult.capabilities.documentSymbolProvider);

    // Read a Java file from the smojol repository
    const javaFile = `${workspaceRoot}/smojol-toolkit/src/main/java/org/smojol/toolkit/ast/FlowNodeServiceImpl.java`;
    const fileContent = fs.readFileSync(javaFile, 'utf-8');
    const fileUri = `file://${javaFile}`;

    // Open the document
    await client.openDocument(fileUri, 'java', fileContent);
    console.log('\nOpened document:', javaFile);

    // Wait for the server to process the file
    console.log('Waiting for server to analyze the file...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Get document symbols
    console.log('\n=== Document Symbols in FlowNodeServiceImpl.java ===\n');
    const symbols = await client.getDocumentSymbols(fileUri);

    if (symbols && symbols.length > 0) {
      // Helper function to print symbols with indentation
      function printSymbol(sym: any, indent: number = 0) {
        const prefix = '  '.repeat(indent);
        const kind = symbolKindName(sym.kind);
        const range = sym.range || sym.location?.range;
        const line = range ? `(line ${range.start.line + 1})` : '';

        console.log(`${prefix}- [${kind}] ${sym.name} ${line}`);

        // If hierarchical symbols, print children
        if (sym.children) {
          for (const child of sym.children) {
            printSymbol(child, indent + 1);
          }
        }
      }

      for (const sym of symbols) {
        printSymbol(sym);
      }
    } else {
      console.log('No symbols found (server may need more time to index the project)');
    }

    // Close document
    await client.closeDocument(fileUri);

    // Stop the server
    await client.stop();
    console.log('\nServer stopped');
  } catch (error) {
    console.error('Error:', error);
    await client.stop();
  }
}

main();

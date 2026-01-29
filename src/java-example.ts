import { createJavaLspClient } from './lsp-server/java-lsp-server';
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

    // Set up diagnostics handler (silent - only count errors for the target file)
    let targetDiagCount = 0;
    client.onDiagnostics((params) => {
      if (params.uri.includes('FlowNodeServiceImpl')) {
        targetDiagCount = params.diagnostics.length;
      }
    });

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

    // Inspect symbols INSIDE the register() method using hover
    console.log('\n=== Symbols Inside register() Method (lines 28-33) ===\n');

    // Hover over 'index' local variable (line 29, column 12)
    console.log('Local variable "index":');
    const hoverIndex = await client.getHover(fileUri, 28, 12); // 0-indexed: line 29
    if (hoverIndex?.contents) {
      console.log('  Type:', JSON.stringify(hoverIndex.contents, null, 2));
    }

    // Hover over 'nodes' field reference (line 29, column 20)
    console.log('\nField reference "nodes":');
    const hoverNodes = await client.getHover(fileUri, 28, 20);
    if (hoverNodes?.contents) {
      console.log('  Type:', JSON.stringify(hoverNodes.contents, null, 2));
    }

    // Hover over 'flowNode' parameter (line 28, column 35)
    console.log('\nParameter "flowNode":');
    const hoverParam = await client.getHover(fileUri, 27, 35);
    if (hoverParam?.contents) {
      console.log('  Type:', JSON.stringify(hoverParam.contents, null, 2));
    }

    // Get definition of 'nodes' to show where it's declared
    console.log('\nDefinition of "nodes" (from line 29):');
    const defNodes = await client.getDefinition(fileUri, 28, 20);
    if (defNodes) {
      console.log('  Defined at:', JSON.stringify(defNodes, null, 2));
    }

    // Get references to 'index' within the method
    console.log('\nReferences to "index":');
    const refsIndex = await client.getReferences(fileUri, 28, 12, true);
    if (refsIndex && refsIndex.length > 0) {
      for (const ref of refsIndex) {
        console.log(`  - Line ${ref.range.start.line + 1}, col ${ref.range.start.character}`);
      }
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

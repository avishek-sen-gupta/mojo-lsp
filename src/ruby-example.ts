import { createRubyLspClient } from './lsp-server/ruby-lsp-server';
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
  // Example: Connect to Solargraph (Ruby Language Server)
  // You need to have solargraph installed:
  //   gem install solargraph

  const rubyProjectDir = '/Users/asgupta/code/sample-ruby-project';

  // Verify the directory exists
  if (!fs.existsSync(rubyProjectDir)) {
    console.error('Ruby project directory not found:', rubyProjectDir);
    return;
  }

  // Use a specific file: lib/foo.rb
  const targetFile = path.join(rubyProjectDir, 'lib/foo.rb');
  if (!fs.existsSync(targetFile)) {
    console.error('Target file not found:', targetFile);
    return;
  }
  console.log(`Selected: ${targetFile}`);

  const client = createRubyLspClient({
    rootUri: `file://${rubyProjectDir}`,
    logger,
  });

  try {
    // Start the client and initialize the server
    console.log('Starting Ruby language server (solargraph)...');
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
        if (params.diagnostics.length > 5) {
          console.log(`  ... and ${params.diagnostics.length - 5} more`);
        }
      }
    });

    // Read the content of the target Ruby file
    const fileContent = fs.readFileSync(targetFile, 'utf-8');
    const fileUri = `file://${targetFile}`;

    // Open the document
    await client.openDocument(fileUri, 'ruby', fileContent);
    console.log('\nOpened document:', targetFile);

    // Wait for solargraph to analyze the file
    console.log('Waiting for solargraph to analyze the file...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Get document symbols
    console.log('\n=== Document Symbols ===\n');
    const symbols = await client.getDocumentSymbols(fileUri);

    if (symbols && symbols.length > 0) {
      const printSymbol = (sym: any, indent: number = 0): void => {
        const prefix = '  '.repeat(indent);
        const kind = symbolKindName(sym.kind);
        const range = sym.range || sym.location?.range;
        const line = range ? `(line ${range.start.line + 1})` : '';

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

    // Find interesting locations in the file for hover/completion/definition
    const lines = fileContent.split('\n');

    // Find a line with a class or module declaration
    let classLine = -1;
    let classCol = 0;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\b(class|module)\s+(\w+)/);
      if (match && !lines[i].trim().startsWith('#')) {
        classLine = i;
        classCol = lines[i].indexOf(match[2]);
        break;
      }
    }

    // Find a line with a method definition
    let methodLine = -1;
    let methodCol = 0;
    for (let i = 0; i < lines.length; i++) {
      // Match method definitions (def method_name)
      const match = lines[i].match(/\bdef\s+(\w+)/);
      if (match && !lines[i].trim().startsWith('#')) {
        methodLine = i;
        methodCol = lines[i].indexOf(match[1]);
        break;
      }
    }

    // Get hover info
    console.log('\n=== Hover Information ===\n');

    if (classLine >= 0) {
      console.log(`Hover over class/module (line ${classLine + 1}, col ${classCol}):`);
      const hoverClass = await client.getHover(fileUri, classLine, classCol);
      if (hoverClass?.contents) {
        console.log('  ', JSON.stringify(hoverClass.contents, null, 2));
      } else {
        console.log('  No hover info available');
      }
    }

    if (methodLine >= 0) {
      console.log(`\nHover over method (line ${methodLine + 1}, col ${methodCol}):`);
      const hoverMethod = await client.getHover(fileUri, methodLine, methodCol);
      if (hoverMethod?.contents) {
        console.log('  ', JSON.stringify(hoverMethod.contents, null, 2));
      } else {
        console.log('  No hover info available');
      }
    }

    // Get completions after .
    console.log('\n=== Completions ===\n');
    let completionLine = -1;
    let completionCol = 0;
    for (let i = 0; i < lines.length; i++) {
      // Look for . (method call) or :: (constant/module access)
      const dotIndex = lines[i].lastIndexOf('.');
      const scopeIndex = lines[i].lastIndexOf('::');

      if (!lines[i].trim().startsWith('#')) {
        if (dotIndex > 0) {
          completionLine = i;
          completionCol = dotIndex + 1;
          break;
        } else if (scopeIndex > 0) {
          completionLine = i;
          completionCol = scopeIndex + 2;
          break;
        }
      }
    }

    if (completionLine >= 0) {
      console.log(`Completions at line ${completionLine + 1}, col ${completionCol}:`);
      const completions = await client.getCompletion(fileUri, completionLine, completionCol);
      if (completions) {
        const items = Array.isArray(completions) ? completions : completions.items;
        if (items && items.length > 0) {
          console.log('First 10 completions:');
          items.slice(0, 10).forEach((item) => {
            const detail = item.detail ? ` - ${item.detail}` : '';
            console.log(`  - ${item.label}${detail}`);
          });
        } else {
          console.log('  No completions available');
        }
      }
    } else {
      console.log('No suitable location found for completions');
    }

    // Get definition
    console.log('\n=== Definition ===\n');
    if (methodLine >= 0) {
      console.log(`Definition lookup at line ${methodLine + 1}, col ${methodCol}:`);
      const definition = await client.getDefinition(fileUri, methodLine, methodCol);
      if (definition) {
        const defs = Array.isArray(definition) ? definition : [definition];
        for (const def of defs) {
          if ('uri' in def && 'range' in def) {
            const defFile = def.uri.replace('file://', '');
            console.log(`  Defined in ${path.basename(defFile)} at line ${def.range.start.line + 1}, col ${def.range.start.character}`);
          } else if ('targetUri' in def) {
            const defFile = def.targetUri.replace('file://', '');
            console.log(`  Defined in ${path.basename(defFile)} at line ${def.targetRange.start.line + 1}, col ${def.targetRange.start.character}`);
          }
        }
      } else {
        console.log('  No definition found');
      }
    }

    // Get references
    console.log('\n=== References ===\n');
    if (classLine >= 0) {
      console.log(`References for class/module at line ${classLine + 1}:`);
      const references = await client.getReferences(fileUri, classLine, classCol, true);
      if (references && references.length > 0) {
        for (const ref of references.slice(0, 10)) {
          const refFile = ref.uri.replace('file://', '');
          console.log(`  - ${path.basename(refFile)}: Line ${ref.range.start.line + 1}, col ${ref.range.start.character}`);
        }
        if (references.length > 10) {
          console.log(`  ... and ${references.length - 10} more`);
        }
      } else {
        console.log('  No references found');
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

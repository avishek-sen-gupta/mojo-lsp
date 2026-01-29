import { createCsharpLspClient, findCsharpFiles } from '../lsp-server/csharp-lsp-server';
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
  // Example: Connect to csharp-ls (C# Language Server)
  // You need to have csharp-ls installed:
  //   dotnet tool install --global csharp-ls
  //
  // csharp-ls is a Roslyn-based language server for C#
  // https://github.com/razzmatazz/csharp-language-server

  const workspaceRoot = process.cwd();
  const cleanArchitectureDir = path.resolve(workspaceRoot, '../CleanArchitecture');

  // Find all C# files in the CleanArchitecture directory
  const csFiles = findCsharpFiles(cleanArchitectureDir);
  if (csFiles.length === 0) {
    console.error('No C# files found in', cleanArchitectureDir);
    return;
  }

  // Pick a random C# file
  const randomFile = csFiles[Math.floor(Math.random() * csFiles.length)];
  console.log(`Found ${csFiles.length} C# files. Selected: ${randomFile}`);

  const solutionPath = path.join(cleanArchitectureDir, 'CleanArchitecture.sln');
  const client = createCsharpLspClient({
    rootUri: `file://${cleanArchitectureDir}`,
    solutionPath,
    logger,
  });

  try {
    // Start the client and initialize the server
    console.log('Starting C# language server (csharp-ls)...');
    const initResult = await client.start();
    console.log('Server initialized!');
    console.log('Hover support:', initResult.capabilities.hoverProvider);
    console.log('Completion support:', initResult.capabilities.completionProvider ? 'yes' : 'no');
    console.log('Document symbol support:', initResult.capabilities.documentSymbolProvider);

    // Set up diagnostics handler
    client.onDiagnostics((params) => {
      if (params.diagnostics.length > 0) {
        console.log(`\nDiagnostics for ${path.basename(params.uri)}:`);
        for (const diag of params.diagnostics) {
          const severity = ['', 'Error', 'Warning', 'Info', 'Hint'][diag.severity || 1];
          console.log(`  [${severity}] Line ${diag.range.start.line + 1}: ${diag.message}`);
        }
      }
    });

    // Read the content of the random C# file
    const fileContent = fs.readFileSync(randomFile, 'utf-8');
    const fileUri = `file://${randomFile}`;

    // Open the document
    await client.openDocument(fileUri, 'csharp', fileContent);
    console.log('\nOpened document:', randomFile);

    // Wait for the server to analyze the file (C# solution loading can take a while)
    console.log('Waiting for server to analyze the solution (this may take a moment)...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

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
      console.log('No symbols found (server may need more time to index)');
    }

    // Find interesting locations in the file for hover/completion/definition
    const lines = fileContent.split('\n');

    // Find a line with a class declaration
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

    // Find a line with a method declaration
    let methodLine = -1;
    let methodCol = 0;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\b(public|private|protected|internal)\s+\w+\s+(\w+)\s*\(/);
      if (match && !lines[i].includes('class ')) {
        methodLine = i;
        methodCol = lines[i].indexOf(match[2]);
        break;
      }
    }

    // Get hover info
    console.log('\n=== Hover Information ===\n');

    if (classLine >= 0) {
      console.log(`Hover over class (line ${classLine + 1}, col ${classCol}):`);
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

    // Get completions at the end of a line with a dot
    console.log('\n=== Completions ===\n');
    let completionLine = -1;
    let completionCol = 0;
    for (let i = 0; i < lines.length; i++) {
      const dotIndex = lines[i].lastIndexOf('.');
      if (dotIndex > 0 && !lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('using')) {
        completionLine = i;
        completionCol = dotIndex + 1;
        break;
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
          if ('range' in def) {
            console.log(`  Defined at line ${def.range.start.line + 1}, col ${def.range.start.character}`);
          } else if ('targetRange' in def) {
            console.log(`  Defined at line ${def.targetRange.start.line + 1}, col ${def.targetRange.start.character}`);
          }
        }
      } else {
        console.log('  No definition found');
      }
    }

    // Get references
    console.log('\n=== References ===\n');
    if (classLine >= 0) {
      console.log(`References for class at line ${classLine + 1}:`);
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

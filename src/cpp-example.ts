import { createCppLspClient, findCppFiles } from './lsp-server/cpp-lsp-server';
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
  // Example: Connect to clangd (C/C++ Language Server)
  // You need to have clangd installed:
  //   - macOS: brew install llvm (clangd is included)
  //   - Ubuntu: apt install clangd
  //   - Or download from https://clangd.llvm.org/installation
  //
  // For best results, generate compile_commands.json in your project:
  //   cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON .

  const workspaceRoot = process.cwd();
  const spdlogDir = path.resolve(workspaceRoot, '../spdlog');

  // Find all C++ files in the spdlog directory
  const cppFiles = findCppFiles(spdlogDir);
  if (cppFiles.length === 0) {
    console.error('No C++ files found in', spdlogDir);
    return;
  }

  // Pick a random C++ file (prefer .cpp or .h files over others)
  const preferredFiles = cppFiles.filter(f => f.endsWith('.cpp') || f.endsWith('.h'));
  const filesToChooseFrom = preferredFiles.length > 0 ? preferredFiles : cppFiles;
  const randomFile = filesToChooseFrom[Math.floor(Math.random() * filesToChooseFrom.length)];
  console.log(`Found ${cppFiles.length} C++ files. Selected: ${randomFile}`);

  const client = createCppLspClient({
    rootUri: `file://${spdlogDir}`,
    logger,
  });

  try {
    // Start the client and initialize the server
    console.log('Starting C++ language server (clangd)...');
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

    // Read the content of the random C++ file
    const fileContent = fs.readFileSync(randomFile, 'utf-8');
    const fileUri = `file://${randomFile}`;

    // Determine language ID based on extension
    const ext = path.extname(randomFile);
    const languageId = ['.c'].includes(ext) ? 'c' : 'cpp';

    // Open the document
    await client.openDocument(fileUri, languageId, fileContent);
    console.log('\nOpened document:', randomFile);

    // Wait for clangd to parse the file
    console.log('Waiting for clangd to analyze the file...');
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

    // Find a line with a class or struct declaration
    let classLine = -1;
    let classCol = 0;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\b(class|struct)\s+(\w+)/);
      if (match && !lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('*')) {
        classLine = i;
        classCol = lines[i].indexOf(match[2]);
        break;
      }
    }

    // Find a line with a function declaration
    let funcLine = -1;
    let funcCol = 0;
    for (let i = 0; i < lines.length; i++) {
      // Match function declarations (return_type function_name(...))
      const match = lines[i].match(/^\s*(?:virtual\s+)?(?:static\s+)?(?:inline\s+)?(?:const\s+)?(\w+(?:<[^>]+>)?(?:\s*[*&])?)\s+(\w+)\s*\(/);
      if (match && !lines[i].trim().startsWith('//') && !lines[i].includes('#define')) {
        funcLine = i;
        funcCol = lines[i].indexOf(match[2]);
        break;
      }
    }

    // Get hover info
    console.log('\n=== Hover Information ===\n');

    if (classLine >= 0) {
      console.log(`Hover over class/struct (line ${classLine + 1}, col ${classCol}):`);
      const hoverClass = await client.getHover(fileUri, classLine, classCol);
      if (hoverClass?.contents) {
        console.log('  ', JSON.stringify(hoverClass.contents, null, 2));
      } else {
        console.log('  No hover info available');
      }
    }

    if (funcLine >= 0) {
      console.log(`\nHover over function (line ${funcLine + 1}, col ${funcCol}):`);
      const hoverFunc = await client.getHover(fileUri, funcLine, funcCol);
      if (hoverFunc?.contents) {
        console.log('  ', JSON.stringify(hoverFunc.contents, null, 2));
      } else {
        console.log('  No hover info available');
      }
    }

    // Get completions after :: or . or ->
    console.log('\n=== Completions ===\n');
    let completionLine = -1;
    let completionCol = 0;
    for (let i = 0; i < lines.length; i++) {
      // Look for :: (scope resolution), . (member access), or -> (pointer member access)
      const scopeIndex = lines[i].lastIndexOf('::');
      const dotIndex = lines[i].lastIndexOf('.');
      const arrowIndex = lines[i].lastIndexOf('->');

      if (!lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('#')) {
        if (scopeIndex > 0) {
          completionLine = i;
          completionCol = scopeIndex + 2;
          break;
        } else if (arrowIndex > 0) {
          completionLine = i;
          completionCol = arrowIndex + 2;
          break;
        } else if (dotIndex > 0) {
          completionLine = i;
          completionCol = dotIndex + 1;
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
    if (funcLine >= 0) {
      console.log(`Definition lookup at line ${funcLine + 1}, col ${funcCol}:`);
      const definition = await client.getDefinition(fileUri, funcLine, funcCol);
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
      console.log(`References for class/struct at line ${classLine + 1}:`);
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

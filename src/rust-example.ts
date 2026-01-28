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

// Recursively find all Rust files in a directory
function findRustFiles(dir: string): string[] {
  const files: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    // Skip hidden directories, target directory, and common non-source directories
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !['target', 'node_modules', 'vendor'].includes(entry.name)) {
      files.push(...findRustFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.rs')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  // Example: Connect to rust-analyzer (Rust Language Server)
  // You need to have rust-analyzer installed:
  //   - macOS: brew install rust-analyzer
  //   - Or via rustup: rustup component add rust-analyzer
  //   - Or download from https://rust-analyzer.github.io/

  const rustProjectDir = '/Users/asgupta/code/rust-web-app';

  // Verify the directory exists
  if (!fs.existsSync(rustProjectDir)) {
    console.error('Rust project directory not found:', rustProjectDir);
    return;
  }

  // Use a specific file: error.rs
  const targetFile = path.join(rustProjectDir, 'src/domain/error.rs');
  if (!fs.existsSync(targetFile)) {
    console.error('Target file not found:', targetFile);
    return;
  }
  console.log(`Selected: ${targetFile}`);

  const client = new LSPClient({
    serverCommand: 'rust-analyzer',
    rootUri: `file://${rustProjectDir}`,
    logger,
  });

  try {
    // Start the client and initialize the server
    console.log('Starting Rust language server (rust-analyzer)...');
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

    // Read the content of the target Rust file
    const fileContent = fs.readFileSync(targetFile, 'utf-8');
    const fileUri = `file://${targetFile}`;

    // Open the document
    await client.openDocument(fileUri, 'rust', fileContent);
    console.log('\nOpened document:', targetFile);

    // Wait for rust-analyzer to analyze the file
    console.log('Waiting for rust-analyzer to analyze the file...');
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

    // Find a line with a struct or enum declaration
    let structLine = -1;
    let structCol = 0;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\b(struct|enum)\s+(\w+)/);
      if (match && !lines[i].trim().startsWith('//')) {
        structLine = i;
        structCol = lines[i].indexOf(match[2]);
        break;
      }
    }

    // Find a line with a function declaration
    let funcLine = -1;
    let funcCol = 0;
    for (let i = 0; i < lines.length; i++) {
      // Match function declarations (fn function_name or pub fn function_name)
      const match = lines[i].match(/\b(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/);
      if (match && !lines[i].trim().startsWith('//')) {
        funcLine = i;
        funcCol = lines[i].indexOf(match[1]);
        break;
      }
    }

    // Get hover info
    console.log('\n=== Hover Information ===\n');

    if (structLine >= 0) {
      console.log(`Hover over struct/enum (line ${structLine + 1}, col ${structCol}):`);
      const hoverStruct = await client.getHover(fileUri, structLine, structCol);
      if (hoverStruct?.contents) {
        console.log('  ', JSON.stringify(hoverStruct.contents, null, 2));
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

    // Get completions after :: or .
    console.log('\n=== Completions ===\n');
    let completionLine = -1;
    let completionCol = 0;
    for (let i = 0; i < lines.length; i++) {
      // Look for :: (path separator) or . (method call)
      const scopeIndex = lines[i].lastIndexOf('::');
      const dotIndex = lines[i].lastIndexOf('.');

      if (!lines[i].trim().startsWith('//')) {
        if (scopeIndex > 0) {
          completionLine = i;
          completionCol = scopeIndex + 2;
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
    if (structLine >= 0) {
      console.log(`References for struct/enum at line ${structLine + 1}:`);
      const references = await client.getReferences(fileUri, structLine, structCol, true);
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

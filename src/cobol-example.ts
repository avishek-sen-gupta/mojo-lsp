import { createCobolLspClient, findCobolFiles } from './lsp-server/cobol-lsp-server';
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
  // Example: Connect to Che4z COBOL Language Server
  // The server is a Java JAR file that communicates over stdio
  //
  // Che4z COBOL Language Support:
  // https://github.com/eclipse-che4z/che-che4z-lsp-for-cobol

  const workspaceRoot = process.cwd();
  const che4zDir = path.resolve(workspaceRoot, '../che-che4z-lsp-for-cobol-2.4.3');
  const serverJar = path.join(che4zDir, 'server/engine/target/server.jar');

  // Find all COBOL files in the Che4z directory (uses test files)
  const cobolFiles = findCobolFiles(che4zDir);
  if (cobolFiles.length === 0) {
    console.error('No COBOL files found in', che4zDir);
    return;
  }

  // Prefer files from positive test directories (better structured COBOL)
  const preferredFiles = cobolFiles.filter(f =>
    f.includes('/positive/') && !f.includes('compileListing')
  );
  const filesToChooseFrom = preferredFiles.length > 0 ? preferredFiles : cobolFiles;

  // Pick a random COBOL file
  const randomFile = filesToChooseFrom[Math.floor(Math.random() * filesToChooseFrom.length)];
  console.log(`Found ${cobolFiles.length} COBOL files (${preferredFiles.length} preferred). Selected: ${randomFile}`);

  const client = createCobolLspClient({
    serverJar,
    rootUri: `file://${che4zDir}`,
    logger,
  });

  try {
    // Start the client and initialize the server
    console.log('Starting COBOL language server (Che4z)...');
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

    // Read the content of the random COBOL file
    const fileContent = fs.readFileSync(randomFile, 'utf-8');
    const fileUri = `file://${randomFile}`;

    // Open the document
    await client.openDocument(fileUri, 'cobol', fileContent);
    console.log('\nOpened document:', randomFile);

    // Wait for the server to analyze the file
    console.log('Waiting for server to analyze the file...');
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

    // Find a line with a data item or variable (COBOL variables are in columns 8-72)
    let dataLine = -1;
    let dataCol = 0;
    for (let i = 0; i < lines.length; i++) {
      // Look for level numbers (01, 05, 10, 77, 88, etc.) followed by a data name
      const match = lines[i].match(/^\s{6}\s*(01|05|10|15|20|25|77|88)\s+([A-Z0-9-]+)/i);
      if (match) {
        dataLine = i;
        dataCol = lines[i].indexOf(match[2]);
        break;
      }
    }

    // Find a line with a PERFORM or CALL statement
    let procLine = -1;
    let procCol = 0;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\b(PERFORM|CALL)\s+([A-Z0-9-]+)/i);
      if (match) {
        procLine = i;
        procCol = lines[i].indexOf(match[2]);
        break;
      }
    }

    // Find a paragraph or section name
    let paragraphLine = -1;
    let paragraphCol = 0;
    for (let i = 0; i < lines.length; i++) {
      // Paragraph names start in column 8 and end with a period
      const match = lines[i].match(/^\s{6}\s([A-Z0-9-]+)\s*(SECTION)?\.?\s*$/i);
      if (match && !['IDENTIFICATION', 'ENVIRONMENT', 'DATA', 'PROCEDURE', 'WORKING-STORAGE', 'FILE', 'LINKAGE'].includes(match[1].toUpperCase())) {
        paragraphLine = i;
        paragraphCol = lines[i].indexOf(match[1]);
        break;
      }
    }

    // Get hover info
    console.log('\n=== Hover Information ===\n');

    if (dataLine >= 0) {
      console.log(`Hover over data item (line ${dataLine + 1}, col ${dataCol}):`);
      const hoverData = await client.getHover(fileUri, dataLine, dataCol);
      if (hoverData?.contents) {
        console.log('  ', JSON.stringify(hoverData.contents, null, 2));
      } else {
        console.log('  No hover info available');
      }
    }

    if (paragraphLine >= 0) {
      console.log(`\nHover over paragraph (line ${paragraphLine + 1}, col ${paragraphCol}):`);
      const hoverPara = await client.getHover(fileUri, paragraphLine, paragraphCol);
      if (hoverPara?.contents) {
        console.log('  ', JSON.stringify(hoverPara.contents, null, 2));
      } else {
        console.log('  No hover info available');
      }
    }

    // Get completions in the procedure division
    console.log('\n=== Completions ===\n');
    let completionLine = -1;
    let completionCol = 0;
    for (let i = 0; i < lines.length; i++) {
      // Find a line in procedure division with some code
      if (lines[i].match(/^\s{6}\s+(MOVE|ADD|SUBTRACT|MULTIPLY|DIVIDE|IF|PERFORM)/i)) {
        completionLine = i;
        // Position after the keyword
        completionCol = lines[i].search(/\S/) + 10;
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
    if (procLine >= 0) {
      console.log(`Definition lookup for PERFORM/CALL target (line ${procLine + 1}, col ${procCol}):`);
      const definition = await client.getDefinition(fileUri, procLine, procCol);
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
    } else if (dataLine >= 0) {
      console.log(`Definition lookup for data item (line ${dataLine + 1}, col ${dataCol}):`);
      const definition = await client.getDefinition(fileUri, dataLine, dataCol);
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
    if (dataLine >= 0) {
      console.log(`References for data item at line ${dataLine + 1}:`);
      const references = await client.getReferences(fileUri, dataLine, dataCol, true);
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

import { createPerlLspClient } from './lsp-server/perl-lsp-server';
import { Logger, SymbolKind } from 'vscode-languageserver-protocol';
import * as path from 'path';
import * as os from 'os';

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

// Sample Perl code to demonstrate LSP features
const samplePerlCode = `#!/usr/bin/perl
use strict;
use warnings;
use Data::Dumper;

# A simple Perl package demonstrating LSP features
package Calculator;

sub new {
    my ($class, %args) = @_;
    my $self = {
        name => $args{name} // 'Calculator',
        value => $args{value} // 0,
    };
    return bless $self, $class;
}

sub add {
    my ($self, $num) = @_;
    $self->{value} += $num;
    return $self;
}

sub subtract {
    my ($self, $num) = @_;
    $self->{value} -= $num;
    return $self;
}

sub get_value {
    my ($self) = @_;
    return $self->{value};
}

sub reset {
    my ($self) = @_;
    $self->{value} = 0;
    return $self;
}

package main;

# Create calculator instance
my $calc = Calculator->new(name => 'MyCalc', value => 10);

# Perform operations
$calc->add(5);
$calc->subtract(3);

# Print result
my $result = $calc->get_value();
print "Result: $result\\n";
print Dumper($calc);

# Array and hash examples
my @numbers = (1, 2, 3, 4, 5);
my %config = (
    debug => 1,
    verbose => 0,
);

foreach my $num (@numbers) {
    print "Number: $num\\n";
}

1;
`;

async function main() {
  // Example: Connect to PerlNavigator (Perl Language Server)
  // You need to have perlnavigator installed:
  //   Download from https://github.com/bscan/PerlNavigator/releases

  const perlNavigatorPath = path.join(os.homedir(), 'code', 'perlnavigator', 'perlnavigator');
  const workspaceDir = process.cwd();

  const client = createPerlLspClient({
    serverPath: perlNavigatorPath,
    rootUri: `file://${workspaceDir}`,
    logger,
  });

  try {
    // Start the client and initialize the server
    console.log('Starting Perl language server (PerlNavigator)...');
    const initResult = await client.start();
    console.log('Server initialized!');
    console.log('Hover support:', initResult.capabilities.hoverProvider);
    console.log('Completion support:', initResult.capabilities.completionProvider ? 'yes' : 'no');
    console.log('Document symbol support:', initResult.capabilities.documentSymbolProvider);
    console.log('Definition support:', initResult.capabilities.definitionProvider);

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

    // Create a virtual Perl document
    const fileUri = `file://${workspaceDir}/example.pl`;

    // Open the document
    await client.openDocument(fileUri, 'perl', samplePerlCode);
    console.log('\nOpened virtual Perl document');

    // Wait for PerlNavigator to analyze the file
    console.log('Waiting for PerlNavigator to analyze the file...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

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

    // Find interesting locations in the file
    const lines = samplePerlCode.split('\n');

    // Find a subroutine definition (sub name)
    let subLine = -1;
    let subCol = 0;
    let subName = '';
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^sub\s+(\w+)/);
      if (match) {
        subLine = i;
        subCol = lines[i].indexOf(match[1]);
        subName = match[1];
        break;
      }
    }

    // Find a package declaration
    let packageLine = -1;
    let packageCol = 0;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^package\s+(\w+)/);
      if (match) {
        packageLine = i;
        packageCol = lines[i].indexOf(match[1]);
        break;
      }
    }

    // Get hover info
    console.log('\n=== Hover Information ===\n');

    if (packageLine >= 0) {
      console.log(`Hover over package (line ${packageLine + 1}, col ${packageCol}):`);
      const hoverPackage = await client.getHover(fileUri, packageLine, packageCol);
      if (hoverPackage?.contents) {
        const contents = hoverPackage.contents;
        if (typeof contents === 'string') {
          console.log('  ', contents);
        } else if (Array.isArray(contents)) {
          console.log('  ', JSON.stringify(contents, null, 2));
        } else if ('value' in contents) {
          console.log('  ', contents.value.substring(0, 200));
        } else {
          console.log('  ', JSON.stringify(contents, null, 2));
        }
      } else {
        console.log('  No hover info available');
      }
    }

    if (subLine >= 0) {
      console.log(`\nHover over subroutine '${subName}' (line ${subLine + 1}, col ${subCol}):`);
      const hoverSub = await client.getHover(fileUri, subLine, subCol);
      if (hoverSub?.contents) {
        const contents = hoverSub.contents;
        if (typeof contents === 'string') {
          console.log('  ', contents);
        } else if (Array.isArray(contents)) {
          console.log('  ', JSON.stringify(contents, null, 2));
        } else if ('value' in contents) {
          console.log('  ', contents.value.substring(0, 200));
        } else {
          console.log('  ', JSON.stringify(contents, null, 2));
        }
      } else {
        console.log('  No hover info available');
      }
    }

    // Get completions after ->
    console.log('\n=== Completions ===\n');
    let completionLine = -1;
    let completionCol = 0;
    for (let i = 0; i < lines.length; i++) {
      // Look for -> (method call)
      const arrowIndex = lines[i].indexOf('->');
      if (arrowIndex > 0 && !lines[i].trim().startsWith('#')) {
        completionLine = i;
        completionCol = arrowIndex + 2;
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

    // Get definition - find method call to look up
    console.log('\n=== Definition ===\n');
    let methodCallLine = -1;
    let methodCallCol = 0;
    let methodName = '';
    for (let i = 0; i < lines.length; i++) {
      // Look for $calc->method_name
      const match = lines[i].match(/\$calc->(\w+)/);
      if (match) {
        methodCallLine = i;
        methodCallCol = lines[i].indexOf(match[1]);
        methodName = match[1];
        break;
      }
    }

    if (methodCallLine >= 0) {
      console.log(`Definition lookup for '${methodName}' at line ${methodCallLine + 1}, col ${methodCallCol}:`);
      const definition = await client.getDefinition(fileUri, methodCallLine, methodCallCol);
      if (definition) {
        const defs = Array.isArray(definition) ? definition : [definition];
        if (defs.length > 0) {
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
      } else {
        console.log('  No definition found');
      }
    }

    // Get references for a subroutine (if supported)
    console.log('\n=== References ===\n');
    if (subLine >= 0) {
      console.log(`References for subroutine '${subName}' at line ${subLine + 1}:`);
      try {
        const references = await client.getReferences(fileUri, subLine, subCol, true);
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
      } catch (e: any) {
        if (e.code === -32601) {
          console.log('  References not supported by PerlNavigator');
        } else {
          throw e;
        }
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

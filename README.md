# mojo-lsp

A generic Language Server Protocol (LSP) client library for Node.js built on top of `vscode-languageserver-protocol`.

> **Note:** This project was vibe-coded.

## Installation

```bash
npm install mojo-lsp
```

## Usage

```typescript
import { LSPClient } from 'mojo-lsp';

const client = new LSPClient({
  serverCommand: 'typescript-language-server',
  serverArgs: ['--stdio'],
  rootUri: `file://${process.cwd()}`,
});

// Start the client
const initResult = await client.start();

// Open a document
await client.openDocument(
  'file:///path/to/file.ts',
  'typescript',
  'const x: number = 1;'
);

// Get completions
const completions = await client.getCompletion(
  'file:///path/to/file.ts',
  0,  // line
  10  // character
);

// Get hover information
const hover = await client.getHover('file:///path/to/file.ts', 0, 6);

// Stop the client
await client.stop();
```

## API

### `LSPClient`

#### Constructor Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `serverCommand` | `string` | Yes | Command to spawn the language server |
| `serverArgs` | `string[]` | No | Arguments to pass to the server |
| `rootUri` | `string` | Yes | Root URI of the workspace |
| `workspaceFolders` | `{ uri: string; name: string }[]` | No | Workspace folders |
| `logger` | `Logger` | No | Logger for debug output |

#### Methods

| Method | Description |
|--------|-------------|
| `start()` | Initialize the language server connection |
| `stop()` | Shutdown and close the connection |
| `openDocument(uri, languageId, text)` | Open a text document |
| `changeDocument(uri, text)` | Update document contents |
| `closeDocument(uri)` | Close a text document |
| `getCompletion(uri, line, character)` | Get completions at position |
| `getHover(uri, line, character)` | Get hover information |
| `getDefinition(uri, line, character)` | Go to definition |
| `getReferences(uri, line, character, includeDeclaration?)` | Find all references |
| `getDocumentSymbols(uri)` | Get document symbols |
| `onDiagnostics(handler)` | Register diagnostics callback |
| `getServerCapabilities()` | Get server capabilities after init |
| `getConnection()` | Get the underlying protocol connection |

## Supported Languages

The following LSP servers have been tested with this client:

| Language | LSP Server | Project |
|----------|------------|---------|
| C/C++ | clangd | https://clangd.llvm.org/ |
| C# | csharp-ls | https://github.com/razzmatazz/csharp-language-server |
| COBOL | Che4z COBOL Language Server | https://github.com/eclipse-che4z/che-che4z-lsp-for-cobol |
| Java | Eclipse JDT Language Server | https://github.com/eclipse-jdtls/eclipse.jdt.ls |
| Perl | PerlNavigator | https://github.com/bscan/PerlNavigator |
| Python | pylsp | https://github.com/python-lsp/python-lsp-server |
| Ruby | Solargraph | https://solargraph.org/ |
| Rust | rust-analyzer | https://rust-analyzer.github.io/ |
| SQL | sql-language-server | https://github.com/joe-re/sql-language-server |
| TypeScript | typescript-language-server | https://github.com/typescript-language-server/typescript-language-server |

## Running the Examples

### TypeScript Example

```bash
# Install dependencies
npm install

# Install TypeScript language server
npm install -g typescript-language-server typescript

# Run the TypeScript example
npm run example
```

### Java Example

```bash
# Install Eclipse JDT Language Server
# See: https://github.com/eclipse/eclipse.jdt.ls

# Run the Java example
npx tsx src/java-example.ts
```

### C# Example

```bash
# Install csharp-ls (Roslyn-based C# language server)
dotnet tool install --global csharp-ls

# Run the C# example (opens a random .cs file from ../CleanArchitecture)
npx tsx src/csharp-example.ts
```

The C# example demonstrates:
- Connecting to csharp-ls with a .NET solution
- Opening an existing C# file from the codebase
- Getting document symbols, hover info, completions, definitions, and references

### C++ Example

```bash
# Install clangd (C/C++ language server)
# macOS:
brew install llvm

# Ubuntu/Debian:
apt install clangd

# Run the C++ example (opens a random .cpp/.h file from ../spdlog)
npx tsx src/cpp-example.ts
```

The C++ example demonstrates:
- Connecting to clangd for C/C++ code intelligence
- Opening an existing C++ file from the spdlog library
- Getting document symbols (namespaces, classes, methods, fields)
- Getting hover info, completions, definitions, and references

For best results with clangd, generate `compile_commands.json` in your project:
```bash
cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON .
```

### COBOL Example

```bash
# The Che4z COBOL Language Server requires Java and uses socket communication
# Build the server JAR first (see Che4z documentation)

# Run the COBOL example (connects to server on port 1044)
npx tsx src/cobol-example.ts
```

The COBOL example demonstrates:
- Connecting to Che4z COBOL Language Server via socket (port 1044)
- Opening COBOL source files (.cbl, .cob)
- Getting document symbols (divisions, sections, paragraphs, variables)
- Getting definitions and go-to-definition for PERFORM targets

## Socket vs Stdio Connections

The LSP client supports both stdio (default) and socket-based connections:

```typescript
// Stdio connection (default)
const client = new LSPClient({
  serverCommand: 'clangd',
  rootUri: `file://${workspaceDir}`,
});

// Socket connection
const client = new LSPClient({
  serverCommand: 'java',
  serverArgs: ['-jar', 'server.jar'],
  rootUri: `file://${workspaceDir}`,
  socket: {
    port: 1044,
    host: 'localhost',  // optional, defaults to localhost
  },
});
```

### Python Example

```bash
# Set up pylsp in a separate directory
mkdir -p ../pylsp && cd ../pylsp
poetry init -n && poetry add python-lsp-server

# Run the Python example
npx tsx src/python-example.ts
```

The Python example demonstrates:
- Connecting to pylsp (Python Language Server) via stdio
- Using the `cwd` option to run the server from a different directory
- Opening Python files and querying document symbols

### SQL Example

```bash
# Set up sql-language-server in a separate directory
mkdir -p ../sql-lsp && cd ../sql-lsp
npm init -y && npm install sql-language-server

# Run the SQL example
npx tsx src/sql-example.ts
```

The SQL example demonstrates:
- Connecting to sql-language-server via stdio
- Opening a virtual SQL document with CREATE TABLE and SELECT statements
- Receiving diagnostics for SQL syntax errors

### Rust Example

```bash
# Install rust-analyzer
# macOS:
brew install rust-analyzer

# Or via rustup:
rustup component add rust-analyzer

# Run the Rust example
npx tsx src/rust-example.ts
```

The Rust example demonstrates:
- Connecting to rust-analyzer via stdio
- Opening Rust source files from a Cargo project
- Getting document symbols (structs, enums, impl blocks, functions, traits)
- Getting hover info, completions, definitions, and references

### Ruby Example

```bash
# Install solargraph
gem install solargraph

# Run the Ruby example
npx tsx src/ruby-example.ts
```

The Ruby example demonstrates:
- Connecting to Solargraph via stdio
- Opening Ruby source files from a project with a Gemfile
- Getting document symbols (classes, modules, methods)
- Getting hover info with documentation, definitions, and references

### Perl Example

```bash
# Download PerlNavigator from GitHub releases
# https://github.com/bscan/PerlNavigator/releases
# Place the binary in ~/code/perlnavigator/

# Run the Perl example
npx tsx src/perl-example.ts
```

The Perl example demonstrates:
- Connecting to PerlNavigator via stdio
- Opening a virtual Perl document with package, subroutines, and variables
- Getting document symbols (packages, subroutines, variables)
- Getting hover info, completions, definitions, and references

## Development

```bash
# Build
npm run build

# Clean
npm run clean
```

## License

MIT

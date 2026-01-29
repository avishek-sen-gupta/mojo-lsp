# mojo-lsp

A generic Language Server Protocol (LSP) client library for Node.js built on top of `vscode-languageserver-protocol`.

> **Note:** This project was vibe-coded.

## Installation

```bash
npm install mojo-lsp
```

## Project Structure

```
src/
├── lsp-client.ts          # Core LSP client implementation
├── index.ts               # Main exports
├── lsp-server/            # Language-specific LSP server factory modules
│   ├── typescript-lsp-server.ts
│   ├── python-lsp-server.ts
│   ├── java-lsp-server.ts
│   ├── ruby-lsp-server.ts
│   ├── perl-lsp-server.ts
│   ├── rust-lsp-server.ts
│   ├── cpp-lsp-server.ts
│   ├── csharp-lsp-server.ts
│   ├── cobol-lsp-server.ts
│   └── sql-lsp-server.ts
├── bridge/                # REST API bridge for LSP servers
│   ├── bridge-server.ts
│   ├── bridge-cli.ts
│   └── bridge-types.ts
└── examples/              # Example usage for each language
    ├── example-typescript.ts
    ├── python-example.ts
    ├── java-example.ts
    ├── ruby-example.ts
    └── ...
```

## Usage

### Using LSP Server Factory Functions (Recommended)

Each supported language has a dedicated factory module that simplifies client creation:

```typescript
import { createTypescriptLspClient } from 'mojo-lsp/lsp-server/typescript-lsp-server';

const client = createTypescriptLspClient({
  rootUri: `file://${process.cwd()}`,
});

await client.start();
// Use the client...
await client.stop();
```

### Using LSPClient Directly

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

## LSP Server Factory Modules

Factory modules provide pre-configured LSP clients for each language:

| Language | Factory Function | Module |
|----------|-----------------|--------|
| TypeScript | `createTypescriptLspClient()` | `lsp-server/typescript-lsp-server` |
| Python | `createPythonLspClient()` | `lsp-server/python-lsp-server` |
| Java | `createJavaLspClient()` | `lsp-server/java-lsp-server` |
| Ruby | `createRubyLspClient()` | `lsp-server/ruby-lsp-server` |
| Perl | `createPerlLspClient()` | `lsp-server/perl-lsp-server` |
| Rust | `createRustLspClient()` | `lsp-server/rust-lsp-server` |
| C/C++ | `createCppLspClient()` | `lsp-server/cpp-lsp-server` |
| C# | `createCsharpLspClient()` | `lsp-server/csharp-lsp-server` |
| COBOL | `createCobolLspClient()` | `lsp-server/cobol-lsp-server` |
| SQL | `createSqlLspClient()` | `lsp-server/sql-lsp-server` |

Each module also exports a `find*Files()` helper function to discover source files.

### Example: Python LSP Client

```typescript
import { createPythonLspClient, findPythonFiles } from 'mojo-lsp/lsp-server/python-lsp-server';

const client = createPythonLspClient({
  rootUri: 'file:///path/to/python/project',
  serverDir: '/path/to/pylsp/installation',  // Directory with poetry/pylsp
});

await client.start();

// Find Python files in the project
const pythonFiles = findPythonFiles('/path/to/python/project');
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
| `cwd` | `string` | No | Working directory for the server process |
| `socket` | `{ port: number; host?: string }` | No | Socket connection options |

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

All examples are located in `src/examples/`. Build the project first:

```bash
npm install
npm run build
```

### TypeScript Example

```bash
# Install TypeScript language server
npm install -g typescript-language-server typescript

# Run the example
node dist/examples/example-typescript.js
```

### Python Example

```bash
# Set up pylsp in a separate directory
mkdir -p ../pylsp && cd ../pylsp
poetry init -n && poetry add python-lsp-server

# Run the example
node dist/examples/python-example.js
```

### Java Example

```bash
# Install Eclipse JDT Language Server (macOS)
brew install jdtls

# Run the example
node dist/examples/java-example.js
```

### Ruby Example

```bash
# Install Solargraph
gem install solargraph

# Run the example
node dist/examples/ruby-example.js
```

### Rust Example

```bash
# Install rust-analyzer (macOS)
brew install rust-analyzer

# Or via rustup:
rustup component add rust-analyzer

# Run the example
node dist/examples/rust-example.js
```

### C++ Example

```bash
# Install clangd (macOS)
brew install llvm

# Run the example
node dist/examples/cpp-example.js
```

For best results with clangd, generate `compile_commands.json` in your project:
```bash
cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON .
```

### C# Example

```bash
# Install csharp-ls
dotnet tool install --global csharp-ls

# Run the example
node dist/examples/csharp-example.js
```

### Perl Example

```bash
# Download PerlNavigator from GitHub releases
# https://github.com/bscan/PerlNavigator/releases

# Run the example
node dist/examples/perl-example.js
```

### SQL Example

```bash
# Set up sql-language-server in a separate directory
mkdir -p ../sql-lsp && cd ../sql-lsp
npm init -y && npm install sql-language-server

# Run the example
node dist/examples/sql-example.js
```

### COBOL Example

```bash
# The Che4z COBOL Language Server requires Java and uses socket communication
# Build the server JAR first (see Che4z documentation)

# Run the example (connects to server on port 1044)
node dist/examples/cobol-example.js
```

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

## REST Bridge Server

The `src/bridge/` directory contains a REST API bridge that exposes LSP functionality over HTTP:

```typescript
import { LSPBridgeServer } from 'mojo-lsp/bridge/bridge-server';

const bridge = new LSPBridgeServer({
  serverCommand: 'typescript-language-server',
  serverArgs: ['--stdio'],
  rootUri: 'file:///path/to/workspace',
});

await bridge.start(3000);  // Start HTTP server on port 3000
```

### Bridge API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/open` | POST | Open a document |
| `/close` | POST | Close a document |
| `/hover` | POST | Get hover information |
| `/completion` | POST | Get completions |
| `/definition` | POST | Go to definition |
| `/references` | POST | Find references |
| `/symbols` | POST | Get document symbols |
| `/diagnostics` | GET | Get cached diagnostics |

## Development

```bash
# Build
npm run build

# Clean
npm run clean
```

## License

MIT

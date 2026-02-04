# mojo-lsp

A generic Language Server Protocol (LSP) client library for Node.js built on top of `vscode-languageserver-protocol`.

> **Note:** This project was vibe-coded.

## Why did I write this?

- I wanted to write a small, but non-trivial project, to try out how effective vibe coding was.
- There are other clients with much more extensive support for different LSP servers; however, they are very specialised to the IDEs of which they are a part of, e.g., VS Code, Neovim, etc. The aim of this library is to allow LSP server access without any lock-in with a specific editor. More specifically, this is intended for use in experiments in AI inference on legacy codebases.
- I wanted to write an LSP client to be able to connect to LSP servers using multiple transport formats (stdio, sockets, etc.). There are some libraries like [MultiLSPy](https://github.com/microsoft/multilspy) which do this, but they don't support the `stdio` protocol, which make it harder to interface with LSP servers which use sockets (like the COBOL LSP server).

## Features

- **Multi-language support** - Pre-configured factory modules for ~15 languages, and counting
- **Simple API** - Easy-to-use client with methods for completions, hover, go-to-definition, find references, and document symbols
- **REST Bridge Server** - HTTP API that exposes LSP functionality over REST with OpenAPI documentation
- **Flexible connections** - Supports both stdio and socket-based LSP server connections
- **TypeScript-first** - Written in TypeScript with full type definitions

## Requirements

- **Node.js** >= 22.0.0
- **npm** >= 8.0.0 (comes with Node.js)
- **Language servers** - Each language requires its own LSP server to be installed separately. See [Supported Languages](#supported-languages) for installation instructions.

## Installation

```bash
npm install mojo-lsp
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
| Bash | `createBashLspClient()` | `lsp-server/bash-lsp-server` |
| C/C++ | `createCppLspClient()` | `lsp-server/cpp-lsp-server` |
| Clojure | `createClojureLspClient()` | `lsp-server/clojure-lsp-server` |
| C# | `createCsharpLspClient()` | `lsp-server/csharp-lsp-server` |
| COBOL | `createCobolLspClient()` | `lsp-server/cobol-lsp-server` |
| Go | `createGoLspClient()` | `lsp-server/go-lsp-server` |
| Java | `createJavaLspClient()` | `lsp-server/java-lsp-server` |
| Kotlin | `createKotlinLspClient()` | `lsp-server/kotlin-lsp-server` |
| Perl | `createPerlLspClient()` | `lsp-server/perl-lsp-server` |
| Python | `createPythonLspClient()` | `lsp-server/python-lsp-server` |
| Ruby | `createRubyLspClient()` | `lsp-server/ruby-lsp-server` |
| Rust | `createRustLspClient()` | `lsp-server/rust-lsp-server` |
| SQL | `createSqlLspClient()` | `lsp-server/sql-lsp-server` |
| Terraform | `createTerraformLspClient()` | `lsp-server/terraform-lsp-server` |
| TypeScript | `createTypescriptLspClient()` | `lsp-server/typescript-lsp-server` |

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

| Language | LSP Server | Project | Notes |
|----------|------------|---------|-------|
| Bash | bash-language-server | https://github.com/bash-lsp/bash-language-server | |
| C/C++ | clangd | https://clangd.llvm.org/ | |
| Clojure | clojure-lsp | https://github.com/clojure-lsp/clojure-lsp | |
| C# | csharp-ls | https://github.com/razzmatazz/csharp-language-server | |
| COBOL | Che4z COBOL Language Server | https://github.com/eclipse-che4z/che-che4z-lsp-for-cobol | |
| Go | gopls | https://github.com/golang/tools/tree/master/gopls | |
| Java | Eclipse JDT Language Server | https://github.com/eclipse-jdtls/eclipse.jdt.ls | |
| Kotlin | kotlin-language-server | https://github.com/fwcd/kotlin-language-server | |
| Perl | PerlNavigator | https://github.com/bscan/PerlNavigator | |
| Python | pylsp | https://github.com/python-lsp/python-lsp-server | |
| Ruby | Solargraph | https://solargraph.org/ | |
| Rust | rust-analyzer | https://rust-analyzer.github.io/ | |
| SQL | sql-language-server | https://github.com/joe-re/sql-language-server | ⚠️ Not working yet |
| Terraform | terraform-ls | https://github.com/hashicorp/terraform-ls | |
| TypeScript | typescript-language-server | https://github.com/typescript-language-server/typescript-language-server | |

## Running the Examples

All examples are located in `src/examples/`. Build the project first:

```bash
npm install
npm run build
```

### Bash Example

```bash
# Install Bash language server
npm install -g bash-language-server

# Run the example
node dist/examples/bash-example.js
```

### Terraform Example

```bash
# Install Terraform language server (macOS)
brew install hashicorp/tap/terraform-ls

# Run the example
node dist/examples/terraform-example.js
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

### Kotlin Example

```bash
# Install Kotlin language server (macOS)
brew install kotlin-lsp

# Run the example
node dist/examples/kotlin-example.js
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

### Clojure Example

```bash
# Install Clojure LSP (macOS)
brew install clojure-lsp/brew/clojure-lsp-native

# Run the example
node dist/examples/clojure-example.js
```

### Go Example

```bash
# Install gopls
go install golang.org/x/tools/gopls@latest

# Run the example
node dist/examples/go-example.js
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

The `src/bridge/` directory contains a REST API bridge that exposes LSP functionality over HTTP. Built with Fastify, it supports multiple programming languages and includes OpenAPI documentation.

### Running the Bridge Server

```bash
# Build first
npm run build

# Run directly with tsx (no build needed for development)
npx tsx src/bridge/bridge-cli.ts --port 3013

# Or run the compiled version
node dist/bridge/bridge-cli.js --port 3013
```

The server provides:
- **OpenAPI documentation** at `http://localhost:3013/documentation`
- **OpenAPI JSON spec** at `http://localhost:3013/documentation/json`

### Programmatic Usage

```typescript
import { LSPBridgeServer } from 'mojo-lsp/bridge/bridge-server';

const bridge = new LSPBridgeServer(3013);
await bridge.start();

// Later...
await bridge.stop();
```

### Supported Languages

The bridge server supports starting LSP servers for multiple languages:

| Language | Required Fields |
|----------|-----------------|
| Bash | `language`, `rootUri` |
| C/C++ | `language`, `rootUri` |
| Clojure | `language`, `rootUri` |
| C# | `language`, `rootUri`, `solutionPath` |
| COBOL | `language`, `rootUri`, `serverJar` |
| Go | `language`, `rootUri` |
| Java | `language`, `rootUri` |
| Kotlin | `language`, `rootUri` |
| Perl | `language`, `rootUri`, `serverPath` |
| Python | `language`, `rootUri`, `serverDir` |
| Ruby | `language`, `rootUri` |
| Rust | `language`, `rootUri` |
| SQL | `language`, `rootUri`, `serverPath` |
| Terraform | `language`, `rootUri` |
| TypeScript | `language`, `rootUri` |

> **Note:** The actual LSP servers must be installed separately. This library only provides the client and bridge infrastructure. See the [Supported Languages](#supported-languages) section for installation instructions for each language server.

### Bridge API Endpoints

#### Lifecycle

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/start` | POST | Start an LSP server for the specified language |
| `/stop` | POST | Stop the running LSP server |
| `/status` | GET | Get the status of the LSP server |

#### Document Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/document/open` | POST | Open a text document |
| `/document/change` | POST | Update a text document |
| `/document/close` | POST | Close a text document |

#### LSP Features

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/completion` | POST | Get code completions at a position |
| `/hover` | POST | Get hover information at a position |
| `/definition` | POST | Go to definition at a position |
| `/references` | POST | Find all references at a position |
| `/symbols` | POST | Get document symbols |

#### Diagnostics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/diagnostics` | GET | Get cached diagnostics for all files |
| `/diagnostics` | DELETE | Clear all cached diagnostics |

### Example: Using the Bridge with curl

```bash
# Start a TypeScript LSP server
curl -X POST http://localhost:3013/start \
  -H "Content-Type: application/json" \
  -d '{"language": "typescript", "rootUri": "file:///path/to/project"}'

# Open a document
curl -X POST http://localhost:3013/document/open \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file:///path/to/project/src/index.ts",
    "languageId": "typescript",
    "text": "const x: number = 1;\nfunction add(a: number, b: number) { return a + b; }"
  }'

# Get document symbols
curl -X POST http://localhost:3013/symbols \
  -H "Content-Type: application/json" \
  -d '{"uri": "file:///path/to/project/src/index.ts"}'

# Get hover information
curl -X POST http://localhost:3013/hover \
  -H "Content-Type: application/json" \
  -d '{"uri": "file:///path/to/project/src/index.ts", "line": 1, "character": 10}'

# Stop the server
curl -X POST http://localhost:3013/stop
```

### Example: Starting Different Language Servers

```bash
# Rust (requires rust-analyzer)
curl -X POST http://localhost:3013/start \
  -H "Content-Type: application/json" \
  -d '{"language": "rust", "rootUri": "file:///path/to/rust/project"}'

# C++ (requires clangd)
curl -X POST http://localhost:3013/start \
  -H "Content-Type: application/json" \
  -d '{"language": "cpp", "rootUri": "file:///path/to/cpp/project"}'

# COBOL (requires Che4z COBOL LSP server JAR)
curl -X POST http://localhost:3013/start \
  -H "Content-Type: application/json" \
  -d '{
    "language": "cobol",
    "rootUri": "file:///path/to/cobol/project",
    "serverJar": "/path/to/server.jar"
  }'
```

## Development

```bash
# Install dependencies
npm install

# Generate JSON schemas from TypeScript types
npm run generate:schemas

# Build (includes schema generation)
npm run build

# Run tests
npm test

# Clean
npm run clean
```

### Testing

Tests are located in `src/tests/` and use Vitest. Each supported language has its own test file that verifies LSP functionality against real language servers.

Tests run sequentially (not in parallel) to avoid resource contention between multiple LSP server processes.

### Schema Generation

The bridge server uses JSON schemas generated from TypeScript types for request validation and OpenAPI documentation. Schemas are auto-generated from `src/bridge/bridge-types.ts`:

```bash
npm run generate:schemas
```

This creates `src/bridge/schemas/index.ts` with Fastify-compatible schemas.

## License

MIT

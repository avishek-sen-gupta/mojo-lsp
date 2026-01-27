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

## Running the Example

```bash
# Install dependencies
npm install

# Install a language server (e.g., TypeScript)
npm install -g typescript-language-server typescript

# Run the example
npm run example
```

## Development

```bash
# Build
npm run build

# Clean
npm run clean
```

## License

ISC

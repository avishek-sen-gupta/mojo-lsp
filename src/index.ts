export { LSPClient, LSPClientOptions, DocumentInfo } from './lsp-client';

// Re-export commonly used types from the protocol
export {
  InitializeResult,
  CompletionItem,
  CompletionList,
  Hover,
  Location,
  LocationLink,
  DocumentSymbol,
  SymbolInformation,
  Diagnostic,
  DiagnosticSeverity,
  PublishDiagnosticsParams,
  Position,
  Range,
  TextDocumentSyncKind,
  Logger,
} from 'vscode-languageserver-protocol';

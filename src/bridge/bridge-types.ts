import {
  Diagnostic,
  InitializeResult,
  CompletionItem,
  CompletionList,
  Hover,
  Location,
  LocationLink,
  DocumentSymbol,
  SymbolInformation,
} from 'vscode-languageserver-protocol';
import { LSPClient } from '../lsp-client';

// Supported languages
export type SupportedLanguage =
  | 'typescript'
  | 'python'
  | 'java'
  | 'rust'
  | 'ruby'
  | 'perl'
  | 'cpp'
  | 'csharp'
  | 'sql'
  | 'cobol'
  | 'bash'
  | 'terraform';

// Base start body with common fields
interface StartBodyBase {
  /** The programming language to use */
  language: SupportedLanguage;
  /** Root URI for the workspace */
  rootUri: string;
  /** Additional arguments to pass to the LSP server */
  serverArgs?: string[];
}

// Language-specific start body types
export interface TypescriptStartBody extends StartBodyBase {
  language: 'typescript';
}

export interface PythonStartBody extends StartBodyBase {
  language: 'python';
  /** Directory containing the pylsp installation (with poetry) */
  serverDir: string;
}

export interface JavaStartBody extends StartBodyBase {
  language: 'java';
}

export interface RustStartBody extends StartBodyBase {
  language: 'rust';
}

export interface RubyStartBody extends StartBodyBase {
  language: 'ruby';
  /** Working directory for the server process */
  cwd?: string;
}

export interface PerlStartBody extends StartBodyBase {
  language: 'perl';
  /** Path to the PerlNavigator executable */
  serverPath: string;
}

export interface CppStartBody extends StartBodyBase {
  language: 'cpp';
}

export interface CsharpStartBody extends StartBodyBase {
  language: 'csharp';
  /** Path to the .sln solution file */
  solutionPath: string;
  /** Log level (default: 'INFO') */
  logLevel?: string;
}

export interface SqlStartBody extends StartBodyBase {
  language: 'sql';
  /** Path to the sql-language-server executable */
  serverPath: string;
}

export interface CobolStartBody extends StartBodyBase {
  language: 'cobol';
  /** Path to the Che4z COBOL LSP server JAR file */
  serverJar: string;
  /** Socket port (default: 1044) */
  port?: number;
  /** Socket host (default: localhost) */
  host?: string;
}

export interface BashStartBody extends StartBodyBase {
  language: 'bash';
}

export interface TerraformStartBody extends StartBodyBase {
  language: 'terraform';
}

// Union type for all start body variants
export type StartBody =
  | TypescriptStartBody
  | PythonStartBody
  | JavaStartBody
  | RustStartBody
  | RubyStartBody
  | PerlStartBody
  | CppStartBody
  | CsharpStartBody
  | SqlStartBody
  | CobolStartBody
  | BashStartBody
  | TerraformStartBody;

// Document body types
export interface DocumentOpenBody {
  uri: string;
  languageId: string;
  text: string;
}

export interface DocumentChangeBody {
  uri: string;
  text: string;
}

export interface DocumentCloseBody {
  uri: string;
}

export interface PositionBody {
  uri: string;
  line: number;
  character: number;
}

export interface ReferencesBody extends PositionBody {
  includeDeclaration?: boolean;
}

export interface SymbolsBody {
  uri: string;
}

// Response types

export interface ErrorResponse {
  error: string;
}

export interface SuccessResponse {
  success: true;
}

export interface StartResponse {
  capabilities: InitializeResult;
}

export interface StatusResponse {
  running: boolean;
  language?: SupportedLanguage;
  capabilities?: InitializeResult | null;
}

export interface CompletionResponse {
  items: CompletionList | CompletionItem[] | null;
}

export interface HoverResponse {
  hover: Hover | null;
}

export interface DefinitionResponse {
  locations: Location | Location[] | LocationLink[] | null;
}

export interface ReferencesResponse {
  locations: Location[] | null;
}

export interface SymbolsResponse {
  symbols: DocumentSymbol[] | SymbolInformation[] | null;
}

export interface DiagnosticsBuffer {
  [uri: string]: Diagnostic[];
}

export interface DiagnosticsResponse {
  diagnostics: DiagnosticsBuffer;
}

// Internal state

export interface BridgeState {
  client: LSPClient | null;
  language: SupportedLanguage | null;
  diagnosticsBuffer: Map<string, Diagnostic[]>;
}

// Error class

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

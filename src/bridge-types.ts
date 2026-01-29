import { Diagnostic } from 'vscode-languageserver-protocol';
import { LSPClient } from './lsp-client';

export interface DiagnosticsBuffer {
  [uri: string]: Diagnostic[];
}

export interface StartBody {
  serverCommand: string;
  serverArgs?: string[];
  rootUri: string;
  cwd?: string;
  socket?: { port: number; host?: string };
}

export interface DocumentBody {
  uri: string;
  languageId?: string;
  text?: string;
}

export interface PositionBody {
  uri: string;
  line: number;
  character: number;
  includeDeclaration?: boolean;
}

export interface BridgeState {
  client: LSPClient | null;
  diagnosticsBuffer: Map<string, Diagnostic[]>;
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

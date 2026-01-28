import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import {
  createProtocolConnection,
  ProtocolConnection,
  InitializeRequest,
  InitializeParams,
  InitializeResult,
  InitializedNotification,
  ShutdownRequest,
  ExitNotification,
  DidOpenTextDocumentNotification,
  DidOpenTextDocumentParams,
  DidCloseTextDocumentNotification,
  DidCloseTextDocumentParams,
  DidChangeTextDocumentNotification,
  DidChangeTextDocumentParams,
  CompletionRequest,
  CompletionParams,
  CompletionList,
  CompletionItem,
  HoverRequest,
  HoverParams,
  Hover,
  DefinitionRequest,
  DefinitionParams,
  Location,
  LocationLink,
  ReferencesRequest,
  ReferenceParams,
  DocumentSymbolRequest,
  DocumentSymbolParams,
  DocumentSymbol,
  SymbolInformation,
  TextDocumentSyncKind,
  PublishDiagnosticsNotification,
  PublishDiagnosticsParams,
  ConfigurationRequest,
  ConfigurationParams,
  RegistrationRequest,
  WorkDoneProgressCreateRequest,
  Logger,
  Diagnostic,
} from 'vscode-languageserver-protocol';
import {
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-jsonrpc/node';

export interface LSPClientOptions {
  serverCommand: string;
  serverArgs?: string[];
  rootUri: string;
  workspaceFolders?: { uri: string; name: string }[];
  logger?: Logger;
  // Working directory for the server process
  cwd?: string;
  // Socket connection options (alternative to stdio)
  socket?: {
    port: number;
    host?: string;  // defaults to 'localhost'
  };
}

export interface DocumentInfo {
  uri: string;
  languageId: string;
  version: number;
  text: string;
}

export class LSPClient {
  private process: ChildProcess | null = null;
  private socket: net.Socket | null = null;
  private connection: ProtocolConnection | null = null;
  private serverCapabilities: InitializeResult | null = null;
  private openDocuments: Map<string, DocumentInfo> = new Map();
  private diagnosticsHandler: ((params: PublishDiagnosticsParams) => void) | null = null;

  constructor(private options: LSPClientOptions) {}

  async start(): Promise<InitializeResult> {
    let reader: StreamMessageReader;
    let writer: StreamMessageWriter;

    if (this.options.socket) {
      // Socket-based connection
      const { port, host = 'localhost' } = this.options.socket;

      // Spawn the server process first (it will listen on the socket)
      this.process = spawn(this.options.serverCommand, this.options.serverArgs || [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.options.cwd,
      });

      // Log stderr for debugging
      this.process.stderr?.on('data', (data) => {
        if (this.options.logger) {
          this.options.logger.error(`Server stderr: ${data.toString()}`);
        }
      });

      this.process.on('exit', (code) => {
        if (this.options.logger) {
          this.options.logger.info(`Server process exited with code ${code}`);
        }
      });

      // Wait for the server to start listening
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Connect to the server via socket
      this.socket = await new Promise<net.Socket>((resolve, reject) => {
        const socket = net.createConnection({ port, host }, () => {
          if (this.options.logger) {
            this.options.logger.info(`Connected to server at ${host}:${port}`);
          }
          resolve(socket);
        });
        socket.on('error', (err) => {
          reject(new Error(`Failed to connect to server at ${host}:${port}: ${err.message}`));
        });
      });

      reader = new StreamMessageReader(this.socket);
      writer = new StreamMessageWriter(this.socket);
    } else {
      // Stdio-based connection (default)
      this.process = spawn(this.options.serverCommand, this.options.serverArgs || [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.options.cwd,
      });

      if (!this.process.stdin || !this.process.stdout) {
        throw new Error('Failed to create server process streams');
      }

      // Log stderr for debugging
      this.process.stderr?.on('data', (data) => {
        if (this.options.logger) {
          this.options.logger.error(`Server stderr: ${data.toString()}`);
        }
      });

      this.process.on('exit', (code) => {
        if (this.options.logger) {
          this.options.logger.info(`Server process exited with code ${code}`);
        }
      });

      reader = new StreamMessageReader(this.process.stdout);
      writer = new StreamMessageWriter(this.process.stdin);
    }

    // Create the protocol connection
    this.connection = createProtocolConnection(reader, writer, this.options.logger);

    // Add error handlers
    this.connection.onError((error) => {
      if (this.options.logger) {
        this.options.logger.error(`Connection error: ${JSON.stringify(error)}`);
      }
    });

    this.connection.onClose(() => {
      if (this.options.logger) {
        this.options.logger.info('Connection closed');
      }
    });

    // Set up notification handlers
    this.setupNotificationHandlers();

    // Start listening
    this.connection.listen();

    // Send initialize request
    const initializeParams: InitializeParams = {
      processId: process.pid,
      rootUri: this.options.rootUri,
      capabilities: {
        textDocument: {
          synchronization: {
            dynamicRegistration: true,
            willSave: true,
            willSaveWaitUntil: true,
            didSave: true,
          },
          completion: {
            dynamicRegistration: true,
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
              deprecatedSupport: true,
              preselectSupport: true,
            },
            contextSupport: true,
          },
          hover: {
            dynamicRegistration: true,
            contentFormat: ['markdown', 'plaintext'],
          },
          definition: {
            dynamicRegistration: true,
            linkSupport: true,
          },
          references: {
            dynamicRegistration: true,
          },
          documentSymbol: {
            dynamicRegistration: true,
            hierarchicalDocumentSymbolSupport: true,
          },
          publishDiagnostics: {
            relatedInformation: true,
            tagSupport: { valueSet: [1, 2] },
            versionSupport: true,
          },
        },
        workspace: {
          workspaceFolders: true,
          configuration: true,
        },
      },
      workspaceFolders: this.options.workspaceFolders || [
        { uri: this.options.rootUri, name: 'workspace' },
      ],
    };

    this.serverCapabilities = await this.connection.sendRequest(
      InitializeRequest.type,
      initializeParams
    );

    // Send initialized notification
    this.connection.sendNotification(InitializedNotification.type, {});

    return this.serverCapabilities;
  }

  private setupNotificationHandlers(): void {
    if (!this.connection) return;

    // Handle diagnostics
    this.connection.onNotification(
      PublishDiagnosticsNotification.type,
      (params: PublishDiagnosticsParams) => {
        if (this.diagnosticsHandler) {
          this.diagnosticsHandler(params);
        }
      }
    );

    // Handle workspace/configuration requests from server
    this.connection.onRequest(
      ConfigurationRequest.type,
      (params: ConfigurationParams) => {
        // Return empty config for each requested item
        return params.items.map(() => ({}));
      }
    );

    // Handle client/registerCapability requests from server (dynamic registration)
    this.connection.onRequest(
      RegistrationRequest.type,
      (_params) => {
        // Accept all dynamic registrations
        return;
      }
    );

    // Handle window/workDoneProgress/create requests from server
    this.connection.onRequest(
      WorkDoneProgressCreateRequest.type,
      (_params) => {
        // Accept progress token creation
        return;
      }
    );
  }

  onDiagnostics(handler: (params: PublishDiagnosticsParams) => void): void {
    this.diagnosticsHandler = handler;
  }

  async openDocument(uri: string, languageId: string, text: string): Promise<void> {
    if (!this.connection) {
      throw new Error('Client not started');
    }

    const doc: DocumentInfo = { uri, languageId, version: 1, text };
    this.openDocuments.set(uri, doc);

    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri,
        languageId,
        version: doc.version,
        text,
      },
    };

    return this.connection.sendNotification(DidOpenTextDocumentNotification.type, params);
  }

  async changeDocument(uri: string, text: string): Promise<void> {
    if (!this.connection) {
      throw new Error('Client not started');
    }

    const doc = this.openDocuments.get(uri);
    if (!doc) {
      throw new Error(`Document ${uri} is not open`);
    }

    doc.version++;
    doc.text = text;

    const params: DidChangeTextDocumentParams = {
      textDocument: {
        uri,
        version: doc.version,
      },
      contentChanges: [{ text }],
    };

    this.connection.sendNotification(DidChangeTextDocumentNotification.type, params);
  }

  async closeDocument(uri: string): Promise<void> {
    if (!this.connection) {
      throw new Error('Client not started');
    }

    const doc = this.openDocuments.get(uri);
    if (!doc) {
      throw new Error(`Document ${uri} is not open`);
    }

    const params: DidCloseTextDocumentParams = {
      textDocument: { uri },
    };

    this.connection.sendNotification(DidCloseTextDocumentNotification.type, params);
    this.openDocuments.delete(uri);
  }

  async getCompletion(
    uri: string,
    line: number,
    character: number
  ): Promise<CompletionList | CompletionItem[] | null> {
    if (!this.connection) {
      throw new Error('Client not started');
    }

    const params: CompletionParams = {
      textDocument: { uri },
      position: { line, character },
    };

    return this.connection.sendRequest(CompletionRequest.type, params);
  }

  async getHover(uri: string, line: number, character: number): Promise<Hover | null> {
    if (!this.connection) {
      throw new Error('Client not started');
    }

    const params: HoverParams = {
      textDocument: { uri },
      position: { line, character },
    };

    return this.connection.sendRequest(HoverRequest.type, params);
  }

  async getDefinition(
    uri: string,
    line: number,
    character: number
  ): Promise<Location | Location[] | LocationLink[] | null> {
    if (!this.connection) {
      throw new Error('Client not started');
    }

    const params: DefinitionParams = {
      textDocument: { uri },
      position: { line, character },
    };

    return this.connection.sendRequest(DefinitionRequest.type, params);
  }

  async getReferences(
    uri: string,
    line: number,
    character: number,
    includeDeclaration: boolean = true
  ): Promise<Location[] | null> {
    if (!this.connection) {
      throw new Error('Client not started');
    }

    const params: ReferenceParams = {
      textDocument: { uri },
      position: { line, character },
      context: { includeDeclaration },
    };

    return this.connection.sendRequest(ReferencesRequest.type, params);
  }

  async getDocumentSymbols(
    uri: string
  ): Promise<DocumentSymbol[] | SymbolInformation[] | null> {
    if (!this.connection) {
      throw new Error('Client not started');
    }

    const params: DocumentSymbolParams = {
      textDocument: { uri },
    };

    return this.connection.sendRequest(DocumentSymbolRequest.type, params);
  }

  getServerCapabilities(): InitializeResult | null {
    return this.serverCapabilities;
  }

  getConnection(): ProtocolConnection | null {
    return this.connection;
  }

  async stop(): Promise<void> {
    if (!this.connection) {
      return;
    }

    try {
      // Send shutdown request
      await this.connection.sendRequest(ShutdownRequest.type);
    } catch (error) {
      // Server may have already exited
    }

    // Give the server a moment to process shutdown
    await new Promise((resolve) => setTimeout(resolve, 100));

    // For socket connections, the server typically closes the connection after shutdown
    // So we skip the exit notification and just clean up
    if (!this.socket) {
      try {
        // Send exit notification (only for stdio connections)
        this.connection.sendNotification(ExitNotification.type);
      } catch (error) {
        // Server may have already closed the connection
      }
    }

    // Clean up socket first (if using socket connection)
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch (error) {
        // Socket may already be destroyed
      }
      this.socket = null;
    }

    try {
      this.connection.dispose();
    } catch (error) {
      // Connection may already be disposed
    }
    this.connection = null;

    if (this.process) {
      try {
        this.process.kill();
      } catch (error) {
        // Process may have already exited
      }
      this.process = null;
    }
  }
}

import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  RouteShorthandOptions,
} from 'fastify';
import cors from '@fastify/cors';
import { LSPClient } from '../lsp-client';
import {
  StartBody,
  DocumentOpenBody,
  DocumentChangeBody,
  DocumentCloseBody,
  PositionBody,
  ReferencesBody,
  SymbolsBody,
  BridgeState,
  BadRequestError,
  DiagnosticsBuffer,
  ErrorResponse,
  SuccessResponse,
  StartResponse,
  StatusResponse,
  CompletionResponse,
  HoverResponse,
  DefinitionResponse,
  ReferencesResponse,
  SymbolsResponse,
  DiagnosticsResponse,
  SupportedLanguage,
  TypescriptStartBody,
  PythonStartBody,
  JavaStartBody,
  RustStartBody,
  RubyStartBody,
  PerlStartBody,
  CppStartBody,
  CsharpStartBody,
  SqlStartBody,
  CobolStartBody,
} from './bridge-types';

// LSP server factory imports
import { createTypescriptLspClient } from '../lsp-server/typescript-lsp-server';
import { createPythonLspClient } from '../lsp-server/python-lsp-server';
import { createJavaLspClient } from '../lsp-server/java-lsp-server';
import { createRustLspClient } from '../lsp-server/rust-lsp-server';
import { createRubyLspClient } from '../lsp-server/ruby-lsp-server';
import { createPerlLspClient } from '../lsp-server/perl-lsp-server';
import { createCppLspClient } from '../lsp-server/cpp-lsp-server';
import { createCsharpLspClient } from '../lsp-server/csharp-lsp-server';
import { createSqlLspClient } from '../lsp-server/sql-lsp-server';
import { createCobolLspClient } from '../lsp-server/cobol-lsp-server';

// Factory function to create LSP client based on language
function createLspClientForLanguage(body: StartBody): LSPClient {
  switch (body.language) {
    case 'typescript': {
      const opts = body as TypescriptStartBody;
      return createTypescriptLspClient({
        rootUri: opts.rootUri,
        serverArgs: opts.serverArgs,
      });
    }
    case 'python': {
      const opts = body as PythonStartBody;
      if (!opts.serverDir) {
        throw new BadRequestError('serverDir is required for Python');
      }
      return createPythonLspClient({
        rootUri: opts.rootUri,
        serverDir: opts.serverDir,
        serverArgs: opts.serverArgs,
      });
    }
    case 'java': {
      const opts = body as JavaStartBody;
      return createJavaLspClient({
        rootUri: opts.rootUri,
        serverArgs: opts.serverArgs,
      });
    }
    case 'rust': {
      const opts = body as RustStartBody;
      return createRustLspClient({
        rootUri: opts.rootUri,
        serverArgs: opts.serverArgs,
      });
    }
    case 'ruby': {
      const opts = body as RubyStartBody;
      return createRubyLspClient({
        rootUri: opts.rootUri,
        cwd: opts.cwd,
        serverArgs: opts.serverArgs,
      });
    }
    case 'perl': {
      const opts = body as PerlStartBody;
      if (!opts.serverPath) {
        throw new BadRequestError('serverPath is required for Perl');
      }
      return createPerlLspClient({
        rootUri: opts.rootUri,
        serverPath: opts.serverPath,
        serverArgs: opts.serverArgs,
      });
    }
    case 'cpp': {
      const opts = body as CppStartBody;
      return createCppLspClient({
        rootUri: opts.rootUri,
        serverArgs: opts.serverArgs,
      });
    }
    case 'csharp': {
      const opts = body as CsharpStartBody;
      if (!opts.solutionPath) {
        throw new BadRequestError('solutionPath is required for C#');
      }
      return createCsharpLspClient({
        rootUri: opts.rootUri,
        solutionPath: opts.solutionPath,
        logLevel: opts.logLevel,
        serverArgs: opts.serverArgs,
      });
    }
    case 'sql': {
      const opts = body as SqlStartBody;
      if (!opts.serverPath) {
        throw new BadRequestError('serverPath is required for SQL');
      }
      return createSqlLspClient({
        rootUri: opts.rootUri,
        serverPath: opts.serverPath,
        serverArgs: opts.serverArgs,
      });
    }
    case 'cobol': {
      const opts = body as CobolStartBody;
      if (!opts.serverJar) {
        throw new BadRequestError('serverJar is required for COBOL');
      }
      return createCobolLspClient({
        rootUri: opts.rootUri,
        serverJar: opts.serverJar,
        port: opts.port,
        host: opts.host,
      });
    }
    default:
      throw new BadRequestError(`Unsupported language: ${(body as StartBody).language}`);
  }
}

// Route option types for strongly typed handlers

type StartRoute = {
  Body: StartBody;
  Reply: StartResponse | ErrorResponse;
};

type StopRoute = {
  Reply: SuccessResponse | ErrorResponse;
};

type StatusRoute = {
  Reply: StatusResponse;
};

type DocumentOpenRoute = {
  Body: DocumentOpenBody;
  Reply: SuccessResponse | ErrorResponse;
};

type DocumentChangeRoute = {
  Body: DocumentChangeBody;
  Reply: SuccessResponse | ErrorResponse;
};

type DocumentCloseRoute = {
  Body: DocumentCloseBody;
  Reply: SuccessResponse | ErrorResponse;
};

type CompletionRoute = {
  Body: PositionBody;
  Reply: CompletionResponse | ErrorResponse;
};

type HoverRoute = {
  Body: PositionBody;
  Reply: HoverResponse | ErrorResponse;
};

type DefinitionRoute = {
  Body: PositionBody;
  Reply: DefinitionResponse | ErrorResponse;
};

type ReferencesRoute = {
  Body: ReferencesBody;
  Reply: ReferencesResponse | ErrorResponse;
};

type SymbolsRoute = {
  Body: SymbolsBody;
  Reply: SymbolsResponse | ErrorResponse;
};

type DiagnosticsGetRoute = {
  Reply: DiagnosticsResponse;
};

type DiagnosticsDeleteRoute = {
  Reply: SuccessResponse;
};

// Route registrars

function registerLifecycleRoutes(app: FastifyInstance, state: BridgeState): void {
  app.post<StartRoute>('/start', async (request, reply) => {
    if (state.client) {
      reply.code(400);
      return { error: 'LSP server already running. Stop it first.' };
    }

    const body = request.body;

    if (!body.language) {
      reply.code(400);
      return { error: 'language is required' };
    }
    if (!body.rootUri) {
      reply.code(400);
      return { error: 'rootUri is required' };
    }

    // Validate language
    const supportedLanguages: SupportedLanguage[] = [
      'typescript', 'python', 'java', 'rust', 'ruby',
      'perl', 'cpp', 'csharp', 'sql', 'cobol',
    ];
    if (!supportedLanguages.includes(body.language)) {
      reply.code(400);
      return { error: `Unsupported language: ${body.language}. Supported: ${supportedLanguages.join(', ')}` };
    }

    try {
      state.client = createLspClientForLanguage(body);
      state.language = body.language;

      state.client.onDiagnostics((params) => {
        state.diagnosticsBuffer.set(params.uri, params.diagnostics);
      });

      const capabilities = await state.client.start();
      return { capabilities };
    } catch (err) {
      state.client = null;
      state.language = null;
      throw err;
    }
  });

  app.post<StopRoute>('/stop', async () => {
    if (state.client) {
      await state.client.stop();
      state.client = null;
      state.language = null;
      state.diagnosticsBuffer.clear();
    }
    return { success: true };
  });

  app.get<StatusRoute>('/status', async () => {
    if (!state.client) {
      return { running: false };
    }
    return {
      running: true,
      language: state.language ?? undefined,
      capabilities: state.client.getServerCapabilities(),
    };
  });
}

function registerDocumentRoutes(app: FastifyInstance, state: BridgeState): void {
  const requireClient = async (
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    if (!state.client) {
      reply.code(400).send({ error: 'LSP server not running. Call /start first.' });
    }
  };

  const routeOpts: RouteShorthandOptions = {
    preHandler: requireClient,
  };

  app.post<DocumentOpenRoute>('/document/open', routeOpts, async (request, reply) => {
    const { uri, languageId, text } = request.body;

    if (!uri) {
      reply.code(400);
      return { error: 'uri is required' };
    }
    if (!languageId) {
      reply.code(400);
      return { error: 'languageId is required' };
    }
    if (text === undefined) {
      reply.code(400);
      return { error: 'text is required' };
    }

    await state.client!.openDocument(uri, languageId, text);
    return { success: true };
  });

  app.post<DocumentChangeRoute>('/document/change', routeOpts, async (request, reply) => {
    const { uri, text } = request.body;

    if (!uri) {
      reply.code(400);
      return { error: 'uri is required' };
    }
    if (text === undefined) {
      reply.code(400);
      return { error: 'text is required' };
    }

    await state.client!.changeDocument(uri, text);
    return { success: true };
  });

  app.post<DocumentCloseRoute>('/document/close', routeOpts, async (request, reply) => {
    const { uri } = request.body;

    if (!uri) {
      reply.code(400);
      return { error: 'uri is required' };
    }

    await state.client!.closeDocument(uri);
    return { success: true };
  });
}

function registerFeatureRoutes(app: FastifyInstance, state: BridgeState): void {
  const requireClient = async (
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    if (!state.client) {
      reply.code(400).send({ error: 'LSP server not running. Call /start first.' });
    }
  };

  const routeOpts: RouteShorthandOptions = {
    preHandler: requireClient,
  };

  app.post<CompletionRoute>('/completion', routeOpts, async (request, reply) => {
    const { uri, line, character } = request.body;

    if (!uri) {
      reply.code(400);
      return { error: 'uri is required' };
    }
    if (line === undefined) {
      reply.code(400);
      return { error: 'line is required' };
    }
    if (character === undefined) {
      reply.code(400);
      return { error: 'character is required' };
    }

    const result = await state.client!.getCompletion(uri, line, character);
    return { items: result };
  });

  app.post<HoverRoute>('/hover', routeOpts, async (request, reply) => {
    const { uri, line, character } = request.body;

    if (!uri) {
      reply.code(400);
      return { error: 'uri is required' };
    }
    if (line === undefined) {
      reply.code(400);
      return { error: 'line is required' };
    }
    if (character === undefined) {
      reply.code(400);
      return { error: 'character is required' };
    }

    const result = await state.client!.getHover(uri, line, character);
    return { hover: result };
  });

  app.post<DefinitionRoute>('/definition', routeOpts, async (request, reply) => {
    const { uri, line, character } = request.body;

    if (!uri) {
      reply.code(400);
      return { error: 'uri is required' };
    }
    if (line === undefined) {
      reply.code(400);
      return { error: 'line is required' };
    }
    if (character === undefined) {
      reply.code(400);
      return { error: 'character is required' };
    }

    const result = await state.client!.getDefinition(uri, line, character);
    return { locations: result };
  });

  app.post<ReferencesRoute>('/references', routeOpts, async (request, reply) => {
    const { uri, line, character, includeDeclaration = true } = request.body;

    if (!uri) {
      reply.code(400);
      return { error: 'uri is required' };
    }
    if (line === undefined) {
      reply.code(400);
      return { error: 'line is required' };
    }
    if (character === undefined) {
      reply.code(400);
      return { error: 'character is required' };
    }

    const result = await state.client!.getReferences(uri, line, character, includeDeclaration);
    return { locations: result };
  });

  app.post<SymbolsRoute>('/symbols', routeOpts, async (request, reply) => {
    const { uri } = request.body;

    if (!uri) {
      reply.code(400);
      return { error: 'uri is required' };
    }

    const result = await state.client!.getDocumentSymbols(uri);
    return { symbols: result };
  });
}

function registerDiagnosticsRoutes(app: FastifyInstance, state: BridgeState): void {
  app.get<DiagnosticsGetRoute>('/diagnostics', async () => {
    const diagnostics: DiagnosticsBuffer = {};
    state.diagnosticsBuffer.forEach((diags, uri) => {
      diagnostics[uri] = diags;
    });
    return { diagnostics };
  });

  app.delete<DiagnosticsDeleteRoute>('/diagnostics', async () => {
    state.diagnosticsBuffer.clear();
    return { success: true };
  });
}

// Main server class

export class LSPBridgeServer {
  private app: FastifyInstance;
  private port: number;
  private state: BridgeState;

  constructor(port: number = 3000) {
    this.port = port;
    this.state = {
      client: null,
      language: null,
      diagnosticsBuffer: new Map(),
    };
    this.app = this.createApp();
  }

  private createApp(): FastifyInstance {
    const app = Fastify({
      logger: false,
    });

    // Register CORS
    app.register(cors, {
      origin: '*',
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    });

    // Register routes
    registerLifecycleRoutes(app, this.state);
    registerDocumentRoutes(app, this.state);
    registerFeatureRoutes(app, this.state);
    registerDiagnosticsRoutes(app, this.state);

    // Error handler
    app.setErrorHandler(async (error: Error, _request, reply) => {
      const statusCode = error instanceof BadRequestError ? 400 : 500;
      reply.code(statusCode).send({ error: error.message });
    });

    return app;
  }

  async start(): Promise<void> {
    await this.app.listen({ port: this.port, host: '0.0.0.0' });
    console.log(`LSP Bridge Server listening on port ${this.port}`);
  }

  async stop(): Promise<void> {
    if (this.state.client) {
      await this.state.client.stop().catch(() => {});
      this.state.client = null;
      this.state.language = null;
    }
    await this.app.close();
  }
}

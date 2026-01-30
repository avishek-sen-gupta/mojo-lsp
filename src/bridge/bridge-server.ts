import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { LSPClient } from '../lsp-client';
import { schemaDefinitions } from './schemas';
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
      return createCsharpLspClient({
        rootUri: opts.rootUri,
        solutionPath: opts.solutionPath,
        logLevel: opts.logLevel,
        serverArgs: opts.serverArgs,
      });
    }
    case 'sql': {
      const opts = body as SqlStartBody;
      return createSqlLspClient({
        rootUri: opts.rootUri,
        serverPath: opts.serverPath,
        serverArgs: opts.serverArgs,
      });
    }
    case 'cobol': {
      const opts = body as CobolStartBody;
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
  app.post<StartRoute>('/start', {
    schema: {
      description: 'Start an LSP server for the specified language',
      tags: ['lifecycle'],
      body: { $ref: 'StartBody#' },
      response: {
        200: { type: 'object', description: 'LSP server capabilities' },
        400: { $ref: 'ErrorResponse#' },
      },
    },
  }, async (request, reply) => {
    if (state.client) {
      reply.code(400);
      return { error: 'LSP server already running. Stop it first.' };
    }

    const body = request.body;

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

  app.post<StopRoute>('/stop', {
    schema: {
      description: 'Stop the running LSP server',
      tags: ['lifecycle'],
      response: {
        200: { $ref: 'SuccessResponse#' },
        400: { $ref: 'ErrorResponse#' },
      },
    },
  }, async () => {
    if (state.client) {
      await state.client.stop();
      state.client = null;
      state.language = null;
      state.diagnosticsBuffer.clear();
    }
    return { success: true };
  });

  app.get<StatusRoute>('/status', {
    schema: {
      description: 'Get the status of the LSP server',
      tags: ['lifecycle'],
      response: {
        200: {
          type: 'object',
          properties: {
            running: { type: 'boolean' },
            language: { type: 'string' },
            capabilities: { type: 'object' },
          },
        },
      },
    },
  }, async () => {
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

  app.post<DocumentOpenRoute>('/document/open', {
    preHandler: requireClient,
    schema: {
      description: 'Open a text document',
      tags: ['document'],
      body: { $ref: 'DocumentOpenBody#' },
      response: {
        200: { $ref: 'SuccessResponse#' },
        400: { $ref: 'ErrorResponse#' },
      },
    },
  }, async (request) => {
    const { uri, languageId, text } = request.body;
    await state.client!.openDocument(uri, languageId, text);
    return { success: true };
  });

  app.post<DocumentChangeRoute>('/document/change', {
    preHandler: requireClient,
    schema: {
      description: 'Update a text document',
      tags: ['document'],
      body: { $ref: 'DocumentChangeBody#' },
      response: {
        200: { $ref: 'SuccessResponse#' },
        400: { $ref: 'ErrorResponse#' },
      },
    },
  }, async (request) => {
    const { uri, text } = request.body;
    await state.client!.changeDocument(uri, text);
    return { success: true };
  });

  app.post<DocumentCloseRoute>('/document/close', {
    preHandler: requireClient,
    schema: {
      description: 'Close a text document',
      tags: ['document'],
      body: { $ref: 'DocumentCloseBody#' },
      response: {
        200: { $ref: 'SuccessResponse#' },
        400: { $ref: 'ErrorResponse#' },
      },
    },
  }, async (request) => {
    const { uri } = request.body;
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

  app.post<CompletionRoute>('/completion', {
    preHandler: requireClient,
    schema: {
      description: 'Get code completions at a position',
      tags: ['features'],
      body: { $ref: 'PositionBody#' },
      response: {
        200: { type: 'object', properties: { items: { type: ['array', 'object', 'null'] } } },
        400: { $ref: 'ErrorResponse#' },
      },
    },
  }, async (request) => {
    const { uri, line, character } = request.body;
    const result = await state.client!.getCompletion(uri, line, character);
    return { items: result };
  });

  app.post<HoverRoute>('/hover', {
    preHandler: requireClient,
    schema: {
      description: 'Get hover information at a position',
      tags: ['features'],
      body: { $ref: 'PositionBody#' },
      response: {
        200: { type: 'object', properties: { hover: { type: ['object', 'null'] } } },
        400: { $ref: 'ErrorResponse#' },
      },
    },
  }, async (request) => {
    const { uri, line, character } = request.body;
    const result = await state.client!.getHover(uri, line, character);
    return { hover: result };
  });

  app.post<DefinitionRoute>('/definition', {
    preHandler: requireClient,
    schema: {
      description: 'Go to definition at a position',
      tags: ['features'],
      body: { $ref: 'PositionBody#' },
      response: {
        200: { type: 'object', properties: { locations: { type: ['array', 'null'] } } },
        400: { $ref: 'ErrorResponse#' },
      },
    },
  }, async (request) => {
    const { uri, line, character } = request.body;
    const result = await state.client!.getDefinition(uri, line, character);
    return { locations: result };
  });

  app.post<ReferencesRoute>('/references', {
    preHandler: requireClient,
    schema: {
      description: 'Find all references at a position',
      tags: ['features'],
      body: { $ref: 'ReferencesBody#' },
      response: {
        200: { type: 'object', properties: { locations: { type: ['array', 'null'] } } },
        400: { $ref: 'ErrorResponse#' },
      },
    },
  }, async (request) => {
    const { uri, line, character, includeDeclaration = true } = request.body;
    const result = await state.client!.getReferences(uri, line, character, includeDeclaration);
    return { locations: result };
  });

  app.post<SymbolsRoute>('/symbols', {
    preHandler: requireClient,
    schema: {
      description: 'Get document symbols',
      tags: ['features'],
      body: { $ref: 'SymbolsBody#' },
      response: {
        200: { type: 'object', properties: { symbols: { type: ['array', 'null'] } } },
        400: { $ref: 'ErrorResponse#' },
      },
    },
  }, async (request) => {
    const { uri } = request.body;
    const result = await state.client!.getDocumentSymbols(uri);
    return { symbols: result };
  });
}

function registerDiagnosticsRoutes(app: FastifyInstance, state: BridgeState): void {
  app.get<DiagnosticsGetRoute>('/diagnostics', {
    schema: {
      description: 'Get cached diagnostics for all files',
      tags: ['diagnostics'],
      response: {
        200: { type: 'object', properties: { diagnostics: { type: 'object' } } },
      },
    },
  }, async () => {
    const diagnostics: DiagnosticsBuffer = {};
    state.diagnosticsBuffer.forEach((diags, uri) => {
      diagnostics[uri] = diags;
    });
    return { diagnostics };
  });

  app.delete<DiagnosticsDeleteRoute>('/diagnostics', {
    schema: {
      description: 'Clear all cached diagnostics',
      tags: ['diagnostics'],
      response: {
        200: { $ref: 'SuccessResponse#' },
      },
    },
  }, async () => {
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

    // Register Swagger
    app.register(swagger, {
      openapi: {
        info: {
          title: 'LSP Bridge Server API',
          description: 'REST API bridge for Language Server Protocol servers',
          version: '1.0.0',
        },
        servers: [{ url: `http://localhost:${this.port}` }],
        tags: [
          { name: 'lifecycle', description: 'Server lifecycle management' },
          { name: 'document', description: 'Document operations' },
          { name: 'features', description: 'LSP features (completion, hover, etc.)' },
          { name: 'diagnostics', description: 'Diagnostics management' },
        ],
      },
    });

    app.register(swaggerUi, {
      routePrefix: '/documentation',
    });

    // Add schemas from generated definitions
    for (const [name, schema] of Object.entries(schemaDefinitions)) {
      app.addSchema({ $id: name, ...(schema as object) });
    }

    // Register CORS
    app.register(cors, {
      origin: '*',
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    });

    // Register routes as a plugin so swagger can discover them
    const state = this.state;
    app.register(async (app) => {
      registerLifecycleRoutes(app, state);
      registerDocumentRoutes(app, state);
      registerFeatureRoutes(app, state);
      registerDiagnosticsRoutes(app, state);
    });

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

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { schemaDefinitions } from './schemas';
import { BridgeState, BadRequestError } from './bridge-types';
import {
  registerLifecycleRoutes,
  registerDocumentRoutes,
  registerFeatureRoutes,
  registerDiagnosticsRoutes,
} from './routes';

export class LSPBridgeServer {
  private app: FastifyInstance;
  private port: number;
  private host: string;
  private state: BridgeState;

  constructor(port: number = 3000, host: string = '127.0.0.1') {
    this.port = port;
    this.host = host;
    this.state = {
      client: null,
      language: null,
      diagnosticsBuffer: new Map(),
    };
    this.app = this.createApp();
  }

  private createApp(): FastifyInstance {
    const app = Fastify({
      logger: true,
    });

    this.registerSwagger(app);
    this.registerSchemas(app);
    this.registerCors(app);
    this.registerRoutes(app);
    this.registerErrorHandler(app);

    return app;
  }

  private registerSwagger(app: FastifyInstance): void {
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
  }

  private registerSchemas(app: FastifyInstance): void {
    for (const [name, schema] of Object.entries(schemaDefinitions)) {
      app.addSchema({ $id: name, ...(schema as object) });
    }
  }

  private registerCors(app: FastifyInstance): void {
    app.register(cors, {
      origin: false,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    });
  }

  private registerRoutes(app: FastifyInstance): void {
    const state = this.state;
    app.register(async (app) => {
      registerLifecycleRoutes(app, state);
      registerDocumentRoutes(app, state);
      registerFeatureRoutes(app, state);
      registerDiagnosticsRoutes(app, state);
    });
  }

  private registerErrorHandler(app: FastifyInstance): void {
    app.setErrorHandler(async (error: Error, request, reply) => {
      if (error instanceof BadRequestError) {
        reply.code(400).send({ error: error.message });
      } else {
        request.log.error(error);
        reply.code(500).send({ error: 'Internal server error' });
      }
    });
  }

  async start(): Promise<void> {
    await this.app.listen({ port: this.port, host: this.host });
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

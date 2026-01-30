import { FastifyInstance } from 'fastify';
import { BridgeState } from '../bridge-types';
import { createLspClientForLanguage } from '../lsp-client-factory';
import { StartRoute, StopRoute, StatusRoute } from './route-types';

export function registerLifecycleRoutes(app: FastifyInstance, state: BridgeState): void {
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

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BridgeState } from '../bridge-types';
import {
  CompletionRoute,
  HoverRoute,
  DefinitionRoute,
  ReferencesRoute,
  SymbolsRoute,
} from './route-types';

export function registerFeatureRoutes(app: FastifyInstance, state: BridgeState): void {
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

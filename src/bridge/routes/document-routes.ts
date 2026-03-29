import { FastifyInstance } from 'fastify';
import { BridgeState } from '../bridge-types';
import { DocumentOpenRoute, DocumentChangeRoute, DocumentCloseRoute } from './route-types';
import { createRequireClient } from './route-guards';

export function registerDocumentRoutes(app: FastifyInstance, state: BridgeState): void {
  const requireClient = createRequireClient(state);

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

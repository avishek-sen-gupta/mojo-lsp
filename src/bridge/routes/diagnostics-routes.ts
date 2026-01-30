import { FastifyInstance } from 'fastify';
import { BridgeState, DiagnosticsBuffer } from '../bridge-types';
import { DiagnosticsGetRoute, DiagnosticsDeleteRoute } from './route-types';

export function registerDiagnosticsRoutes(app: FastifyInstance, state: BridgeState): void {
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

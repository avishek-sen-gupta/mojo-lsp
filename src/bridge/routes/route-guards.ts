import { FastifyRequest, FastifyReply } from 'fastify';
import { BridgeState } from '../bridge-types';

export function createRequireClient(state: BridgeState) {
  return async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!state.client) {
      return reply.code(400).send({ error: 'LSP server not running. Call /start first.' });
    }
  };
}

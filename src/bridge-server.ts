import express, { Request, Response, NextFunction, Router } from 'express';
import { Server } from 'http';
import { LSPClient, LSPClientOptions } from './lsp-client';
import { Diagnostic } from 'vscode-languageserver-protocol';

// Types

interface DiagnosticsBuffer {
  [uri: string]: Diagnostic[];
}

interface StartBody {
  serverCommand: string;
  serverArgs?: string[];
  rootUri: string;
  cwd?: string;
  socket?: { port: number; host?: string };
}

interface DocumentBody {
  uri: string;
  languageId?: string;
  text?: string;
}

interface PositionBody {
  uri: string;
  line: number;
  character: number;
  includeDeclaration?: boolean;
}

// Custom error class

class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

// Bridge server state (shared across routes)

interface BridgeState {
  client: LSPClient | null;
  diagnosticsBuffer: Map<string, Diagnostic[]>;
}

// Route factories

function createLifecycleRoutes(state: BridgeState): Router {
  const router = Router();

  router.post('/start', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (state.client) {
        throw new BadRequestError('LSP server already running. Stop it first.');
      }

      const { serverCommand, serverArgs, rootUri, cwd, socket } = req.body as StartBody;

      if (!serverCommand) throw new BadRequestError('serverCommand is required');
      if (!rootUri) throw new BadRequestError('rootUri is required');

      const options: LSPClientOptions = { serverCommand, serverArgs, rootUri, cwd, socket };
      state.client = new LSPClient(options);

      state.client.onDiagnostics((params) => {
        state.diagnosticsBuffer.set(params.uri, params.diagnostics);
      });

      const capabilities = await state.client.start();
      res.json({ capabilities });
    } catch (err) {
      next(err);
    }
  });

  router.post('/stop', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (state.client) {
        await state.client.stop();
        state.client = null;
        state.diagnosticsBuffer.clear();
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  router.get('/status', (req: Request, res: Response) => {
    if (!state.client) {
      res.json({ running: false });
      return;
    }
    res.json({
      running: true,
      capabilities: state.client.getServerCapabilities(),
    });
  });

  return router;
}

function createDocumentRoutes(state: BridgeState): Router {
  const router = Router();

  const requireClient = (req: Request, res: Response, next: NextFunction) => {
    if (!state.client) {
      next(new BadRequestError('LSP server not running. Call /start first.'));
      return;
    }
    next();
  };

  router.use(requireClient);

  router.post('/open', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uri, languageId, text } = req.body as DocumentBody;
      if (!uri) throw new BadRequestError('uri is required');
      if (!languageId) throw new BadRequestError('languageId is required');
      if (text === undefined) throw new BadRequestError('text is required');

      await state.client!.openDocument(uri, languageId, text);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  router.post('/change', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uri, text } = req.body as DocumentBody;
      if (!uri) throw new BadRequestError('uri is required');
      if (text === undefined) throw new BadRequestError('text is required');

      await state.client!.changeDocument(uri, text);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  router.post('/close', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uri } = req.body as DocumentBody;
      if (!uri) throw new BadRequestError('uri is required');

      await state.client!.closeDocument(uri);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

function createFeatureRoutes(state: BridgeState): Router {
  const router = Router();

  const requireClient = (req: Request, res: Response, next: NextFunction) => {
    if (!state.client) {
      next(new BadRequestError('LSP server not running. Call /start first.'));
      return;
    }
    next();
  };

  router.use(requireClient);

  router.post('/completion', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uri, line, character } = req.body as PositionBody;
      if (!uri) throw new BadRequestError('uri is required');
      if (line === undefined) throw new BadRequestError('line is required');
      if (character === undefined) throw new BadRequestError('character is required');

      const result = await state.client!.getCompletion(uri, line, character);
      res.json({ items: result });
    } catch (err) {
      next(err);
    }
  });

  router.post('/hover', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uri, line, character } = req.body as PositionBody;
      if (!uri) throw new BadRequestError('uri is required');
      if (line === undefined) throw new BadRequestError('line is required');
      if (character === undefined) throw new BadRequestError('character is required');

      const result = await state.client!.getHover(uri, line, character);
      res.json({ hover: result });
    } catch (err) {
      next(err);
    }
  });

  router.post('/definition', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uri, line, character } = req.body as PositionBody;
      if (!uri) throw new BadRequestError('uri is required');
      if (line === undefined) throw new BadRequestError('line is required');
      if (character === undefined) throw new BadRequestError('character is required');

      const result = await state.client!.getDefinition(uri, line, character);
      res.json({ locations: result });
    } catch (err) {
      next(err);
    }
  });

  router.post('/references', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uri, line, character, includeDeclaration = true } = req.body as PositionBody;
      if (!uri) throw new BadRequestError('uri is required');
      if (line === undefined) throw new BadRequestError('line is required');
      if (character === undefined) throw new BadRequestError('character is required');

      const result = await state.client!.getReferences(uri, line, character, includeDeclaration);
      res.json({ locations: result });
    } catch (err) {
      next(err);
    }
  });

  router.post('/symbols', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uri } = req.body as PositionBody;
      if (!uri) throw new BadRequestError('uri is required');

      const result = await state.client!.getDocumentSymbols(uri);
      res.json({ symbols: result });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

function createDiagnosticsRoutes(state: BridgeState): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const diagnostics: DiagnosticsBuffer = {};
    state.diagnosticsBuffer.forEach((diags, uri) => {
      diagnostics[uri] = diags;
    });
    res.json({ diagnostics });
  });

  router.delete('/', (req: Request, res: Response) => {
    state.diagnosticsBuffer.clear();
    res.json({ success: true });
  });

  return router;
}

// Main server class

export class LSPBridgeServer {
  private app: express.Application;
  private server: Server | null = null;
  private port: number;
  private state: BridgeState;

  constructor(port: number = 3000) {
    this.port = port;
    this.state = {
      client: null,
      diagnosticsBuffer: new Map(),
    };
    this.app = this.createApp();
  }

  private createApp(): express.Application {
    const app = express();

    // Middleware
    app.use(express.json());
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      next();
    });

    // Routes
    app.use('/', createLifecycleRoutes(this.state));
    app.use('/document', createDocumentRoutes(this.state));
    app.use('/', createFeatureRoutes(this.state));
    app.use('/diagnostics', createDiagnosticsRoutes(this.state));

    // Error handler
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      const statusCode = err instanceof BadRequestError ? 400 : 500;
      res.status(statusCode).json({ error: err.message });
    });

    return app;
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`LSP Bridge Server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state.client) {
        this.state.client.stop().catch(() => {});
        this.state.client = null;
      }
      if (this.server) {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

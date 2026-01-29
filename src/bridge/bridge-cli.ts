#!/usr/bin/env node
import { LSPBridgeServer } from './bridge-server';

function parseArgs(): { port: number } {
  const args = process.argv.slice(2);
  let port = 3000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' || args[i] === '-p') {
      const portArg = args[i + 1];
      if (portArg) {
        const parsed = parseInt(portArg, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed < 65536) {
          port = parsed;
        } else {
          console.error(`Invalid port: ${portArg}`);
          process.exit(1);
        }
      }
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
LSP Bridge Server

Usage: bridge-cli [options]

Options:
  -p, --port <port>  Port to listen on (default: 3000)
  -h, --help         Show this help message

Example:
  bridge-cli --port 3000
`);
      process.exit(0);
    }
  }

  return { port };
}

async function main(): Promise<void> {
  const { port } = parseArgs();

  const server = new LSPBridgeServer(port);

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    try {
      await server.stop();
      console.log('Server stopped');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

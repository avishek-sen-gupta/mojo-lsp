import { Logger, SymbolKind } from 'vscode-languageserver-protocol';
import { LSPClient } from '../lsp-client';

// Silent logger for tests
export const silentLogger: Logger = {
  error: () => {},
  warn: () => {},
  info: () => {},
  log: () => {},
};

// Map SymbolKind enum to human-readable names
export function symbolKindName(kind: SymbolKind): string {
  const names: Record<number, string> = {
    1: 'File',
    2: 'Module',
    3: 'Namespace',
    4: 'Package',
    5: 'Class',
    6: 'Method',
    7: 'Property',
    8: 'Field',
    9: 'Constructor',
    10: 'Enum',
    11: 'Interface',
    12: 'Function',
    13: 'Variable',
    14: 'Constant',
    15: 'String',
    16: 'Number',
    17: 'Boolean',
    18: 'Array',
    19: 'Object',
    20: 'Key',
    21: 'Null',
    22: 'EnumMember',
    23: 'Struct',
    24: 'Event',
    25: 'Operator',
    26: 'TypeParameter',
  };
  return names[kind] || `Unknown(${kind})`;
}

// Wait helper
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to safely stop client
export async function safeStop(client: LSPClient): Promise<void> {
  try {
    await client.stop();
  } catch {
    // Ignore errors during cleanup
  }
}

// Helper to check if a command exists
export async function commandExists(command: string): Promise<boolean> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    await execAsync(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}

// Helper to check if a directory exists
export function directoryExists(path: string): boolean {
  const fs = require('fs');
  return fs.existsSync(path) && fs.statSync(path).isDirectory();
}

// Helper to check if a file exists
export function fileExists(path: string): boolean {
  const fs = require('fs');
  return fs.existsSync(path) && fs.statSync(path).isFile();
}

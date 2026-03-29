import * as path from 'path';
import * as fs from 'fs';

/**
 * Recursively find all files matching the given extensions in a directory,
 * skipping hidden directories and any directories in the excluded list.
 */
export function findFilesByExtension(
  dir: string,
  extensions: string[],
  excludedDirs: string[]
): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        !excludedDirs.includes(entry.name)) {
      files.push(...findFilesByExtension(fullPath, extensions, excludedDirs));
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

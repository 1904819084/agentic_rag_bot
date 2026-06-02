import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(packageDir, 'src');
const distDir = path.join(packageDir, 'dist');

const srcModules = new Set(
  readdirSync(srcDir)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => path.basename(file, '.ts')),
);

const distModules = existsSync(distDir)
  ? new Set(
      readdirSync(distDir)
        .filter((file) => file.endsWith('.js'))
        .map((file) => path.basename(file, '.js')),
    )
  : new Set();

const staleModules = [...distModules].filter((name) => !srcModules.has(name));
const missingModules = [...srcModules].filter((name) => !distModules.has(name));

if (staleModules.length || missingModules.length) {
  console.error('packages/shared dist does not match src.');
  if (staleModules.length) {
    console.error(`Stale dist modules: ${staleModules.join(', ')}`);
  }
  if (missingModules.length) {
    console.error(`Missing dist modules: ${missingModules.join(', ')}`);
  }
  process.exit(1);
}

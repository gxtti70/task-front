import { spawn } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generatedConfig = path.join(projectRoot, 'src/environments/stripe-build-config.generated.ts');
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY?.trim() ?? '';

if (publishableKey && !/^pk_(test|live)_[A-Za-z0-9]+$/.test(publishableKey)) {
  console.error('STRIPE_PUBLISHABLE_KEY must be an empty value or a Stripe publishable key starting with pk_test_ or pk_live_.');
  process.exit(1);
}

await writeFile(
  generatedConfig,
  `export const stripeBuildConfig = { publishableKey: ${JSON.stringify(publishableKey)} } as const;\n`,
  { mode: 0o600 }
);

const cli = path.join(projectRoot, 'node_modules/@angular/cli/bin/ng.js');
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit'
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('error', async error => {
  console.error(`Could not start Angular CLI: ${error.message}`);
  await rm(generatedConfig, { force: true });
  process.exitCode = 1;
});

child.on('close', async (code, signal) => {
  await rm(generatedConfig, { force: true });
  process.exitCode = code ?? (signal ? 1 : 0);
});

import { spawn } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generatedStripeConfig = path.join(projectRoot, 'src/environments/stripe-build-config.generated.ts');
const generatedApiConfig = path.join(projectRoot, 'src/environments/api-build-config.generated.ts');
const generatedBillingConfig = path.join(projectRoot, 'src/environments/billing-build-config.generated.ts');
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
const apiUrl = process.env.API_URL?.trim() ?? '/api';
const rawBillingSimulate = process.env.BILLING_SIMULATE?.trim() ?? 'false';

if (publishableKey && !/^pk_(test|live)_[A-Za-z0-9]+$/.test(publishableKey)) {
  console.error('STRIPE_PUBLISHABLE_KEY must be an empty value or a Stripe publishable key starting with pk_test_ or pk_live_.');
  process.exit(1);
}

if (rawBillingSimulate !== '' && rawBillingSimulate !== 'true' && rawBillingSimulate !== 'false') {
  console.error('BILLING_SIMULATE must be "true", "false" or an empty value.');
  process.exit(1);
}

const billingSimulate = rawBillingSimulate === 'true';

await writeFile(
  generatedStripeConfig,
  `export const stripeBuildConfig = { publishableKey: ${JSON.stringify(publishableKey)} } as const;\n`,
  { mode: 0o600 }
);

await writeFile(
  generatedApiConfig,
  `export const apiBuildConfig = { apiUrl: ${JSON.stringify(apiUrl)} } as const;\n`,
  { mode: 0o600 }
);

await writeFile(
  generatedBillingConfig,
  `export const billingBuildConfig = { simulate: ${billingSimulate} } as const;\n`,
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
  await rm(generatedStripeConfig, { force: true });
  await rm(generatedApiConfig, { force: true });
  await rm(generatedBillingConfig, { force: true });
  process.exitCode = 1;
});

child.on('close', async (code, signal) => {
  await rm(generatedStripeConfig, { force: true });
  await rm(generatedApiConfig, { force: true });
  await rm(generatedBillingConfig, { force: true });
  process.exitCode = code ?? (signal ? 1 : 0);
});

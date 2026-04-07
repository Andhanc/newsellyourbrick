import { spawn } from 'node:child_process';

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: false });
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const maxAttempts = Number(process.env.PRISMA_MIGRATE_RETRIES || 12);
const delayMs = Number(process.env.PRISMA_MIGRATE_RETRY_DELAY_MS || 5000);

console.log('[startup] prisma generate...');
const genCode = await run('npx', ['prisma', 'generate']);
if (genCode !== 0) {
  console.error('[startup] prisma generate failed, stopping startup.');
  process.exit(genCode);
}

let migrateOk = false;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(`[startup] prisma migrate deploy (attempt ${attempt}/${maxAttempts})...`);
  const code = await run('npx', ['prisma', 'migrate', 'deploy']);
  if (code === 0) {
    migrateOk = true;
    break;
  }
  if (attempt < maxAttempts) {
    console.warn(`[startup] migrate failed, retrying in ${delayMs}ms...`);
    await sleep(delayMs);
  }
}

if (!migrateOk) {
  console.warn('[startup] prisma migrate deploy failed after retries; continuing app startup.');
}

process.exit(0);

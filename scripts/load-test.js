import autocannon from 'autocannon';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.LOAD_BASE_URL || 'http://localhost:3000';
const CONNECTION_STEPS = (process.env.LOAD_STEPS || '25,50,100,200,300,400,500')
  .split(',')
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isFinite(v) && v > 0);
const DURATION_SEC = Number(process.env.LOAD_DURATION_SEC || 20);
const WARMUP_SEC = Number(process.env.LOAD_WARMUP_SEC || 5);
const MAX_P95_MS = Number(process.env.LOAD_MAX_P95_MS || 800);
const MAX_ERROR_RATE_PERCENT = Number(process.env.LOAD_MAX_ERROR_RATE_PERCENT || 1);
const PIPELINING = Number(process.env.LOAD_PIPELINING || 1);
const PATHS = (process.env.LOAD_PATHS || '/health,/api/health')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sumStatusCodes(statusCodeStats = {}) {
  let total = 0;
  for (const value of Object.values(statusCodeStats)) {
    if (typeof value === 'number' && Number.isFinite(value)) total += value;
  }
  return total;
}

function sumNon2xx(statusCodeStats = {}) {
  let total = 0;
  for (const [code, value] of Object.entries(statusCodeStats)) {
    const codeNumber = Number(code);
    if (!Number.isFinite(codeNumber) || typeof value !== 'number') continue;
    if (codeNumber < 200 || codeNumber >= 300) total += value;
  }
  return total;
}

function runSingleStep(connections, seconds) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: BASE_URL,
        connections,
        duration: seconds,
        pipelining: PIPELINING,
        requests: PATHS.map((currentPath) => ({
          method: 'GET',
          path: currentPath,
        })),
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    autocannon.track(instance, {
      renderProgressBar: false,
      renderResultsTable: false,
    });
  });
}

function evaluateStep(result, connections) {
  const p95 = result?.latency?.p95 ?? Number.POSITIVE_INFINITY;
  const totalRequests = sumStatusCodes(result?.statusCodeStats);
  const non2xx = sumNon2xx(result?.statusCodeStats);
  const totalErrors = (result?.errors || 0) + (result?.timeouts || 0) + non2xx;
  const errorRatePercent = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 100;
  const requestsPerSec = result?.requests?.average ?? 0;

  const slaPassed = p95 <= MAX_P95_MS && errorRatePercent <= MAX_ERROR_RATE_PERCENT;

  return {
    connections,
    totalRequests,
    requestsPerSec,
    p95,
    errors: totalErrors,
    errorRatePercent,
    slaPassed,
  };
}

function printStep(step) {
  const status = step.slaPassed ? 'OK' : 'FAIL';
  console.log(
    `[${status}] conn=${step.connections} rps=${step.requestsPerSec.toFixed(1)} p95=${step.p95.toFixed(1)}ms errors=${step.errors} errRate=${step.errorRatePercent.toFixed(2)}%`
  );
}

async function main() {
  if (CONNECTION_STEPS.length === 0) {
    throw new Error('LOAD_STEPS пустой. Пример: LOAD_STEPS=25,50,100');
  }

  console.log('=== Load test started ===');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Paths: ${PATHS.join(', ')}`);
  console.log(`Steps: ${CONNECTION_STEPS.join(', ')}`);
  console.log(
    `SLA: p95<=${MAX_P95_MS}ms, errorRate<=${MAX_ERROR_RATE_PERCENT}%`
  );

  const stepResults = [];
  let safePeakConnections = 0;
  let breakingPoint = null;

  for (const connections of CONNECTION_STEPS) {
    console.log(`\n-- Warmup ${WARMUP_SEC}s for ${connections} connections --`);
    await runSingleStep(connections, WARMUP_SEC);
    await sleep(300);

    console.log(`-- Measure ${DURATION_SEC}s for ${connections} connections --`);
    const measureResult = await runSingleStep(connections, DURATION_SEC);
    const evaluated = evaluateStep(measureResult, connections);
    stepResults.push(evaluated);
    printStep(evaluated);

    if (evaluated.slaPassed) {
      safePeakConnections = connections;
    } else if (!breakingPoint) {
      breakingPoint = connections;
      break;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    target: BASE_URL,
    paths: PATHS,
    sla: {
      maxP95Ms: MAX_P95_MS,
      maxErrorRatePercent: MAX_ERROR_RATE_PERCENT,
    },
    run: {
      warmupSec: WARMUP_SEC,
      durationSec: DURATION_SEC,
      steps: CONNECTION_STEPS,
    },
    result: {
      safePeakConnections,
      estimatedPeakUsers: safePeakConnections,
      firstBreakingStep: breakingPoint,
      note: 'Оценка "пользователей" приближенная: 1 соединение ~= 1 активный пользователь.',
    },
    steps: stepResults,
  };

  const reportPath = path.resolve(process.cwd(), 'load-test-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n=== Итог ===');
  if (safePeakConnections > 0) {
    console.log(
      `Сайт выдерживает примерно до ${safePeakConnections} одновременных активных пользователей (по заданному SLA).`
    );
  } else {
    console.log('Сайт не прошел SLA даже на первом шаге нагрузки.');
  }
  if (breakingPoint) {
    console.log(`Точка деградации начинается примерно с ${breakingPoint} соединений.`);
  } else {
    console.log('Точка деградации не достигнута в рамках заданных шагов.');
  }
  console.log(`Подробный отчет сохранен в: ${reportPath}`);
}

main().catch((error) => {
  console.error('\nLoad test failed:', error.message);
  process.exitCode = 1;
});

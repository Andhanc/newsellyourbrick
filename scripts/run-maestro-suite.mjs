#!/usr/bin/env node
/**
 * Seed demo data, run Maestro suite N times, write markdown + JSON report.
 *
 *   node scripts/run-maestro-suite.mjs
 *   MAESTRO_RUNS=3 node scripts/run-maestro-suite.mjs
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

config()

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MAESTRO_DIR = join(ROOT, 'maestro')
const FLOWS_DIR = join(MAESTRO_DIR, 'flows')
const REPORTS_DIR = join(MAESTRO_DIR, 'reports')
const RUNS = Math.max(1, Number(process.env.MAESTRO_RUNS || 3))
const APP_URL = process.env.MAESTRO_APP_URL || 'http://localhost:5173'
const MAESTRO_BIN = process.env.MAESTRO_BIN || join(process.env.HOME || '', '.maestro/bin/maestro')

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${process.env.HOME}/.maestro/bin:${process.env.PATH || ''}` },
    ...opts,
  })
  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? String(result.error.message || result.error) : null,
  }
}

function listFlowFiles(dir = FLOWS_DIR) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listFlowFiles(full))
    else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) out.push(full)
  }
  return out.sort()
}

function ensureVite() {
  const probe = run('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', APP_URL])
  if (String(probe.stdout).trim() === '200') return true
  console.warn(`[maestro] ${APP_URL} is not reachable (got ${probe.stdout}). Start npm run start:local first.`)
  return false
}

function main() {
  mkdirSync(REPORTS_DIR, { recursive: true })
  const startedAt = new Date().toISOString()
  const stamp = startedAt.replace(/[:.]/g, '-')

  console.log('[maestro] seeding demo data…')
  const seed = run('node', ['scripts/seed-maestro-demo.mjs'], { maxBuffer: 10 * 1024 * 1024 })
  if (seed.status !== 0) {
    console.error(seed.stdout)
    console.error(seed.stderr)
    throw new Error('seed-maestro-demo failed')
  }
  console.log(seed.stdout)

  if (!ensureVite()) {
    process.exitCode = 2
    return
  }

  if (!existsSync(MAESTRO_BIN) && run('which', ['maestro']).status !== 0) {
    console.error('Maestro CLI not found. Install: curl -Ls "https://get.maestro.mobile.dev" | bash')
    process.exitCode = 2
    return
  }

  const flows = listFlowFiles()
  const maestroCmd = existsSync(MAESTRO_BIN) ? MAESTRO_BIN : 'maestro'
  const allRuns = []

  for (let i = 1; i <= RUNS; i += 1) {
    console.log(`[maestro] suite run ${i}/${RUNS}`)
    const outDir = join(REPORTS_DIR, `${stamp}-run-${i}`)
    mkdirSync(outDir, { recursive: true })
    const junitPath = join(outDir, 'junit.xml')
    const args = [
      'test',
      ...flows.map((f) => f.replace(`${MAESTRO_DIR}/`, '')),
      '--headless',
      '--format',
      'JUNIT',
      '--output',
      junitPath,
      '--test-output-dir',
      outDir,
      '--test-suite-name',
      `SellYourBrick-Maestro-run-${i}`,
      '-e',
      `APP_URL=${APP_URL}`,
    ]
    const envFile = join(MAESTRO_DIR, 'demo.env.yaml')
    if (existsSync(envFile)) {
      for (const line of readFileSync(envFile, 'utf8').split('\n')) {
        const m = line.match(/^([A-Z0-9_]+):\s*(.+)\s*$/)
        if (!m) continue
        args.push('-e', `${m[1]}=${m[2]}`)
      }
    }
    const result = run(maestroCmd, args, {
      maxBuffer: 20 * 1024 * 1024,
      cwd: MAESTRO_DIR,
    })
    const combined = `${result.stdout}\n${result.stderr}`
    const failedMatch = combined.match(/(\d+)\/(\d+) Flow Failed/)
    const passedMatch = combined.match(/(\d+)\/(\d+) Flow Passed/)
    const inferredFailed = failedMatch ? Number(failedMatch[1]) : null
    const status =
      result.status !== 0
        ? result.status
        : inferredFailed && inferredFailed > 0
          ? 1
          : 0
    allRuns.push({
      run: i,
      status,
      maestroExit: result.status,
      flowSummary: failedMatch
        ? failedMatch[0]
        : passedMatch
          ? passedMatch[0]
          : null,
      outDir,
      junitPath,
      stdoutTail: (result.stdout || '').slice(-4000),
      stderrTail: (result.stderr || '').slice(-2000),
      error: result.error,
    })
    console.log(result.stdout)
    if (result.stderr) console.error(result.stderr)
  }

  const passedRuns = allRuns.filter((r) => r.status === 0).length
  const failedRuns = allRuns.length - passedRuns
  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    appUrl: APP_URL,
    runsRequested: RUNS,
    passedRuns,
    failedRuns,
    flowFiles: flows.map((f) => f.replace(`${ROOT}/`, '')),
    seedManifestPath: 'maestro/demo-manifest.json',
    runs: allRuns,
  }

  const jsonPath = join(REPORTS_DIR, `${stamp}-summary.json`)
  const mdPath = join(REPORTS_DIR, `${stamp}-REPORT.md`)
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`)

  const md = [
    '# Maestro E2E Report',
    '',
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- App: ${APP_URL}`,
    `- Suite runs: **${passedRuns}/${RUNS} passed**`,
    `- Flow files: ${flows.length}`,
    '',
    '## Demo accounts',
    '',
    '- Buyer: `maestro-buyer@sellyourbrick.test` / `MaestroDemo2026!`',
    '- Seller: `maestro-seller@sellyourbrick.test` / `MaestroDemo2026!`',
    '- Seed manifest: `maestro/demo-manifest.json`',
    '',
    '## Coverage',
    '',
    '- Guest: discover hero → stage, auction/buy-now/debts/shares, marketing pages, map/search/favorites/compare',
    '- Auth: UI email login as buyer',
    '- Buyer: cabinet tabs, wallet, bonuses, favorites, compare, private club, catalogs, property details, VIP lot, test-drive',
    '- Seller: `/owner-test` views, legacy owner redirects, bonuses, own listing detail',
    '',
    '## Runs',
    '',
    ...allRuns.map(
      (r) =>
        `- Run ${r.run}: ${r.status === 0 ? 'PASSED' : 'FAILED'} (exit ${r.status}) → \`${r.outDir.replace(`${ROOT}/`, '')}\``,
    ),
    '',
    '## Notes',
    '',
    '- Maestro web is Beta (Chromium, en-US locale).',
    '- Auth for role suites uses `/__e2e__/session` (dev-only).',
    '- Soft-launch seller cabinet remains reachable because `sellerCabinet` is not in blocked features.',
    '',
  ].join('\n')
  writeFileSync(mdPath, md)
  writeFileSync(join(REPORTS_DIR, 'LATEST.md'), md)
  writeFileSync(join(REPORTS_DIR, 'LATEST.json'), `${JSON.stringify(report, null, 2)}\n`)

  console.log(`[maestro] report: ${mdPath}`)
  if (failedRuns > 0) process.exitCode = 1
}

main()

/**
 * Перед запуском Vite освобождает основной порт фронта (5173)
 * и запасной 5174, чтобы не поднимался второй зависший инстанс.
 */
import { execSync } from 'child_process'
import process from 'process'

const vitePort = parseInt(process.env.VITE_PORT || '5173', 10)
const ports = Number.isFinite(vitePort) && vitePort > 0
  ? [vitePort, vitePort + 1]
  : [5173, 5174]

function listeningPids(port) {
  try {
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    if (!out) return []
    return [...new Set(out.split(/\s+/).filter(Boolean))]
  } catch {
    return []
  }
}

function processName(pid) {
  try {
    return execSync(`ps -p ${pid} -o comm=`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function isNodeProcess(pid) {
  return /node/i.test(processName(pid))
}

function sleepSync(ms) {
  try {
    execSync(`sleep ${Math.max(0.05, ms / 1000)}`, { stdio: 'ignore' })
  } catch {
    // ignore
  }
}

function waitForPortFree(port, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (listeningPids(port).length === 0) return true
    sleepSync(50)
  }
  return listeningPids(port).length === 0
}

function freePort(port) {
  const pids = listeningPids(port)
  if (pids.length === 0) return

  for (const pid of pids) {
    if (!isNodeProcess(pid)) {
      console.warn(
        `[FRONTEND] Порт ${port} занят процессом ${pid} (${processName(pid) || 'unknown'}) — не трогаем`,
      )
      continue
    }
    console.log(`[FRONTEND] Освобождаю порт ${port} (PID ${pid})`)
    try {
      process.kill(Number(pid), 'SIGTERM')
    } catch (error) {
      if (error?.code !== 'ESRCH') {
        console.warn(`[FRONTEND] Не удалось остановить PID ${pid}:`, error.message || error)
      }
    }
  }

  if (!waitForPortFree(port)) {
    for (const pid of listeningPids(port)) {
      if (!isNodeProcess(pid)) continue
      try {
        process.kill(Number(pid), 'SIGKILL')
      } catch (error) {
        if (error?.code !== 'ESRCH') {
          console.warn(`[FRONTEND] Не удалось принудительно остановить PID ${pid}:`, error.message || error)
        }
      }
    }
    waitForPortFree(port, 500)
  }
}

for (const port of ports) {
  freePort(port)
}

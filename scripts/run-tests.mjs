import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

function testsIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = `${directory}/${entry.name}`
    if (entry.isDirectory()) return testsIn(file)
    return /\.test\.(js|mjs)$/.test(entry.name) ? [file] : []
  })
}

const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...['src', 'server', 'scripts'].flatMap(testsIn).sort()], {
  stdio: 'inherit',
})
if (result.error) console.error(result.error)
process.exitCode = result.status ?? 1

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { closeSync, createReadStream, mkdirSync, openSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const envFile = path.resolve(process.env.DEPLOY_ENV_FILE || path.join(root, '.env.production'))
const project = process.env.DEPLOY_PROJECT || 'conecta-pilot'
const compose = ['compose', '--env-file', envFile, '-p', project, '-f', path.join(root, 'deploy/compose.production.yaml')]
const options = { cwd: root, env: { ...process.env, DEPLOY_ENV_FILE: envFile }, maxBuffer: 16 * 1024 * 1024 }
const docker = (args, extra = {}) => execFileSync('docker', args, { ...options, stdio: ['ignore', 'pipe', 'inherit'], ...extra })
const run = (args, extra = {}) => docker([...compose, ...args], extra)
const db = (command, extra = {}) => run(['exec', '-T', 'postgres', 'sh', '-ec', command], extra)
// As instâncias por SSH e por domínio compartilham banco e fotos: pausar ambas.
const writers = () => docker(['ps', '--filter', `label=com.docker.compose.project=${project}`, '--format', '{{.ID}} {{.Label "com.docker.compose.service"}}']).toString().trim().split('\n').map(line => line.split(' ')).filter(([, service]) => ['app', 'app-domain'].includes(service)).map(([id]) => id)
const checksum = async (filename) => {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filename)) hash.update(chunk)
  return hash.digest('hex')
}
const media = (args, extra = {}) => run(['run', '--rm', '--no-deps', '-T', '--entrypoint', 'tar', 'app', ...args], extra)
const output = (filename, operation) => {
  const fd = openSync(filename, 'wx', 0o600)
  try { operation(fd) } finally { closeSync(fd) }
}
const input = (filename, operation) => {
  const fd = openSync(filename, 'r')
  try { operation(fd) } finally { closeSync(fd) }
}

const action = process.argv[2]
if (!['backup', 'restore'].includes(action)) throw new Error('Use backup ou restore CAMINHO_DO_BACKUP.')
// Mesmo lock para backup e restauração deste projeto no host.
const lock = path.join(root, `.deploy-${project}.lock`)
try { mkdirSync(lock, { mode: 0o700 }) } catch { throw new Error('Já existe uma operação de armazenamento em andamento. Confira o lock antes de repetir.') }
try {
  if (action === 'backup') {
    const directory = process.env.BACKUP_DIR
    if (!directory || !path.isAbsolute(directory)) throw new Error('Defina BACKUP_DIR absoluto, fora da instalação e dos diretórios de dados.')
    mkdirSync(directory, { recursive: true, mode: 0o700 })
    const configuration = JSON.parse(run(['config', '--format', 'json']).toString())
    const protectedPaths = [root, ...Object.values(configuration.services).flatMap(service => (service.volumes || []).filter(volume => volume.type === 'bind').map(volume => volume.source))]
    const canonicalDirectory = realpathSync(directory)
    if (protectedPaths.some(source => { const relative = path.relative(path.resolve(source), canonicalDirectory); return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)) }))
      throw new Error('BACKUP_DIR deve ficar fora da instalação, banco e fotos.')
    const destination = path.join(directory, new Date().toISOString().replaceAll(':', '-'))
    const partial = `${destination}.partial`
    mkdirSync(partial, { mode: 0o700 })
    const activeWriters = writers()
    try {
      if (activeWriters.length) docker(['stop', '--time', '30', ...activeWriters])
      output(path.join(partial, 'database.dump'), fd => db('pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl', { stdio: ['ignore', fd, 'inherit'] }))
      output(path.join(partial, 'media.tar.gz'), fd => media(['-czf', '-', '-C', '/app/media', '.'], { stdio: ['ignore', fd, 'inherit'] }))
      const manifest = { version: 1, createdAt: new Date().toISOString(), project, files: {} }
      for (const file of ['database.dump', 'media.tar.gz']) manifest.files[file] = await checksum(path.join(partial, file))
      writeFileSync(path.join(partial, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600 })
      renameSync(partial, destination)
      console.info(`Backup concluído: ${destination}. Copiar para o destino externo e verificar a cópia.`)
    } finally {
      if (activeWriters.length) docker(['start', ...activeWriters])
    }
  } else {
    const source = path.resolve(process.argv[3] || '')
    if (!process.argv[3]) throw new Error('Informe o diretório do backup.')
    const manifest = JSON.parse(readFileSync(path.join(source, 'manifest.json'), 'utf8'))
    if (manifest.version !== 1) throw new Error('Versão de backup não suportada.')
    for (const file of ['database.dump', 'media.tar.gz']) {
      if (await checksum(path.join(source, file)) !== manifest.files[file]) throw new Error(`Backup incompleto ou alterado: ${file}.`)
    }
    if (writers().length) throw new Error('Pare a aplicação antes da restauração.')
    const tables = db(`psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"`).toString().trim()
    if (tables !== '0') throw new Error('Restauração exige banco vazio. Use outro projeto e novos diretórios; nenhum banco será apagado.')
    run(['run', '--rm', '--no-deps', '-T', '--entrypoint', 'sh', 'app', '-ec', 'test -z "$(ls -A /app/media)"'])
    input(path.join(source, 'database.dump'), fd => db('pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --single-transaction --no-owner --no-acl --exit-on-error', { stdio: [fd, 'inherit', 'inherit'] }))
    input(path.join(source, 'media.tar.gz'), fd => media(['-xzf', '-', '-C', '/app/media'], { stdio: [fd, 'inherit', 'inherit'] }))
    console.info('Banco e fotos restaurados. Aplicação permanece parada: validar os dados e arquivos antes de iniciar.')
  }
} finally {
  rmSync(lock, { recursive: true })
}

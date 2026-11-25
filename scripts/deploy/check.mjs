import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { productionErrors } from './environment.mjs'

const errors = productionErrors(process.env)
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
try {
  await access(process.env.MEDIA_DIR, constants.R_OK | constants.W_OK)
} catch {
  console.error('MEDIA_DIR deve existir com permissão de leitura e escrita para a aplicação.')
  process.exit(1)
}
console.info('Configuração de produção válida. Confirmar persistência, SMTP, HTTPS e autorizações no roteiro do M6.')

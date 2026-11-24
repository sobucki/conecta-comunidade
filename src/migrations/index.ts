import * as migration_20261124_014048 from './20261124_014048'
import * as migration_20261124_022040 from './20261124_022040'
import * as migration_20261124_123359_m3_participacao from './20261124_123359_m3_participacao'
import * as migration_20261124_125127_m4_estados from './20261124_125127_m4_estados'
import * as migration_20261124_125128_m4_selecao_excecoes from './20261124_125128_m4_selecao_excecoes'
import * as migration_20261124_131526_m5_preparacao_piloto from './20261124_131526_m5_preparacao_piloto'

export const migrations = [
  {
    up: migration_20261124_014048.up,
    down: migration_20261124_014048.down,
    name: '20261124_014048',
  },
  {
    up: migration_20261124_022040.up,
    down: migration_20261124_022040.down,
    name: '20261124_022040',
  },
  {
    up: migration_20261124_123359_m3_participacao.up,
    down: migration_20261124_123359_m3_participacao.down,
    name: '20261124_123359_m3_participacao',
  },
  {
    up: migration_20261124_125127_m4_estados.up,
    down: migration_20261124_125127_m4_estados.down,
    name: '20261124_125127_m4_estados',
  },
  {
    up: migration_20261124_125128_m4_selecao_excecoes.up,
    down: migration_20261124_125128_m4_selecao_excecoes.down,
    name: '20261124_125128_m4_selecao_excecoes',
  },
  {
    up: migration_20261124_131526_m5_preparacao_piloto.up,
    down: migration_20261124_131526_m5_preparacao_piloto.down,
    name: '20261124_131526_m5_preparacao_piloto',
  },
]

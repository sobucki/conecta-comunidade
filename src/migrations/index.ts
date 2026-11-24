import * as migration_20261124_014048 from './20261124_014048';
import * as migration_20261124_022040 from './20261124_022040';

export const migrations = [
  {
    up: migration_20261124_014048.up,
    down: migration_20261124_014048.down,
    name: '20261124_014048',
  },
  {
    up: migration_20261124_022040.up,
    down: migration_20261124_022040.down,
    name: '20261124_022040'
  },
];

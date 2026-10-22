import { Flex, Typography } from 'antd';
import CharacterStat from '../../atom/character-stat/character-stat';
import Monitor from '../../atom/monitor/monitor';
import type { BuildBand } from '../../../api/core-game-data';

import './build.css';

export interface BuildProps {
  build: number;
  bands: readonly BuildBand[];
  current?: number | null;
  onChange?: (current: number | null) => void;
}

function dcModForBuild(build: number, bands: readonly BuildBand[]) {
  return bands.find((band) => build >= band.min && build <= band.max)?.dcMod;
}

export default function Build({ build, bands, current, onChange }: BuildProps) {
  const dcMod = dcModForBuild(build, bands);
  const maxHp = Math.floor(build / 5);

  return (
    <Flex className="build" align="center" gap={12}>
      <Flex className="build__stat" align="stretch">
        <CharacterStat label="BLD" value={build} />
        <Flex className="build__dc" vertical align="center" justify="center">
          <Typography.Text className="build__label">DC mod</Typography.Text>
          <Typography.Text className="build__value">
            {dcMod ?? '—'}
          </Typography.Text>
        </Flex>
      </Flex>
      <Monitor max={maxHp} current={current} onChange={onChange} />
    </Flex>
  );
}

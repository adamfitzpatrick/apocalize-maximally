import { Flex, InputNumber, Typography } from 'antd';
import { STATS, statKeys } from '../../../api/core-game-data';
import CharacterStat from '../../atom/character-stat/character-stat';
import { useCharacterCreation } from '../../../contexts/character-creation-context';
import { INITIAL_FREE_DEVELOPMENT_POINTS } from '../../../entities/character';

import './character-creation-step.css';

export default function PointAssignment() {
  const { character, updateInvestedDevelopmentPoints } = useCharacterCreation();
  const effectiveStats = character?.allEffectiveStats;
  const invested = character?.characterRecord.investedDevelopmentPoints;
  const available = character?.availableDevelopmentPoints ?? 0;

  if (!character || !effectiveStats || !invested) {
    return null;
  }

  return (
    <Flex vertical gap={16}>
      <Typography.Text className="character-creation-points-remaining">
        {available} of {INITIAL_FREE_DEVELOPMENT_POINTS} free development points
        remaining
      </Typography.Text>
      <Flex className="point-assignment__stats" justify="space-between" gap={8}>
        {statKeys.map((statKey, index) => {
          const investedInStat = invested[statKey];
          return (
            <Flex
              key={statKey}
              className="point-assignment__stat"
              vertical
              align="center"
              gap={8}
            >
              <CharacterStat
                label={STATS[index].short}
                value={effectiveStats[statKey]}
              />
              <InputNumber
                className="point-assignment__input"
                size="small"
                min={0}
                max={investedInStat + available}
                value={investedInStat}
                onChange={(value) => {
                  if (typeof value === 'number') {
                    updateInvestedDevelopmentPoints(statKey, value);
                  }
                }}
              />
            </Flex>
          );
        })}
      </Flex>
    </Flex>
  );
}

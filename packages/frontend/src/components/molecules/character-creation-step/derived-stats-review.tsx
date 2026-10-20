import { Flex, Typography } from 'antd';
import CharacterStat from '../../atom/character-stat/character-stat';
import { useCharacterCreation } from '../../../contexts/character-creation-context';
import type Character from '../../../entities/character';

import './character-creation-step.css';

const DERIVED_STATS: {
  name: string;
  abbrev: string;
  formula: string;
  getValue: (character: Character) => number;
}[] = [
  {
    name: 'Build',
    abbrev: 'BLD',
    formula: 'STR + FOR',
    getValue: (c) => c.build
  },
  {
    name: 'Health Points',
    abbrev: 'HP',
    formula: 'Build / 5',
    getValue: (c) => c.hp
  },
  {
    name: 'Initiative',
    abbrev: 'INIT',
    formula: '(AGI + LUCK) / 10',
    getValue: (c) => c.initiative
  },
  {
    name: 'Salvage',
    abbrev: 'SAL',
    formula: '(INS + LUCK) / 2',
    getValue: (c) => c.salvage
  },
  {
    name: 'Resilience',
    abbrev: 'RES',
    formula: '(STR + FOR) / 2',
    getValue: (c) => c.resilience
  },
  {
    name: 'Resolve',
    abbrev: 'RSV',
    formula: '(INT + INS) / 2',
    getValue: (c) => c.resolve
  },
  {
    name: 'Immunity',
    abbrev: 'IMM',
    formula: '(FOR + LUCK) / 2',
    getValue: (c) => c.immunity
  },
  {
    name: 'Dodge',
    abbrev: 'DDG',
    formula: '(AGI + INS) / 2',
    getValue: (c) => c.dodge
  },
  {
    name: 'Luck per game',
    abbrev: 'LPG',
    formula: 'LUCK / 10',
    getValue: (c) => c.luckUsePerGame
  }
];

const LEFT_COLUMN = DERIVED_STATS.slice(0, 5);
const RIGHT_COLUMN = DERIVED_STATS.slice(5);

function DerivedStatRow({
  name,
  abbrev,
  formula,
  value
}: {
  name: string;
  abbrev: string;
  formula: string;
  value: number;
}) {
  return (
    <Flex className="derived-stats-review__item" vertical gap={6}>
      <Flex vertical gap={2}>
        <Typography.Text className="derived-stats-review__name">
          {name}
        </Typography.Text>
        <Typography.Text className="derived-stats-review__formula">
          {formula}
        </Typography.Text>
      </Flex>
      <div className="derived-stats-review__stat">
        <CharacterStat label={abbrev} value={value} />
      </div>
    </Flex>
  );
}

export default function DerivedStatsReview() {
  const { character } = useCharacterCreation();

  if (!character?.allEffectiveStats) {
    return (
      <Typography.Paragraph>
        Complete base stat choices to review derived stats.
      </Typography.Paragraph>
    );
  }

  return (
    <div>
      <Typography.Paragraph style={{ marginBottom: '2rem' }}>
        These values are calculated from your final base stats. There are no
        choices required for this step.
      </Typography.Paragraph>
      <div className="derived-stats-review">
        <Flex className="derived-stats-review__column" vertical gap={16}>
          {LEFT_COLUMN.map(({ name, abbrev, formula, getValue }) => (
            <DerivedStatRow
              key={name}
              name={name}
              abbrev={abbrev}
              formula={formula}
              value={getValue(character)}
            />
          ))}
        </Flex>
        <Flex className="derived-stats-review__column" vertical gap={16}>
          {RIGHT_COLUMN.map(({ name, abbrev, formula, getValue }) => (
            <DerivedStatRow
              key={name}
              name={name}
              abbrev={abbrev}
              formula={formula}
              value={getValue(character)}
            />
          ))}
        </Flex>
      </div>
    </div>
  );
}

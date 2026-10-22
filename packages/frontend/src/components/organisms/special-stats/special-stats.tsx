import { Collapse, Flex, Typography } from 'antd';
import CharacterStat from '../../atom/character-stat/character-stat';
import Armor from '../../molecules/armor/armor';
import Build from '../../molecules/build/build';
import { useCoreGameData } from '../../../contexts/core-game-data-context';
import type Character from '../../../entities/character';

import './special-stats.css';

interface SpecialStatsProps {
  character: Character;
  onCurrentArmorChange?: (current: number) => void;
  onCurrentHpChange?: (current: number) => void;
}

function numberChange(onChange?: (current: number) => void) {
  return (current: number | null) => {
    if (current !== null) {
      onChange?.(current);
    }
  };
}

function ArmorStat({ character, onCurrentArmorChange }: SpecialStatsProps) {
  return (
    <Armor
      gear={character.carriedGear}
      current={character.currentArmor}
      onChange={numberChange(onCurrentArmorChange)}
    />
  );
}

const DERIVED_SPECIAL_STATS: {
  label: string;
  value: (character: Character) => number;
}[] = [
  { label: 'SAL', value: (character) => character.salvage },
  { label: 'RES', value: (character) => character.resilience },
  { label: 'RSV', value: (character) => character.resolve },
  { label: 'IMM', value: (character) => character.immunity }
];

function DerivedSpecialStats({
  character,
  paired = false
}: {
  character: Character;
  paired?: boolean;
}) {
  const stats = DERIVED_SPECIAL_STATS.map((stat) => (
    <CharacterStat
      key={stat.label}
      label={stat.label}
      value={stat.value(character)}
      showDerived
    />
  ));

  if (paired) {
    return <div className="special-stats__derived special-stats__derived--paired">{stats}</div>;
  }

  return (
    <Flex className="special-stats__derived" gap={12} align="start">
      {stats}
    </Flex>
  );
}

function BuildStat({ character, onCurrentHpChange }: SpecialStatsProps) {
  const coreGameData = useCoreGameData();
  return (
    <Build
      build={character.build}
      bands={coreGameData?.otherRules?.build ?? []}
      current={character.currentHp}
      onChange={numberChange(onCurrentHpChange)}
    />
  );
}

export function SpecialStats({
  character,
  onCurrentArmorChange,
  onCurrentHpChange
}: SpecialStatsProps) {
  return (
    <section className="special-stats">
      <Typography.Title level={4}>SPECIAL STATS</Typography.Title>
      <Flex className="special-stats__stats" gap={12} align="center">
        <ArmorStat
          character={character}
          onCurrentArmorChange={onCurrentArmorChange}
        />
        <BuildStat
          character={character}
          onCurrentHpChange={onCurrentHpChange}
        />
        <CharacterStat label="INIT" value={character.initiative} />
        <DerivedSpecialStats character={character} />
      </Flex>
    </section>
  );
}

function SummaryValue({ label, value }: { label: string; value: number | string }) {
  return (
    <Flex className="special-stats__summary" align="baseline" gap={6}>
      <Typography.Text strong>{label}</Typography.Text>
      <Typography.Text>{value}</Typography.Text>
    </Flex>
  );
}

export function SpecialStatsMobile({
  character,
  onCurrentArmorChange,
  onCurrentHpChange
}: SpecialStatsProps) {
  const coreGameData = useCoreGameData();
  const gear = character.carriedGear;

  return (
    <section className="special-stats">
      <Typography.Title level={4}>SPECIAL STATS</Typography.Title>
      <Collapse
        className="special-stats__collapse"
        items={[
          {
            key: 'armor',
            collapsible: 'icon',
            label: (
              <SummaryValue
                label="Armor"
                value={`${character.currentArmor} / ${character.armorMax}`}
              />
            ),
            children: (
              <Armor
                gear={gear}
                current={character.currentArmor}
                onChange={numberChange(onCurrentArmorChange)}
              />
            )
          },
          {
            key: 'build',
            collapsible: 'icon',
            label: (
              <Flex align="center" gap={16} wrap>
                <SummaryValue label="Build" value={character.build} />
                <SummaryValue
                  label="HP"
                  value={`${character.currentHp} / ${character.hp}`}
                />
              </Flex>
            ),
            children: (
              <Build
                build={character.build}
                bands={coreGameData?.otherRules?.build ?? []}
                current={character.currentHp}
                onChange={numberChange(onCurrentHpChange)}
              />
            )
          },
          {
            key: 'initiative',
            collapsible: 'disabled',
            showArrow: false,
            label: <SummaryValue label="Initiative" value={character.initiative} />
          },
          {
            key: 'derived',
            label: (
              <Flex align="center" gap={12} wrap>
                {DERIVED_SPECIAL_STATS.map((stat) => (
                  <SummaryValue
                    key={stat.label}
                    label={stat.label}
                    value={stat.value(character)}
                  />
                ))}
              </Flex>
            ),
            children: <DerivedSpecialStats character={character} paired />
          }
        ]}
      />
    </section>
  );
}

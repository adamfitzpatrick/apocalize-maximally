import { useState } from 'react';
import { Flex, Segmented, Typography } from 'antd';
import CharacterSkillPill from '../../atom/character-skill-pill/character-skill-pill';
import CharacterStat from '../../atom/character-stat/character-stat';
import { STATS, type SkillOption } from '../../../api/core-game-data';
import type Character from '../../../entities/character';

import './base-stats.css';

const BASE_STAT_GETTERS: ((character: Character) => number)[] = [
  (character) => character.strength,
  (character) => character.fortitude,
  (character) => character.agility,
  (character) => character.intelligence,
  (character) => character.instinct,
  (character) => character.charisma,
  (character) => character.fightingSkill,
  (character) => character.ballisticSkill,
  (character) => character.luck
];

interface BaseStatsProps {
  character: Character;
  skills?: SkillOption[] | null;
}

function standardSkillsByStat(skills?: SkillOption[] | null) {
  return (
    skills?.reduce(
      (accumulator, skill) => {
        if (!Object.keys(accumulator).includes(skill.baseStat)) {
          accumulator[skill.baseStat] = [];
        }
        if (!skill.apocalypseSkill) {
          accumulator[skill.baseStat].push(skill.name);
        }
        return accumulator;
      },
      {} as { [stat: string]: string[] }
    ) ?? {}
  );
}

export function BaseStats({ character, skills }: BaseStatsProps) {
  const sortedStandardSkills = standardSkillsByStat(skills);

  return (
    <section className="base-stats">
      <Typography.Title level={4}>BASE STATS</Typography.Title>
      <Flex className="base-stats__columns" wrap gap={12}>
        {STATS.map((stat, index) => (
          <Flex className="base-stats__column" key={stat.name} vertical gap={1}>
            <CharacterStat
              label={stat.short}
              value={BASE_STAT_GETTERS[index](character)}
              showDerived
            />
            {sortedStandardSkills[stat.short.toLowerCase()] ? (
              sortedStandardSkills[stat.short.toLowerCase()].map((skill) => (
                <CharacterSkillPill
                  key={skill}
                  name={skill}
                  proficiency={character.getSkillProficiencyMarker(skill)}
                  displayOnly={true}
                />
              ))
            ) : (
              <div>&nbsp;</div>
            )}
          </Flex>
        ))}
      </Flex>
    </section>
  );
}

export function BaseStatsMobile({ character, skills }: BaseStatsProps) {
  const [phoneBaseView, setPhoneBaseView] = useState<'Stats' | 'Skills'>('Stats');
  const sortedStandardSkills = standardSkillsByStat(skills);

  return (
    <section className="base-stats">
      <Typography.Title level={4}>BASE STATS</Typography.Title>
      <Segmented
        block
        className="base-stats__switch"
        options={['Stats', 'Skills']}
        value={phoneBaseView}
        onChange={(value) => setPhoneBaseView(value as 'Stats' | 'Skills')}
      />
      {phoneBaseView === 'Stats' ? (
        <div className="base-stats__phone-stats">
          {[STATS.slice(0, 5), STATS.slice(5)].map((column, columnIndex) => (
            <Flex key={columnIndex} vertical align="center" gap={8}>
              {column.map((stat) => {
                const index = STATS.indexOf(stat);
                return (
                  <CharacterStat
                    key={stat.short}
                    label={stat.short}
                    value={BASE_STAT_GETTERS[index](character)}
                    showDerived
                  />
                );
              })}
            </Flex>
          ))}
        </div>
      ) : (
        <Flex className="base-stats__phone-skills" vertical gap={12}>
          {STATS.map((stat) => {
            const statSkills = sortedStandardSkills[stat.short.toLowerCase()] ?? [];
            if (statSkills.length === 0) {
              return null;
            }
            return (
              <Flex key={stat.short} vertical gap={4}>
                <Typography.Text strong>{stat.short}</Typography.Text>
                {statSkills.map((skill) => (
                  <CharacterSkillPill
                    key={skill}
                    name={skill}
                    proficiency={character.getSkillProficiencyMarker(skill)}
                    displayOnly={true}
                  />
                ))}
              </Flex>
            );
          })}
        </Flex>
      )}
    </section>
  );
}

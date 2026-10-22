import { Flex, Typography } from 'antd';
import CharacterStat from '../../components/atom/character-stat/character-stat';
import { MajorChoiceSelector, MajorChoiceSelectorSummary } from '../../components/molecules/character-creation-step/infobox-selector';
import InformationDisplay from '../../components/molecules/character-creation-step/information-display';
import {
  AgeCategory,
  ApocalypseOption,
  STATS,
  type ArchetypeOption
} from '../../api/core-game-data';
import type { CreationConfigData } from './creation-types';
import AgeSelector, {
  AgeSelectionSummary
} from '../../components/molecules/character-creation-step/age-selector';
import PointAssignment from '../../components/molecules/character-creation-step/point-assignment';
import { SkillSelector } from '../../components/molecules/character-creation-step/skill-selector';
import DerivedStatsReview from '../../components/molecules/character-creation-step/derived-stats-review';
import PersonalDescription from '../../components/molecules/character-creation-step/personal-description';
import {
  isBugOutSelectionComplete,
  isFreeChoiceSelectionComplete,
  StartingGearMethod,
  StartingGearSelection
} from '../../components/molecules/character-creation-step/starting-gear-selector';
import type Character from '../../entities/character';

export type { Step, Phase, CreationConfigData } from './creation-types';

export function buildCreationConfig(
  archetypes: ArchetypeOption[],
  apocalypses: ApocalypseOption[],
  ageCategories: AgeCategory[],
  includePsychicPowerStep = false
): CreationConfigData {
  return {
    phases: [
      {
        title: 'Base Stats',
        steps: [
          {
            title: 'Review starting base stats',
            fullComponent: (
              <InformationDisplay
                description={[
                  'All base stats start at 25 for all characters.  There are no required choices for this step.'
                ]}
              >
                <Flex justify="space-between">
                  {STATS.map((stat) => (
                    <CharacterStat key={stat.short} label={stat.short} value={25} />
                  ))}
                </Flex>
              </InformationDisplay>
            ),
            collapsedComponent: null,
            isComplete: () => true
          },
          {
            title: 'Select a primary archetype',
            fullComponent: (
              <MajorChoiceSelector data={archetypes} target="primaryArchetype" />
            ),
            collapsedComponent: (<MajorChoiceSelectorSummary target="primaryArchetype" />),
            isComplete: (character) => Boolean(character.primaryArchetype)
          },
          {
            title: 'Select a secondary archetype',
            fullComponent: (
              <MajorChoiceSelector
                data={archetypes}
                target="secondaryArchetype"
              />
            ),
            collapsedComponent: (<MajorChoiceSelectorSummary target="secondaryArchetype" />),
            isComplete: (character) => Boolean(character.secondaryArchetype)
          },
          {
            title: 'Select a personal apocalypse',
            fullComponent: (
              <MajorChoiceSelector
                data={apocalypses}
                target="personalApocalypse"
              />
            ),
            collapsedComponent: (<MajorChoiceSelectorSummary target="personalApocalypse" />),
            isComplete: (character) => Boolean(character.personalApocalypse)
          },
          {
            title: 'Select an age category',
            fullComponent: (
              <AgeSelector ageCategories={ageCategories} />
            ),
            collapsedComponent: <AgeSelectionSummary />,
            isComplete: (character) => Boolean(character.ageCategory)
          },
          {
            title: 'Distribute free development points',
            fullComponent: (
              <PointAssignment />
            ),
            collapsedComponent: (
              <Typography.Title level={5} className="selection-summary" style={{ margin: 0 }}>
                All points distributed
              </Typography.Title>
            ),
            isComplete: (character) => Boolean(character.personalApocalypse)
          }
        ]
      },
      {
        title: 'Skill Proficiencies',
        steps: [
          {
            title: 'Choose Combat Skills',
            fullComponent: (
              <SkillSelector
                source="combat"
                instructions='Every character may begin with 2 Combat-related skill proficiencies, but can choose
fewer to gain additional skill proficiencies from their Archetype lists (maximum 2). If the Combat-related skill also exists on the Archetype list, it may be
selected a second time to increase the Level of Proficiency'
              />
            ),
            collapsedComponent: null,
            // 0–2 combat skills are valid; unused slots become bonus archetype picks.
            isComplete: () => true
          },
          {
            title: 'Choose Archetype Skills',
            fullComponent: (
              <SkillSelector
                source="archetype"
                instructions='Characters gain Proficiency in 7 skills: 4 from their Primary Archetype and 3 from their
Secondary Archetype. Skills may not be chosen more than once by any character
Archetype except for the Scientist. The Scientist which can choose multiple times from
the Scientist List (increasing the Level of Proficiency each time the skill is selected). If a
Skill Proficiency was gained through Age or the Combat-related skill choices, it may be
chosen again to increase the Level of Proficiency.'
              />
            ),
            collapsedComponent: null,
            isComplete: (character) =>
              !character.canSelectMorePrimaryArchetypeSkills &&
              !character.canSelectMoreSecondaryArchetypeSkills
          },
          {
            title: 'Choose Apocalypse Skills',
            fullComponent: (
              <SkillSelector
                source="apocalypse"
                instructions='Characters gain 1 skill proficiency from their Personal Apocalypse, but cannot choose
one previously gained from Age or Archetype. They MAY, however, gain or increase the
level of proficiency in a Combat skill. If they gained a Level of Proficiency in a Combat
from their Archetype, they cannot choose the Combat skill again.'
              />
            ),
            collapsedComponent: null,
            isComplete: (character) => Boolean(character.personalApocalypseSkill)
          }
        ]
      },
      {
        title: 'Special Stats',
        steps: [
          {
            title: 'Review derived stats',
            fullComponent: <DerivedStatsReview />,
            collapsedComponent: null,
            isComplete: () => true
          }
        ]
      },
      {
        title: 'Special Abilities',
        steps: [
          {
            title: 'Choose an Archetype Special Ability',
            fullComponent: (
              <SkillSelector
                source="primaryArchetypeSpecialAbility"
                instructions="Characters must choose 1 Special Ability from their Primary Archetype."
              />
            ),
            collapsedComponent: null,
            isComplete: (character) =>
              Boolean(character.primaryArchetypeSpecialAbility)
          },
          {
            title: 'Choose an Apocalypse Special Ability',
            fullComponent: (
              <SkillSelector
                source="apocalypseSpecialAbility"
                instructions="Characters gain 1 Special Ability from their Personal Apocalypse at Character Creation."
              />
            ),
            collapsedComponent: null,
            isComplete: (character) =>
              Boolean(character.personalApocalypseSpecialAbility)
          }
        ]
      },
      {
        title: 'Lucky Mutation',
        steps: [
          {
            title: 'Choose a Lucky Mutation',
            fullComponent: (
              <SkillSelector
                source="luckyMutation"
                instructions="Characters select 1 Lucky Mutation."
              />
            ),
            collapsedComponent: null,
            isComplete: (character) => Boolean(character.luckyMutation)
          },
          ...(includePsychicPowerStep
            ? [
                {
                  title: 'Choose a Psychic Power',
                  fullComponent: (
                    <SkillSelector
                      source="psychicPower"
                      instructions="Select 1 Psychic Power."
                    />
                  ),
                  collapsedComponent: null,
                  isComplete: (character: Character) =>
                    Boolean(character.psychicPower)
                }
              ]
            : [])
        ]
      },
      {
        title: 'Personal Description',
        steps: [
          {
            title: 'Describe your character',
            fullComponent: <PersonalDescription />,
            collapsedComponent: null,
            isComplete: (character) => {
              const { name, physicalDescription, background } =
                character.characterRecord;
              return [name, physicalDescription, background].every(
                (value) => typeof value === 'string' && value.trim().length > 0
              );
            }
          },
          {
            title: 'Select Negative Traits',
            fullComponent: (
              <SkillSelector
                source="negativeTrait"
                instructions="Characters must select 1 Negative Trait."
              />
            ),
            collapsedComponent: null,
            isComplete: (character) => Boolean(character.negativeTrait)
          }
        ]
      },
      {
        title: 'Starting Gear',
        steps: [
          {
            title: 'Choose a Method',
            fullComponent: <StartingGearMethod />,
            collapsedComponent: null,
            isComplete: (character) =>
              character.characterRecord.startingGearMethod === 'bug-out' ||
              character.characterRecord.startingGearMethod === 'free-choice'
          },
          {
            title: 'Select Starting Gear',
            fullComponent: <StartingGearSelection />,
            collapsedComponent: null,
            isComplete: (character) =>
              character.characterRecord.startingGearMethod === 'free-choice'
                ? isFreeChoiceSelectionComplete(character)
                : isBugOutSelectionComplete(character)
          }
        ]
      }
    ]
  };
}

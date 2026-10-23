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
import type { CreationStage } from '../../entities/character';

export type { Step, Phase, CreationConfigData } from './creation-types';

const combatSkillInstructions = [
  'Every character may begin with two Combat-related skill proficiencies, but may choose fewer to gain up to two additional skill proficiencies from their Archetype lists.',
  'If a Combat-related skill also appears on an Archetype list, it may be selected again to increase its Level of Proficiency.'
].join(' ');

const archetypeSkillInstructions = [
  'Characters gain Proficiency in seven skills: four from their Primary Archetype and three from their Secondary Archetype.',
  'Skills may not be selected more than once from an Archetype list, except for the Scientist.',
  'Only Scientists may select the same skill repeatedly from the Scientist list, up to M Proficiency.',
  "Each selection counts toward that Archetype's skill selection limit.",
  'A Skill Proficiency gained through Age or a Combat-related skill choice may be selected again to increase its Level of Proficiency.'
].join(' ');

const apocalypseSkillInstructions = [
  'Characters gain one skill proficiency from their Personal Apocalypse, but cannot choose one previously gained from Age or an Archetype.',
  'They may, however, gain or increase proficiency in a Combat skill.',
  'If they gained a Level of Proficiency in a Combat skill from their Archetype, they cannot choose that Combat skill again.'
].join(' ');

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
                  'All base stats start at 25 for all characters. There are no required choices for this step.'
                ]}
              >
                <Flex className="starting-base-stats" justify="space-between">
                  {STATS.map((stat) => (
                    <CharacterStat key={stat.short} label={stat.short} value={25} />
                  ))}
                </Flex>
              </InformationDisplay>
            ),
            collapsedComponent: null,
            isComplete: () => true,
            tracksProgress: false
          },
          {
            title: 'Select a primary archetype',
            fullComponent: (
              <Flex vertical gap="middle">
                <Typography.Text>
                  Click on an archetype to learn more about it.
                </Typography.Text>
                <MajorChoiceSelector data={archetypes} target="primaryArchetype" />
              </Flex>
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
            isComplete: (character) =>
              Boolean(character.secondaryArchetype) &&
              character.secondaryArchetype?.name !==
                character.primaryArchetype?.name
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
            isComplete: (character) =>
              character.characterRecord.age > 0 && Boolean(character.ageCategory)
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
            isComplete: (character) => character.availableDevelopmentPoints === 0
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
                instructions={combatSkillInstructions}
              />
            ),
            collapsedComponent: null,
            // 0–2 combat skills are valid; unused slots become bonus archetype picks.
            isComplete: () => true,
            tracksProgress: false
          },
          {
            title: 'Choose Archetype Skills',
            fullComponent: (
              <SkillSelector
                source="archetype"
                instructions={archetypeSkillInstructions}
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
                instructions={apocalypseSkillInstructions}
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
            isComplete: () => true,
            tracksProgress: false
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
            isComplete: (character) =>
              Boolean(character.characterRecord.name?.trim())
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
            isComplete: () => true,
            tracksProgress: false
          },
          {
            title: 'Select Starting Gear',
            fullComponent: <StartingGearSelection />,
            collapsedComponent: null,
            hideUntilReached: true,
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

export function creationProgressPercent(
  character: Character,
  config: CreationConfigData
): number {
  const steps = config.phases.flatMap((phase) =>
    phase.steps.filter((step) => step.tracksProgress !== false)
  );
  if (steps.length === 0) {
    return 0;
  }
  const completed = steps.filter((step) => step.isComplete(character)).length;
  return Math.round((completed / steps.length) * 100);
}

export function incompleteCreationPath(
  character: Character,
  config: CreationConfigData
): string | null {
  const stage = earliestIncompleteCreationStage(character, config);
  if (!stage) {
    return null;
  }
  const id = encodeURIComponent(character.characterRecord.id);
  return `/character-creation/${id}?phase=${stage[0]}&step=${stage[1]}`;
}

export function earliestIncompleteCreationStage(
  character: Character,
  config: CreationConfigData
): CreationStage | null {
  for (let phaseIndex = 0; phaseIndex < config.phases.length; phaseIndex += 1) {
    const steps = config.phases[phaseIndex].steps;
    for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
      if (!steps[stepIndex].isComplete(character)) {
        return [phaseIndex + 1, stepIndex + 1];
      }
    }
  }
  return null;
}

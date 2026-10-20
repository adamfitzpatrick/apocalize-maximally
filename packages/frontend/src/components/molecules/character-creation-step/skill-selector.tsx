import { Flex, Typography } from 'antd';
import { useCharacterCreation } from '../../../contexts/character-creation-context';
import { useCoreGameData } from '../../../contexts/core-game-data-context';
import {
  MAX_APOCALYPSE_SKILL_SELECTIONS,
  MAX_COMBAT_SKILL_SELECTIONS,
  MAX_LUCKY_MUTATION_SELECTIONS,
  MAX_NEGATIVE_TRAIT_SELECTIONS,
  MAX_PSYCHIC_POWER_SELECTIONS,
  MAX_PRIMARY_ARCHETYPE_SKILL_SELECTIONS,
  MAX_APOCALYPSE_SPECIAL_ABILITY_SELECTIONS,
  MAX_PRIMARY_ARCHETYPE_SPECIAL_ABILITY_SELECTIONS,
  MAX_SECONDARY_ARCHETYPE_SKILL_SELECTIONS,
  PSYCHIC_POWER_LUCKY_MUTATION,
  type SkillSelectionSource
} from '../../../entities/character';
import type { SkillOption } from '../../../api/core-game-data';
import CharacterSkillPill from '../../atom/character-skill-pill/character-skill-pill';

import './character-creation-step.css';

interface SkillSelectorProps {
  source:
    | 'combat'
    | 'archetype'
    | 'apocalypse'
    | 'primaryArchetypeSpecialAbility'
    | 'apocalypseSpecialAbility'
    | 'luckyMutation'
    | 'psychicPower'
    | 'negativeTrait';
  instructions?: string;
}

type SelectableOption = {
  name: string;
  description?: string;
};

function SkillPillGroup({
  options,
  selectedSkills,
  canSelectSkill,
  source,
  onToggle,
  showProficiency = true
}: {
  options: SelectableOption[];
  selectedSkills: string[];
  canSelectSkill: (skillName: string) => boolean;
  source: SkillSelectionSource;
  onToggle: (skillName: string, source: SkillSelectionSource) => void;
  showProficiency?: boolean;
}) {
  const { character } = useCharacterCreation();

  return (
    <Flex className="skill-selector-tags" wrap gap={8}>
      {options.map((option) => {
        const selected = selectedSkills.includes(option.name);
        const proficiency = showProficiency
          ? (character?.getSkillProficiencyMarker(option.name) ?? null)
          : null;
        return (
          <CharacterSkillPill
            key={option.name}
            name={option.name.trim()}
            description={option.description}
            proficiency={proficiency}
            selected={selected}
            disabled={!canSelectSkill(option.name)}
            onClick={() => onToggle(option.name, source)}
          />
        );
      })}
    </Flex>
  );
}

function toSkillOptions(skills: SkillOption[]): SelectableOption[] {
  return skills.map((skill) => ({ name: skill.name }));
}

export function SkillSelector({ source, instructions }: SkillSelectorProps) {
  const { character, updateSkills } = useCharacterCreation();
  const coreGameData = useCoreGameData();
  const allSkills = coreGameData?.skills ?? [];
  const allSpecialAbilities = coreGameData?.specialAbilities ?? [];
  const luckyMutations = coreGameData?.luckyMutations ?? [];
  const negativeTraits = coreGameData?.negativeTraits ?? [];

  if (source === 'combat') {
    const skills = allSkills.filter((skill) => skill.combat);
    const selectedSkills = character?.combatSkills ?? [];
    const canSelectMore = character?.canSelectMoreCombatSkills ?? false;
    const bonusArchetypeSlots = character?.bonusArchetypeSkillSlots ?? 0;

    return (
      <div>
        {instructions && (
          <Typography.Paragraph style={{ marginBottom: '2rem' }}>
            {instructions}
          </Typography.Paragraph>
        )}
        <Typography.Paragraph className="character-creation-points-remaining">
          Combat skills selected: {selectedSkills.length}/
          {MAX_COMBAT_SKILL_SELECTIONS}
          {bonusArchetypeSlots > 0
            ? ` — ${bonusArchetypeSlots} additional archetype skill${
              bonusArchetypeSlots === 1 ? '' : 's'
            } available`
            : null}
        </Typography.Paragraph>
        <SkillPillGroup
          options={toSkillOptions(skills)}
          selectedSkills={selectedSkills}
          canSelectSkill={(skillName) =>
            selectedSkills.includes(skillName) || canSelectMore
          }
          source="combat"
          onToggle={updateSkills}
        />
      </div>
    );
  }

  if (source === 'apocalypse') {
    const apocalypse = character?.personalApocalypse;
    const apocalypseSkillNames = apocalypse?.skills ?? [];
    // Prefer catalog entries, but keep apocalypse-listed names even if
    // skills.json is missing a row (otherwise options silently disappear).
    const skills = apocalypseSkillNames.map(
      (name) =>
        allSkills.find((skill) => skill.name === name) ?? {
          name,
          baseStat: '',
          combat: false
        }
    );
    const selectedSkill = character?.personalApocalypseSkill;
    const selectedSkills = selectedSkill ? [selectedSkill] : [];

    return (
      <div>
        {instructions && (
          <Typography.Paragraph style={{ marginBottom: '2rem' }}>
            {instructions}
          </Typography.Paragraph>
        )}
        <section className="skill-selector-group">
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            {apocalypse?.name ?? 'Personal apocalypse'}
          </Typography.Title>
          <Typography.Paragraph className="character-creation-points-remaining">
            Apocalypse skills selected: {selectedSkills.length}/
            {MAX_APOCALYPSE_SKILL_SELECTIONS}
          </Typography.Paragraph>
          <SkillPillGroup
            options={toSkillOptions(skills)}
            selectedSkills={selectedSkills}
            canSelectSkill={(skillName) =>
              Boolean(character?.isApocalypseSkillEligible(skillName)) &&
              (selectedSkills.includes(skillName) ||
                Boolean(character?.canSelectMoreApocalypseSkills))
            }
            source="apocalypse"
            onToggle={updateSkills}
          />
        </section>
      </div>
    );
  }

  if (source === 'primaryArchetypeSpecialAbility') {
    const primaryArchetype = character?.primaryArchetype;
    const abilities = allSpecialAbilities.filter(
      (ability) => ability.source === primaryArchetype?.name
    );
    const selectedAbility = character?.primaryArchetypeSpecialAbility;
    const selectedSkills = selectedAbility ? [selectedAbility] : [];

    return (
      <div>
        {instructions && (
          <Typography.Paragraph style={{ marginBottom: '2rem' }}>
            {instructions}
          </Typography.Paragraph>
        )}
        <section className="skill-selector-group">
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            {primaryArchetype?.name ?? 'Primary archetype'}
          </Typography.Title>
          <Typography.Paragraph className="character-creation-points-remaining">
            Special abilities selected: {selectedSkills.length}/
            {MAX_PRIMARY_ARCHETYPE_SPECIAL_ABILITY_SELECTIONS}
          </Typography.Paragraph>
          <SkillPillGroup
            options={abilities.map((ability) => ({
              name: ability.name,
              description: ability.description
            }))}
            selectedSkills={selectedSkills}
            canSelectSkill={(abilityName) =>
              Boolean(
                character?.isPrimaryArchetypeSpecialAbilityEligible(abilityName)
              ) &&
              (selectedSkills.includes(abilityName) ||
                Boolean(
                  character?.canSelectMorePrimaryArchetypeSpecialAbilities
                ))
            }
            source="primaryArchetypeSpecialAbility"
            onToggle={updateSkills}
            showProficiency={false}
          />
        </section>
      </div>
    );
  }

  if (source === 'apocalypseSpecialAbility') {
    const apocalypse = character?.personalApocalypse;
    const abilities = allSpecialAbilities.filter(
      (ability) => ability.source === apocalypse?.name
    );
    const selectedAbility = character?.personalApocalypseSpecialAbility;
    const selectedSkills = selectedAbility ? [selectedAbility] : [];

    return (
      <div>
        {instructions && (
          <Typography.Paragraph style={{ marginBottom: '2rem' }}>
            {instructions}
          </Typography.Paragraph>
        )}
        <section className="skill-selector-group">
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            {apocalypse?.name ?? 'Personal apocalypse'}
          </Typography.Title>
          <Typography.Paragraph className="character-creation-points-remaining">
            Special abilities selected: {selectedSkills.length}/
            {MAX_APOCALYPSE_SPECIAL_ABILITY_SELECTIONS}
          </Typography.Paragraph>
          <SkillPillGroup
            options={abilities.map((ability) => ({
              name: ability.name,
              description: ability.description
            }))}
            selectedSkills={selectedSkills}
            canSelectSkill={(abilityName) =>
              Boolean(
                character?.isApocalypseSpecialAbilityEligible(abilityName)
              ) &&
              (selectedSkills.includes(abilityName) ||
                Boolean(character?.canSelectMoreApocalypseSpecialAbilities))
            }
            source="apocalypseSpecialAbility"
            onToggle={updateSkills}
            showProficiency={false}
          />
        </section>
      </div>
    );
  }

  if (source === 'luckyMutation') {
    const selectedMutation = character?.luckyMutation;
    const selectedSkills = selectedMutation ? [selectedMutation] : [];

    return (
      <div>
        {instructions && (
          <Typography.Paragraph style={{ marginBottom: '2rem' }}>
            {instructions}
          </Typography.Paragraph>
        )}
        <Typography.Paragraph className="character-creation-points-remaining">
          Lucky mutations selected: {selectedSkills.length}/
          {MAX_LUCKY_MUTATION_SELECTIONS}
        </Typography.Paragraph>
        <SkillPillGroup
          options={luckyMutations.map((mutation) => ({
            name: mutation.name,
            description: mutation.description
          }))}
          selectedSkills={selectedSkills}
          canSelectSkill={(mutationName) =>
            Boolean(character?.isLuckyMutationEligible(mutationName)) &&
            (selectedSkills.includes(mutationName) ||
              Boolean(character?.canSelectMoreLuckyMutations))
          }
          source="luckyMutation"
          onToggle={updateSkills}
          showProficiency={false}
        />
      </div>
    );
  }

  if (source === 'psychicPower') {
    const powers =
      luckyMutations.find(
        (mutation) => mutation.name === PSYCHIC_POWER_LUCKY_MUTATION
      )?.powers ?? [];
    const selectedPower = character?.psychicPower;
    const selectedSkills = selectedPower ? [selectedPower] : [];

    return (
      <div>
        {instructions && (
          <Typography.Paragraph style={{ marginBottom: '2rem' }}>
            {instructions}
          </Typography.Paragraph>
        )}
        <Typography.Paragraph className="character-creation-points-remaining">
          Psychic powers selected: {selectedSkills.length}/
          {MAX_PSYCHIC_POWER_SELECTIONS}
        </Typography.Paragraph>
        <SkillPillGroup
          options={powers.map((power) => ({
            name: power.name,
            description: power.description
          }))}
          selectedSkills={selectedSkills}
          canSelectSkill={(powerName) =>
            Boolean(character?.isPsychicPowerEligible(powerName)) &&
            (selectedSkills.includes(powerName) ||
              Boolean(character?.canSelectMorePsychicPowers))
          }
          source="psychicPower"
          onToggle={updateSkills}
          showProficiency={false}
        />
      </div>
    );
  }

  if (source === 'negativeTrait') {
    const selectedTrait = character?.negativeTrait;
    const selectedSkills = selectedTrait ? [selectedTrait] : [];

    return (
      <div>
        {instructions && (
          <Typography.Paragraph style={{ marginBottom: '2rem' }}>
            {instructions}
          </Typography.Paragraph>
        )}
        <Typography.Paragraph className="character-creation-points-remaining">
          Negative traits selected: {selectedSkills.length}/
          {MAX_NEGATIVE_TRAIT_SELECTIONS}
        </Typography.Paragraph>
        <SkillPillGroup
          options={negativeTraits.map((trait) => ({
            name: trait.name,
            description: trait.description
          }))}
          selectedSkills={selectedSkills}
          canSelectSkill={(traitName) =>
            Boolean(character?.isNegativeTraitEligible(traitName)) &&
            (selectedSkills.includes(traitName) ||
              Boolean(character?.canSelectMoreNegativeTraits))
          }
          source="negativeTrait"
          onToggle={updateSkills}
          showProficiency={false}
        />
      </div>
    );
  }

  const primaryArchetype = character?.primaryArchetype;
  const secondaryArchetype = character?.secondaryArchetype;
  const primarySkillNames = primaryArchetype?.skills ?? [];
  const secondarySkillNames = secondaryArchetype?.skills ?? [];
  const primarySkills = allSkills.filter((skill) =>
    primarySkillNames.includes(skill.name)
  );
  const secondarySkills = allSkills.filter((skill) =>
    secondarySkillNames.includes(skill.name)
  );
  const primarySelected = character?.primaryArchetypeSkills ?? [];
  const secondarySelected = character?.secondaryArchetypeSkills ?? [];
  const bonusRemaining = character?.remainingBonusArchetypeSkillSlots ?? 0;

  return (
    <div className="skill-selector-archetype">
      {instructions && (
        <Typography.Paragraph style={{ marginBottom: '2rem' }}>
          {instructions}
        </Typography.Paragraph>
      )}
      {bonusRemaining > 0 && (
        <Typography.Paragraph className="character-creation-points-remaining">
          {bonusRemaining} bonus archetype skill
          {bonusRemaining === 1 ? '' : 's'} available from unused combat slots
        </Typography.Paragraph>
      )}
      <section className="skill-selector-group">
        <Typography.Title level={5} style={{ marginBottom: 0 }}>
          {primaryArchetype?.name ?? 'Primary archetype'}
        </Typography.Title>
        <Typography.Paragraph className="character-creation-points-remaining">
          Primary skills selected: {primarySelected.length}/
          {MAX_PRIMARY_ARCHETYPE_SKILL_SELECTIONS}
        </Typography.Paragraph>
        <SkillPillGroup
          options={toSkillOptions(primarySkills)}
          selectedSkills={primarySelected}
          canSelectSkill={(skillName) =>
            primarySelected.includes(skillName) ||
            Boolean(character?.canSelectMorePrimaryArchetypeSkills)
          }
          source="primaryArchetype"
          onToggle={updateSkills}
        />
      </section>
      <section className="skill-selector-group">
        <Typography.Title level={5} style={{ marginBottom: 0 }}>
          {secondaryArchetype?.name ?? 'Secondary archetype'}
        </Typography.Title>
        <Typography.Paragraph className="character-creation-points-remaining">
          Secondary skills selected: {secondarySelected.length}/
          {MAX_SECONDARY_ARCHETYPE_SKILL_SELECTIONS}
        </Typography.Paragraph>
        <SkillPillGroup
          options={toSkillOptions(secondarySkills)}
          selectedSkills={secondarySelected}
          canSelectSkill={(skillName) =>
            secondarySelected.includes(skillName) ||
            Boolean(character?.canSelectMoreSecondaryArchetypeSkills)
          }
          source="secondaryArchetype"
          onToggle={updateSkills}
        />
      </section>
    </div>
  );
}

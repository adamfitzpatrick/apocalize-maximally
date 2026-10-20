import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import Character, {
  buildSkillProficiencies,
  CreationStage,
  INITIAL_FREE_DEVELOPMENT_POINTS,
  MAX_COMBAT_SKILL_SELECTIONS,
  PSYCHIC_POWER_LUCKY_MUTATION,
  type SkillSelectionSource
} from '../entities/character';
import type { CoreGameData } from '../api/core-game-data';
import { useCoreGameData } from './core-game-data-context';
import { useAuth } from './auth-context';
import {
  CharacterRecord,
  CharacterStats,
  getCharacter,
  saveCharacter
} from '../api/characters';
import { buildCreationConfig } from '../pages/character-creation/creation-config';
import {
  CharacterCreationContext,
  useCharacterCreation
} from './character-creation-context';

export type {
  Step,
  Phase,
  CreationConfigData
} from '../pages/character-creation/creation-types';
export { useCharacterCreation };

type ReadyCoreGameData = NonNullable<ReturnType<typeof useCoreGameData>> & {
  archetypes: NonNullable<CoreGameData['archetypes']>;
  apocalypses: NonNullable<CoreGameData['apocalypses']>;
  ages: NonNullable<CoreGameData['ages']>;
  skills: NonNullable<CoreGameData['skills']>;
  specialAbilities: NonNullable<CoreGameData['specialAbilities']>;
  luckyMutations: NonNullable<CoreGameData['luckyMutations']>;
  negativeTraits: NonNullable<CoreGameData['negativeTraits']>;
  startingGear: NonNullable<CoreGameData['startingGear']>;
};

function isCoreGameDataReady(
  coreGameData: ReturnType<typeof useCoreGameData>
): coreGameData is ReadyCoreGameData {
  return (
    coreGameData !== null &&
    Boolean(
      coreGameData.archetypes &&
        coreGameData.apocalypses &&
        coreGameData.ages &&
        coreGameData.skills &&
        coreGameData.specialAbilities &&
        coreGameData.luckyMutations &&
        coreGameData.negativeTraits &&
        coreGameData.startingGear
    )
  );
}

export function CharacterCreationProvider({
  characterId,
  children
}: {
  characterId: string;
  children: ReactNode;
}) {
  const coreGameData = useCoreGameData();
  const { userId } = useAuth();
  const [character, doSetDraft] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const dataReady = isCoreGameDataReady(coreGameData);

  const setDraft = useCallback(
    (draft: CharacterRecord) => {
      if (!isCoreGameDataReady(coreGameData)) {
        return;
      }
      doSetDraft(new Character(coreGameData, draft));
    },
    [coreGameData]
  );

  const updateCreationStage = useCallback(
    (stage: CreationStage) => {
      if (!isCoreGameDataReady(coreGameData) || !character) {
        return;
      }
      doSetDraft(
        new Character(coreGameData, {
          ...character.characterRecord,
          creationStage: { phase: stage[0], step: stage[1] }
        })
      );
    },
    [character, coreGameData]
  );

  const updateMajorSelection = useCallback(
    (
      target: 'primaryArchetype' | 'secondaryArchetype' | 'personalApocalypse',
      selection: string
    ) => {
      if (!isCoreGameDataReady(coreGameData) || !character) {
        return;
      }
      const nextRecord = {
        ...character.characterRecord,
        [target]: selection
      };
      if (
        target === 'primaryArchetype' &&
        selection !== character.characterRecord.primaryArchetype
      ) {
        nextRecord.primaryArchetypeSpecialAbility = '';
      }
      if (
        target === 'personalApocalypse' &&
        selection !== character.characterRecord.personalApocalypse
      ) {
        nextRecord.personalApocalypseSpecialAbility = '';
      }
      doSetDraft(new Character(coreGameData, nextRecord));
    },
    [character, coreGameData]
  );

  const updateAgeSelection = useCallback(
    (age: number) => {
      if (!isCoreGameDataReady(coreGameData) || !character) {
        return;
      }
      doSetDraft(
        new Character(coreGameData, {
          ...character.characterRecord,
          age: age
        })
      );
    },
    [character, coreGameData]
  );

  const updateInvestedDevelopmentPoints = useCallback(
    (stat: keyof CharacterStats, points: number) => {
      if (!isCoreGameDataReady(coreGameData) || !character) {
        return;
      }
      const invested = {
        ...character.characterRecord.investedDevelopmentPoints
      };
      const pointsInOtherStats = (
        Object.keys(invested) as (keyof CharacterStats)[]
      ).reduce((sum, key) => (key === stat ? sum : sum + invested[key]), 0);
      const maxForStat = INITIAL_FREE_DEVELOPMENT_POINTS - pointsInOtherStats;
      invested[stat] = Math.max(0, Math.min(Math.floor(points), maxForStat));
      doSetDraft(
        new Character(coreGameData, {
          ...character.characterRecord,
          investedDevelopmentPoints: invested
        })
      );
    },
    [character, coreGameData]
  );

  const updateSkills = useCallback(
    (skillName: string, source: SkillSelectionSource) => {
      if (!isCoreGameDataReady(coreGameData) || !character) {
        return;
      }

      if (source === 'combat') {
        const combatSkills = character.combatSkills;
        if (combatSkills.includes(skillName)) {
          const nextRecord = {
            ...character.characterRecord,
            combatSkills: combatSkills.filter((name) => name !== skillName)
          };
          doSetDraft(
            new Character(coreGameData, {
              ...nextRecord,
              skills: buildSkillProficiencies(nextRecord)
            })
          );
          return;
        }
        if (combatSkills.length >= MAX_COMBAT_SKILL_SELECTIONS) {
          return;
        }
        const nextRecord = {
          ...character.characterRecord,
          combatSkills: [...combatSkills, skillName]
        };
        doSetDraft(
          new Character(coreGameData, {
            ...nextRecord,
            skills: buildSkillProficiencies(nextRecord)
          })
        );
        return;
      }

      const primarySelected = [...character.primaryArchetypeSkills];
      const secondarySelected = [...character.secondaryArchetypeSkills];

      if (source === 'primaryArchetype') {
        if (primarySelected.includes(skillName)) {
          const nextRecord = {
            ...character.characterRecord,
            archetypeSkills: {
              primary: primarySelected.filter((name) => name !== skillName),
              secondary: secondarySelected
            }
          };
          doSetDraft(
            new Character(coreGameData, {
              ...nextRecord,
              skills: buildSkillProficiencies(nextRecord)
            })
          );
          return;
        }
        if (!character.canSelectMorePrimaryArchetypeSkills) {
          return;
        }
        if (!(character.primaryArchetype?.skills ?? []).includes(skillName)) {
          return;
        }
        const nextRecord = {
          ...character.characterRecord,
          archetypeSkills: {
            primary: [...primarySelected, skillName],
            secondary: secondarySelected
          }
        };
        doSetDraft(
          new Character(coreGameData, {
            ...nextRecord,
            skills: buildSkillProficiencies(nextRecord)
          })
        );
        return;
      }

      if (source === 'secondaryArchetype') {
        if (secondarySelected.includes(skillName)) {
          const nextRecord = {
            ...character.characterRecord,
            archetypeSkills: {
              primary: primarySelected,
              secondary: secondarySelected.filter((name) => name !== skillName)
            }
          };
          doSetDraft(
            new Character(coreGameData, {
              ...nextRecord,
              skills: buildSkillProficiencies(nextRecord)
            })
          );
          return;
        }
        if (!character.canSelectMoreSecondaryArchetypeSkills) {
          return;
        }
        if (!(character.secondaryArchetype?.skills ?? []).includes(skillName)) {
          return;
        }
        const nextRecord = {
          ...character.characterRecord,
          archetypeSkills: {
            primary: primarySelected,
            secondary: [...secondarySelected, skillName]
          }
        };
        doSetDraft(
          new Character(coreGameData, {
            ...nextRecord,
            skills: buildSkillProficiencies(nextRecord)
          })
        );
        return;
      }

      if (source === 'apocalypse') {
        if (character.personalApocalypseSkill === skillName) {
          const nextRecord = {
            ...character.characterRecord,
            personalApocalypseSkill: ''
          };
          doSetDraft(
            new Character(coreGameData, {
              ...nextRecord,
              skills: buildSkillProficiencies(nextRecord)
            })
          );
          return;
        }
        if (
          !character.canSelectMoreApocalypseSkills ||
          !character.isApocalypseSkillEligible(skillName)
        ) {
          return;
        }
        const nextRecord = {
          ...character.characterRecord,
          personalApocalypseSkill: skillName
        };
        doSetDraft(
          new Character(coreGameData, {
            ...nextRecord,
            skills: buildSkillProficiencies(nextRecord)
          })
        );
        return;
      }

      if (source === 'primaryArchetypeSpecialAbility') {
        if (character.primaryArchetypeSpecialAbility === skillName) {
          doSetDraft(
            new Character(coreGameData, {
              ...character.characterRecord,
              primaryArchetypeSpecialAbility: ''
            })
          );
          return;
        }
        if (
          !character.canSelectMorePrimaryArchetypeSpecialAbilities ||
          !character.isPrimaryArchetypeSpecialAbilityEligible(skillName)
        ) {
          return;
        }
        doSetDraft(
          new Character(coreGameData, {
            ...character.characterRecord,
            primaryArchetypeSpecialAbility: skillName
          })
        );
        return;
      }

      if (source === 'apocalypseSpecialAbility') {
        if (character.personalApocalypseSpecialAbility === skillName) {
          doSetDraft(
            new Character(coreGameData, {
              ...character.characterRecord,
              personalApocalypseSpecialAbility: ''
            })
          );
          return;
        }
        if (
          !character.canSelectMoreApocalypseSpecialAbilities ||
          !character.isApocalypseSpecialAbilityEligible(skillName)
        ) {
          return;
        }
        doSetDraft(
          new Character(coreGameData, {
            ...character.characterRecord,
            personalApocalypseSpecialAbility: skillName
          })
        );
        return;
      }

      if (source === 'luckyMutation') {
        if (character.luckyMutation === skillName) {
          doSetDraft(
            new Character(coreGameData, {
              ...character.characterRecord,
              luckyMutation: '',
              psychicPower: ''
            })
          );
          return;
        }
        if (
          !character.canSelectMoreLuckyMutations ||
          !character.isLuckyMutationEligible(skillName)
        ) {
          return;
        }
        doSetDraft(
          new Character(coreGameData, {
            ...character.characterRecord,
            luckyMutation: skillName,
            psychicPower:
              skillName === PSYCHIC_POWER_LUCKY_MUTATION
                ? character.characterRecord.psychicPower
                : ''
          })
        );
        return;
      }

      if (source === 'psychicPower') {
        if (character.psychicPower === skillName) {
          doSetDraft(
            new Character(coreGameData, {
              ...character.characterRecord,
              psychicPower: ''
            })
          );
          return;
        }
        if (
          !character.canSelectMorePsychicPowers ||
          !character.isPsychicPowerEligible(skillName)
        ) {
          return;
        }
        doSetDraft(
          new Character(coreGameData, {
            ...character.characterRecord,
            psychicPower: skillName
          })
        );
        return;
      }

      if (source === 'negativeTrait') {
        if (character.negativeTrait === skillName) {
          doSetDraft(
            new Character(coreGameData, {
              ...character.characterRecord,
              negativeTrait: ''
            })
          );
          return;
        }
        if (
          !character.canSelectMoreNegativeTraits ||
          !character.isNegativeTraitEligible(skillName)
        ) {
          return;
        }
        doSetDraft(
          new Character(coreGameData, {
            ...character.characterRecord,
            negativeTrait: skillName
          })
        );
      }
    },
    [character, coreGameData]
  );

  useEffect(() => {
    if (!dataReady || !userId || !characterId || !coreGameData) {
      return;
    }

    const gameData = coreGameData;
    let cancelled = false;

    async function loadCharacter() {
      setLoading(true);
      setError('');
      doSetDraft(null);

      try {
        const characterRecord = await getCharacter(userId, characterId);
        if (cancelled) {
          return;
        }
        doSetDraft(new Character(gameData, characterRecord));
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Unable to load character.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCharacter();
    return () => {
      cancelled = true;
    };
    // Reload when the route identity changes or core data first becomes ready.
    // Intentionally omit the coreGameData object identity (new every render).
  }, [
    characterId,
    dataReady,
    userId,
    coreGameData?.archetypes,
    coreGameData?.apocalypses,
    coreGameData?.ages,
    coreGameData?.skills,
    coreGameData?.specialAbilities,
    coreGameData?.luckyMutations,
    coreGameData?.negativeTraits,
    coreGameData?.startingGear
  ]);

  useEffect(() => {
    if (!character) {
      return;
    }
    void saveCharacter(
      character.characterRecord.userId,
      character.characterRecord
    );
  }, [character]);

  const includePsychicPowerStep =
    character?.luckyMutation === PSYCHIC_POWER_LUCKY_MUTATION;

  const creationConfig = useMemo(() => {
    if (!isCoreGameDataReady(coreGameData)) {
      return null;
    }
    return buildCreationConfig(
      coreGameData.archetypes,
      coreGameData.apocalypses,
      coreGameData.ages,
      coreGameData.startingGear,
      includePsychicPowerStep
    );
  }, [coreGameData, dataReady, includePsychicPowerStep]);

  const value = useMemo(
    () => ({
      creationConfig,
      character,
      loading: loading || !dataReady || Boolean(coreGameData?.loading),
      error: error || coreGameData?.error || '',
      setDraft,
      updateCreationStage,
      updateMajorSelection,
      updateAgeSelection,
      updateInvestedDevelopmentPoints,
      updateSkills
    }),
    [
      character,
      coreGameData?.error,
      coreGameData?.loading,
      creationConfig,
      dataReady,
      error,
      loading,
      setDraft,
      updateMajorSelection,
      updateCreationStage,
      updateAgeSelection,
      updateInvestedDevelopmentPoints,
      updateSkills
    ]
  );

  return (
    <CharacterCreationContext.Provider value={value}>
      {children}
    </CharacterCreationContext.Provider>
  );
}

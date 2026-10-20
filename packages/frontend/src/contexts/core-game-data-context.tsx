import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';
import type { ReactNode } from 'react';
import {
  AgeCategory,
  ApocalypseOption,
  ArchetypeOption,
  getCharacterCreationData,
  LuckyMutationOption,
  NegativeTraitOption,
  SkillOption,
  StartingGearOption,
  SpecialAbilityOption,
  type CoreGameData
} from '../api/core-game-data';

interface CoreGameDataContext extends CoreGameData {
  loading: boolean;
  error: string;
}
const CoreGameDataContext =
  createContext<CoreGameDataContext | null>(null);

export function CoreGameDataProvider({ children }: { children: ReactNode }) {
  const [archetypes, setArchetypes] = useState<ArchetypeOption[] | null>(null);
  const [apocalypses, setApocalypses] = useState<ApocalypseOption[] | null>(null);
  const [ages, setAges] = useState<AgeCategory[] | null>(null);
  const [skills, setSkills] = useState<SkillOption[] | null>(null);
  const [specialAbilities, setSpecialAbilities] = useState<SpecialAbilityOption[] | null>(null);
  const [luckyMutations, setLuckyMutations] = useState<LuckyMutationOption[] | null>(null);
  const [negativeTraits, setNegativeTraits] = useState<NegativeTraitOption[] | null>(null);
  const [startingGear, setStartingGear] = useState<StartingGearOption[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const coreGameData = await getCharacterCreationData();
        if (!cancelled) {
          setArchetypes(coreGameData.archetypes);
          setApocalypses(coreGameData.apocalypses);
          setAges(coreGameData.ages);
          setSkills(coreGameData.skills);
          setSpecialAbilities(coreGameData.specialAbilities);
          setLuckyMutations(coreGameData.luckyMutations);
          setNegativeTraits(coreGameData.negativeTraits);
          setStartingGear(coreGameData.startingGear);
        }
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Unable to load core game data.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CoreGameDataContext.Provider value={{ archetypes, apocalypses, ages, skills, specialAbilities, luckyMutations, negativeTraits, startingGear, loading, error }}>
      {children}
    </CoreGameDataContext.Provider>
  );
}

export function useCoreGameData() {
  const context = useContext(CoreGameDataContext);
  if (context === undefined) {
    throw new Error('useCoreGameData must be used within a CoreGameDataProvider.');
  }
  return context;
}

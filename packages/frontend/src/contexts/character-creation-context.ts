import { createContext, useContext } from 'react';
import type Character from '../entities/character';
import type {
  CreationStage,
  SkillSelectionSource
} from '../entities/character';
import type { CharacterRecord, CharacterStats } from '../api/characters';
import type { CreationConfigData } from '../pages/character-creation/creation-types';

export interface CharacterCreationContextValue {
  creationConfig: CreationConfigData | null;
  character: Character | null;
  loading: boolean;
  error: string;
  setDraft: (draft: CharacterRecord) => void;
  updateCreationStage: (stage: CreationStage) => void;
  updateMajorSelection: (
    target: 'primaryArchetype' | 'secondaryArchetype' | 'personalApocalypse',
    selection: string
  ) => void;
  updateAgeSelection: (age: number) => void;
  updateInvestedDevelopmentPoints: (
    stat: keyof CharacterStats,
    points: number
  ) => void;
  updateSkills: (skillName: string, source: SkillSelectionSource) => void;
}

export const CharacterCreationContext =
  createContext<CharacterCreationContextValue | null>(null);

export function useCharacterCreation() {
  const context = useContext(CharacterCreationContext);
  if (!context) {
    throw new Error(
      'useCharacterCreation must be used within a CharacterCreationProvider.'
    );
  }
  return context;
}

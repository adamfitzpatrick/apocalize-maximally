import { getIdToken } from '../auth';
import type { StartingGearOption } from './core-game-data';

export interface CharacterStats {
  str: number;
  for: number;
  agi: number;
  int: number;
  ins: number;
  cha: number;
  fs: number;
  bs: number;
  luck: number;
}

export interface ArchetypeSkillSelections {
  primary: string[];
  secondary: string[];
}

export interface CharacterRecord {
  id: string;
  userId: string;
  creationStage: { phase: number; step: number } | null;
  name?: string;
  physicalDescription?: string;
  background?: string;
  primaryArchetype?: string;
  secondaryArchetype?: string;
  personalApocalypse?: string;
  skills?: Record<string, number>;
  combatSkills?: string[];
  archetypeSkills?: ArchetypeSkillSelections;
  personalApocalypseSkill?: string;
  ageRelatedSkills?: string[];
  primaryArchetypeSpecialAbility?: string;
  personalApocalypseSpecialAbility?: string;
  luckyMutation?: string;
  psychicPower?: string;
  negativeTrait?: string;
  startingArmor?: StartingGearOption;
  startingWeapon?: StartingGearOption;
  startingGear?: StartingGearOption;
  age: number;
  avatar?: string;
  investedDevelopmentPoints: CharacterStats;
  [key: string]: unknown;
}  

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');

function isStartingGearSelection(
  value: unknown,
  category: StartingGearOption['category']
): boolean {
  if (value === undefined) {
    return true;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const gear = value as Record<string, unknown>;
  return (
    typeof gear.name === 'string' &&
    gear.category === category &&
    Array.isArray(gear.items) &&
    gear.items.every((item) => typeof item === 'string')
  );
}

function isCharacterRecord(value: unknown): value is CharacterRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.userId === 'string' &&
    (record.combatSkills === undefined ||
      (Array.isArray(record.combatSkills) &&
        record.combatSkills.every((skill) => typeof skill === 'string'))) &&
    (record.ageRelatedSkills === undefined ||
      (Array.isArray(record.ageRelatedSkills) &&
        record.ageRelatedSkills.every((skill) => typeof skill === 'string') &&
        new Set(record.ageRelatedSkills).size === record.ageRelatedSkills.length)) &&
    (record.archetypeSkills === undefined ||
      (typeof record.archetypeSkills === 'object' &&
        record.archetypeSkills !== null &&
        !Array.isArray(record.archetypeSkills) &&
        ['primary', 'secondary'].every((field) =>
          Array.isArray(
            (record.archetypeSkills as Record<string, unknown>)[field]
          ) &&
          ((record.archetypeSkills as Record<string, unknown>)[field] as unknown[])
            .every((skill) => typeof skill === 'string')
        ))) &&
    isStartingGearSelection(record.startingArmor, 'armor') &&
    isStartingGearSelection(record.startingWeapon, 'weapon') &&
    isStartingGearSelection(record.startingGear, 'gear') &&
    [
      'name',
      'physicalDescription',
      'background',
      'primaryArchetype',
      'secondaryArchetype',
      'personalApocalypse',
      'personalApocalypseSkill',
      'primaryArchetypeSpecialAbility',
      'personalApocalypseSpecialAbility',
      'luckyMutation',
      'psychicPower',
      'negativeTrait',
      'avatar'
    ].every((field) => record[field] === undefined || typeof record[field] === 'string')
  );
}

async function requestCharacterApi(
  userId: string,
  path: string,
  init: RequestInit = {}
): Promise<unknown> {
  if (!apiUrl) {
    throw new Error('Set VITE_API_URL in packages/frontend/.env to use characters.');
  }

  const token = await getIdToken();
  const response = await fetch(
    `${apiUrl}/user/${encodeURIComponent(userId)}${path}`,
    {
      ...init,
      headers: {
        Authorization: token,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers
      }
    }
  );
  if (!response.ok) {
    throw new Error(`Character request failed (${response.status}).`);
  }
  return response.json();
}

export async function getCharacters(userId: string): Promise<CharacterRecord[]> {
  const result = await requestCharacterApi(userId, '/characters');
  if (!Array.isArray(result) || !result.every(isCharacterRecord)) {
    throw new Error('The character list response is invalid.');
  }
  return result;
}

export async function getCharacter(
  userId: string,
  characterId: string
): Promise<CharacterRecord> {
  const result = await requestCharacterApi(
    userId,
    `/character/${encodeURIComponent(characterId)}`
  );
  if (!isCharacterRecord(result)) {
    throw new Error('The character response is invalid.');
  }
  return result;
}

export async function saveCharacter(
  userId: string,
  character: CharacterRecord
): Promise<CharacterRecord> {
  const result = await requestCharacterApi(
    userId,
    `/character/${encodeURIComponent(character.id)}`,
    { method: 'PUT', body: JSON.stringify(character) }
  );
  if (!isCharacterRecord(result)) {
    throw new Error('The saved character response is invalid.');
  }
  return result;
}

export async function createCharacter(userId: string): Promise<CharacterRecord> {
  const character: CharacterRecord = {
    id: crypto.randomUUID(),
    userId,
    creationStage: { phase: 1, step: 1 },
    name: '',
    physicalDescription: '',
    background: '',
    primaryArchetype: '',
    secondaryArchetype: '',
    personalApocalypse: '',
    primaryArchetypeSpecialAbility: '',
    personalApocalypseSpecialAbility: '',
    luckyMutation: '',
    psychicPower: '',
    negativeTrait: '',
    combatSkills: [],
    archetypeSkills: { primary: [], secondary: [] },
    personalApocalypseSkill: '',
    ageRelatedSkills: [],
    investedDevelopmentPoints: {
      str: 0,
      for: 0,
      agi: 0,
      int: 0,
      ins: 0,
      cha: 0,
      fs: 0,
      bs: 0,
      luck: 0
    },
    age: 0,
    skills: {},
    armor: {},
    health: 0,
    infection: 0,
    experience: { total: 0, unused: 0 }
  };
  return saveCharacter(userId, character);
}

import { getIdToken } from '../auth';

export interface StatModifiers {
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

export interface SelectionOption {
  name: string;
  description: string[];
  skills: string[];
  bestStats?: string[];
  commonSkills?: string[];
}

export interface ArchetypeOption extends SelectionOption {
  imageUrl?: string;
  primaryModifiers: StatModifiers;
  secondaryModifiers: StatModifiers;
}

export interface ApocalypseOption extends SelectionOption {
  imageUrl?: string;
  modifiers: StatModifiers;
}

export interface AgeCategory {
  range: string;
  category: string;
  modifiers: StatModifiers;
  skillProf: string;
}

export interface SkillOption {
  name: string;
  baseStat: string;
  combat: boolean;
}

export interface SpecialAbilityOption {
  name: string;
  description: string;
  source: string;
}

export interface PsychicPowerOption {
  name: string;
  description: string;
}

export interface LuckyMutationOption {
  name: string;
  description: string;
  powers?: PsychicPowerOption[];
}

export interface NegativeTraitOption {
  name: string;
  description: string;
}

export type StartingGearCategory = 'armor' | 'weapon' | 'gear';

export interface StartingGearOption {
  name: string;
  category: StartingGearCategory;
  items: string[];
}

export interface CoreGameData {
  archetypes: ArchetypeOption[] | null;
  apocalypses: ApocalypseOption[] | null;
  ages: AgeCategory[] | null;
  skills: SkillOption[] | null;
  specialAbilities: SpecialAbilityOption[] | null;
  luckyMutations: LuckyMutationOption[] | null;
  negativeTraits: NegativeTraitOption[] | null;
  startingGear: StartingGearOption[] | null;
}

export const STATS = [
  { name: 'Strength', short: 'STR' },
  { name: 'Fortitude', short: 'FOR' },
  { name: 'Agility', short: 'AGI' },
  { name: 'Intelligence', short: 'INT' },
  { name: 'Instinct', short: 'INS' },
  { name: 'Charisma', short: 'CHA' },
  { name: 'Fighting Skill', short: 'FS' },
  { name: 'Ballistic Skill', short: 'BS' },
  { name: 'Luck', short: 'LUCK' }
];

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
export const statKeys: (keyof StatModifiers)[] = [
  'str',
  'for',
  'agi',
  'int',
  'ins',
  'cha',
  'fs',
  'bs',
  'luck'
];

function isStringArray(candidate: unknown): candidate is string[] {
  return (
    Array.isArray(candidate) &&
    candidate.every((entry) => typeof entry === 'string')
  );
}

function isStatModifiers(candidate: unknown): candidate is StatModifiers {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    !Array.isArray(candidate) &&
    statKeys.every(
      (key) => typeof (candidate as Record<string, unknown>)[key] === 'number'
    )
  );
}

async function requestCreationData(path: string): Promise<unknown> {
  if (!apiUrl) {
    throw new Error(
      'Set VITE_API_URL in packages/frontend/.env to load character creation data.'
    );
  }

  const token = await getIdToken();
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { Authorization: token }
  });
  if (!response.ok) {
    throw new Error(`Character creation data request failed (${response.status}).`);
  }
  return response.json();
}

function isSelectionOption(value: unknown): value is SelectionOption {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const option = value as Record<string, unknown>;
  const description = option.description;
  return (
    typeof option.name === 'string' &&
    (typeof description === 'string' ||
      (Array.isArray(description) &&
        description.every((paragraph) => typeof paragraph === 'string'))) &&
    isStringArray(option.skills) &&
    (option.bestStats === undefined ||
      isStringArray(option.bestStats)) &&
    (option.commonSkills === undefined ||
      isStringArray(option.commonSkills))
  );
}

function isArchetypeOption(value: unknown): value is ArchetypeOption {
  if (!isSelectionOption(value)) return false;
  const option = value as SelectionOption & Record<string, unknown>;
  return (
    (option.imageUrl === undefined || typeof option.imageUrl === 'string') &&
    isStatModifiers(option.primaryModifiers) &&
    isStatModifiers(option.secondaryModifiers)
  );
}

function isApocalypseOption(value: unknown): value is ApocalypseOption {
  if (!isSelectionOption(value)) return false;
  const option = value as SelectionOption & Record<string, unknown>;
  return (
    (option.imageUrl === undefined || typeof option.imageUrl === 'string') &&
    isStatModifiers(option.modifiers)
  );
}

function isAgeCategory(value: unknown): value is AgeCategory {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const age = value as Record<string, unknown>;
  return (
    typeof age.range === 'string' &&
    typeof age.category === 'string' &&
    typeof age.skillProf === 'string' &&
    isStatModifiers(age.modifiers)
  );
}

function isSkillOption(value: unknown): value is SkillOption {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const skill = value as Record<string, unknown>;
  return (
    typeof skill.name === 'string' &&
    typeof skill.baseStat === 'string' &&
    typeof skill.combat === 'boolean'
  );
}

function isLuckyMutationOption(
  value: unknown
): value is LuckyMutationOption {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const mutation = value as Record<string, unknown>;
  const powers = mutation.powers;
  return (
    typeof mutation.name === 'string' &&
    typeof mutation.description === 'string' &&
    (powers === undefined ||
      (Array.isArray(powers) &&
        powers.every(
          (power) =>
            typeof power === 'object' &&
            power !== null &&
            !Array.isArray(power) &&
            typeof (power as Record<string, unknown>).name === 'string' &&
            typeof (power as Record<string, unknown>).description === 'string'
        )))
  );
}

function isNegativeTraitOption(
  value: unknown
): value is NegativeTraitOption {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const trait = value as Record<string, unknown>;
  return (
    typeof trait.name === 'string' && typeof trait.description === 'string'
  );
}

function isStartingGearOption(value: unknown): value is StartingGearOption {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const gear = value as Record<string, unknown>;
  return (
    typeof gear.name === 'string' &&
    (gear.category === 'armor' ||
      gear.category === 'weapon' ||
      gear.category === 'gear') &&
    Array.isArray(gear.items) &&
    gear.items.every((item) => typeof item === 'string')
  );
}

function isSpecialAbilityOption(
  value: unknown
): value is SpecialAbilityOption {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const ability = value as Record<string, unknown>;
  return (
    typeof ability.name === 'string' &&
    typeof ability.description === 'string' &&
    typeof ability.source === 'string'
  );
}

async function getSelectionOptions<T>(
  path: string,
  validate: (value: unknown) => value is T
): Promise<T[]> {
  const result = await requestCreationData(path);
  if (!Array.isArray(result) || !result.every(validate)) {
    throw new Error(`The ${path.split('/').pop()} response is invalid.`);
  }
  return result;
}

export async function getCharacterCreationData(): Promise<CoreGameData> {
  const [
    archetypes,
    apocalypses,
    ages,
    skills,
    specialAbilities,
    luckyMutations,
    negativeTraits,
    startingGear
  ] = await Promise.all([
    getSelectionOptions('/data/archetypes', isArchetypeOption),
    getSelectionOptions('/data/apocalypses', isApocalypseOption),
    requestCreationData('/data/ages'),
    getSelectionOptions('/data/skills', isSkillOption),
    getSelectionOptions('/data/special-abilities', isSpecialAbilityOption),
    getSelectionOptions('/data/lucky-mutation', isLuckyMutationOption),
    getSelectionOptions('/data/negative-traits', isNegativeTraitOption),
    getSelectionOptions('/data/starting-gear', isStartingGearOption)
  ]);
  if (!Array.isArray(ages) || !ages.every(isAgeCategory)) {
    throw new Error('The ages response is invalid.');
  }
  return {
    archetypes,
    apocalypses,
    ages,
    skills,
    specialAbilities,
    luckyMutations,
    negativeTraits,
    startingGear
  };
}

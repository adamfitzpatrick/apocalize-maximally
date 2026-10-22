import { getIdToken } from '../auth';
import { requireApiUrl } from './api-url';

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
  apocalypseSkill?: boolean;
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

export type StartingGearCategory = 'armor' | 'weapon' | 'gear' | 'ammo';

export interface StartingGearOption {
  slug: string;
  name: string;
  category: StartingGearCategory;
  cp: number;
  description?: string;
  /** Difficulty class letter. Present only on weapons. */
  dc?: string;
  /** Skill used to attack with this weapon. */
  skill?: string;
}

export interface BugOutKitChoice {
  quantity: number;
  options: { slug: string }[];
}

export interface BugOutKitItem {
  slug: string;
  quantity: number;
}

export type BugOutKitEntry = BugOutKitItem | BugOutKitChoice;

export interface BugOutKit {
  slug: string;
  name: string;
  items: BugOutKitEntry[];
}

export interface GearCatalog {
  gear: StartingGearOption[];
  bugOutKits: BugOutKit[];
}

export interface BuildBand {
  min: number;
  max: number;
  dcMod: number;
  foodMod: number;
  contortMod: number;
}

export interface DamageCode {
  degree: number;
  code: string;
  description: string;
  dice: string;
}

export interface OtherRules {
  build: BuildBand[];
  damageCodes: DamageCode[];
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
  bugOutKits: BugOutKit[] | null;
  otherRules: OtherRules | null;
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
  const token = await getIdToken();
  const response = await fetch(
    `${requireApiUrl(
      'Set VITE_API_URL in packages/frontend/.env to load character creation data.'
    )}${path}`,
    { headers: { Authorization: token } }
  );
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
    typeof skill.combat === 'boolean' &&
    (skill.apocalypseSkill === undefined ||
      typeof skill.apocalypseSkill === 'boolean')
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

function isBuildBand(value: unknown): value is BuildBand {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const band = value as Record<string, unknown>;
  return (
    typeof band.min === 'number' &&
    typeof band.max === 'number' &&
    typeof band.dcMod === 'number' &&
    typeof band.foodMod === 'number' &&
    typeof band.contortMod === 'number'
  );
}

function isDamageCode(value: unknown): value is DamageCode {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const code = value as Record<string, unknown>;
  return (
    typeof code.degree === 'number' &&
    typeof code.code === 'string' &&
    typeof code.description === 'string' &&
    typeof code.dice === 'string'
  );
}

function isOtherRules(value: unknown): value is OtherRules {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const rules = value as Record<string, unknown>;
  return (
    Array.isArray(rules.build) &&
    rules.build.every(isBuildBand) &&
    Array.isArray(rules.damageCodes) &&
    rules.damageCodes.every(isDamageCode)
  );
}

function isBugOutKitEntry(value: unknown): value is BugOutKitEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  if (typeof entry.quantity !== 'number') {
    return false;
  }
  if (Array.isArray(entry.options)) {
    return entry.options.every(
      (option) =>
        typeof option === 'object' &&
        option !== null &&
        typeof (option as { slug?: unknown }).slug === 'string'
    );
  }
  return typeof entry.slug === 'string';
}

function isBugOutKit(value: unknown): value is BugOutKit {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const kit = value as Record<string, unknown>;
  return (
    typeof kit.slug === 'string' &&
    typeof kit.name === 'string' &&
    Array.isArray(kit.items) &&
    kit.items.every(isBugOutKitEntry)
  );
}

function isGearCatalog(value: unknown): value is GearCatalog {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const catalog = value as Record<string, unknown>;
  return (
    Array.isArray(catalog.gear) &&
    catalog.gear.every(isStartingGearOption) &&
    Array.isArray(catalog.bugOutKits) &&
    catalog.bugOutKits.every(isBugOutKit)
  );
}

function isStartingGearOption(value: unknown): value is StartingGearOption {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const gear = value as Record<string, unknown>;
  return (
    typeof gear.slug === 'string' &&
    typeof gear.name === 'string' &&
    (gear.category === 'armor' ||
      gear.category === 'weapon' ||
      gear.category === 'gear' ||
      gear.category === 'ammo') &&
    typeof gear.cp === 'number' &&
    (gear.description === undefined || typeof gear.description === 'string') &&
    (gear.dc === undefined ||
      (gear.category === 'weapon' && typeof gear.dc === 'string')) &&
    (gear.skill === undefined ||
      (gear.category === 'weapon' && typeof gear.skill === 'string')) &&
    !('bugOutKit' in gear) &&
    !('items' in gear)
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
    gearCatalog,
    otherRules
  ] = await Promise.all([
    getSelectionOptions('/data/archetypes', isArchetypeOption),
    getSelectionOptions('/data/apocalypses', isApocalypseOption),
    requestCreationData('/data/ages'),
    getSelectionOptions('/data/skills', isSkillOption),
    getSelectionOptions('/data/special-abilities', isSpecialAbilityOption),
    getSelectionOptions('/data/lucky-mutation', isLuckyMutationOption),
    getSelectionOptions('/data/negative-traits', isNegativeTraitOption),
    requestCreationData('/data/gear'),
    requestCreationData('/data/other-rules')
  ]);
  if (!Array.isArray(ages) || !ages.every(isAgeCategory)) {
    throw new Error('The ages response is invalid.');
  }
  if (!isGearCatalog(gearCatalog)) {
    throw new Error('The gear response is invalid.');
  }
  if (!isOtherRules(otherRules)) {
    throw new Error('The other-rules response is invalid.');
  }
  return {
    archetypes,
    apocalypses,
    ages,
    skills,
    specialAbilities,
    luckyMutations,
    negativeTraits,
    startingGear: gearCatalog.gear,
    bugOutKits: gearCatalog.bugOutKits,
    otherRules
  };
}

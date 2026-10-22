import gearCatalogData from '../../../data-management/data/gear.json';
import { getIdToken } from '../auth';
import type { BugOutKit, BugOutKitEntry, StartingGearOption } from './core-game-data';
import { requireApiUrl } from './api-url';

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
  /** True after the player confirms Play Character. Editing is no longer offered. */
  playing?: boolean;
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
  startingGearMethod?: 'bug-out' | 'free-choice';
  /** True when starting gear came from bug-out kits, so those kits can be rebuilt from `gear`. */
  bugOut?: boolean;
  /** Owned gear. Each item is stored on its own, with a CP that can differ from the catalog. */
  gear?: CharacterGearItem[];
  /** Slugs of gear chosen with the free-choice CP budget. */
  freeChoiceGear?: string[];
  /** Player-written equipment rows: name, description, category, CP. */
  customGear?: string[][];
  startingWeapon?: StartingGearOption;
  startingGear?: StartingGearOption;
  age: number;
  avatar?: string;
  /** Current armor points. Starts at the character's maximum armor. */
  currentArmor?: number;
  /** Current hit points. Starts at the character's maximum HP. */
  currentHp?: number;
  /** Checked resolve-damage conditions. */
  resolveDamage?: ResolveDamage;
  /** Selected infection stage, 1 through 6. Absent when none is selected. */
  infectionStage?: number;
  /** Hunger total. Absent until the player enters a value. */
  hunger?: number;
  cp?: number;
  cx?: number;
  unusedXp?: number;
  totalXp?: number;
  investedDevelopmentPoints: CharacterStats;
  [key: string]: unknown;
}  

export interface ResolveDamage {
  unnerved: boolean;
  shaken: boolean;
  insanity: boolean;
}

export interface CharacterGearItem {
  slug: string;
  cp: number;
  equipped: boolean;
}

export type { BugOutKit, BugOutKitChoice, BugOutKitEntry, BugOutKitItem } from './core-game-data';

function isStoredGearItem(
  value: unknown
): value is { slug: string; cp: number; equipped?: boolean } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const gear = value as Record<string, unknown>;
  return (
    typeof gear.slug === 'string' &&
    typeof gear.cp === 'number' &&
    (gear.equipped === undefined || typeof gear.equipped === 'boolean')
  );
}

function isCharacterGearItem(value: unknown): value is CharacterGearItem {
  return (
    isStoredGearItem(value) &&
    typeof (value as { equipped?: unknown }).equipped === 'boolean'
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

/** Expand a bug-out kit into owned items, using the catalog CP as the starting value. */
export function gearItemsFromKit(
  kit: BugOutKit,
  cpBySlug: Map<string, number>
): CharacterGearItem[] {
  const items: CharacterGearItem[] = [];
  for (const entry of kit.items) {
    const slug = 'options' in entry ? entry.options[0]?.slug : entry.slug;
    if (!slug) {
      continue;
    }
    const cp = cpBySlug.get(slug) ?? 0;
    for (let index = 0; index < entry.quantity; index += 1) {
      items.push({ slug, cp, equipped: true });
    }
  }
  return items;
}

const catalogCp = new Map(
  (gearCatalogData as { slug: string; cp: number }[]).map((item) => [item.slug, item.cp])
);

/** Older saves stored whole kits in `gear`. Replace those with their items before validation. */
function migrateStoredGear(value: unknown) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return;
  }
  const record = value as Record<string, unknown>;
  if (
    Array.isArray(record.gear) &&
    record.gear.length > 0 &&
    record.gear.every(isBugOutKit)
  ) {
    record.gear = record.gear.flatMap((kit) => gearItemsFromKit(kit, catalogCp));
    record.bugOut = true;
    record.startingGearMethod = 'bug-out';
  }
  if (record.bugOut === undefined && record.startingGearMethod === 'bug-out') {
    record.bugOut = true;
  }
  if (record.bugOut === undefined && record.startingGearMethod === 'free-choice') {
    record.bugOut = false;
  }
  if (Array.isArray(record.gear)) {
    record.gear = record.gear.map((item) => {
      if (!isStoredGearItem(item) || typeof item.equipped === 'boolean') {
        return item;
      }
      return { ...item, equipped: true };
    });
  }
}

function isCustomGear(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every(
        (row) =>
          Array.isArray(row) &&
          row.length === 4 &&
          row.every((cell) => typeof cell === 'string')
      ))
  );
}

function isFreeChoiceGear(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every((slug) => typeof slug === 'string') &&
      new Set(value).size === value.length)
  );
}

function isGearList(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) && value.every(isCharacterGearItem))
  );
}

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
  const isItem = typeof gear.cp === 'number' && typeof gear.slug === 'string';
  const isLegacyKit =
    Array.isArray(gear.items) &&
    gear.items.every((item) => typeof item === 'string');
  return (
    typeof gear.name === 'string' &&
    gear.category === category &&
    (isItem || isLegacyKit)
  );
}

function isOptionalCount(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === 'number' && Number.isInteger(value) && value >= 0)
  );
}

function isInfectionStage(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 6)
  );
}

function isResolveDamage(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const damage = value as Record<string, unknown>;
  return (
    typeof damage.unnerved === 'boolean' &&
    typeof damage.shaken === 'boolean' &&
    typeof damage.insanity === 'boolean'
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
    (record.startingGearMethod === undefined ||
      record.startingGearMethod === 'bug-out' ||
      record.startingGearMethod === 'free-choice') &&
    (record.bugOut === undefined || typeof record.bugOut === 'boolean') &&
    (record.playing === undefined || typeof record.playing === 'boolean') &&
    (record.currentArmor === undefined || typeof record.currentArmor === 'number') &&
    (record.currentHp === undefined || typeof record.currentHp === 'number') &&
    isResolveDamage(record.resolveDamage) &&
    isInfectionStage(record.infectionStage) &&
    isOptionalCount(record.hunger) &&
    isOptionalCount(record.cp) &&
    isOptionalCount(record.cx) &&
    isOptionalCount(record.unusedXp) &&
    isOptionalCount(record.totalXp) &&
    isGearList(record.gear) &&
    isFreeChoiceGear(record.freeChoiceGear) &&
    isCustomGear(record.customGear) &&
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
  const token = await getIdToken();
  const response = await fetch(
    `${requireApiUrl(
      'Set VITE_API_URL in packages/frontend/.env to use characters.'
    )}/user/${encodeURIComponent(userId)}${path}`,
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
  if (response.status === 204) {
    return undefined;
  }
  const text = await response.text();
  return text ? JSON.parse(text) : undefined;
}

export async function getCharacters(userId: string): Promise<CharacterRecord[]> {
  const result = await requestCharacterApi(userId, '/characters');
  if (Array.isArray(result)) {
    result.forEach(migrateStoredGear);
  }
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
  migrateStoredGear(result);
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

export async function deleteCharacter(
  userId: string,
  characterId: string
): Promise<void> {
  await requestCharacterApi(
    userId,
    `/character/${encodeURIComponent(characterId)}`,
    { method: 'DELETE' }
  );
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

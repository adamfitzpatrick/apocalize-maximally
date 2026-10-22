import { AgeCategory, ApocalypseOption, ArchetypeOption, CoreGameData } from '../api/core-game-data';
import { CharacterRecord, CharacterStats } from '../api/characters';

export type CreationStage = [number, number]

export const INITIAL_FREE_DEVELOPMENT_POINTS = 100;
export const MAX_COMBAT_SKILL_SELECTIONS = 2;
export const MAX_PRIMARY_ARCHETYPE_SKILL_SELECTIONS = 4;
export const MAX_SECONDARY_ARCHETYPE_SKILL_SELECTIONS = 3;
export const MAX_APOCALYPSE_SKILL_SELECTIONS = 1;
export const MAX_PRIMARY_ARCHETYPE_SPECIAL_ABILITY_SELECTIONS = 1;
export const MAX_APOCALYPSE_SPECIAL_ABILITY_SELECTIONS = 1;
export const MAX_LUCKY_MUTATION_SELECTIONS = 1;
export const MAX_PSYCHIC_POWER_SELECTIONS = 1;
export const MAX_NEGATIVE_TRAIT_SELECTIONS = 1;
export const PSYCHIC_POWER_LUCKY_MUTATION = 'Psychic Power';
export const MAX_SKILL_PROFICIENCY_LEVEL = 4;
export const SCIENTIST_ARCHETYPE_NAME = 'The Scientist';

export type SkillSelectionSource =
  | 'combat'
  | 'primaryArchetype'
  | 'secondaryArchetype'
  | 'apocalypse'
  | 'primaryArchetypeSpecialAbility'
  | 'apocalypseSpecialAbility'
  | 'luckyMutation'
  | 'psychicPower'
  | 'negativeTrait';

export type SkillSelectionAction = 'toggle' | 'add' | 'remove';

export type SkillProficiencyMarker = 'P' | 'S' | 'T' | 'M';

const SKILL_PROFICIENCY_MARKERS: SkillProficiencyMarker[] = ['P', 'S', 'T', 'M'];

/** Added to the skill's base stat. Untrained skills use the separate penalty. */
const SKILL_THRESHOLD_MODIFIER: Record<SkillProficiencyMarker, number> = {
  P: 0,
  S: 5,
  T: 10,
  M: 15
};
const UNTRAINED_SKILL_THRESHOLD_MODIFIER = -5;

export function proficiencyLevelToMarker(
  level: number
): SkillProficiencyMarker | null {
  if (level < 1 || level > MAX_SKILL_PROFICIENCY_LEVEL) {
    return null;
  }
  return SKILL_PROFICIENCY_MARKERS[level - 1];
}

/** Proficiency rank is the number of selections across all skill sources. */
export function buildSkillProficiencies(
  record: CharacterRecord
): Record<string, number> {
  const counts: Record<string, number> = {};
  const bump = (skillName: string) => {
    counts[skillName] = Math.min(
      (counts[skillName] ?? 0) + 1,
      MAX_SKILL_PROFICIENCY_LEVEL
    );
  };

  for (const skillName of record.combatSkills ?? []) {
    bump(skillName);
  }
  for (const skillName of record.archetypeSkills?.primary ?? []) {
    bump(skillName);
  }
  for (const skillName of record.archetypeSkills?.secondary ?? []) {
    bump(skillName);
  }
  for (const skillName of record.ageRelatedSkills ?? []) {
    bump(skillName);
  }
  if (record.personalApocalypseSkill) {
    bump(record.personalApocalypseSkill);
  }

  return counts;
}

function isCharacterStat(
  key: string,
  stats: CharacterStats
): key is keyof CharacterStats {
  return Object.prototype.hasOwnProperty.call(stats, key);
}

const INITIAL_BASE_STATS: CharacterStats = {
  str: 25,
  for: 25,
  agi: 25,
  int: 25,
  ins: 25,
  cha: 25,
  fs: 25,
  bs: 25,
  luck: 25
};

export default class Character {
  private readonly coreGameData: CoreGameData;
  private internalCharacterRecord!: CharacterRecord;
  private internalPrimaryArchetype!: ArchetypeOption | null;
  private internalSecondaryArchetype!: ArchetypeOption | null;
  private internalPersonalApocalypse!: ApocalypseOption | null;
  private internalAgeCategory!: AgeCategory | null;

  constructor(coreGameData: CoreGameData, characterRecord: CharacterRecord) {
    if (!(
      coreGameData.archetypes &&
            coreGameData.apocalypses &&
            coreGameData.ages &&
            coreGameData.skills &&
            coreGameData.specialAbilities &&
            coreGameData.luckyMutations &&
            coreGameData.negativeTraits &&
            coreGameData.startingGear
    )) {
      throw new Error('Cannot instantiate Character: missing core game data');
    }
    this.coreGameData = coreGameData;
    this.internalCharacterRecord = characterRecord;
    this.internalPrimaryArchetype = this.getArchetype(this.internalCharacterRecord.primaryArchetype);
    this.internalSecondaryArchetype = this.getArchetype(this.internalCharacterRecord.secondaryArchetype);
    this.internalPersonalApocalypse = coreGameData.apocalypses.find(apocalypse => {
      return apocalypse.name === characterRecord.personalApocalypse
    }) ?? null;
    this.internalAgeCategory = this.getAgeCategory(this.internalCharacterRecord.age);
  }

  get characterRecord() {
    return this.internalCharacterRecord;
  }

  get primaryArchetype() {
    return this.internalPrimaryArchetype;
  }

  get secondaryArchetype() {
    return this.internalSecondaryArchetype;
  }

  get personalApocalypse() {
    return this.internalPersonalApocalypse;
  }

  get ageCategory() {
    return this.internalAgeCategory;
  }

  get combatSkills(): string[] {
    return this.characterRecord.combatSkills ?? [];
  }

  get skillProficiencies(): Record<string, number> {
    return buildSkillProficiencies(this.characterRecord);
  }

  getSkillProficiencyLevel(skillName: string): number {
    return this.skillProficiencies[skillName] ?? 0;
  }

  getSkillProficiencyMarker(skillName: string): SkillProficiencyMarker | null {
    return proficiencyLevelToMarker(this.getSkillProficiencyLevel(skillName));
  }

  /**
   * Proficient (P) skills use their base stat. Untrained skills are 5 lower.
   * S, T, and M add 5, 10, and 15.
   */
  getSkillThreshold(skillName: string): number | null {
    const skill = this.coreGameData.skills?.find((entry) => entry.name === skillName);
    const stats = this.allEffectiveStats;
    if (!skill || !stats || !isCharacterStat(skill.baseStat, stats)) {
      return null;
    }
    const marker = this.getSkillProficiencyMarker(skillName);
    const modifier =
      marker === null
        ? UNTRAINED_SKILL_THRESHOLD_MODIFIER
        : SKILL_THRESHOLD_MODIFIER[marker];
    return stats[skill.baseStat] + modifier;
  }

  get primaryArchetypeSkills(): string[] {
    return this.characterRecord.archetypeSkills?.primary ?? [];
  }

  get secondaryArchetypeSkills(): string[] {
    return this.characterRecord.archetypeSkills?.secondary ?? [];
  }

  get archetypeSkills(): string[] {
    return [...this.primaryArchetypeSkills, ...this.secondaryArchetypeSkills];
  }

  /**
   * Combat skill slots left unused convert into extra archetype skill picks.
   */
  get bonusArchetypeSkillSlots(): number {
    return Math.max(
      0,
      MAX_COMBAT_SKILL_SELECTIONS - this.combatSkills.length
    );
  }

  get remainingBonusArchetypeSkillSlots(): number {
    const primaryOverflow = Math.max(
      0,
      this.primaryArchetypeSkills.length - MAX_PRIMARY_ARCHETYPE_SKILL_SELECTIONS
    );
    const secondaryOverflow = Math.max(
      0,
      this.secondaryArchetypeSkills.length -
        MAX_SECONDARY_ARCHETYPE_SKILL_SELECTIONS
    );
    return Math.max(
      0,
      this.bonusArchetypeSkillSlots - primaryOverflow - secondaryOverflow
    );
  }

  get canSelectMoreCombatSkills(): boolean {
    return this.combatSkills.length < MAX_COMBAT_SKILL_SELECTIONS;
  }

  get maxPrimaryArchetypeSkillSelections(): number {
    return (
      MAX_PRIMARY_ARCHETYPE_SKILL_SELECTIONS +
      this.remainingBonusArchetypeSkillSlots
    );
  }

  get maxSecondaryArchetypeSkillSelections(): number {
    return (
      MAX_SECONDARY_ARCHETYPE_SKILL_SELECTIONS +
      this.remainingBonusArchetypeSkillSlots
    );
  }

  get canSelectMorePrimaryArchetypeSkills(): boolean {
    return (
      this.primaryArchetypeSkills.length <
      MAX_PRIMARY_ARCHETYPE_SKILL_SELECTIONS ||
      this.remainingBonusArchetypeSkillSlots > 0
    );
  }

  get canSelectMoreSecondaryArchetypeSkills(): boolean {
    return (
      this.secondaryArchetypeSkills.length <
      MAX_SECONDARY_ARCHETYPE_SKILL_SELECTIONS ||
      this.remainingBonusArchetypeSkillSlots > 0
    );
  }

  get canSelectMoreArchetypeSkills(): boolean {
    return (
      this.canSelectMorePrimaryArchetypeSkills ||
      this.canSelectMoreSecondaryArchetypeSkills
    );
  }

  get personalApocalypseSkill(): string | null {
    return this.characterRecord.personalApocalypseSkill || null;
  }

  get canSelectMoreApocalypseSkills(): boolean {
    return !this.personalApocalypseSkill;
  }

  get primaryArchetypeSpecialAbility(): string | null {
    return this.characterRecord.primaryArchetypeSpecialAbility || null;
  }

  get canSelectMorePrimaryArchetypeSpecialAbilities(): boolean {
    return !this.primaryArchetypeSpecialAbility;
  }

  isPrimaryArchetypeSpecialAbilityEligible(abilityName: string): boolean {
    if (this.primaryArchetypeSpecialAbility === abilityName) {
      return true;
    }
    const archetypeName = this.primaryArchetype?.name;
    if (!archetypeName || !this.coreGameData.specialAbilities) {
      return false;
    }
    return this.coreGameData.specialAbilities.some(
      (ability) =>
        ability.source === archetypeName &&
        ability.name.trim() === abilityName.trim()
    );
  }

  get personalApocalypseSpecialAbility(): string | null {
    return this.characterRecord.personalApocalypseSpecialAbility || null;
  }

  get canSelectMoreApocalypseSpecialAbilities(): boolean {
    return !this.personalApocalypseSpecialAbility;
  }

  get luckyMutation(): string | null {
    return this.characterRecord.luckyMutation || null;
  }

  get canSelectMoreLuckyMutations(): boolean {
    return !this.luckyMutation;
  }

  isLuckyMutationEligible(mutationName: string): boolean {
    if (this.luckyMutation === mutationName) {
      return true;
    }
    return (this.coreGameData.luckyMutations ?? []).some(
      (mutation) => mutation.name.trim() === mutationName.trim()
    );
  }

  get psychicPower(): string | null {
    return this.characterRecord.psychicPower || null;
  }

  get canSelectMorePsychicPowers(): boolean {
    return (
      this.luckyMutation === PSYCHIC_POWER_LUCKY_MUTATION && !this.psychicPower
    );
  }

  get gear() {
    return this.characterRecord.gear ?? [];
  }

  get startingWeapon() {
    return this.characterRecord.startingWeapon ?? null;
  }

  get startingGear() {
    return this.characterRecord.startingGear ?? null;
  }

  get gearCatalog() {
    return this.coreGameData.startingGear ?? [];
  }

  get bugOutKits() {
    return this.coreGameData.bugOutKits ?? [];
  }

  get carriedGear(): {
    name: string;
    cp: number;
    category: string;
    equipped: boolean;
    skill?: string;
    dc?: string;
  }[] {
    const catalog = new Map(
      this.gearCatalog.map((item) => [
        item.slug,
        {
          name: item.name,
          cp: item.cp,
          category: item.category,
          skill: item.skill,
          dc: item.dc
        }
      ])
    );
    const items: {
      name: string;
      cp: number;
      category: string;
      equipped: boolean;
      skill?: string;
      dc?: string;
    }[] = this.gear.flatMap((owned) => {
      const item = catalog.get(owned.slug);
      if (!item) {
        return [];
      }
      return [{
        name: item.name,
        cp: owned.cp,
        category: item.category,
        equipped: owned.equipped,
        skill: item.skill,
        dc: item.dc
      }];
    });
    for (const slug of this.characterRecord.freeChoiceGear ?? []) {
      const item = catalog.get(slug);
      if (item) {
        items.push({ ...item, equipped: true });
      }
    }
    for (const row of this.characterRecord.customGear ?? []) {
      const [name, description, category, cpText] = row.map((cell) => cell.trim());
      if (name && description && category && /^\d+$/.test(cpText)) {
        items.push({ name, cp: Number(cpText), category, equipped: true });
      }
    }
    for (const item of [this.startingWeapon, this.startingGear]) {
      if (item) {
        items.push({
          name: item.name,
          cp: item.cp,
          category: item.category,
          equipped: true,
          skill: item.skill,
          dc: item.dc
        });
      }
    }
    return items;
  }

  get gearCp(): number {
    return this.carriedGear.reduce((total, item) => total + item.cp, 0);
  }

  get armorMax(): number {
    return this.carriedGear
      .filter((item) => item.category === 'armor' && item.equipped)
      .reduce((total, piece) => total + piece.cp / 3, 0);
  }

  get currentArmor(): number {
    return typeof this.characterRecord.currentArmor === 'number'
      ? this.characterRecord.currentArmor
      : this.armorMax;
  }

  get currentHp(): number {
    return typeof this.characterRecord.currentHp === 'number'
      ? this.characterRecord.currentHp
      : this.hp;
  }

  get negativeTrait(): string | null {
    return this.characterRecord.negativeTrait || null;
  }

  get specialAbilityRows(): { source: string; name: string; effect: string }[] {
    const rows: { source: string; name: string; effect: string }[] = [];
    const abilities = this.coreGameData.specialAbilities ?? [];
    const named = (name: string, source?: string | null) =>
      abilities.find(
        (ability) =>
          ability.name.trim() === name.trim() &&
          (source === undefined || source === null || ability.source === source)
      );

    const archetypeAbility = this.primaryArchetypeSpecialAbility;
    if (archetypeAbility) {
      const match = named(archetypeAbility, this.primaryArchetype?.name);
      rows.push({
        source: match?.source ?? 'Archetype',
        name: archetypeAbility,
        effect: match?.description ?? ''
      });
    }

    const apocalypseAbility = this.personalApocalypseSpecialAbility;
    if (apocalypseAbility) {
      const match = named(apocalypseAbility, this.personalApocalypse?.name);
      rows.push({
        source: match?.source ?? 'Apocalypse',
        name: apocalypseAbility,
        effect: match?.description ?? ''
      });
    }

    const mutationName = this.luckyMutation;
    if (mutationName) {
      const mutation = this.coreGameData.luckyMutations?.find(
        (entry) => entry.name.trim() === mutationName.trim()
      );
      rows.push({
        source: 'Lucky mutation',
        name: mutationName,
        effect: mutation?.description ?? ''
      });
      const powerName = this.psychicPower;
      if (powerName) {
        const power = mutation?.powers?.find(
          (entry) => entry.name.trim() === powerName.trim()
        );
        rows.push({
          source: 'Psychic power',
          name: powerName,
          effect: power?.description ?? ''
        });
      }
    }

    const traitName = this.negativeTrait;
    if (traitName) {
      const trait = this.coreGameData.negativeTraits?.find(
        (entry) => entry.name.trim() === traitName.trim()
      );
      rows.push({
        source: 'Negative trait',
        name: traitName,
        effect: trait?.description ?? ''
      });
    }

    return rows;
  }

  get canSelectMoreNegativeTraits(): boolean {
    return !this.negativeTrait;
  }

  isNegativeTraitEligible(traitName: string): boolean {
    if (this.negativeTrait === traitName) {
      return true;
    }
    return (this.coreGameData.negativeTraits ?? []).some(
      (trait) => trait.name.trim() === traitName.trim()
    );
  }

  isPsychicPowerEligible(powerName: string): boolean {
    if (this.luckyMutation !== PSYCHIC_POWER_LUCKY_MUTATION) {
      return false;
    }
    if (this.psychicPower === powerName) {
      return true;
    }
    const powers =
      this.coreGameData.luckyMutations?.find(
        (mutation) => mutation.name === PSYCHIC_POWER_LUCKY_MUTATION
      )?.powers ?? [];
    return powers.some((power) => power.name.trim() === powerName.trim());
  }

  isApocalypseSpecialAbilityEligible(abilityName: string): boolean {
    if (this.personalApocalypseSpecialAbility === abilityName) {
      return true;
    }
    const apocalypseName = this.personalApocalypse?.name;
    if (!apocalypseName || !this.coreGameData.specialAbilities) {
      return false;
    }
    return this.coreGameData.specialAbilities.some(
      (ability) =>
        ability.source === apocalypseName &&
        ability.name.trim() === abilityName.trim()
    );
  }

  /**
   * Apocalypse picks cannot repeat Age or Archetype skills.
   * Combat skills may be chosen again unless they were also gained from Archetype.
   */
  isApocalypseSkillEligible(skillName: string): boolean {
    if (this.personalApocalypseSkill === skillName) {
      return true;
    }
    if (
      (this.characterRecord.ageRelatedSkills ?? []).includes(skillName) ||
      this.primaryArchetypeSkills.includes(skillName) ||
      this.secondaryArchetypeSkills.includes(skillName)
    ) {
      return false;
    }
    return (this.personalApocalypse?.skills ?? []).includes(skillName);
  }

  get creationStage(): CreationStage | null {
    if (!this.characterRecord.creationStage) {
      return null;
    }

    return [
      this.characterRecord.creationStage.phase,
      this.characterRecord.creationStage.step
    ];
  }

  get availableDevelopmentPoints(): number {
    return INITIAL_FREE_DEVELOPMENT_POINTS - Object.values(this.characterRecord.investedDevelopmentPoints).reduce((sum, value) => sum + value, 0);
  }

  get allEffectiveStats(): CharacterStats | null {
    if (!(
      this.primaryArchetype &&
            this.secondaryArchetype &&
            this.personalApocalypse &&
            this.ageCategory
    )) {
      return null;
    }
    return this.addStatMods(
      INITIAL_BASE_STATS,
      this.primaryArchetype.primaryModifiers,
      this.secondaryArchetype.secondaryModifiers,
      this.personalApocalypse.modifiers,
      this.ageCategory.modifiers,
      this.characterRecord.investedDevelopmentPoints
    );
  }

  get strength(): number {
    return this.allEffectiveStats?.str ?? 0;
  }

  get fortitude(): number {
    return this.allEffectiveStats?.for ?? 0;
  }

  get agility(): number {
    return this.allEffectiveStats?.agi ?? 0;
  }

  get intelligence(): number {
    return this.allEffectiveStats?.int ?? 0;
  }

  get instinct(): number {
    return this.allEffectiveStats?.ins ?? 0;
  }

  get charisma(): number {
    return this.allEffectiveStats?.cha ?? 0;
  }

  get fightingSkill(): number {
    return this.allEffectiveStats?.fs ?? 0;
  }

  get ballisticSkill(): number {
    return this.allEffectiveStats?.bs ?? 0;
  }

  get luck(): number {
    return this.allEffectiveStats?.luck ?? 0;
  }

  get build(): number {
    return this.strength + this.fortitude;
  }

  get dcMod(): number | null {
    const band = this.coreGameData.otherRules?.build.find(
      (entry) => this.build >= entry.min && this.build <= entry.max
    );
    return band?.dcMod ?? null;
  }

  /** Unarmed attacks start at Light (degree 1) and shift by the build DC modifier. */
  get unarmedDamageCode(): string | null {
    if (this.dcMod === null) {
      return null;
    }
    const degree = 1 + this.dcMod;
    return (
      this.coreGameData.otherRules?.damageCodes.find((entry) => entry.degree === degree)
        ?.code ?? null
    );
  }

  get hp(): number {
    return Math.floor(this.build / 5.);
  }

  get initiative(): number {
    return Math.floor((this.agility + this.luck) / 10.);
  }

  get salvage(): number {
    return Math.floor((this.luck + this.instinct) / 2.);
  }

  get resilience(): number {
    return Math.floor(this.build / 2.);
  }

  get resolve(): number {
    return Math.floor((this.intelligence + this.instinct) / 2.);
  }

  get immunity(): number {
    return Math.floor((this.fortitude + this.luck) / 2.);
  }

  get dodge(): number {
    return Math.floor((this.agility + this.instinct) / 2.);
  }

  /** Highest threshold among Blades, Brawl, and Clubs. */
  get parry(): number | null {
    const thresholds = ['Blades', 'Brawl', 'Clubs']
      .map((skill) => this.getSkillThreshold(skill))
      .filter((threshold): threshold is number => threshold !== null);
    if (thresholds.length === 0) {
      return null;
    }
    return Math.max(...thresholds);
  }

  get luckUsePerGame(): number {
    return Math.floor(this.luck / 10.);
  }

  private getArchetype(name?: string) {
    if (!name || !this.coreGameData.archetypes) { return null; }
    return this.coreGameData.archetypes.find(archetype => archetype.name === name) ?? null;
  }

  private getAgeCategory(age: number) {
    return this.coreGameData.ages?.map(category => {
      return {
        category,
        min: Math.min(...this.convertRangeString(category.range)),
        max: Math.max(...this.convertRangeString(category.range))
      }
    }).find(category => category.min <= age && category.max >= age)?.category ?? null;
  }

  private convertRangeString(rangeStr: string) {
    return rangeStr.split('-').map(bound => Number(bound.trim()))
  }

  private addStatMods(baseStats: CharacterStats, ...modifiers: CharacterStats[]): CharacterStats {
    return {
      str: baseStats.str + modifiers.reduce((sum, mod) => sum + mod.str, 0),
      for: baseStats.for + modifiers.reduce((sum, mod) => sum + mod.for, 0),
      agi: baseStats.agi + modifiers.reduce((sum, mod) => sum + mod.agi, 0),
      int: baseStats.int + modifiers.reduce((sum, mod) => sum + mod.int, 0),
      ins: baseStats.ins + modifiers.reduce((sum, mod) => sum + mod.ins, 0),
      cha: baseStats.cha + modifiers.reduce((sum, mod) => sum + mod.cha, 0),
      fs: baseStats.fs + modifiers.reduce((sum, mod) => sum + mod.fs, 0),
      bs: baseStats.bs + modifiers.reduce((sum, mod) => sum + mod.bs, 0),
      luck: baseStats.luck + modifiers.reduce((sum, mod) => sum + mod.luck, 0)
    };
  }
}
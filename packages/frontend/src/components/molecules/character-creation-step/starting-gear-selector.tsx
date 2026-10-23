import { useState } from 'react';
import { Flex, Popconfirm, Segmented, Typography } from 'antd';
import {
  type BugOutKit,
  type BugOutKitEntry,
  type CharacterGearItem,
  type CharacterRecord,
  gearItemsFromKit
} from '../../../api/characters';
import type { StartingGearOption } from '../../../api/core-game-data';
import type Character from '../../../entities/character';
import { useCharacterCreation } from '../../../contexts/character-creation-context';
import { useCoreGameData } from '../../../contexts/core-game-data-context';
import ManualEntry from '../manual-entry/manual-entry';
import Table from '../table/table';

const FREE_CHOICE_CP = 140;
const CUSTOM_GEAR_HEADERS = ['Name', 'Description', 'Category', 'CP'];
const CUSTOM_GEAR_CATEGORIES = ['weapon', 'armor', 'gear'];
const EMPTY_CUSTOM_GEAR_ROW = ['', '', '', ''];

const WEAPON_KIT_SLUGS = new Set([
  'bow-kit',
  'handgun-kit',
  'melee-kit',
  'mixed-kit',
  'rifle-kit',
  'thrower-kit'
]);

function kitCategory(slug: string): 'armor' | 'weapon' | 'gear' {
  if (slug.startsWith('armor-')) {
    return 'armor';
  }
  if (WEAPON_KIT_SLUGS.has(slug)) {
    return 'weapon';
  }
  return 'gear';
}

function formatKitEntry(
  entry: BugOutKitEntry,
  names: Map<string, string>
): string {
  if ('options' in entry) {
    const choice = entry.options
      .map((option) => names.get(option.slug) ?? option.slug)
      .join(' or ');
    return entry.quantity > 1 ? `${choice} ×${entry.quantity}` : choice;
  }
  const name = names.get(entry.slug) ?? entry.slug;
  return entry.quantity > 1 ? `${name} ×${entry.quantity}` : name;
}

type GearMethod = NonNullable<CharacterRecord['startingGearMethod']>;

function clearGearSelections(record: CharacterRecord): CharacterRecord {
  const nextRecord = { ...record };
  delete nextRecord.gear;
  delete nextRecord.bugOut;
  delete nextRecord.freeChoiceGear;
  delete nextRecord.customGear;
  delete nextRecord.startingWeapon;
  delete nextRecord.startingGear;
  return nextRecord;
}

function hasGearSelections(record: CharacterRecord): boolean {
  if ((record.gear ?? []).length > 0 || (record.freeChoiceGear ?? []).length > 0) {
    return true;
  }
  if ((record.customGear ?? []).some((row) => !isBlankCustomGearRow(row))) {
    return true;
  }
  return Boolean(record.startingWeapon || record.startingGear);
}

function slugCounts(items: { slug: string }[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.slug, (counts.get(item.slug) ?? 0) + 1);
  }
  return counts;
}

function containsCounts(
  gear: CharacterGearItem[],
  needed: Map<string, number>
) {
  const have = slugCounts(gear);
  for (const [slug, count] of needed) {
    if ((have.get(slug) ?? 0) < count) {
      return false;
    }
  }
  return true;
}

function removeCounts(
  gear: CharacterGearItem[],
  needed: Map<string, number>
): CharacterGearItem[] {
  const remaining = new Map(needed);
  return gear.filter((item) => {
    const left = remaining.get(item.slug) ?? 0;
    if (left <= 0) {
      return true;
    }
    remaining.set(item.slug, left - 1);
    return false;
  });
}

function selectedKit(
  kits: readonly BugOutKit[],
  gear: CharacterGearItem[] | undefined,
  category: 'armor' | 'weapon' | 'gear',
  cpBySlug: Map<string, number>,
  bugOut: boolean | undefined
): BugOutKit | undefined {
  if (!bugOut) {
    return undefined;
  }
  const matches = kits.filter((kit) => {
    if (kitCategory(kit.slug) !== category) {
      return false;
    }
    return containsCounts(gear ?? [], slugCounts(gearItemsFromKit(kit, cpBySlug)));
  });
  return matches.sort(
    (left, right) =>
      gearItemsFromKit(right, cpBySlug).length -
      gearItemsFromKit(left, cpBySlug).length
  )[0];
}

export function StartingGearMethod() {
  const { character, setDraft } = useCharacterCreation();
  const record = character?.characterRecord;
  const storedMethod = record?.startingGearMethod;
  const method = storedMethod ?? 'bug-out';
  const [pendingMethod, setPendingMethod] = useState<GearMethod | null>(null);

  function applyMethod(next: GearMethod) {
    if (!record) {
      return;
    }
    setDraft({
      ...clearGearSelections(record),
      startingGearMethod: next,
      bugOut: next === 'bug-out'
    });
  }

  function chooseMethod(next: GearMethod) {
    if (!record || next === method) {
      return;
    }
    if (hasGearSelections(record)) {
      setPendingMethod(next);
      return;
    }
    applyMethod(next);
  }

  return (
    <Flex className="starting-gear-selector" vertical gap={16}>
      <Typography.Paragraph style={{ marginBottom: 0 }}>
        Choose a method for selecting your starting gear.
      </Typography.Paragraph>
      <Popconfirm
        title="Your previous gear selections will be reset."
        open={pendingMethod !== null}
        onConfirm={() => {
          if (pendingMethod) {
            applyMethod(pendingMethod);
          }
          setPendingMethod(null);
        }}
        onCancel={() => setPendingMethod(null)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingMethod(null);
          }
        }}
        okText="Reset"
        cancelText="Cancel"
      >
        <div>
          <Segmented
            block
            options={['Bug-Out', 'Free Choice']}
            value={method === 'bug-out' ? 'Bug-Out' : 'Free Choice'}
            onChange={(value) =>
              chooseMethod(value === 'Bug-Out' ? 'bug-out' : 'free-choice')
            }
          />
        </div>
      </Popconfirm>
    </Flex>
  );
}

function gearCpSpent(
  items: StartingGearOption[],
  selectedSlugs: readonly string[]
): number {
  const selected = new Set(selectedSlugs);
  return items.reduce(
    (spent, item) => spent + (selected.has(item.slug) ? item.cp : 0),
    0
  );
}

function customGearCp(row: string[]): number | null {
  const [name, description, category, cpText] = row.map((cell) => cell.trim());
  if (
    !name ||
    !description ||
    !CUSTOM_GEAR_CATEGORIES.includes(category) ||
    !/^\d+$/.test(cpText)
  ) {
    return null;
  }
  return Number(cpText);
}

function isBlankCustomGearRow(row: string[]): boolean {
  return row.every((cell) => cell.trim() === '');
}

export function isFreeChoiceSelectionComplete(character: Character): boolean {
  const rows = character.characterRecord.customGear ?? [];
  const rowsReady = rows.every(
    (row) => isBlankCustomGearRow(row) || customGearCp(row) !== null
  );
  if (!rowsReady) {
    return false;
  }
  const spent =
    gearCpSpent(character.gearCatalog, character.characterRecord.freeChoiceGear ?? []) +
    rows.reduce((total, row) => total + (customGearCp(row) ?? 0), 0);
  return spent <= FREE_CHOICE_CP;
}

export function FreeChoiceGearSelector() {
  const { character, setDraft } = useCharacterCreation();
  const coreGameData = useCoreGameData();
  const record = character?.characterRecord;
  const items = [...(coreGameData?.startingGear ?? [])].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  const selectedSlugs = record?.freeChoiceGear ?? [];
  const selected = new Set(selectedSlugs);
  const customRows = record?.customGear ?? [EMPTY_CUSTOM_GEAR_ROW];
  const customSpent = customRows.reduce(
    (total, row) => total + (customGearCp(row) ?? 0),
    0
  );
  const spent = gearCpSpent(items, selectedSlugs) + customSpent;
  const remaining = FREE_CHOICE_CP - spent;

  function toggleItem(rowIndex: number) {
    if (!record) {
      return;
    }
    const item = items[rowIndex];
    if (!item) {
      return;
    }
    if (selected.has(item.slug)) {
      setDraft({
        ...record,
        freeChoiceGear: selectedSlugs.filter((slug) => slug !== item.slug)
      });
      return;
    }
    if (item.cp > remaining) {
      return;
    }
    setDraft({
      ...record,
      freeChoiceGear: [...selectedSlugs, item.slug]
    });
  }

  return (
    <Flex vertical gap={16}>
      <Typography.Paragraph style={{ marginBottom: 0 }}>
        CP spent: {spent}. CP remaining: {remaining}.
      </Typography.Paragraph>
      <Table
        className="free-choice-gear-table"
        headers={['Name', 'Description', 'CP']}
        rows={items.map((item) => [item.name, item.description ?? '', item.cp])}
        selectedRowIndexes={items.flatMap((item, index) =>
          selected.has(item.slug) ? [index] : []
        )}
        onRowClick={toggleItem}
      />
      <Typography.Paragraph style={{ marginBottom: 0 }}>
        Add your own equipment. Each entry needs a name, description, category, and CP value.
      </Typography.Paragraph>
      <ManualEntry
        columns={CUSTOM_GEAR_HEADERS.length}
        headers={CUSTOM_GEAR_HEADERS}
        columnOptions={[undefined, undefined, CUSTOM_GEAR_CATEGORIES]}
        value={customRows}
        onChange={(rows) => {
          if (!record) {
            return;
          }
          setDraft({
            ...record,
            customGear: rows
          });
        }}
      />
    </Flex>
  );
}

export function StartingGearSelection() {
  const { character } = useCharacterCreation();
  if (character?.characterRecord.startingGearMethod === 'free-choice') {
    return <FreeChoiceGearSelector />;
  }
  return <BugOutKitSelector />;
}

const BUG_OUT_TABLES: {
  caption: string;
  category: 'armor' | 'weapon' | 'gear';
}[] = [
  { caption: 'Armor Kit', category: 'armor' },
  { caption: 'Weapon Kit', category: 'weapon' },
  { caption: 'Gear Kit', category: 'gear' }
];

export function isBugOutSelectionComplete(character: Character): boolean {
  const cpBySlug = new Map(
    character.gearCatalog.map((item) => [item.slug, item.cp])
  );
  return BUG_OUT_TABLES.every((table) =>
    Boolean(
      selectedKit(
        character.bugOutKits,
        character.characterRecord.gear,
        table.category,
        cpBySlug,
        character.characterRecord.bugOut
      )
    )
  );
}

export function BugOutKitSelector() {
  const coreGameData = useCoreGameData();
  const { character, setDraft } = useCharacterCreation();
  const record = character?.characterRecord;
  const catalog = coreGameData?.startingGear ?? [];
  const kits = coreGameData?.bugOutKits ?? [];
  const names = new Map(catalog.map((item) => [item.slug, item.name]));
  const cpBySlug = new Map(catalog.map((item) => [item.slug, item.cp]));

  if (!record || record.startingGearMethod === 'free-choice') {
    return null;
  }

  function selectKit(kit: BugOutKit, category: 'armor' | 'weapon' | 'gear') {
    if (!record) {
      return;
    }
    const previous = selectedKit(kits, record.gear, category, cpBySlug, true);
    const kept = previous
      ? removeCounts(record.gear ?? [], slugCounts(gearItemsFromKit(previous, cpBySlug)))
      : (record.gear ?? []);
    setDraft({
      ...record,
      startingGearMethod: 'bug-out',
      bugOut: true,
      gear: [...kept, ...gearItemsFromKit(kit, cpBySlug)]
    });
  }

  return (
    <Flex className="table-selector" vertical gap={24}>
      <Typography.Paragraph style={{ marginBottom: 0 }}>
        Make one selection from each table.
      </Typography.Paragraph>
      {BUG_OUT_TABLES.map((table) => {
        const data = kits.filter(
          (kit) => kitCategory(kit.slug) === table.category
        );
        const chosen = selectedKit(kits, record.gear, table.category, cpBySlug, record.bugOut);
        const selectedRowIndex = data.findIndex((kit) => kit.slug === chosen?.slug);
        return (
          <Table
            key={table.category}
            className="starting-gear-table"
            caption={table.caption}
            headers={['Name', 'Items']}
            rows={data.map((kit) => [
              kit.name,
              kit.items.map((entry) => formatKitEntry(entry, names)).join(', ')
            ])}
            selectedRowIndex={selectedRowIndex >= 0 ? selectedRowIndex : null}
            onRowClick={(rowIndex) => {
              const kit = data[rowIndex];
              if (kit) {
                selectKit(kit, table.category);
              }
            }}
          />
        );
      })}
    </Flex>
  );
}

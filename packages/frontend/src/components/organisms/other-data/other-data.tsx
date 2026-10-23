import { useState } from 'react';
import { Checkbox, InputNumber, Radio, Segmented, Tooltip, Typography } from 'antd';
import type { ResolveDamage } from '../../../api/characters';
import Table from '../../molecules/table/table';
import type Character from '../../../entities/character';

import './other-data.css';

function displayValue(value?: string | null) {
  return value?.trim() ? value : '—';
}

function inventoryLine(
  name: string,
  description: string,
  quantity: number,
  cp: number
) {
  return {
    name: quantity > 1 ? `${name} ×${quantity}` : name,
    description,
    cp
  };
}

function gearInventory(character: Character) {
  const catalog = new Map(
    character.gearCatalog.map((item) => [
      item.slug,
      { name: item.name, description: item.description ?? '', cp: item.cp }
    ])
  );
  const grouped = new Map<
    string,
    { name: string; description: string; cp: number; quantity: number }
  >();
  for (const item of character.gear) {
    const key = `${item.slug}:${item.cp}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += 1;
    } else {
      const listed = catalog.get(item.slug);
      grouped.set(key, {
        name: listed?.name ?? item.slug,
        description: listed?.description ?? '',
        cp: item.cp,
        quantity: 1
      });
    }
  }
  const rows = [...grouped.values()].map((item) =>
    inventoryLine(item.name, item.description, item.quantity, item.cp)
  );
  for (const slug of character.characterRecord.freeChoiceGear ?? []) {
    const item = catalog.get(slug);
    if (item) {
      rows.push({ name: item.name, description: item.description, cp: item.cp });
    }
  }
  for (const row of character.characterRecord.customGear ?? []) {
    const [name, description, category, cpText] = row.map((cell) => cell.trim());
    if (name && description && category && /^\d+$/.test(cpText)) {
      rows.push({ name, description, cp: Number(cpText) });
    }
  }
  for (const item of [character.startingWeapon, character.startingGear]) {
    if (item) {
      rows.push({
        name: item.name,
        description: item.description ?? '',
        cp: item.cp
      });
    }
  }
  return rows;
}

function GearInventory({ character }: { character: Character }) {
  const rows = gearInventory(character);

  return (
    <div className="other-data__inventory">
      <Typography.Title level={4}>Gear Inventory</Typography.Title>
      <Table
        headers={['Item', 'Characteristic', 'CP']}
        rows={rows.map((row) => [
          row.name,
          <span className="other-data__characteristic" title={row.description}>
            {row.description}
          </span>,
          row.cp
        ])}
      />
    </div>
  );
}

function SpecialAbilities({ character }: { character: Character }) {
  return (
    <div className="other-data__abilities">
      <Typography.Title level={4}>Special abilities</Typography.Title>
      <Table
        headers={['Source', 'Ability Name', 'Effect']}
        rows={character.specialAbilityRows.map((ability) => [
          ability.source,
          ability.name,
          <span className="other-data__characteristic" title={ability.effect}>
            {displayValue(ability.effect)}
          </span>
        ])}
      />
    </div>
  );
}

const RESOLVE_DAMAGE_ROWS: { key: keyof ResolveDamage; label: string }[] = [
  { key: 'unnerved', label: 'Unnerved (disadv on rolls)' },
  { key: 'shaken', label: 'Shaken (-3 initiative)' },
  { key: 'insanity', label: 'Insanity Condition' }
];

const INFECTION_ROWS = [
  { stage: 1, name: 'Incubation' },
  { stage: 2, name: 'Gestation' },
  { stage: 3, name: 'Symptomatic' },
  { stage: 4, name: 'Prodromal' },
  { stage: 5, name: 'Acute' },
  { stage: 6, name: 'Transform/Die' }
];

function CountStat({
  label,
  value,
  onChange
}: {
  label: string;
  value?: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="other-data__stat">
      <Typography.Text>{label}</Typography.Text>
      <InputNumber
        size="small"
        min={0}
        precision={0}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

const HUNGER_TOOLTIP = (
  <>
    <div>1/4 FOR = Starving</div>
    <div>1/2 FOR = Emaciated</div>
    <div>FOR = Dead</div>
  </>
);

function Status({
  character,
  onResolveDamageChange,
  onInfectionChange,
  onHungerChange,
  onCountChange
}: {
  character: Character;
  onResolveDamageChange: (resolveDamage: ResolveDamage) => void;
  onInfectionChange: (infectionStage: number | null) => void;
  onHungerChange: (hunger: number | null) => void;
  onCountChange: (
    field: 'cp' | 'cx' | 'unusedXp' | 'totalXp',
    value: number | null
  ) => void;
}) {
  const damage = character.characterRecord.resolveDamage ?? {
    unnerved: false,
    shaken: false,
    insanity: false
  };
  const infectionStage = character.characterRecord.infectionStage;

  return (
    <div className="other-data__status">
      <div className="other-data__resolve">
        <div className="other-data__resolve-body">
          <Typography.Title level={4}>Resolve DMG</Typography.Title>
          <Table
            headers={[]}
            rows={RESOLVE_DAMAGE_ROWS.map((row) => [
              row.label,
              <Checkbox
                key={row.key}
                checked={damage[row.key]}
                onChange={(event) =>
                  onResolveDamageChange({ ...damage, [row.key]: event.target.checked })
                }
              />
            ])}
          />
        </div>
        <Tooltip title={HUNGER_TOOLTIP}>
          <div className="other-data__hunger">
            <Typography.Text>Hunger</Typography.Text>
            <InputNumber
              size="small"
              min={0}
              precision={0}
              value={character.characterRecord.hunger}
              onChange={onHungerChange}
            />
          </div>
        </Tooltip>
      </div>
      <div className="other-data__tracked">
        <Typography.Title className="other-data__backpack-title" level={4} style={{ marginBottom: 0 }}>
          Backpack
        </Typography.Title>
        <div className="other-data__stat-columns">
          <div className="other-data__stat-column">
            <CountStat
              label="CP"
              value={character.characterRecord.cp}
              onChange={(value) => onCountChange('cp', value)}
            />
            <CountStat
              label="CX"
              value={character.characterRecord.cx}
              onChange={(value) => onCountChange('cx', value)}
            />
          </div>
          <div className="other-data__stat-column">
            <CountStat
              label="Unused XP"
              value={character.characterRecord.unusedXp}
              onChange={(value) => onCountChange('unusedXp', value)}
            />
            <CountStat
              label="Total XP"
              value={character.characterRecord.totalXp}
              onChange={(value) => onCountChange('totalXp', value)}
            />
          </div>
        </div>
        <div
          className={
            character.gearCp > 200 + character.build
              ? 'other-data__encumbrance other-data__encumbrance--over'
              : 'other-data__encumbrance'
          }
        >
          <Typography.Text className="other-data__encumbrance-title" strong>
            Encumbrance
          </Typography.Text>
          <Typography.Text className="other-data__encumbrance-effect">
            -1 Initiative, disadv to dodge, 1/2 move
          </Typography.Text>
          <Typography.Text>Total CP: {character.gearCp}</Typography.Text>
        </div>
      </div>
      <div className="other-data__infection">
        <Typography.Title level={4}>Infection</Typography.Title>
        <Table
          headers={['Stage', 'Infection', '']}
          rows={INFECTION_ROWS.map((row) => [
            row.stage,
            row.name,
            <Radio
              key={row.stage}
              checked={infectionStage === row.stage}
              onClick={() =>
                onInfectionChange(infectionStage === row.stage ? null : row.stage)
              }
            />
          ])}
        />
      </div>
    </div>
  );
}

const OTHER_DATA_VIEWS = ['Inventory', 'Abilities', 'Status'] as const;
type OtherDataView = (typeof OTHER_DATA_VIEWS)[number];

export function OtherData({
  character,
  onResolveDamageChange,
  onInfectionChange,
  onHungerChange,
  onCountChange
}: {
  character: Character;
  onResolveDamageChange: (resolveDamage: ResolveDamage) => void;
  onInfectionChange: (infectionStage: number | null) => void;
  onHungerChange: (hunger: number | null) => void;
  onCountChange: (
    field: 'cp' | 'cx' | 'unusedXp' | 'totalXp',
    value: number | null
  ) => void;
}) {
  const [view, setView] = useState<OtherDataView>('Inventory');

  return (
    <section className="other-data other-data--segment">
      <Segmented
        block
        className="other-data__switch"
        options={[...OTHER_DATA_VIEWS]}
        value={view}
        onChange={(value) => setView(value as OtherDataView)}
      />
      {view === 'Inventory' && <GearInventory character={character} />}
      {view === 'Abilities' && <SpecialAbilities character={character} />}
      {view === 'Status' && (
        <Status
          character={character}
          onResolveDamageChange={onResolveDamageChange}
          onInfectionChange={onInfectionChange}
          onHungerChange={onHungerChange}
          onCountChange={onCountChange}
        />
      )}
    </section>
  );
}

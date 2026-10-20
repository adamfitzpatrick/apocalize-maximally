import { InputNumber, Typography } from 'antd';
import { AgeCategory, type StatModifiers } from '../../../api/core-game-data';
import { useCharacterCreation } from '../../../contexts/character-creation-context';
import Table from '../table/table';

import './character-creation-step.css';

interface AgeSelectorProps {
  ageCategories: AgeCategory[];
}

const ageTableStatKeys: (keyof StatModifiers)[] = [
  'str',
  'for',
  'int',
  'ins',
  'cha',
  'luck'
];

export function AgeSelectionSummary() {
  const { character } = useCharacterCreation();
  const age = character?.characterRecord.age;
  const category = character?.ageCategory?.category;

  if (age == null || !category) {
    return null;
  }

  return (
    <Typography.Title level={5} className="selection-summary" style={{ margin: 0 }}>
      Age {age} — {category}
    </Typography.Title>
  );
}

export default function AgeSelector({ ageCategories }: AgeSelectorProps) {
  const { character, updateAgeSelection } = useCharacterCreation();
  const headers = [
    'Age',
    ...ageTableStatKeys.map((key) => key.toUpperCase()),
    'Skill'
  ];
  const rows = ageCategories.map((ageCategory) => [
    ageCategory.range,
    ageCategory.category,
    ...ageTableStatKeys.map((key) => ageCategory.modifiers[key]),
    ageCategory.skillProf
  ]);

  return (
    <>
      <Table
        caption="Age categories"
        headers={headers}
        rows={rows}
        spanFirstHeaderAcrossTwoColumns
        highlightSignedNumbers
      />
      <label className="character-creation-field">
        Age
        <InputNumber
          min={0}
          value={character?.characterRecord.age}
          onChange={(value) => {
            if (typeof value === 'number') {
              updateAgeSelection(value);
            }
          }}
        />
      </label>
    </>
  );
}

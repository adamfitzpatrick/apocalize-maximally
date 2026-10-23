import { InputNumber, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { AgeCategory, type StatModifiers } from '../../../api/core-game-data';
import { useCharacterCreation } from '../../../contexts/character-creation-context';
import { MAX_CHARACTER_AGE } from '../../../entities/character';
import Table from '../table/table';

import './character-creation-step.css';

interface AgeSelectorProps {
  ageCategories: AgeCategory[];
}

function useNarrowScreen() {
  const [narrow, setNarrow] = useState(() =>
    window.matchMedia('(max-width: 520px)').matches
  );

  useEffect(() => {
    const query = window.matchMedia('(max-width: 520px)');
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return narrow;
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
  const narrow = useNarrowScreen();
  const headers = [
    'Age',
    ...ageTableStatKeys.map((key) => key.toUpperCase()),
    'Skill'
  ];
  const rows = ageCategories.map((ageCategory) => [
    ageCategory.range,
    ...(narrow ? [] : [ageCategory.category]),
    ...ageTableStatKeys.map((key) => ageCategory.modifiers[key]),
    ageCategory.skillProf
  ]);

  return (
    <>
      <Table
        className="age-category-table"
        caption="Age categories"
        headers={headers}
        rows={rows}
        spanFirstHeaderAcrossTwoColumns={!narrow}
        highlightSignedNumbers
      />
      <label className="character-creation-field">
        Age
        <InputNumber
          min={1}
          max={MAX_CHARACTER_AGE}
          value={
            character?.characterRecord.age
              ? character.characterRecord.age
              : null
          }
          onChange={(value) => {
            updateAgeSelection(typeof value === 'number' ? value : 0);
          }}
        />
      </label>
    </>
  );
}

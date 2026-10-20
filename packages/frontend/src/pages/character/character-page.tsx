import { Alert, Button, Flex, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CharacterStat from '../../components/atom/character-stat/character-stat';
import { getCharacter } from '../../api/characters';
import { STATS, type StartingGearOption } from '../../api/core-game-data';
import { useAuth } from '../../contexts/auth-context';
import { useCoreGameData } from '../../contexts/core-game-data-context';
import Character from '../../entities/character';

import './character-page.css';

const BASE_STAT_GETTERS: ((character: Character) => number)[] = [
  (character) => character.strength,
  (character) => character.fortitude,
  (character) => character.agility,
  (character) => character.intelligence,
  (character) => character.instinct,
  (character) => character.charisma,
  (character) => character.fightingSkill,
  (character) => character.ballisticSkill,
  (character) => character.luck
];

const DERIVED_STATS: {
  label: string;
  getValue: (character: Character) => number;
}[] = [
  { label: 'BLD', getValue: (character) => character.build },
  { label: 'HP', getValue: (character) => character.hp },
  { label: 'INIT', getValue: (character) => character.initiative },
  { label: 'SAL', getValue: (character) => character.salvage },
  { label: 'RES', getValue: (character) => character.resilience },
  { label: 'RSV', getValue: (character) => character.resolve },
  { label: 'IMM', getValue: (character) => character.immunity },
  { label: 'DDG', getValue: (character) => character.dodge },
  { label: 'LPG', getValue: (character) => character.luckUsePerGame }
];

function displayValue(value?: string | null) {
  return value?.trim() ? value : '—';
}

function GearSummary({
  label,
  gear
}: {
  label: string;
  gear?: StartingGearOption | null;
}) {
  return (
    <div>
      <Typography.Text strong>
        {label}: {gear?.name ?? '—'}
      </Typography.Text>
      {gear && gear.items.length > 0 && (
        <ul className="character-page__list">
          {gear.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CharacterPage() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const coreGameData = useCoreGameData();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!characterId || !userId || !coreGameData || coreGameData.loading) {
      return;
    }
    if (coreGameData.error) {
      setError(coreGameData.error);
      setLoading(false);
      return;
    }
    if (
      !coreGameData.archetypes ||
      !coreGameData.apocalypses ||
      !coreGameData.ages ||
      !coreGameData.skills ||
      !coreGameData.specialAbilities ||
      !coreGameData.luckyMutations ||
      !coreGameData.negativeTraits ||
      !coreGameData.startingGear
    ) {
      return;
    }

    const gameData = coreGameData;
    let cancelled = false;

    async function loadCharacter() {
      setLoading(true);
      setError('');
      try {
        const record = await getCharacter(userId, characterId!);
        if (!cancelled) {
          setCharacter(new Character(gameData, record));
        }
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error ? reason.message : 'Unable to load character.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCharacter();
    return () => {
      cancelled = true;
    };
  }, [
    characterId,
    userId,
    coreGameData?.loading,
    coreGameData?.error,
    coreGameData?.archetypes,
    coreGameData?.apocalypses,
    coreGameData?.ages,
    coreGameData?.skills,
    coreGameData?.specialAbilities,
    coreGameData?.luckyMutations,
    coreGameData?.negativeTraits,
    coreGameData?.startingGear
  ]);

  if (loading || coreGameData?.loading) {
    return (
      <Flex className="characters-loading" justify="center">
        <Spin size="large" />
      </Flex>
    );
  }

  if (error || !character) {
    return <Alert message={error || 'Unable to load character.'} type="error" showIcon />;
  }

  const record = character.characterRecord;
  const skillNames = Object.keys(character.skillProficiencies).sort((a, b) =>
    a.localeCompare(b)
  );

  return (
    <section className="character-page">
      <Flex justify="space-between" align="center" gap={12} wrap>
        <Button onClick={() => navigate('/')}>Back to characters</Button>
        <Button
          onClick={() =>
            navigate(
              `/character-creation/${encodeURIComponent(record.id)}`
            )
          }
        >
          Continue creation
        </Button>
      </Flex>

      <header>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          {displayValue(record.name)}
        </Typography.Title>
        <Typography.Paragraph className="character-page__meta">
          {displayValue(character.primaryArchetype?.name)} /{' '}
          {displayValue(character.secondaryArchetype?.name)} /{' '}
          {displayValue(character.personalApocalypse?.name)}
          {character.ageCategory
            ? ` — ${character.ageCategory.category} (${record.age})`
            : ''}
        </Typography.Paragraph>
      </header>

      <section>
        <Typography.Title level={4}>Description</Typography.Title>
        <Typography.Paragraph>
          <Typography.Text strong>Physical description: </Typography.Text>
          {displayValue(record.physicalDescription)}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <Typography.Text strong>Background: </Typography.Text>
          {displayValue(record.background)}
        </Typography.Paragraph>
      </section>

      <section>
        <Typography.Title level={4}>Base stats</Typography.Title>
        <Flex className="character-page__stats" wrap gap={12}>
          {STATS.map((stat, index) => (
            <CharacterStat
              key={stat.short}
              label={stat.short}
              value={BASE_STAT_GETTERS[index](character)}
              showDerived
            />
          ))}
        </Flex>
      </section>

      <section>
        <Typography.Title level={4}>Derived stats</Typography.Title>
        <Flex className="character-page__stats" wrap gap={12}>
          {DERIVED_STATS.map((stat) => (
            <CharacterStat
              key={stat.label}
              label={stat.label}
              value={stat.getValue(character)}
              showDerived
            />
          ))}
        </Flex>
      </section>

      <section>
        <Typography.Title level={4}>Skills</Typography.Title>
        {skillNames.length === 0 ? (
          <Typography.Text>—</Typography.Text>
        ) : (
          <ul className="character-page__list">
            {skillNames.map((skillName) => (
              <li key={skillName}>
                {skillName}
                {character.getSkillProficiencyMarker(skillName)
                  ? ` (${character.getSkillProficiencyMarker(skillName)})`
                  : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <Typography.Title level={4}>Special abilities</Typography.Title>
        <Typography.Paragraph>
          Archetype: {displayValue(character.primaryArchetypeSpecialAbility)}
        </Typography.Paragraph>
        <Typography.Paragraph>
          Apocalypse: {displayValue(character.personalApocalypseSpecialAbility)}
        </Typography.Paragraph>
        <Typography.Paragraph>
          Lucky mutation: {displayValue(character.luckyMutation)}
          {character.psychicPower ? ` — ${character.psychicPower}` : ''}
        </Typography.Paragraph>
        <Typography.Paragraph>
          Negative trait: {displayValue(character.negativeTrait)}
        </Typography.Paragraph>
      </section>

      <section>
        <Typography.Title level={4}>Starting gear</Typography.Title>
        <Flex vertical gap={12}>
          <GearSummary label="Armor" gear={character.startingArmor} />
          <GearSummary label="Weapon" gear={character.startingWeapon} />
          <GearSummary label="Gear" gear={character.startingGear} />
        </Flex>
      </section>
    </section>
  );
}

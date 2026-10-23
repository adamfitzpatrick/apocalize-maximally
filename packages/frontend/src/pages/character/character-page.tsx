import { Alert, Button, Descriptions, Flex, Popconfirm, Spin, Typography } from 'antd';
import { ArrowIcon } from '../../components/atom/arrow-icon-button/arrow-icon-button';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BaseStats, BaseStatsMobile } from '../../components/organisms/base-stats/base-stats';
import { Actions, ActionsMobile } from '../../components/organisms/actions/actions';
import { OtherData } from '../../components/organisms/other-data/other-data';
import { SpecialStats, SpecialStatsMobile } from '../../components/organisms/special-stats/special-stats';
import {
  getCharacter,
  saveCharacter,
  type CharacterRecord,
  type ResolveDamage
} from '../../api/characters';
import { useAuth } from '../../contexts/auth-context';
import { useCoreGameData } from '../../contexts/core-game-data-context';
import Character, {
  PSYCHIC_POWER_LUCKY_MUTATION
} from '../../entities/character';
import {
  buildCreationConfig,
  incompleteCreationPath
} from '../character-creation/creation-config';

import './character-page.css';

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
      />
    </svg>
  );
}

function displayValue(value?: string | null) {
  return value?.trim() ? value : '—';
}

function formatAge(age: number, category?: string | null) {
  if (!category?.trim()) {
    return '—';
  }
  return `${age} (${category.toLowerCase()})`;
}

function withoutLeadingThe(name?: string | null) {
  return displayValue(name).replace(/^The\s+/, '');
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
        const loaded = new Character(gameData, record);
        const nextRecord = { ...record };
        if (typeof record.currentHp !== 'number' && loaded.allEffectiveStats) {
          nextRecord.currentHp = loaded.hp;
        }
        if (typeof record.currentArmor !== 'number') {
          nextRecord.currentArmor = loaded.armorMax;
        }
        const seeded =
          nextRecord.currentHp !== record.currentHp ||
          nextRecord.currentArmor !== record.currentArmor;
        if (seeded) {
          await saveCharacter(userId, nextRecord);
        }
        if (!cancelled) {
          setCharacter(new Character(gameData, seeded ? nextRecord : record));
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

  useEffect(() => {
    if (
      !character ||
      !coreGameData ||
      coreGameData.loading ||
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
    const path = incompleteCreationPath(
      character,
      buildCreationConfig(
        coreGameData.archetypes,
        coreGameData.apocalypses,
        coreGameData.ages,
        character.luckyMutation === PSYCHIC_POWER_LUCKY_MUTATION
      )
    );
    if (path) {
      navigate(path, { replace: true });
    }
  }, [
    character,
    coreGameData,
    coreGameData?.loading,
    coreGameData?.archetypes,
    coreGameData?.apocalypses,
    coreGameData?.ages,
    coreGameData?.skills,
    coreGameData?.specialAbilities,
    coreGameData?.luckyMutations,
    coreGameData?.negativeTraits,
    coreGameData?.startingGear,
    navigate
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
  const loadedCharacter = character;

  function persistCurrents(patch: {
    currentArmor?: number;
    currentHp?: number;
    resolveDamage?: ResolveDamage;
    playing?: boolean;
    infectionStage?: number | null;
    hunger?: number | null;
    cp?: number | null;
    cx?: number | null;
    unusedXp?: number | null;
    totalXp?: number | null;
  }) {
    if (!userId || !coreGameData?.startingGear) {
      return;
    }
    const nextRecord: CharacterRecord = { ...loadedCharacter.characterRecord };
    const optionalCounts = [
      'infectionStage',
      'hunger',
      'cp',
      'cx',
      'unusedXp',
      'totalXp'
    ] as const;
    if (patch.currentArmor !== undefined) {
      nextRecord.currentArmor = patch.currentArmor;
    }
    if (patch.currentHp !== undefined) {
      nextRecord.currentHp = patch.currentHp;
    }
    if (patch.resolveDamage !== undefined) {
      nextRecord.resolveDamage = patch.resolveDamage;
    }
    if (patch.playing !== undefined) {
      nextRecord.playing = patch.playing;
    }
    for (const field of optionalCounts) {
      const value = patch[field];
      if (value === null) {
        delete nextRecord[field];
      } else if (value !== undefined) {
        nextRecord[field] = value;
      }
    }
    setCharacter(new Character(coreGameData, nextRecord));
    void saveCharacter(userId, nextRecord);
  }

  return (
    <>
    <section className="character-page character-page--wide">
      <Flex justify="space-between" align="center" gap={12} wrap>
        <Button icon={<ArrowIcon left inline />} onClick={() => navigate('/')}>
          Back
        </Button>
        <Flex gap={8}>
          {!record.playing && (
            <Popconfirm
              title="You will no longer be able to edit this character."
              okText="Play"
              cancelText="Cancel"
              onConfirm={() => persistCurrents({ playing: true })}
            >
              <Button type="primary">Play Character</Button>
            </Popconfirm>
          )}
          {!record.playing && (
            <Button
              aria-label="Edit Character"
              icon={<EditIcon />}
              onClick={() =>
                navigate(
                  `/character-creation/${encodeURIComponent(record.id)}`
                )
              }
            />
          )}
        </Flex>
      </Flex>

      <header>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          {displayValue(record.name)}
        </Typography.Title>
        <Descriptions
          className="character-page__identity"
          column={4}
          layout="vertical"
          size="small"
          colon={false}
          items={[
            {
              key: 'primaryArchetype',
              label: 'Primary archetype',
              children: displayValue(character.primaryArchetype?.name)
            },
            {
              key: 'secondaryArchetype',
              label: 'Secondary archetype',
              children: displayValue(character.secondaryArchetype?.name)
            },
            {
              key: 'personalApocalypse',
              label: 'Personal apocalypse',
              children: displayValue(character.personalApocalypse?.name)
            },
            {
              key: 'age',
              label: 'Age',
              children: formatAge(record.age, character.ageCategory?.category)
            }
          ]}
        />
      </header>

      <BaseStats character={character} skills={coreGameData?.skills} />

      <SpecialStats
        character={character}
        onCurrentArmorChange={(currentArmor) => persistCurrents({ currentArmor })}
        onCurrentHpChange={(currentHp) => persistCurrents({ currentHp })}
      />

      <Actions character={character} />

      <OtherData
        character={character}
        onResolveDamageChange={(resolveDamage) => persistCurrents({ resolveDamage })}
        onInfectionChange={(infectionStage) => persistCurrents({ infectionStage })}
        onHungerChange={(hunger) => persistCurrents({ hunger })}
        onCountChange={(field, value) => persistCurrents({ [field]: value })}
      />
    </section>
    <section className="character-page character-page--phone">
      <Flex justify="space-between" align="center" gap={12} wrap>
        <Button icon={<ArrowIcon left inline />} onClick={() => navigate('/')}>
          Back
        </Button>
        <Flex gap={8}>
          {!record.playing && (
            <Popconfirm
              title="You will no longer be able to edit this character."
              okText="Play"
              cancelText="Cancel"
              onConfirm={() => persistCurrents({ playing: true })}
            >
              <Button type="primary">Play Character</Button>
            </Popconfirm>
          )}
          {!record.playing && (
            <Button
              aria-label="Edit Character"
              icon={<EditIcon />}
              onClick={() =>
                navigate(
                  `/character-creation/${encodeURIComponent(record.id)}`
                )
              }
            />
          )}
        </Flex>
      </Flex>

      <header>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          {displayValue(record.name)}
        </Typography.Title>
        <Flex className="character-page__phone-identity" justify="space-between" gap={8}>
          <span>
            {[
              withoutLeadingThe(character.primaryArchetype?.name),
              withoutLeadingThe(character.secondaryArchetype?.name)
            ]
              .filter((name) => name !== '—')
              .join(' / ') || '—'}
          </span>
          <span>{displayValue(character.personalApocalypse?.name)}</span>
          <span>{formatAge(record.age, character.ageCategory?.category)}</span>
        </Flex>
      </header>

      <BaseStatsMobile character={character} skills={coreGameData?.skills} />

      <SpecialStatsMobile
        character={character}
        onCurrentArmorChange={(currentArmor) => persistCurrents({ currentArmor })}
        onCurrentHpChange={(currentHp) => persistCurrents({ currentHp })}
      />

      <ActionsMobile character={character} />

      <OtherData
        character={character}
        onResolveDamageChange={(resolveDamage) => persistCurrents({ resolveDamage })}
        onInfectionChange={(infectionStage) => persistCurrents({ infectionStage })}
        onHungerChange={(hunger) => persistCurrents({ hunger })}
        onCountChange={(field, value) => persistCurrents({ [field]: value })}
      />
    </section>
    </>
  );
}

import { Alert, Button, Flex, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';
import {
  createCharacter,
  deleteCharacter,
  getCharacters,
  type CharacterRecord
} from '../../api/characters';
import CharacterCard from '../../components/molecules/character-card/character-card';
import type { CharacterCardProps } from '../../components/molecules/character-card/character-card';

const characterCreationFields = [
  'name',
  'primaryArchetype',
  'secondaryArchetype',
  'personalApocalypse',
  'age',
  'investedDevelopmentPoints',
  'skills',
  'armor',
  'health',
  'infection',
  'experience'
];

function getCharacterCreationProgress(character: CharacterRecord): number {
  const completedFields = characterCreationFields.filter((field) => {
    const value = character[field];
    return typeof value === 'string'
      ? value.trim().length > 0
      : value !== undefined && value !== null;
  }).length;

  return Math.round((completedFields / characterCreationFields.length) * 100);
}

export default function CharactersPage() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadCharacters() {
      setLoading(true);
      setError('');
      try {
        const result = await getCharacters(userId);
        if (!cancelled) setCharacters(result);
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error ? reason.message : 'Unable to load characters.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCharacters();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleDeleteCharacter(characterId: string) {
    setError('');
    try {
      await deleteCharacter(userId, characterId);
      setCharacters((current) =>
        current.filter((character) => character.id !== characterId)
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to delete character.'
      );
      throw reason;
    }
  }

  async function handleCreateCharacter() {
    setCreating(true);
    setError('');
    try {
      const character = await createCharacter(userId);
      navigate(`/character-creation/${encodeURIComponent(character.id)}?phase=1&step=1`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to create character.'
      );
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <Flex className="characters-loading" justify="center">
        <Spin size="large" />
      </Flex>
    );
  }

  return (
    <>
      {characters.length > 0 && (
        <Flex className="characters-toolbar" justify="flex-end">
          <Button
            type="primary"
            loading={creating}
            onClick={() => void handleCreateCharacter()}
          >
            Create New Character
          </Button>
        </Flex>
      )}
      {error && (
        <Alert
          className="characters-alert"
          message={error}
          type="error"
          showIcon
        />
      )}
      
      {error ? null : characters.length === 0 ? (
        <Flex className="characters-empty" vertical align="center" gap="middle">
          <Typography.Title level={2}>No characters yet</Typography.Title>
          <Button
            type="primary"
            size="large"
            loading={creating}
            onClick={() => void handleCreateCharacter()}
          >
            Create a character
          </Button>
        </Flex>
      ) : (
        <div className="character-card-grid">
          {characters.map((character) => {
            const characterCard: CharacterCardProps = {
              name: character.name || 'Unnamed character',
              primaryArchetype: character.primaryArchetype,
              secondaryArchetype: character.secondaryArchetype,
              personalApocalypse: character.personalApocalypse,
              avatar: character.avatar,
              creationProgress: getCharacterCreationProgress(character),
              onClick: () =>
                navigate(`/character/${encodeURIComponent(character.id)}`),
              onDelete: () => handleDeleteCharacter(character.id)
            };
            return <CharacterCard key={character.id} {...characterCard} />;
          })}
        </div>
      )}
    </>
  );
}

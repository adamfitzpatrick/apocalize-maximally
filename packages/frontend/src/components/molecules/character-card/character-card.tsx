import { Avatar, Card, Flex, Progress, Typography } from 'antd';
import type { KeyboardEvent } from 'react';
import avatarPlaceholder from './character-avatar-placeholder.svg';
import './character-card.css';

export interface CharacterCardProps {
  name: string;
  primaryArchetype?: string;
  secondaryArchetype?: string;
  personalApocalypse?: string;
  avatar?: string;
  creationProgress: number;
  onClick: () => void;
}

export default function CharacterCard({
  name,
  primaryArchetype,
  secondaryArchetype,
  personalApocalypse,
  avatar,
  creationProgress,
  onClick
}: CharacterCardProps) {
  const progress = Math.min(100, Math.max(0, creationProgress));
  const isReadyToPlay = progress === 100;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <Card
      className="character-card"
      hoverable
      role="link"
      tabIndex={0}
      aria-label={`Open character ${name}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <Flex className="character-card__content" vertical gap="small">
        <Flex align="flex-start" gap="small">
          <Avatar
            className="character-card__avatar"
            src={avatar || avatarPlaceholder}
            alt=""
            shape="square"
            size={64}
          />
          <Flex className="character-card__details" vertical gap={4}>
            <Typography.Title className="character-card__name" level={4}>
              {name}
            </Typography.Title>
            <Typography.Text className="character-card__field">
              {primaryArchetype || '—'}
            </Typography.Text>
            <Typography.Text className="character-card__field">
              {secondaryArchetype || '—'}
            </Typography.Text>
            <Typography.Text className="character-card__field">
              {personalApocalypse || '—'}
            </Typography.Text>
          </Flex>
        </Flex>
        {isReadyToPlay ? (
          <Typography.Text className="character-card__ready">
            Ready to play!
          </Typography.Text>
        ) : (
          <Progress
            className="character-card__progress"
            percent={progress}
            size="small"
            showInfo
            aria-label={`${name} character creation progress`}
          />
        )}
      </Flex>
    </Card>
  );
}

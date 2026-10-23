import { Button, Card, Flex, Input, Popover, Progress, Typography } from 'antd';
import { useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react';
import avatarPlaceholder from './character-avatar-placeholder.svg';
import './character-card.css';

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 6 9 17l-5-5"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12"
      />
    </svg>
  );
}

export interface CharacterCardProps {
  name: string;
  primaryArchetype?: string;
  secondaryArchetype?: string;
  personalApocalypse?: string;
  avatar?: string;
  creationProgress: number;
  onClick: () => void;
  onDelete: () => Promise<void> | void;
}

function CharacterAvatar({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <img
      className="character-card__avatar"
      src={!failed && src ? src : avatarPlaceholder}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}

export default function CharacterCard({
  name,
  primaryArchetype,
  secondaryArchetype,
  personalApocalypse,
  avatar,
  creationProgress,
  onClick,
  onDelete
}: CharacterCardProps) {
  const progress = Math.min(100, Math.max(0, creationProgress));
  const isReadyToPlay = progress === 100;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const nameMatches = typedName === name;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  }

  function stopCardActivation(event: MouseEvent) {
    event.stopPropagation();
  }

  async function confirmDelete() {
    if (!nameMatches) {
      return;
    }
    setDeleting(true);
    try {
      await onDelete();
      setDeleteOpen(false);
      setTypedName('');
    } catch {
      // The characters page reports the failure.
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card
      className="character-card"
      hoverable
      role="link"
      tabIndex={0}
      aria-label={`Open character ${name}`}
      onClick={() => {
        if (deleteOpen) {
          return;
        }
        onClick();
      }}
      onKeyDown={handleKeyDown}
    >
      <Flex
        className="character-card__content"
        vertical
        gap="small"
        style={{ height: '100%' }}
      >
        <Flex align="flex-start" gap="small">
          <CharacterAvatar src={avatar} />
          <Flex className="character-card__details" vertical gap={4}>
            <Typography.Title className="character-card__name" level={5}>
              {name}
            </Typography.Title>
            <Flex
              vertical
              gap={2}
            >
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
          <Flex
            className="character-card__progress-container"
            vertical
            align="flex-end"
            justify="space-between"
          >
            <Popover
              trigger="click"
              open={deleteOpen}
              onOpenChange={(open) => {
                setDeleteOpen(open);
                if (!open) {
                  setTypedName('');
                }
              }}
              title="Delete character"
              content={
                <Flex
                  className="character-card__delete-confirm"
                  vertical
                  gap={8}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Typography.Text>Are you sure?</Typography.Text>
                  <Typography.Text>Type {name} to delete this character.</Typography.Text>
                  <Input
                    value={typedName}
                    aria-label={`Type ${name} to confirm deletion`}
                    onChange={(event) => setTypedName(event.target.value)}
                    onPressEnter={() => void confirmDelete()}
                  />
                  <Button
                    danger
                    type="primary"
                    disabled={!nameMatches}
                    loading={deleting}
                    onClick={() => void confirmDelete()}
                  >
                    Delete
                  </Button>
                </Flex>
              }
            >
              <Button
                className="character-card__delete"
                type="text"
                aria-label={`Delete ${name}`}
                icon={<TrashIcon />}
                onClick={stopCardActivation}
              />
            </Popover>
            <Progress
              className="character-card__progress"
              type='dashboard'
              percent={progress}
              steps={{ count: isReadyToPlay ? 0 : 7, gap: 3 }}
              size={40}
              format={(percent) => (isReadyToPlay ? <CheckIcon /> : `${percent}%`)}
              aria-label={
                isReadyToPlay
                  ? `${name} is ready to play`
                  : `${name} character creation progress`
              }
              railColor='rgba(255, 255, 255, 0.1)'
            />
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}

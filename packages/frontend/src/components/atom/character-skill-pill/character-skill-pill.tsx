import { Button, Flex, Tooltip, Typography } from 'antd';
import classNames from 'classnames';
import type { SkillProficiencyMarker } from '../../../entities/character';

import './character-skill-pill.css';

export interface CharacterSkillPillProps {
  name: string;
  description?: string;
  proficiency?: SkillProficiencyMarker | null;
  selected?: boolean;
  disabled?: boolean;
  /** Already gained earlier. Shown as static text, not a control that rejects a click. */
  unavailable?: boolean;
  displayOnly?: boolean;
  onClick?: () => void;
}

export default function CharacterSkillPill({
  name,
  description,
  proficiency = null,
  selected = false,
  disabled = false,
  unavailable = false,
  displayOnly = false,
  onClick
}: CharacterSkillPillProps) {
  if (displayOnly) { disabled = true; }
  const body = (
    <Flex className="character-skill-pill__content">
      <Typography.Text
        className={classNames(
          'character-skill-pill__proficiency',
          `character-skill-pill__proficiency--${proficiency ?? 'empty'}`,
          { 'character-skill-pill__proficiency--color': selected && !proficiency }
        )}
      >{proficiency}</Typography.Text>
      <Typography.Text className="character-skill-pill__name">{name}</Typography.Text>
    </Flex>
  );
  const pill = unavailable ? (
    <div
      aria-disabled="true"
      className="character-skill-pill character-skill-pill--unavailable"
    >
      {body}
    </div>
  ) : (
    <Button
      aria-pressed={selected}
      className={classNames('character-skill-pill', {
        'character-skill-pill--display-only': displayOnly,
        'character-skill-pill--selected': selected
      })}
      disabled={disabled}
      htmlType="button"
      onClick={onClick}
      size="small"
    >
      {body}
    </Button>
  );

  const tooltip = [
    description,
    unavailable ? 'Already gained from an earlier step.' : undefined
  ]
    .filter(Boolean)
    .join(' ');

  if (!tooltip) {
    return pill;
  }

  return (
    <Tooltip title={tooltip} mouseEnterDelay={0.2}>
      {/* Span keeps tooltips working when the button is disabled. */}
      <span className="character-skill-pill__tooltip-anchor">{pill}</span>
    </Tooltip>
  );
}

{
  /*
  <span
          className={classNames('character-skill-pill__proficiency', {
            'character-skill-pill__proficiency--empty': !proficiency
          })}
          aria-hidden={proficiency ? undefined : true}
          aria-label={
            proficiency === 'P'
              ? 'Proficient'
              : proficiency === 'S'
                ? 'Specialized'
                : proficiency === 'T'
                  ? 'Trained'
                  : proficiency === 'M'
                    ? 'Master'
                    : undefined
          }
        >
          */
}

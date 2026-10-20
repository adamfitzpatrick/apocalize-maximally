import { Button, Tooltip, Typography } from 'antd';
import classNames from 'classnames';
import type { SkillProficiencyMarker } from '../../../entities/character';

import './character-skill-pill.css';

export interface CharacterSkillPillProps {
  name: string;
  description?: string;
  proficiency?: SkillProficiencyMarker | null;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export default function CharacterSkillPill({
  name,
  description,
  proficiency = null,
  selected = false,
  disabled = false,
  onClick
}: CharacterSkillPillProps) {
  const pill = (
    <Button
      aria-pressed={selected}
      className={classNames('character-skill-pill', {
        'character-skill-pill--selected': selected
      })}
      disabled={disabled}
      htmlType="button"
      onClick={onClick}
      size="small"
    >
      {proficiency && (
        <span
          className="character-skill-pill__proficiency"
          aria-label={
            proficiency === 'P'
              ? 'Proficient'
              : proficiency === 'S'
                ? 'Specialized'
                : proficiency === 'T'
                  ? 'Trained'
                  : 'Master'
          }
        >
          {proficiency}
        </span>
      )}
      <Typography.Text>{name}</Typography.Text>
    </Button>
  );

  if (!description) {
    return pill;
  }

  return (
    <Tooltip title={description} mouseEnterDelay={0.2}>
      {/* Span keeps tooltips working when the button is disabled. */}
      <span className="character-skill-pill__tooltip-anchor">{pill}</span>
    </Tooltip>
  );
}

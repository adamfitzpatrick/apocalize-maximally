import { Button, Flex, Typography } from 'antd';
import './skill-name.css';

export type SkillMarker = '' | 'P' | 'S' | 'T' | 'M';

export interface SkillNameProps {
  name: string;
  marker: SkillMarker;
  onMarkerChange?: (marker: SkillMarker) => void;
  selectable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onSelect?: () => void;
}

const proficiencyMarkers: SkillMarker[] = ['', 'P', 'S', 'T', 'M'];

export default function SkillName({
  name,
  marker,
  onMarkerChange,
  selectable = false,
  selected = false,
  disabled = false,
  compact = false,
  onSelect
}: SkillNameProps) {
  function cycleMarker() {
    const currentIndex = proficiencyMarkers.indexOf(marker);
    const nextIndex = (currentIndex + 1) % proficiencyMarkers.length;
    onMarkerChange?.(proficiencyMarkers[nextIndex]);
  }

  if (selectable) {
    return (
      <Button
        aria-pressed={selected}
        className={`skill-name skill-name--selectable${selected ? ' skill-name--selected' : ''}`}
        disabled={disabled}
        htmlType="button"
        onClick={onSelect}
        size="small"
      >
        {marker && (
          <span
            className="skill-name__proficiency"
            aria-label={marker === 'P' ? 'Proficient' : marker === 'S' ? 'Specialized' : marker}
          >
            {marker}
          </span>
        )}
        <Typography.Text>{name}</Typography.Text>
      </Button>
    );
  }

  if (compact) {
    return (
      <span className="skill-name skill-name--compact">
        {marker && (
          <span
            className="skill-name__proficiency"
            aria-label={marker === 'P' ? 'Proficient' : marker === 'S' ? 'Specialized' : marker}
          >
            {marker}
          </span>
        )}
        <Typography.Text>{name}</Typography.Text>
      </span>
    );
  }

  return (
    <Flex className="skill-name" align="center" gap="small">
      <Button
        aria-label={`${name} proficiency: ${marker || 'none'}. Activate to change.`}
        className="skill-name__marker"
        htmlType="button"
        onClick={cycleMarker}
        size="small"
      >
        {marker}
      </Button>
      <Typography.Text>{name}</Typography.Text>
    </Flex>
  );
}

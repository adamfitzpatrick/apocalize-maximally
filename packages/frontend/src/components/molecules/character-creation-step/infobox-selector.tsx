import {
  ApocalypseOption,
  ArchetypeOption,
  StatModifiers
} from '../../../api/core-game-data';
import Infobox from '../infobox/infobox';
import { useCharacterCreation } from '../../../contexts/character-creation-context';
import { useState } from 'react';
import { Button, Typography } from 'antd';

import './character-creation-step.css';

type MajorChoiceTarget =
  | 'primaryArchetype'
  | 'secondaryArchetype'
  | 'personalApocalypse';

interface MajorChoiceSelectorSummaryProps {
  target: MajorChoiceTarget;
}

interface MajorChoiceSelectorProps extends MajorChoiceSelectorSummaryProps {
  data: (ArchetypeOption | ApocalypseOption)[];
  displayOnly?: boolean;
}

function getModifiers(
  datum: ArchetypeOption | ApocalypseOption,
  target: MajorChoiceTarget
): StatModifiers {
  switch (target) {
    case 'primaryArchetype':
      return (datum as ArchetypeOption).primaryModifiers;
    case 'secondaryArchetype':
      return (datum as ArchetypeOption).secondaryModifiers;
    case 'personalApocalypse':
      return (datum as ApocalypseOption).modifiers;
  }
}

export function MajorChoiceSelectorSummary({ target }: MajorChoiceSelectorSummaryProps) {
  const { character } = useCharacterCreation();
  const selected = character?.[target];
  return (
    <Typography.Title level={5} className="selection-summary" style={{ margin: 0 }}>
      {selected?.name}
    </Typography.Title>
  );
}

export function MajorChoiceSelector({
  data,
  target,
  displayOnly = false
}: MajorChoiceSelectorProps) {
  const { character, updateMajorSelection } = useCharacterCreation();
  const [expanded, setExpanded] = useState<boolean[]>(data.map(() => false));

  if (!character) {
    return null;
  }
  const selected = character[target];

  function doSetSelection(name: string) {
    setExpanded(expanded.map(() => false));
    updateMajorSelection(target, name);
  }

  function expandHandler(index: number) {
    if (selected || displayOnly) {
      return;
    }
    setExpanded(
      expanded.map((value, expandedIndex) => {
        if (index === expandedIndex) {
          return !value;
        }
        return value;
      })
    );
  }

  function getChangeButton() {
    if (!selected || displayOnly) {
      return null;
    }
    const targetFirstWord =
      target[0].toUpperCase() + target.slice(1).split('A')[0];
    const targetSecondWord = target.slice(1).split(/(A)/).slice(1).join('');
    return (
      <div>
        <Button onClick={() => updateMajorSelection(target, '')}>
          Change {targetFirstWord} {targetSecondWord}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div>
        {data.map((datum, index) => {
          if (selected && selected.name !== datum.name) {
            return null;
          }
          return (
            <Infobox
              size={displayOnly ? 'small' : 'normal'}
              key={datum.name}
              expanded={expanded[index]}
              selected={!displayOnly && datum.name === selected?.name}
              title={datum.name}
              imageUrl={datum.imageUrl}
              description={datum.description as string[]}
              highlightedFeatures={target === 'personalApocalypse' ? undefined : [
                {
                  name: 'Best Stats',
                  description: datum.bestStats?.join(', ') ?? ''
                },
                {
                  name: 'Common Skills',
                  description: datum.commonSkills?.join(', ') ?? ''
                }
              ]}
              modifiers={getModifiers(datum, target)}
              buttonLabel="Select Option"
              buttonHandler={() => doSetSelection(datum.name)}
              expandHandler={() => expandHandler(index)}
            />
          );
        })}
      </div>
      {getChangeButton()}
    </>
  );
}

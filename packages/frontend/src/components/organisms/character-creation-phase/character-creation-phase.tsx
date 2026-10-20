import { Button, Card, Flex } from 'antd';
import CharacterCreationStep from '../../molecules/character-creation-step/character-creation-step';
import { MouseEventHandler } from 'react';
import { CreationStage } from '../../../entities/character';
import { Step } from '../../../pages/character-creation/creation-types';

interface CharacterCreationPhaseProps {
  creationStage: CreationStage | null;
  title: string;
  phase: number;
  phaseCount: number;
  steps: Step[];
  advance: MouseEventHandler<HTMLButtonElement>;
  disableAdvance: boolean;
  goBack: MouseEventHandler<HTMLButtonElement>;
  disableGoBack: boolean;
}

export function CharacterCreationPhase({
  creationStage,
  title,
  phase,
  phaseCount,
  steps,
  advance,
  disableAdvance,
  goBack,
  disableGoBack
}: CharacterCreationPhaseProps) {
  if (!creationStage) { return null; }
  const isFinalStep =
    phase === phaseCount && creationStage[1] === steps.length;
  return (
    <Card
      className="character-creation-phase-card"
      title={`Phase ${phase} of ${phaseCount}: ${title}`}
    >
      {steps.map((step, index) => (
        <CharacterCreationStep
          key={step.title}
          title={step.title}
          step={index + 1}
          stepCount={steps.length}
          collapsed={!(creationStage && creationStage[1] === index + 1)}
        >
          { index + 1 === creationStage[1] ? step.fullComponent : step.collapsedComponent }
        </CharacterCreationStep>
      ))}

      <Flex className="character-creation-navigation" justify="space-between">
        <Button onClick={goBack} disabled={disableGoBack}>
          Back
        </Button>
        <Button
          type="primary"
          onClick={advance}
          disabled={disableAdvance}
        >
          {isFinalStep ? 'Finish' : 'Next'}
        </Button>
      </Flex>
    </Card>
  )
}
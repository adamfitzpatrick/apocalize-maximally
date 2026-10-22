import { Card } from 'antd';
import CharacterCreationStep from '../../molecules/character-creation-step/character-creation-step';
import ArrowIconButton from '../../atom/arrow-icon-button/arrow-icon-button';
import { MouseEventHandler } from 'react';
import type Character from '../../../entities/character';
import type { CreationStage } from '../../../entities/character';
import { Step } from '../../../pages/character-creation/creation-types';

import './character-creation-phase.css';

interface CharacterCreationPhaseProps {
  character: Character;
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
  character,
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
  const currentStep = creationStage[1];
  const isFinalStep = phase === phaseCount && currentStep === steps.length;
  return (
    <div className="character-creation-phase-frame">
      <ArrowIconButton
        className="character-creation-phase-nav character-creation-phase-nav--back"
        left
        aria-label="Back"
        disabled={disableGoBack}
        onClick={goBack}
      />
      <Card
        className="character-creation-phase-card"
        title={`Phase ${phase} of ${phaseCount}: ${title}`}
      >
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCurrentStep = stepNumber === currentStep;
        if (stepNumber > currentStep && !step.isComplete(character)) {
          return null;
        }

        return (
          <CharacterCreationStep
            key={step.title}
            title={step.title}
            step={stepNumber}
            stepCount={steps.length}
            collapsed={!isCurrentStep}
          >
            {isCurrentStep ? step.fullComponent : step.collapsedComponent}
          </CharacterCreationStep>
        );
      })}

      </Card>
      <ArrowIconButton
        className="character-creation-phase-nav character-creation-phase-nav--next"
        aria-label={isFinalStep ? 'Finish' : 'Next'}
        disabled={disableAdvance}
        onClick={advance}
      />
    </div>
  )
}
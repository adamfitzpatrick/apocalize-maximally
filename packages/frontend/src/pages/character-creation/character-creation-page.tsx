import { Alert, Button, Flex, Spin } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreationStage } from '../../entities/character';
import { CharacterCreationPhase } from '../../components/organisms/character-creation-phase/character-creation-phase';
import { useCharacterCreation } from '../../contexts/character-creation-provider';

const phaseFallback = 1;
const stepFallback = 1;

export default function CharacterCreation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    creationConfig: config,
    character: draft,
    loading,
    error,
    updateCreationStage
  } = useCharacterCreation();

  const [stage, setStage] = useState<CreationStage | null>(null);
  const [cannotAdvance, setCannotAdvance] = useState(true);

  function isValidCreationStage(candidate: CreationStage | null): boolean {
    if (
      !candidate ||
      !Number.isInteger(candidate[0]) ||
      !Number.isInteger(candidate[1]) ||
      candidate[0] < 1 ||
      candidate[1] < 1
    ) {
      return false;
    }

    const phase = config?.phases[candidate[0] - 1];
    return Boolean(phase?.steps[candidate[1] - 1]);
  }

  function readCreationStage(): CreationStage {
    const urlPhase = Number(searchParams.get('phase'));
    const urlStep = Number(searchParams.get('step'));
    const urlStage: CreationStage = [urlPhase, urlStep];
    if (
      searchParams.has('phase') &&
      searchParams.has('step') &&
      isValidCreationStage(urlStage)
    ) {
      return urlStage;
    }

    if (draft && isValidCreationStage(draft.creationStage)) {
      return draft.creationStage as CreationStage;
    }

    return [phaseFallback, stepFallback];
  }

  useEffect(() => {
    if (!draft) {
      setStage(null);
      return;
    }
    if (!config || stage !== null) {
      return;
    }

    const characterStage = readCreationStage();
    setStage(characterStage);
  }, [config, draft, stage, searchParams]);

  const updateButtons = useCallback(() => {
    if (!draft || !stage || !config) {
      setCannotAdvance(true);
      return;
    }
    const phase = config.phases[stage[0] - 1];
    const step = phase?.steps[stage[1] - 1];
    setCannotAdvance(!step || !step.isComplete(draft));
  }, [config, draft, stage]);

  useEffect(() => {
    updateButtons();
  }, [updateButtons]);

  const phaseCount = config?.phases.length ?? 0;

  function advance() {
    if (!stage || !config || !draft) {
      return;
    }
    const phase = config.phases[stage[0] - 1];
    const isFinalStep =
      stage[0] === config.phases.length && stage[1] === phase.steps.length;
    if (isFinalStep) {
      navigate(`/character/${encodeURIComponent(draft.characterRecord.id)}`);
      return;
    }
    const newStage = [...stage] as CreationStage;
    if (stage[1] === phase.steps.length) {
      newStage[0]++;
      newStage[1] = 1;
    } else {
      newStage[1]++;
    }
    setStage(newStage);
    updateCreationStage(newStage);
  }

  function goBack() {
    if (!draft || !stage || !config) {
      return;
    }
    const newStage = [...stage] as CreationStage;
    if (stage[0] === 1 && stage[1] === 1) {
      return;
    }
    if (stage[1] === 1) {
      newStage[0]--;
      newStage[1] = config.phases[newStage[0] - 1].steps.length;
    } else {
      newStage[1]--;
    }
    setStage(newStage);
    updateCreationStage(newStage);
  }

  function disableGoBack() {
    if (!draft || !stage) {
      return true;
    }
    return stage[0] === 1 && stage[1] === 1;
  }

  useEffect(() => {
    if (!stage || !config) {
      return;
    }
    const phaseSteps = config.phases[stage[0] - 1]?.steps;
    if (!phaseSteps || stage[1] <= phaseSteps.length) {
      return;
    }
    const clampedStage: CreationStage = [stage[0], phaseSteps.length];
    setStage(clampedStage);
    updateCreationStage(clampedStage);
  }, [config, stage, updateCreationStage]);

  useEffect(() => {
    if (!stage) {
      return;
    }
    setSearchParams(
      {
        phase: String(stage[0]),
        step: String(stage[1])
      },
      { replace: true }
    );
  }, [stage, setSearchParams]);

  const phase = stage && stage[0] && config?.phases[stage[0] - 1];

  return (
    <section className="character-creation-page">
      <Button onClick={() => navigate('/')} className="character-creation-back">
        Back to characters
      </Button>
      {error && !draft && <Alert message={error} type="error" showIcon />}
      {(loading || (!draft && !error)) && (
        <Flex className="characters-loading" justify="center">
          <Spin size="large" />
        </Flex>
      )}
      {draft && phase &&(
        <CharacterCreationPhase
          character={draft}
          creationStage={stage}
          key={phase.title}
          title={phase.title}
          phase={stage[0]}
          phaseCount={phaseCount}
          steps={phase.steps}
          advance={advance}
          disableAdvance={cannotAdvance}
          goBack={goBack}
          disableGoBack={disableGoBack()}
        />
      )}
    </section>
  );
}

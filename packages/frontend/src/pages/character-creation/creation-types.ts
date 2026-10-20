import type { ReactNode } from 'react';
import type Character from '../../entities/character';

export interface Step {
  title: string;
  fullComponent: ReactNode;
  collapsedComponent: ReactNode;
  isComplete: (character: Character) => boolean;
}

export interface Phase {
  title: string;
  steps: Step[];
}

export interface CreationConfigData {
  phases: Phase[];
}

import type { ReactNode } from 'react';
import type Character from '../../entities/character';

export interface Step {
  title: string;
  fullComponent: ReactNode;
  collapsedComponent: ReactNode;
  isComplete: (character: Character) => boolean;
  /** Review and optional steps stay complete without a player choice, so they are left out of the progress percentage. */
  tracksProgress?: boolean;
  /** A later step that is already complete stays hidden until the player reaches it. */
  hideUntilReached?: boolean;
}

export interface Phase {
  title: string;
  steps: Step[];
}

export interface CreationConfigData {
  phases: Phase[];
}

import { Button } from 'antd';
import classNames from 'classnames';
import type { MouseEventHandler } from 'react';

import './arrow-icon-button.css';

export interface ArrowIconButtonProps {
  left?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  'aria-label': string;
}

export default function ArrowIconButton({
  left = false,
  disabled,
  className,
  onClick,
  'aria-label': ariaLabel
}: ArrowIconButtonProps) {
  return (
    <Button
      className={classNames('arrow-icon-button', className)}
      type="text"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      icon={
        <svg
          className={classNames('arrow-icon-button__mark', {
            'arrow-icon-button__mark--left': left,
            'arrow-icon-button__mark--disabled': disabled
          })}
          viewBox="0 0 50 150"
          aria-hidden="true"
        >
          <polyline
            points="10,10 45,75 10,140"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="butt"
            strokeLinejoin="miter"
          />
        </svg>
      }
    />
  );
}

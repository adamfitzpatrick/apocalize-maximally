import { Button } from 'antd';
import classNames from 'classnames';
import type { MouseEventHandler } from 'react';

import './arrow-icon-button.css';

export interface ArrowIconProps {
  left?: boolean;
  className?: string;
  /** Sized to sit beside button text. The phase arrows stay full height. */
  inline?: boolean;
}

export function ArrowIcon({ left = false, className, inline = false }: ArrowIconProps) {
  return (
    <svg
      className={classNames(
        'arrow-icon-button__mark',
        {
          'arrow-icon-button__mark--left': left,
          'arrow-icon-button__mark--inline': inline
        },
        className
      )}
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
  );
}

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
        <ArrowIcon
          left={left}
          className={classNames({ 'arrow-icon-button__mark--disabled': disabled })}
        />
      }
    />
  );
}

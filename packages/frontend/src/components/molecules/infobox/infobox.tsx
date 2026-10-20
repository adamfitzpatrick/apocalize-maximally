import { MouseEventHandler } from 'react';
import { CharacterStats } from '../../../api/characters';
import classNames from 'classnames';
import { Button, Typography } from 'antd';
import { STATS, statKeys } from '../../../api/core-game-data';
import Table from '../table/table';

import './infobox.css';

interface Highlight {
  name: string;
  description: string;
}

interface InfoboxProps {
  size?: 'small' | 'normal';
  selected?: boolean
  expanded?: boolean;
  title: string;
  imageUrl?: string;
  description: string[];
  highlightedFeatures?: Highlight[];
  modifiers?: CharacterStats;
  expandHandler: MouseEventHandler<HTMLButtonElement>;
  buttonLabel?: string;
  buttonHandler?: MouseEventHandler<HTMLButtonElement>;
}

export default function Infobox({
  size = 'normal',
  selected,
  expanded,
  title,
  imageUrl,
  description,
  highlightedFeatures,
  modifiers,
  expandHandler,
  buttonLabel,
  buttonHandler,
}: InfoboxProps) {
  const articleClasses = classNames(
    'infobox',
    {
      'infobox--expanded': expanded,
      'infobox--selected': selected,
      'infobox--small': size === 'small'
    }
  )
  return (
    <article
      className={articleClasses}
    >
      <button
        className={classNames({
          'infobox__compact': !expanded,
          'infobox__compact--small': size === 'small',
          'infobox__expanded-content': expanded
        })}
        type="button"
        aria-expanded={false}
        onClick={expandHandler}
      >
        {!expanded ? (
          <div className={classNames(
            'infobox__compact',
            { 'infobox__compact--small': size === 'small' }
          )}>
            {imageUrl && (
              <img className="infobox__thumbnail" src={imageUrl} alt="" />
            )}
            <Typography.Text className="infobox__name" strong>
              {title}
            </Typography.Text>
          </div>
        ) : (
          <>
            {imageUrl && (
              <img className="infobox__image" src={imageUrl} alt="" />
            )}
            <span className="infobox__description">
              <Typography.Text className="infobox__name" strong>
                {title}
              </Typography.Text>
              {(Array.isArray(description) ? description : [description]).map(
                (paragraph, index) => (
                  <Typography.Paragraph
                    className="infobox__text"
                    key={index}
                  >
                    {paragraph}
                  </Typography.Paragraph>
                )
              )}
              {highlightedFeatures && highlightedFeatures.map(feature => {
                return (
                  <Typography.Paragraph className="infobox__text" key={feature.name}>
                    <Typography.Text strong>{feature.name}:&nbsp;</Typography.Text>
                    {feature.description}
                  </Typography.Paragraph>
                )
              })}
              {modifiers && (
                <Table
                  className="infobox__modifiers"
                  caption="Modifiers"
                  headers={STATS.map((stat) => stat.short)}
                  rows={[statKeys.map((stat) => modifiers[stat])]}
                  highlightSignedNumbers
                />
              )}
            </span>
            <Button
              className="infobox__select"
              type="primary"
              onClick={buttonHandler}
            >
              {buttonLabel}
            </Button>
          </>)}
      </button>
    </article>
  )
}
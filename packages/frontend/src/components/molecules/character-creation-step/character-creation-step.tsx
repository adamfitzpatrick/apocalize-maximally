import { Card, Flex, Typography } from 'antd';
import React from 'react';

interface CharacterCreationStepProps extends React.PropsWithChildren {
    step: number;
    stepCount: number;
    title: string;
    collapsed?: boolean;
}

export default function CharacterCreationStep({ step, stepCount, title, children, collapsed }: CharacterCreationStepProps) {
  return (collapsed && 
        <Card size='small'>
          <Flex justify="space-between">
            <Typography.Text>Step {step} of {stepCount}: {title}</Typography.Text>
            {children}
          </Flex>
        </Card>
        ||
        <Card
          size="small"
          className="character-creation-step"
          title={`Step ${step} of ${stepCount}: ${title}`}
        >
          {children}
        </Card>
  )
}
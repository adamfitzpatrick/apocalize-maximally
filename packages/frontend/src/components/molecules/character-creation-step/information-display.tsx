import { Typography } from 'antd'
import React from 'react'

interface InformationDisplayProps extends React.PropsWithChildren {
    description: string[]
}

export default function InformationDisplay({ description, children }: InformationDisplayProps) {
  return (
    <React.Fragment>
      {description.map(para => <Typography.Text key={para}>{para}</Typography.Text>)}
      {children}
    </React.Fragment>
  )
}
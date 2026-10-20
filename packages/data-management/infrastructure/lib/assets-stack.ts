import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

interface AssetsStackProps extends cdk.StackProps {
  environment: 'dev' | 'prd';
  assetsPath: string;
}

export class AssetsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AssetsStackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: `${props.environment}-apocalize-assets-${props.env?.account}-${props.env?.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    const distribution = new cloudfront.Distribution(
      this,
      'AssetsDistribution',
      {
        comment: `${props.environment}-apocalize-assets`,
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
        }
      }
    );

    new s3deploy.BucketDeployment(this, 'DeployAssets', {
      sources: [
        s3deploy.Source.asset(props.assetsPath, { exclude: ['.gitkeep'] })
      ],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
      prune: true
    });

    new cdk.CfnOutput(this, 'AssetsBaseUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description:
        'Base URL for repository-managed assets; reference images by /archetypes/ or /apocalypses/.'
    });
    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: bucket.bucketName
    });

    cdk.Tags.of(this).add('Environment', props.environment);
  }
}

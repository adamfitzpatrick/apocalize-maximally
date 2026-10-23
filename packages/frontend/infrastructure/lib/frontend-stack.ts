import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'node:path';

interface FrontendStackProps extends cdk.StackProps {
  environment: 'dev' | 'prd';
  domainName: string;
  hostedZoneId: string;
  hostedZoneName: string;
  /** Existing us-east-1 certificate. This stack does not create or delete it. */
  certificateArn: string;
}

function recordNameInZone(domainName: string, zoneName: string): string | undefined {
  const domain = domainName.replace(/\.$/, '').toLowerCase();
  const zone = zoneName.replace(/\.$/, '').toLowerCase();
  if (domain === zone) {
    return undefined;
  }
  const suffix = `.${zone}`;
  if (!domain.endsWith(suffix)) {
    throw new Error(`Domain ${domain} is outside hosted zone ${zone}.`);
  }
  return domain.slice(0, -suffix.length);
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const prefix = props.environment;
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      'HostedZone',
      {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.hostedZoneName
      }
    );
    const bucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `${prefix}-apocalize-frontend-${props.env?.account}-${props.env?.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      defaultRootObject: 'index.html',
      comment: `${prefix}-apocalize-frontend`,
      domainNames: [props.domainName],
      certificate: acm.Certificate.fromCertificateArn(
        this,
        'SiteCertificate',
        props.certificateArn
      ),
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5)
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5)
        }
      ]
    });

    new s3deploy.BucketDeployment(this, 'DeploySite', {
      sources: [s3deploy.Source.asset(path.resolve(__dirname, '../../dist'))],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
      prune: true
    });

    new route53.ARecord(this, 'SiteAliasRecord', {
      zone: hostedZone,
      recordName: recordNameInZone(props.domainName, props.hostedZoneName),
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      )
    });

    new cdk.CfnOutput(this, 'SiteUrl', {
      value: `https://${props.domainName}`
    });
    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId
    });

    cdk.Tags.of(this).add('Environment', prefix);
  }
}

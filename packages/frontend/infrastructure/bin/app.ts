import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import { FrontendStack } from '../lib/frontend-stack';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const environmentValue = process.env.ENVIRONMENT ?? 'dev';
if (environmentValue !== 'dev' && environmentValue !== 'prd') {
  throw new Error(
    "ENVIRONMENT must be either 'dev' or 'prd' in packages/frontend/.env."
  );
}
const environment = environmentValue;
const account = process.env.AWS_ACCOUNT_ID;
const region = process.env.AWS_REGION;
const domainName = process.env.FRONTEND_DOMAIN_NAME;
const hostedZoneId = process.env.HOSTED_ZONE_ID;
const hostedZoneName = process.env.HOSTED_ZONE_NAME;
const certificateArn = process.env.CLOUDFRONT_CERTIFICATE_ARN;

if (
  !account ||
  !region ||
  !domainName ||
  !hostedZoneId ||
  !hostedZoneName ||
  !certificateArn
) {
  throw new Error(
    'Set AWS_ACCOUNT_ID, AWS_REGION, FRONTEND_DOMAIN_NAME, HOSTED_ZONE_ID, HOSTED_ZONE_NAME, and CLOUDFRONT_CERTIFICATE_ARN in packages/frontend/.env.'
  );
}

const normalizedDomain = domainName.replace(/\.$/, '').toLowerCase();
const normalizedZone = hostedZoneName.replace(/\.$/, '').toLowerCase();
if (
  normalizedDomain !== normalizedZone &&
  !normalizedDomain.endsWith(`.${normalizedZone}`)
) {
  throw new Error(
    'FRONTEND_DOMAIN_NAME must be the hosted-zone domain or one of its subdomains.'
  );
}

const environmentDomainName =
  environment === 'prd' ? normalizedDomain : `${environment}.${normalizedDomain}`;
const app = new cdk.App();
new FrontendStack(app, `FrontendStack-${environment}`, {
  env: { account, region },
  stackName: `apocalize-${environment}-frontend`,
  environment,
  domainName: environmentDomainName,
  hostedZoneId,
  hostedZoneName,
  certificateArn
});

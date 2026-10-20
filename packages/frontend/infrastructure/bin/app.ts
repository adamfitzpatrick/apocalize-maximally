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
const domainName = process.env.FRONTEND_DOMAIN_NAME;
const hostedZoneId = process.env.HOSTED_ZONE_ID;
const hostedZoneName = process.env.HOSTED_ZONE_NAME;

if (!account || !domainName || !hostedZoneId || !hostedZoneName) {
  throw new Error(
    'Set AWS_ACCOUNT_ID, FRONTEND_DOMAIN_NAME, HOSTED_ZONE_ID, and HOSTED_ZONE_NAME in packages/frontend/.env.'
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

const environmentDomainName = `${environment}.${normalizedDomain}`;
const app = new cdk.App();
new FrontendStack(app, `FrontendStack-${environment}`, {
  env: { account, region: 'us-east-1' },
  stackName: `apocalize-${environment}-frontend`,
  environment,
  domainName: environmentDomainName,
  baseDomainName: normalizedDomain,
  hostedZoneId,
  hostedZoneName
});

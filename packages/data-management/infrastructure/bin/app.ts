import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import { AssetsStack } from '../lib/assets-stack';

dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });

const environmentValue = process.env.ENVIRONMENT ?? 'dev';
if (environmentValue !== 'dev' && environmentValue !== 'prd') {
  throw new Error(
    "ENVIRONMENT must be either 'dev' or 'prd' in packages/backend/.env."
  );
}

const account = process.env.AWS_ACCOUNT_ID;
const region = process.env.AWS_REGION;
if (!account || !region) {
  throw new Error(
    'Set AWS_ACCOUNT_ID and AWS_REGION in packages/backend/.env.'
  );
}

const app = new cdk.App();
new AssetsStack(app, `AssetsStack-${environmentValue}`, {
  env: { account, region },
  stackName: `apocalize-${environmentValue}-assets`,
  environment: environmentValue,
  assetsPath: path.resolve(__dirname, '../../assets')
});

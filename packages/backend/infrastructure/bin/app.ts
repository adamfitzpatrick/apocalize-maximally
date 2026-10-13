import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as dotenv from "dotenv";
import { BackendStack } from "../lib/backend-stack";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const environmentValue = process.env.ENVIRONMENT ?? "dev";
if (environmentValue !== "dev" && environmentValue !== "prd") {
  throw new Error(
    "ENVIRONMENT must be either 'dev' or 'prd' in packages/backend/.env."
  );
}
const environment = environmentValue;
const account = process.env.AWS_ACCOUNT_ID;
const region = process.env.AWS_REGION;
const frontendDomainName = process.env.FRONTEND_DOMAIN_NAME;

if (!account || !region || !frontendDomainName) {
  throw new Error(
    "Set AWS_ACCOUNT_ID, AWS_REGION, and FRONTEND_DOMAIN_NAME in packages/backend/.env."
  );
}

const frontendOrigin = `https://${environment}.${frontendDomainName
  .replace(/\.$/, "")
  .toLowerCase()}`;
const app = new cdk.App();
new BackendStack(app, `BackendStack-${environment}`, {
  env: { account, region },
  stackName: `apocalize-${environment}-backend`,
  environment,
  frontendOrigin
});

# Apocalize Maximally

This repository is a Yarn-workspaces monorepo with independently deployable React and AWS backend packages:

- `packages/frontend` — React, Vite, and a CloudFront/S3 site with a Route 53 custom domain.
- `packages/backend` — API Gateway, a TypeScript Lambda, and a DynamoDB single-table design.

## Requirements

- Node.js 22 or later and Corepack
- AWS CLI credentials with permission to deploy the stacks
- An existing Route 53 hosted zone for the frontend domain

This repository uses Yarn Berry with Plug'n'Play and zero-installs. Dependencies
are stored in `.yarn/cache`, with the generated `.pnp.cjs` and required native
package files in `.yarn/unplugged`. Keep these files checked in. After cloning,
run this from the repository root to verify the lockfile and offline cache:

```bash
yarn install --immutable
```

Copy each package's `.env.example` to `.env` and fill in the values. Do not commit `.env` files.

### Backend

The backend provisions a self-service Cognito user pool with passwordless
email one-time codes. Email is the only required user attribute; there is no
administrator approval step. The API requires a valid Cognito token, and
DynamoDB items are scoped to the authenticated user.

Set `AWS_ACCOUNT_ID`, `AWS_REGION`, and `FRONTEND_DOMAIN_NAME` in
`packages/backend/.env`. Set `ENVIRONMENT` to
`dev` or `prd` in both package `.env` files; it defaults to `dev` when omitted.
The backend derives its allowed frontend origin as
`https://<ENVIRONMENT>.<FRONTEND_DOMAIN_NAME>`.

Build and deploy the backend independently:

```sh
yarn workspace @apocalize/backend build
yarn deploy:backend
```

Copy `ApiUrl`, `AuthUserPoolId`, and `AuthUserPoolClientId` from the backend
stack outputs to `VITE_API_URL`, `VITE_COGNITO_USER_POOL_ID`, and
`VITE_COGNITO_USER_POOL_CLIENT_ID` in `packages/frontend/.env`.

### Frontend

Set `AWS_ACCOUNT_ID`, `FRONTEND_DOMAIN_NAME`, `HOSTED_ZONE_ID`, and
`HOSTED_ZONE_NAME` in `packages/frontend/.env`. The frontend CDK stack runs in
`us-east-1`, as required for CloudFront certificates. Set `VITE_API_URL` to the
backend API URL and the two `VITE_COGNITO_*` values from the backend stack
before building. `FRONTEND_DOMAIN_NAME` is the base domain; CDK prepends the
environment as a subdomain (`dev.app.example.com` or `prd.app.example.com` for
`app.example.com`). The frontend package and backend package must use the same
environment and base domain. The frontend domain must be within the configured
Route 53 hosted zone; `http://localhost:5173` is also allowed for local development.

Stack names, named AWS resources, and the frontend domain are
environment-prefixed. Deploying `dev` and `prd` therefore creates separate
stacks and distinct frontend domains. To deploy a selected environment,
set the same `ENVIRONMENT=dev` or `ENVIRONMENT=prd` in both package `.env`
files before running that environment's synth or deploy command.

```sh
yarn workspace @apocalize/frontend build
yarn deploy:frontend
```

Each package can also be synthesized without deploying:

```sh
yarn synth:backend
yarn synth:frontend
```

Bootstrap each target AWS environment with AWS CDK before the first deploy.
Deploy the backend before the frontend so the frontend build can use the API URL.

## Local frontend development

From the repository root, run:

```sh
yarn workspace @apocalize/frontend dev
```

The React app expects the backend API URL and Cognito outputs in
`packages/frontend/.env`.
